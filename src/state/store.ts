// ============================================================
// State Store — in-memory state, shared between MCP tools
// and the HTTP dashboard server. Deep clones on init so
// each demo run starts fully reset.
// ============================================================

import { EventEmitter } from "events";
import { MOCK_USERS } from "../data/mockData.js";
import type { MockUser } from "../data/mockData.js";

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  category: string;
  detail: string;
  status: "success" | "simulated_error" | "skipped";
  durationMs: number;
}

export interface OffboardingTask {
  id: string;
  userId: string;
  userName: string;
  startedAt: string;
  completedAt: string | null;
  checklist: {
    identity: boolean;
    teamsAndCalling: boolean;
    licensing: boolean;
    mailbox: boolean;
    avd: boolean;
    hardware: boolean;
    printerAccess: boolean;
  };
}

class StateStore extends EventEmitter {
  private users: Map<string, MockUser>;
  private auditLog: AuditEntry[];
  private offboardingTasks: Map<string, OffboardingTask>;
  private auditCounter: number;

  constructor() {
    super();
    // Deep clone so resets work cleanly
    this.users = new Map(MOCK_USERS.map((u) => [u.id, JSON.parse(JSON.stringify(u)) as MockUser]));
    this.auditLog = [];
    this.offboardingTasks = new Map();
    this.auditCounter = 1;
  }

  // ---- User accessors ----

  getUser(idOrUpn: string): MockUser | undefined {
    // search by id first, then upn/mail
    if (this.users.has(idOrUpn)) return this.users.get(idOrUpn);
    for (const u of this.users.values()) {
      if (
        u.userPrincipalName.toLowerCase() === idOrUpn.toLowerCase() ||
        u.displayName.toLowerCase() === idOrUpn.toLowerCase() ||
        u.mail.toLowerCase() === idOrUpn.toLowerCase()
      ) {
        return u;
      }
    }
    return undefined;
  }

  getAllUsers(): MockUser[] {
    return Array.from(this.users.values());
  }

  updateUser(id: string, patch: Partial<MockUser>): MockUser {
    const user = this.users.get(id);
    if (!user) throw new Error(`User ${id} not found`);
    Object.assign(user, patch);
    this.emit("stateChanged", { type: "userUpdated", userId: id });
    return user;
  }

  // ---- Audit log ----

  addAuditEntry(
    userId: string,
    userName: string,
    action: string,
    category: string,
    detail: string,
    status: AuditEntry["status"] = "success",
    durationMs = 0
  ): AuditEntry {
    const entry: AuditEntry = {
      id: `audit-${String(this.auditCounter++).padStart(4, "0")}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action,
      category,
      detail,
      status,
      durationMs,
    };
    this.auditLog.push(entry);
    this.emit("stateChanged", { type: "auditAdded", entry });
    return entry;
  }

  getAuditLog(userId?: string): AuditEntry[] {
    if (userId) return this.auditLog.filter((e) => e.userId === userId);
    return [...this.auditLog];
  }

  // ---- Offboarding tasks ----

  startOffboardingTask(userId: string): OffboardingTask {
    const user = this.getUser(userId);
    if (!user) throw new Error(`User ${userId} not found`);
    const task: OffboardingTask = {
      id: `ob-${userId}-${Date.now()}`,
      userId: user.id,
      userName: user.displayName,
      startedAt: new Date().toISOString(),
      completedAt: null,
      checklist: {
        identity: false,
        teamsAndCalling: false,
        licensing: false,
        mailbox: false,
        avd: false,
        hardware: false,
        printerAccess: false,
      },
    };
    this.offboardingTasks.set(user.id, task);
    this.updateUser(user.id, { status: "offboarding", offboardingStarted: task.startedAt });
    this.emit("stateChanged", { type: "offboardingStarted", userId: user.id });
    return task;
  }

  updateOffboardingTask(userId: string, checklistKey: keyof OffboardingTask["checklist"]): void {
    const task = this.offboardingTasks.get(userId);
    if (!task) return;
    task.checklist[checklistKey] = true;

    const allDone = Object.values(task.checklist).every(Boolean);
    if (allDone && !task.completedAt) {
      task.completedAt = new Date().toISOString();
      this.updateUser(userId, { status: "offboarded", offboardingCompleted: task.completedAt });
    }
    this.emit("stateChanged", { type: "checklistUpdated", userId });
  }

  getOffboardingTask(userId: string): OffboardingTask | undefined {
    return this.offboardingTasks.get(userId);
  }

  getAllOffboardingTasks(): OffboardingTask[] {
    return Array.from(this.offboardingTasks.values());
  }

  // ---- Reset (for demo reruns) ----

  reset(): void {
    this.users = new Map(MOCK_USERS.map((u) => [u.id, JSON.parse(JSON.stringify(u)) as MockUser]));
    this.auditLog = [];
    this.offboardingTasks = new Map();
    this.auditCounter = 1;
    this.emit("stateChanged", { type: "reset" });
  }

  // ---- Dashboard summary ----

  getSummary() {
    const users = this.getAllUsers();
    return {
      totalUsers: users.length,
      active: users.filter((u) => u.status === "active").length,
      offboarding: users.filter((u) => u.status === "offboarding").length,
      offboarded: users.filter((u) => u.status === "offboarded").length,
      auditEntries: this.auditLog.length,
      activeOffboardings: this.getAllOffboardingTasks().filter((t) => !t.completedAt).length,
    };
  }
}

// Singleton — shared across all tool modules and HTTP server
export const store = new StateStore();
