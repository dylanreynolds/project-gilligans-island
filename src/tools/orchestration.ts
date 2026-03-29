// ============================================================
// Orchestration Tools — Full offboarding/onboarding workflows
// and audit/status reporting
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { store } from "../state/store.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- Exported core offboarding function (used by MCP tool + HTTP API) ----

export type OffboardingStep = {
  step: string;
  category: string;
  status: "completed" | "error" | "skipped";
  detail: string;
  ms: number;
};

export async function executeOffboardingWorkflow(
  userId: string,
  reason: string,
  simulateError: boolean
): Promise<{ notFound: true } | {
  success: boolean;
  message: string;
  summary: {
    userId: string;
    displayName: string;
    status: string;
    startedAt: string | undefined;
    completedAt: string | null;
    stepsCompleted: number;
    stepsErrored: number;
    totalSimulatedLatencyMs: number;
  };
  steps: OffboardingStep[];
  checklistStatus: Record<string, boolean> | null;
  auditLog: unknown[];
  dashboardUrl: string;
}> {
  const user = store.getUser(userId);
  if (!user) return { notFound: true };

  let task = store.getOffboardingTask(user.id);
  if (!task) task = store.startOffboardingTask(user.id);

  const steps: OffboardingStep[] = [];
  const addStep = (step: string, category: string, detail: string, ms: number, status: OffboardingStep["status"] = "completed") => {
    steps.push({ step, category, status, detail, ms });
  };
  const sim = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);

  // ---- Step 1: Identity ----
  {
    const t = sim(300, 800);
    store.updateUser(user.id, { accountEnabled: false, sessionsRevoked: true, passwordReset: true });
    user.groupMemberships.forEach((g) => (g.removed = true));
    user.roleAssignments.forEach((r) => (r.removed = true));
    store.updateUser(user.id, { groupMemberships: user.groupMemberships, roleAssignments: user.roleAssignments });
    store.addAuditEntry(user.id, user.displayName, "IDENTITY_OFFBOARD", "Identity", "Account disabled, sessions revoked, groups/roles removed", "success", t);
    store.updateOffboardingTask(user.id, "identity");
    addStep("Disable account & revoke access", "Identity", `Account disabled. Removed from ${user.groupMemberships.length} groups and ${user.roleAssignments.length} roles.`, t);
    await sleep(50);
  }

  // ---- Step 2: Teams & Calling ----
  {
    const t = sim(800, 2200);
    if (simulateError) {
      const errDetail = "429 Too Many Requests — throttled by Teams API. Retry-After: 60s. (Simulated for demo)";
      store.addAuditEntry(user.id, user.displayName, "TEAMS_OFFBOARD_ERROR", "Teams & Calling", errDetail, "simulated_error", t);
      addStep("Disable Teams Calling", "Teams & Calling", errDetail, t, "error");
      addStep("Remove phone number", "Teams & Calling", "Skipped due to upstream error", 0, "skipped");
    } else {
      const prevNumber = user.teamsConfig.phoneNumber;
      user.teamsConfig.enterpriseVoiceEnabled = false;
      user.teamsConfig.phoneNumber = null;
      user.teamsConfig.lineUri = null;
      user.teamsConfig.voiceRoutingPolicy = null;
      user.teamsConfig.callingPolicy = null;
      user.teamsConfig.callForwardingTarget = user.mail;
      store.updateUser(user.id, { teamsConfig: user.teamsConfig });
      store.addAuditEntry(user.id, user.displayName, "TEAMS_OFFBOARD", "Teams & Calling",
        `Enterprise Voice disabled. Phone ${prevNumber} released. Call forwarding → manager.`, "success", t);
      store.updateOffboardingTask(user.id, "teamsAndCalling");
      addStep("Disable Teams Calling & remove phone number", "Teams & Calling", `Phone ${prevNumber} released to pool. Forwarding to manager.`, t);
    }
    await sleep(50);
  }

  // ---- Step 3: Licensing ----
  {
    const t = sim(400, 1200);
    const licenseNames = user.licenses.map((l) => l.displayName);
    store.updateUser(user.id, { licenses: [] });
    store.addAuditEntry(user.id, user.displayName, "LICENSE_OFFBOARD", "Licensing",
      `Removed ${licenseNames.length} license(s): ${licenseNames.join(", ")}`, "success", t);
    store.updateOffboardingTask(user.id, "licensing");
    addStep("Remove all M365 licenses", "Licensing", `Removed: ${licenseNames.join(", ")}`, t);
    await sleep(50);
  }

  // ---- Step 4: Mailbox ----
  {
    const t = sim(300, 800);
    const manager = store.getUser(user.managerId);
    user.mailboxSettings.autoReplyEnabled = true;
    user.mailboxSettings.autoReplyMessage = `${user.displayName} is no longer with the organisation. Please contact ${user.managerName}.`;
    user.mailboxSettings.isShared = true;
    user.mailboxSettings.sendDisabled = true;
    if (manager) user.mailboxSettings.fullAccessDelegates.push(manager.userPrincipalName);
    store.updateUser(user.id, { mailboxSettings: user.mailboxSettings });
    store.addAuditEntry(user.id, user.displayName, "MAILBOX_OFFBOARD", "Mailbox",
      `OOO set, converted to shared mailbox, delegate access granted to ${user.managerName}`, "success", t);
    store.updateOffboardingTask(user.id, "mailbox");
    addStep("Configure mailbox", "Mailbox", `OOO reply active. Shared. Delegate: ${user.managerName}`, t);
    await sleep(50);
  }

  // ---- Step 5: AVD ----
  {
    const t = sim(400, 1500);
    const count = user.avdAssignments.length;
    user.avdAssignments.forEach((a) => { a.activeSessions = 0; a.sessionStatus = "removed"; });
    store.updateUser(user.id, { avdAssignments: user.avdAssignments });
    store.addAuditEntry(user.id, user.displayName, "AVD_OFFBOARD", "AVD",
      `Disconnected sessions and removed from ${count} host pool(s).`, "success", t);
    store.updateOffboardingTask(user.id, "avd");
    addStep("Remove AVD access", "AVD", `Disconnected and removed from ${count} host pool(s).`, t);
    await sleep(50);
  }

  // ---- Step 6: Hardware ----
  {
    const t = sim(300, 900);
    const ticketNumber = `INC${Math.floor(Math.random() * 9000000 + 1000000)}`;
    const count = user.hardware.filter((h) => h.status === "assigned").length;
    user.hardware.forEach((h) => { if (h.status === "assigned") { h.status = "pending_return"; h.returnTicket = ticketNumber; } });
    store.updateUser(user.id, { hardware: user.hardware });
    store.addAuditEntry(user.id, user.displayName, "HARDWARE_OFFBOARD", "Hardware",
      `Return ticket ${ticketNumber} created for ${count} asset(s).`, "success", t);
    store.updateOffboardingTask(user.id, "hardware");
    addStep("Generate hardware return ticket", "Hardware", `${count} item(s) flagged. Return ticket: ${ticketNumber}`, t);
    await sleep(50);
  }

  // ---- Step 7: Printers ----
  {
    const t = sim(150, 500);
    const count = user.printerAssignments.filter((p) => !p.removed).length;
    user.printerAssignments.forEach((p) => (p.removed = true));
    store.updateUser(user.id, { printerAssignments: user.printerAssignments });
    store.addAuditEntry(user.id, user.displayName, "PRINTER_OFFBOARD", "Printer Access",
      `Removed from ${count} printer group(s).`, "success", t);
    store.updateOffboardingTask(user.id, "printerAccess");
    addStep("Remove printer access", "Printer Access", `Removed from ${count} printer(s).`, t);
  }

  const finalTask = store.getOffboardingTask(user.id);
  const totalMs = steps.reduce((a, s) => a + s.ms, 0);
  const completed = steps.filter((s) => s.status === "completed").length;
  const errored = steps.filter((s) => s.status === "error").length;

  return {
    success: errored === 0,
    message: errored > 0
      ? `Offboarding completed with ${errored} error(s) for ${user.displayName}`
      : `Offboarding complete for ${user.displayName}`,
    summary: {
      userId: user.id,
      displayName: user.displayName,
      status: finalTask?.completedAt ? "offboarded" : "offboarding_partial",
      startedAt: finalTask?.startedAt,
      completedAt: finalTask?.completedAt ?? null,
      stepsCompleted: completed,
      stepsErrored: errored,
      totalSimulatedLatencyMs: totalMs,
    },
    steps,
    checklistStatus: finalTask?.checklist ?? null,
    auditLog: store.getAuditLog(user.id).slice(-10),
    dashboardUrl: "http://localhost:3000",
  };
}

