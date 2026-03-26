// ============================================================
// ServiceNow Ticket Mock Data & Store Extension
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { store } from "../state/store.js";

export type SnowTicketState = "New" | "In Progress" | "Pending" | "Resolved" | "Closed";
export type SnowPriority = "1 - Critical" | "2 - High" | "3 - Moderate" | "4 - Low";

export interface SnowTicket {
  number: string;
  sysId: string;
  state: SnowTicketState;
  priority: SnowPriority;
  category: string;
  subcategory: string;
  shortDescription: string;
  description: string;
  requestedBy: string;
  requestedByEmail: string;
  assignedTo: string;
  assignedGroup: string;
  affectedUser: string;
  affectedUserId: string;
  affectedUserDept: string;
  affectedUserManager: string;
  reason: string;
  lastDayOfWork: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  workNotes: SnowWorkNote[];
  approvals: SnowApproval[];
  outboundRestTriggered: boolean;
  outboundRestPayload: object | null;
  outboundRestResponse: object | null;
  azureRunbookJobId: string | null;
  azureLogicAppRunId: string | null;
}

export interface SnowWorkNote {
  id: string;
  timestamp: string;
  author: string;
  note: string;
  type: "work_note" | "activity" | "system";
}

export interface SnowApproval {
  id: string;
  approver: string;
  approverEmail: string;
  state: "requested" | "approved" | "rejected";
  requestedAt: string;
  respondedAt: string | null;
  comments: string;
}

// In-memory ticket store (singleton map keyed by ticket number)
const ticketStore = new Map<string, SnowTicket>();
let ticketCounter = 1000;

function nextTicketNumber() {
  return `RITM${String(ticketCounter++).padStart(7, "0")}`;
}

function nextSysId() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

export function createSnowTicket(userId: string, reason: string, requestedBy: string): SnowTicket {
  const user = store.getUser(userId);
  if (!user) throw new Error(`User ${userId} not found`);

  const now = new Date().toISOString();
  const lastDay = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const ticket: SnowTicket = {
    number: nextTicketNumber(),
    sysId: nextSysId(),
    state: "New",
    priority: "2 - High",
    category: "HR",
    subcategory: "Employee Offboarding",
    shortDescription: `Offboarding Request — ${user.displayName} (${reason})`,
    description: `Employee offboarding has been initiated for ${user.displayName}, ${user.jobTitle} in ${user.department}.\n\nReason: ${reason}\nLast Day of Work: ${lastDay}\nManager: ${user.managerName}\nLocation: ${user.officeLocation}\n\nThis ticket triggers automated offboarding via Azure Logic App → Azure Runbook.\n\nAutomation will handle:\n- Entra ID account disable and session revocation\n- Microsoft Teams Phone and Enterprise Voice removal\n- M365 license reclamation\n- Exchange mailbox delegation and OOO configuration\n- Azure Virtual Desktop access removal\n- Hardware return process\n- Universal Print access removal`,
    requestedBy,
    requestedByEmail: `${requestedBy.toLowerCase().replace(" ", ".")}@M365x12345.onmicrosoft.com`,
    assignedTo: "IT Automation",
    assignedGroup: "GRP-IT-Offboarding-Automation",
    affectedUser: user.displayName,
    affectedUserId: user.id,
    affectedUserDept: user.department,
    affectedUserManager: user.managerName,
    reason,
    lastDayOfWork: lastDay,
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    outboundRestTriggered: false,
    outboundRestPayload: null,
    outboundRestResponse: null,
    azureRunbookJobId: null,
    azureLogicAppRunId: null,
    workNotes: [
      {
        id: `wn-001`,
        timestamp: now,
        author: "System",
        note: `Ticket created. Offboarding request for ${user.displayName} received from ${requestedBy}.`,
        type: "system",
      },
    ],
    approvals: [
      {
        id: `appr-001`,
        approver: user.managerName,
        approverEmail: `manager@M365x12345.onmicrosoft.com`,
        state: "requested",
        requestedAt: now,
        respondedAt: null,
        comments: "",
      },
    ],
  };

  ticketStore.set(ticket.number, ticket);
  return ticket;
}

export function getSnowTicket(number: string): SnowTicket | undefined {
  return ticketStore.get(number);
}

export function getAllSnowTickets(): SnowTicket[] {
  return Array.from(ticketStore.values());
}

