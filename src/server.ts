// ============================================================
// Main Server Entry Point
//   • MCP server (stdio) — AI tool interface
//   • HTTP server (port 3000) — live dashboard + REST API
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { store } from "./state/store.js";
import { registerIdentityTools } from "./tools/identity.js";
import { registerTeamsTools } from "./tools/teams.js";
import { registerLicensingTools } from "./tools/licensing.js";
import { registerMailboxTools } from "./tools/mailbox.js";
import { registerAvdTools } from "./tools/avd.js";
import { registerHardwareTools } from "./tools/hardware.js";
import { registerPrinterTools } from "./tools/printer.js";
import { registerOrchestrationTools } from "./tools/orchestration.js";
import { registerServiceNowTools, getAllSnowTickets, getSnowTicket, resetSnowTickets, createSnowTicket, approveTicket, resolveSnowTicket, addWorkNote } from "./tools/servicenow.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---- 1. Create MCP Server ----
const server = new McpServer({
  name: "enterprise-offboarding-mock",
  version: "1.0.0",
});

// Register all tool groups
registerIdentityTools(server);
registerTeamsTools(server);
registerLicensingTools(server);
registerMailboxTools(server);
registerAvdTools(server);
registerHardwareTools(server);
registerPrinterTools(server);
registerOrchestrationTools(server);
registerServiceNowTools(server);

// ---- 2. HTTP Dashboard Server ----
const app = express();
app.use(express.json());

// Serve static dashboard files
const dashboardPath = join(__dirname, "..", "dashboard");
app.use(express.static(dashboardPath));

// REST API for dashboard polling
app.get("/api/users", (_req, res) => {
  res.json(store.getAllUsers().map((u) => ({
    id: u.id,
    displayName: u.displayName,
    userPrincipalName: u.userPrincipalName,
    jobTitle: u.jobTitle,
    department: u.department,
    officeLocation: u.officeLocation,
    status: u.status,
    accountEnabled: u.accountEnabled,
    licenseCount: u.licenses.length,
    teamsCallingEnabled: u.teamsConfig.enterpriseVoiceEnabled,
    phoneNumber: u.teamsConfig.phoneNumber,
    offboardingStarted: u.offboardingStarted,
    offboardingCompleted: u.offboardingCompleted,
    hardwarePendingReturn: u.hardware.filter((h) => h.status === "pending_return").length,
    checklist: store.getOffboardingTask(u.id)?.checklist ?? null,
  })));
});

app.get("/api/users/:id", (req, res) => {
  const user = store.getUser(req.params.id);
  if (!user) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(user);
});

app.get("/api/summary", (_req, res) => {
  res.json(store.getSummary());
});

app.get("/api/audit-log", (req, res) => {
  const userId = req.query.userId as string | undefined;
  const limit = parseInt(req.query.limit as string ?? "50", 10);
  const entries = store.getAuditLog(userId);
  res.json({ total: entries.length, entries: entries.slice(-limit) });
});

app.get("/api/offboarding-tasks", (_req, res) => {
  res.json(store.getAllOffboardingTasks());
});

// Helper — adds dashboard-friendly fields to a ticket object
function normalizeTicket(t: ReturnType<typeof getSnowTicket>) {
  if (!t) return t;
  const primaryApproval = t.approvals[0];
  return {
    ...t,
    employeeName: t.affectedUser,
    employeeEmail: t.requestedByEmail,
    approvalState: primaryApproval?.state ?? 'not_required',
    approvedBy: primaryApproval?.state === 'approved' ? primaryApproval.approver : null,
    approvedAt: primaryApproval?.respondedAt ?? null,
    workNotes: t.workNotes.map(n => ({ ...n, text: n.note })),
  };
}

app.get("/api/snow/tickets", (_req, res) => {
  res.json({ tickets: getAllSnowTickets().map(t => normalizeTicket(t)) });
});

app.get("/api/snow/tickets/:number", (req, res) => {
  const ticket = getSnowTicket(req.params.number);
  if (!ticket) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(normalizeTicket(ticket));
});

app.post("/api/snow/tickets", (req, res) => {
  const { employeeId, reason, requestedBy } = req.body as { employeeId?: string; reason?: string; requestedBy?: string };
  if (!employeeId) { res.status(400).json({ error: "employeeId is required" }); return; }
  try {
    const ticket = createSnowTicket(employeeId, reason ?? "Resignation", requestedBy ?? "IT Admin");
    res.json({ success: true, ticket: normalizeTicket(ticket) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(404).json({ error: msg });
  }
});

app.post("/api/snow/tickets/:number/approve", (req, res) => {
  const ticket = getSnowTicket(req.params.number);
  if (!ticket) { res.status(404).json({ error: "Not Found" }); return; }
  // Approve using the first pending approval's approver name, or the passed-in approver
  const firstApproval = ticket.approvals.find(a => a.state === "requested");
  const approver = firstApproval?.approver ?? ((req.body as { approver?: string })?.approver ?? "IT Admin");
  approveTicket(req.params.number, approver);
  res.json({ success: true, ticket: normalizeTicket(getSnowTicket(req.params.number)) });
});

app.post("/api/snow/tickets/:number/work-note", (req, res) => {
  const ticket = getSnowTicket(req.params.number);
  if (!ticket) { res.status(404).json({ error: "Not Found" }); return; }
  const { author, note, type } = req.body as { author?: string; note?: string; type?: "work_note" | "activity" | "system" };
  addWorkNote(req.params.number, author ?? "System", note ?? "", type ?? "work_note");
  res.json({ success: true, ticket: normalizeTicket(getSnowTicket(req.params.number)) });
});

app.post("/api/snow/tickets/:number/resolve", (req, res) => {
  const ticket = getSnowTicket(req.params.number);
  if (!ticket) { res.status(404).json({ error: "Not Found" }); return; }
  const { completedBy, resolution, jobId } = req.body as { completedBy?: string; resolution?: string; jobId?: string };
  resolveSnowTicket(req.params.number, completedBy ?? "Azure Automation", resolution ?? "Offboarding completed.", jobId ?? "");
  res.json({ success: true, ticket: normalizeTicket(getSnowTicket(req.params.number)) });
});

app.post("/api/reset", (_req, res) => {
  store.reset();
  resetSnowTickets();
  res.json({ success: true, message: "State reset to initial mock data" });
});

// ---- 3. Start Both Servers ----
const HTTP_PORT = parseInt(process.env.PORT ?? "3000", 10);

app.listen(HTTP_PORT, () => {
  process.stderr.write(`[offboarding-mcp] Dashboard: http://localhost:${HTTP_PORT}\n`);
  process.stderr.write(`[offboarding-mcp] API:       http://localhost:${HTTP_PORT}/api/summary\n`);
});

// Connect MCP server via stdio
const transport = new StdioServerTransport();
await server.connect(transport);

process.stderr.write("[offboarding-mcp] MCP server ready on stdio\n");
