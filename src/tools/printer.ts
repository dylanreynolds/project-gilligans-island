// ============================================================
// Printer Access Tools — Print Server / Universal Print
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { store } from "../state/store.js";
import { PRINTER_CATALOG } from "../data/mockData.js";

const randomDuration = (min = 150, max = 700) =>
  Math.floor(Math.random() * (max - min) + min);

export function registerPrinterTools(server: McpServer) {
  // ---- List Available Printers ----
  server.tool(
    "list_printers",
    "List all network printers and print queues available in the tenant via Microsoft Universal Print. Equivalent to GET /v1.0/print/printers.",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              totalPrinters: PRINTER_CATALOG.length,
              graphEndpoint: "GET /v1.0/print/printers",
              printers: PRINTER_CATALOG.map((p) => ({
                id: p.id,
                displayName: p.name,
                location: p.location,
                securityGroup: p.group,
                status: "online",
                capabilities: ["duplex", "color", "staple"],
              })),
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Get Printer Assignments ----
  server.tool(
    "get_printer_assignments",
    "Get all printer queue assignments for a specific user. Returns which printers they have access to via Universal Print security groups.",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              userId: user.id,
              displayName: user.displayName,
              officeLocation: user.officeLocation,
              printerCount: user.printerAssignments.length,
              assignments: user.printerAssignments,
              graphEndpoint: `GET /v1.0/print/printers/{printerId}/shares`,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Remove Printer Access ----
  server.tool(
    "remove_printer_access",
    "Remove a user from all Universal Print security groups and printer shares. Prevents printing on any networked printer. Equivalent to DELETE /v1.0/groups/{groupId}/members/{userId} for each printer security group.",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }

      const activeAssignments = user.printerAssignments.filter((p) => !p.removed);
      if (activeAssignments.length === 0) {
        return { content: [{ type: "text", text: JSON.stringify({ success: true, message: `ℹ️ ${user.displayName} has no active printer assignments.`, skipped: true }) }] };
      }

      const t = randomDuration();
      user.printerAssignments.forEach((p) => (p.removed = true));
      store.updateUser(user.id, { printerAssignments: user.printerAssignments });

      store.addAuditEntry(user.id, user.displayName, "REMOVE_PRINTER_ACCESS", "Printer Access",
        `Removed from ${activeAssignments.length} printer group(s): ${activeAssignments.map((p) => p.printerName).join(", ")}`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Removed ${user.displayName} from ${activeAssignments.length} printer(s)`,
              removedFrom: activeAssignments.map((p) => ({
                printerName: p.printerName,
                location: p.location,
                securityGroup: p.securityGroup,
              })),
              graphEndpoints: activeAssignments.map((p) =>
                `DELETE /v1.0/groups/{${p.securityGroup}}/members/${user.id}/$ref`
              ),
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Reassign Printer (New Hire) ----
  server.tool(
    "assign_printer_access",
    "Assign a user to a printer security group, granting access to a specific network printer. Used during new hire onboarding. Equivalent to POST /v1.0/groups/{groupId}/members/$ref.",
    {
      userId: z.string().describe("User ID, UPN, or display name"),
      printerId: z.string().describe("Printer ID from list_printers (e.g. prn-001)"),
    },
    async ({ userId, printerId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }
      const printer = PRINTER_CATALOG.find((p) => p.id === printerId);
      if (!printer) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `Printer '${printerId}' not found. Call list_printers to see available IDs.` }) }] };
      }

      const existing = user.printerAssignments.find((p) => p.printerId === printerId);
      if (existing && !existing.removed) {
        return { content: [{ type: "text", text: JSON.stringify({ success: true, message: `ℹ️ ${user.displayName} already has access to ${printer.name}.`, skipped: true }) }] };
      }

      const t = randomDuration();
      if (existing) {
        existing.removed = false;
      } else {
        user.printerAssignments.push({
          printerId: printer.id,
          printerName: printer.name,
          location: printer.location,
          securityGroup: printer.group,
          assignedDate: new Date().toISOString().split("T")[0],
          removed: false,
        });
      }
      store.updateUser(user.id, { printerAssignments: user.printerAssignments });

      store.addAuditEntry(user.id, user.displayName, "ASSIGN_PRINTER_ACCESS", "Printer Access",
        `Assigned to printer: ${printer.name} (${printer.location}) via group ${printer.group}`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Printer access granted: ${user.displayName} → ${printer.name}`,
              printer: { id: printer.id, name: printer.name, location: printer.location },
              graphEndpoint: `POST /v1.0/groups/{${printer.group}}/members/$ref`,
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );
}