export function updateSnowTicket(number: string, patch: Partial<SnowTicket>): SnowTicket {
  const ticket = ticketStore.get(number);
  if (!ticket) throw new Error(`Ticket ${number} not found`);
  Object.assign(ticket, patch);
  ticket.updatedAt = new Date().toISOString();
  return ticket;
}

export function addWorkNote(number: string, author: string, note: string, type: SnowWorkNote["type"] = "work_note"): void {
  const ticket = ticketStore.get(number);
  if (!ticket) return;
  ticket.workNotes.push({
    id: `wn-${String(ticket.workNotes.length + 1).padStart(3, "0")}`,
    timestamp: new Date().toISOString(),
    author,
    note,
    type,
  });
  ticket.updatedAt = new Date().toISOString();
}

export function approveTicket(number: string, approverId: string): void {
  const ticket = ticketStore.get(number);
  if (!ticket) return;
  const approval = ticket.approvals.find((a) => a.id === approverId || a.approver === approverId);
  if (approval) {
    approval.state = "approved";
    approval.respondedAt = new Date().toISOString();
    approval.comments = "Approved — proceed with automated offboarding.";
  }
  addWorkNote(number, approval?.approver ?? "Manager", "Offboarding request approved. Azure automation triggered.", "activity");
  ticket.state = "In Progress";
  ticket.updatedAt = new Date().toISOString();
}

export function resetSnowTickets(): void {
  ticketStore.clear();
  ticketCounter = 1000;
}

