// ============================================================
// Hardware Discovery Tools — CMDB / Asset Management
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { store } from "../state/store.js";

const randomDuration = (min = 200, max = 1000) =>
  Math.floor(Math.random() * (max - min) + min);

export function registerHardwareTools(server: McpServer) {
  // ---- Discover User Hardware ----
  server.tool(
    "discover_user_hardware",
    "Discover all hardware assets assigned to a user from the CMDB (Configuration Management Database). Returns laptops, phones, monitors, and accessories with serial numbers, asset tags, and current status.",
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
              assetCount: user.hardware.length,
              assets: user.hardware,
              cmdbSource: "ServiceNow CMDB — Table: cmdb_ci_computer / cmdb_ci_cell_phone",
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Generate Return Shipment ----
  server.tool(
    "generate_return_shipment",
    "Generate a pre-paid hardware return shipment/ticket for a departing user. Creates a ServiceNow incident, generates a return label, and instructions for shipping hardware back from the user's office location.",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }

      const assignedHardware = user.hardware.filter((h) => h.status === "assigned");
      if (assignedHardware.length === 0) {
        return { content: [{ type: "text", text: JSON.stringify({ success: true, message: `ℹ️ No hardware assigned to ${user.displayName}.`, skipped: true }) }] };
      }

      const t = randomDuration(500, 1400);
      const ticketNumber = `INC${Math.floor(Math.random() * 9000000 + 1000000)}`;
      const trackingNumber = `1Z${Math.random().toString(36).toUpperCase().slice(2, 16)}`;

      assignedHardware.forEach((h) => {
        h.status = "pending_return";
        h.returnTicket = ticketNumber;
      });
      store.updateUser(user.id, { hardware: user.hardware });

      store.addAuditEntry(user.id, user.displayName, "GENERATE_RETURN_SHIPMENT", "Hardware",
        `Return ticket ${ticketNumber} generated for ${assignedHardware.length} asset(s). Tracking: ${trackingNumber}`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Hardware return ticket generated for ${user.displayName}`,
              ticket: {
                number: ticketNumber,
                state: "Open",
                priority: "3 - Moderate",
                assignedTo: "IT Asset Management",
                shortDescription: `Hardware return - ${user.displayName} offboarding`,
              },
              returnShipment: {
                trackingNumber,
                carrier: "UPS",
                preLabelUrl: `https://mock-labels.contoso.com/return/${ticketNumber}.pdf`,
                instructions: `Please pack items securely and drop off at any UPS location. Ship to: IT Asset Returns, 100 Corporate Dr, ${user.officeLocation}.`,
              },
              itemsToReturn: assignedHardware.map((h) => ({ type: h.type, make: h.make, model: h.model, serial: h.serialNumber, assetTag: h.assetTag })),
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Mark Hardware Returned ----
  server.tool(
    "mark_hardware_returned",
    "Mark one or all hardware items for a user as received/returned in the CMDB. Updates asset status and closes the return ticket.",
    {
      userId: z.string().describe("User ID, UPN, or display name"),
      assetTag: z.string().optional().describe("Specific asset tag to mark as returned. If omitted, all pending items are marked returned."),
    },
    async ({ userId, assetTag }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }

      const items = assetTag
        ? user.hardware.filter((h) => h.assetTag === assetTag)
        : user.hardware.filter((h) => h.status === "pending_return");

      if (items.length === 0) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "NotFound", message: "No pending return items found." }) }] };
      }

      const t = randomDuration(200, 600);
      items.forEach((h) => (h.status = "returned"));
      store.updateUser(user.id, { hardware: user.hardware });

      store.addAuditEntry(user.id, user.displayName, "HARDWARE_RETURNED", "Hardware",
        `Hardware received: ${items.map((h) => `${h.type} (${h.assetTag})`).join(", ")}`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ ${items.length} hardware item(s) marked as returned`,
              returnedItems: items.map((h) => ({ type: h.type, assetTag: h.assetTag, serial: h.serialNumber })),
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Update Hardware Status ----
  server.tool(
    "update_hardware_status",
    "Update the status of a specific hardware asset in the CMDB. Used for recording disposal, repair, or reassignment.",
    {
      userId: z.string().describe("User ID, UPN, or display name"),
      assetTag: z.string().describe("Asset tag of the hardware item"),
      newStatus: z.enum(["assigned", "pending_return", "returned"]).describe("New status for the asset"),
    },
    async ({ userId, assetTag, newStatus }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }

      const item = user.hardware.find((h) => h.assetTag === assetTag);
      if (!item) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "NotFound", message: `Asset tag '${assetTag}' not found for this user.` }) }] };
      }

      const oldStatus = item.status;
      item.status = newStatus;
      store.updateUser(user.id, { hardware: user.hardware });

      store.addAuditEntry(user.id, user.displayName, "UPDATE_HARDWARE_STATUS", "Hardware",
        `Asset ${assetTag} (${item.type}) status changed: ${oldStatus} → ${newStatus}`, "success", 150);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Asset ${assetTag} updated: ${oldStatus} → ${newStatus}`,
              asset: item,
            }, null, 2),
          },
        ],
      };
    }
  );
}