export function registerOrchestrationTools(server: McpServer) {
  // ---- Start Offboarding Workflow ----
  server.tool(
    "start_offboarding_workflow",
    "Initialise an offboarding workflow for a user. Creates a tracking ticket, records the start time, and marks the user as 'offboarding'. Call individual task tools after this to complete each offboarding step, or call run_complete_offboarding for a fully automated run.",
    {
      userId: z.string().describe("User ID, UPN, or display name of the employee being offboarded"),
      reason: z.string().optional().default("Resignation").describe("Offboarding reason (Resignation, Termination, Retirement, Contract End)"),
    },
    async ({ userId, reason }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }
      if (user.status === "offboarded") {
        return { content: [{ type: "text", text: JSON.stringify({ error: "Conflict", message: `${user.displayName} has already been offboarded.` }) }] };
      }

      const task = store.startOffboardingTask(user.id);
      store.addAuditEntry(user.id, user.displayName, "OFFBOARDING_STARTED", "Orchestration",
        `Offboarding workflow initiated. Reason: ${reason}. Ticket: ${task.id}`, "success", 120);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `🚀 Offboarding workflow started for ${user.displayName}`,
              task: {
                ticketId: task.id,
                userId: user.id,
                displayName: user.displayName,
                department: user.department,
                manager: user.managerName,
                reason,
                startedAt: task.startedAt,
                status: "in_progress",
              },
              pendingSteps: [
                "1. Identity & Access — disable account, revoke sessions, remove groups/roles",
                "2. Teams & Calling — disable voice, remove phone number, configure voicemail",
                "3. Licensing — remove all M365 licenses",
                "4. Mailbox — set OOO, grant delegate access, convert to shared",
                "5. AVD — disconnect sessions, remove host pool access",
                "6. Hardware — discover assets, generate return shipment",
                "7. Printer Access — remove from all printer groups",
              ],
              note: "Call run_complete_offboarding to execute all steps automatically, or call individual tools per step.",
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Run Complete Offboarding ----
  server.tool(
    "run_complete_offboarding",
    "Execute the complete automated offboarding workflow for a user in the correct sequence. Runs all 7 offboarding categories and produces a full audit trail. Simulates an Azure Logic App or Runbook orchestration.",
    {
      userId: z.string().describe("User ID, UPN, or display name"),
      reason: z.string().optional().default("Resignation").describe("Offboarding reason"),
      simulateError: z.boolean().optional().default(false).describe("Simulate a throttling/error scenario for demo purposes"),
    },
    async ({ userId, reason, simulateError }) => {
      const result = await executeOffboardingWorkflow(userId, reason, simulateError);
      if ("notFound" in result) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ...result,
              message: result.success ? `✅ ${result.message}` : `⚠️ ${result.message}`,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Get Offboarding Status ----
  server.tool(
    "get_offboarding_status",
    "Get the current offboarding status and checklist for a user or all active offboardings.",
    {
      userId: z.string().optional().describe("User ID, UPN, or display name. Omit to get all active offboardings."),
    },
    async ({ userId }) => {
      if (userId) {
        const user = store.getUser(userId);
        if (!user) {
          return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
        }
        const task = store.getOffboardingTask(user.id);
        const auditEntries = store.getAuditLog(user.id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                user: { id: user.id, displayName: user.displayName, status: user.status },
                offboardingTask: task ?? "No offboarding task found — call start_offboarding_workflow first.",
                accountEnabled: user.accountEnabled,
                sessionsRevoked: user.sessionsRevoked,
                licenseCount: user.licenses.length,
                teamsCallingEnabled: user.teamsConfig.enterpriseVoiceEnabled,
                phoneNumber: user.teamsConfig.phoneNumber,
                avdStatus: user.avdAssignments.map((a) => ({ pool: a.hostPoolName, status: a.sessionStatus })),
                hardwareStatus: user.hardware.map((h) => ({ type: h.type, assetTag: h.assetTag, status: h.status })),
                recentAuditEntries: auditEntries.slice(-5),
              }, null, 2),
            },
          ],
        };
      }

      const allTasks = store.getAllOffboardingTasks();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              summary: store.getSummary(),
              activeOffboardings: allTasks.filter((t) => !t.completedAt),
              completedOffboardings: allTasks.filter((t) => t.completedAt),
              dashboardUrl: "http://localhost:3000",
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Reset Demo State ----
  server.tool(
    "reset_demo_state",
    "Reset all user state back to the initial mock data. Use this at the start of a new hackathon demo run to restore all 25 users to their original Active state.",
    {},
    async () => {
      store.reset();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "🔄 Demo state reset — all 25 users restored to Active status",
              users: store.getAllUsers().map((u) => ({ id: u.id, displayName: u.displayName, status: u.status })),
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Get Audit Log ----
  server.tool(
    "get_audit_log",
    "Retrieve the full audit trail of all offboarding actions performed in this session. Useful for compliance reporting and demonstrating what the automation did.",
    {
      userId: z.string().optional().describe("Filter to a specific user. Omit for all entries."),
      limit: z.number().optional().default(20).describe("Maximum number of entries to return (default 20)"),
    },
    async ({ userId, limit }) => {
      const entries = store.getAuditLog(userId ? store.getUser(userId)?.id : undefined);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              totalEntries: entries.length,
              showing: Math.min(limit, entries.length),
              entries: entries.slice(-limit),
            }, null, 2),
          },
        ],
      };
    }
  );
}