// ─── Register MCP Tools ───────────────────────────────────────────────────────
export function registerServiceNowTools(server: McpServer) {
  // ---- Create ServiceNow Ticket ----
  server.tool(
    "create_snow_ticket",
    "Create a ServiceNow offboarding RITM (Request Item) ticket. This simulates the HR or manager raising a ticket to trigger the automated offboarding pipeline. In production this would be a Catalog Item in ServiceNow that fires an Outbound REST Message to Azure.",
    {
      userId: z.string().describe("User ID, UPN, or display name of the employee to offboard"),
      reason: z.string().optional().default("Resignation").describe("Resignation / Termination / Retirement / Contract End"),
      requestedBy: z.string().optional().default("Patti Fernandez").describe("Name of the person raising the ticket (HR / Manager)"),
    },
    async ({ userId, reason, requestedBy }) => {
      const user = store.getUser(userId);
      if (!user) return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };

      const ticket = createSnowTicket(user.id, reason, requestedBy);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            message: `✅ ServiceNow ticket created`,
            ticket: {
              number: ticket.number,
              sysId: ticket.sysId,
              state: ticket.state,
              priority: ticket.priority,
              shortDescription: ticket.shortDescription,
              affectedUser: ticket.affectedUser,
              assignedGroup: ticket.assignedGroup,
              lastDayOfWork: ticket.lastDayOfWork,
              createdAt: ticket.createdAt,
            },
            nextStep: `Call approve_snow_ticket with number '${ticket.number}' to trigger the Azure automation pipeline.`,
            snowEndpoint: `POST /api/now/table/sc_request (Catalog: Employee Offboarding)`,
          }, null, 2),
        }],
      };
    }
  );

  // ---- Get Ticket ----
  server.tool(
    "get_snow_ticket",
    "Retrieve a ServiceNow offboarding ticket by number (e.g. RITM1000000).",
    { ticketNumber: z.string().describe("ServiceNow ticket number e.g. RITM1000000") },
    async ({ ticketNumber }) => {
      const ticket = getSnowTicket(ticketNumber);
      if (!ticket) return { content: [{ type: "text", text: JSON.stringify({ error: "404", message: `Ticket ${ticketNumber} not found.` }) }] };
      return { content: [{ type: "text", text: JSON.stringify(ticket, null, 2) }] };
    }
  );

  // ---- List Tickets ----
  server.tool(
    "list_snow_tickets",
    "List all ServiceNow offboarding tickets in the mock instance.",
    {},
    async () => {
      const tickets = getAllSnowTickets();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            count: tickets.length,
            tickets: tickets.map((t) => ({
              number: t.number,
              state: t.state,
              priority: t.priority,
              affectedUser: t.affectedUser,
              shortDescription: t.shortDescription,
              createdAt: t.createdAt,
              azureTriggered: t.outboundRestTriggered,
              logicAppRunId: t.azureLogicAppRunId,
            })),
          }, null, 2),
        }],
      };
    }
  );

  // ---- Approve Ticket ----
  server.tool(
    "approve_snow_ticket",
    "Approve a ServiceNow offboarding ticket. This simulates the manager approving the request, which then fires the Outbound REST Message from ServiceNow to the Azure Logic App webhook — triggering the full automated offboarding runbook.",
    {
      ticketNumber: z.string().describe("ServiceNow ticket number"),
      approverName: z.string().optional().describe("Name of the approver (defaults to the manager)"),
    },
    async ({ ticketNumber, approverName }) => {
      const ticket = getSnowTicket(ticketNumber);
      if (!ticket) return { content: [{ type: "text", text: JSON.stringify({ error: "404", message: `Ticket ${ticketNumber} not found.` }) }] };
      if (ticket.state === "Resolved" || ticket.state === "Closed") {
        return { content: [{ type: "text", text: JSON.stringify({ error: "Conflict", message: `Ticket ${ticketNumber} is already ${ticket.state}.` }) }] };
      }

      approveTicket(ticketNumber, approverName ?? ticket.affectedUserManager);

      // Generate Azure Logic App run ID to simulate the webhook fire
      const logicAppRunId = `08585${Math.random().toString().slice(2, 18)}`;
      const runbookJobId = `job-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

      const outboundPayload = {
        employeeId: ticket.affectedUserId,
        employeeUpn: `${ticket.affectedUser.split(" ")[0].toLowerCase()}@M365x12345.onmicrosoft.com`,
        ticketNumber: ticket.number,
        ticketSysId: ticket.sysId,
        reason: ticket.reason,
        lastDayOfWork: ticket.lastDayOfWork,
        requestedBy: ticket.requestedBy,
        callbackUrl: `https://instance.service-now.com/api/now/table/sc_task/${ticket.sysId}`,
      };

      updateSnowTicket(ticketNumber, {
        outboundRestTriggered: true,
        outboundRestPayload: outboundPayload,
        outboundRestResponse: { status: 200, message: "Logic App triggered", runId: logicAppRunId },
        azureLogicAppRunId: logicAppRunId,
        azureRunbookJobId: runbookJobId,
        state: "In Progress",
      });

      addWorkNote(ticketNumber, "Azure Automation", `Outbound REST Message fired → Azure Logic App webhook.\nRun ID: ${logicAppRunId}\nRunbook Job: ${runbookJobId}`, "system");

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            message: `✅ Ticket approved — Azure automation pipeline triggered`,
            ticket: { number: ticket.number, state: "In Progress", approvedBy: approverName ?? ticket.affectedUserManager },
            azurePipeline: {
              logicAppRunId,
              runbookJobId,
              webhookUrl: `https://prod-xx.australiasoutheast.logic.azure.com/workflows/offboarding/triggers/manual/run`,
              outboundPayload,
            },
            nextStep: `Call run_complete_offboarding with userId '${ticket.affectedUserId}' to execute all Azure-side steps.`,
          }, null, 2),
        }],
      };
    }
  );

  // ---- Update Ticket from Azure ----
  server.tool(
    "update_snow_ticket_from_azure",
    "Called by Azure automation to write progress back to the ServiceNow ticket after each offboarding step completes. Simulates the Azure Runbook calling the ServiceNow REST API to update work notes.",
    {
      ticketNumber: z.string().describe("ServiceNow ticket number"),
      step: z.string().describe("Offboarding step that completed (e.g. 'Identity & Access')"),
      detail: z.string().describe("Detail message for the work note"),
      completed: z.boolean().optional().default(false).describe("Set true to mark ticket as Resolved"),
    },
    async ({ ticketNumber, step, detail, completed }) => {
      const ticket = getSnowTicket(ticketNumber);
      if (!ticket) return { content: [{ type: "text", text: JSON.stringify({ error: "404", message: `Ticket ${ticketNumber} not found.` }) }] };

      addWorkNote(ticketNumber, "Azure Automation Runbook", `[${step}] ${detail}`, "system");

      if (completed) {
        updateSnowTicket(ticketNumber, {
          state: "Resolved",
          resolvedAt: new Date().toISOString(),
        });
        addWorkNote(ticketNumber, "Azure Automation Runbook", "All offboarding steps completed successfully. Ticket resolved.", "activity");
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            ticketNumber,
            state: completed ? "Resolved" : "In Progress",
            noteAdded: `[${step}] ${detail}`,
            snowEndpoint: `PUT /api/now/table/sc_request/${ticket.sysId}`,
          }, null, 2),
        }],
      };
    }
  );
}
