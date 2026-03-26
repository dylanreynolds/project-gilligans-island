// ============================================================
// Licensing Tools — O365 / M365 license management
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { store } from "../state/store.js";
import { LICENSE_CATALOG } from "../data/mockData.js";

const randomDuration = (min = 300, max = 1500) =>
  Math.floor(Math.random() * (max - min) + min);

export function registerLicensingTools(server: McpServer) {
  // ---- Get User Licenses ----
  server.tool(
    "get_user_licenses",
    "List all Microsoft 365 licenses currently assigned to a user. Equivalent to GET /v1.0/users/{id}/licenseDetails.",
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
              licenseCount: user.licenses.length,
              licenses: user.licenses,
              graphEndpoint: `GET /v1.0/users/${user.id}/licenseDetails`,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Remove All Licenses ----
  server.tool(
    "remove_all_licenses",
    "Remove all Microsoft 365 and Azure AD licenses from a user. This disables access to all M365 services (Exchange, Teams, SharePoint, etc.). Equivalent to POST /v1.0/users/{id}/assignLicense with empty addLicenses and all skuIds in removeLicenses.",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }
      if (user.licenses.length === 0) {
        return { content: [{ type: "text", text: JSON.stringify({ success: true, message: `ℹ️ ${user.displayName} has no licenses to remove.`, skipped: true }) }] };
      }

      const t = randomDuration(500, 1500);
      const removedLicenses = [...user.licenses];
      const removedSkuIds = removedLicenses.map((l) => l.skuId);

      store.updateUser(user.id, { licenses: [] });
      store.addAuditEntry(user.id, user.displayName, "REMOVE_ALL_LICENSES", "Licensing",
        `Removed ${removedLicenses.length} license(s): ${removedLicenses.map((l) => l.displayName).join(", ")}`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Removed ${removedLicenses.length} license(s) from ${user.displayName}`,
              graphEndpoint: `POST /v1.0/users/${user.id}/assignLicense`,
              payload: { addLicenses: [], removeLicenses: removedSkuIds },
              removedLicenses: removedLicenses.map((l) => ({ displayName: l.displayName, skuPartNumber: l.skuPartNumber, skuId: l.skuId })),
              simulatedLatencyMs: t,
              note: "Access to all M365 services will be revoked within 24 hours.",
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Remove Specific License ----
  server.tool(
    "remove_specific_license",
    "Remove a specific Microsoft 365 license SKU from a user. Use when you need to remove only one license (e.g. Teams Phone) while keeping others (e.g. E5).",
    {
      userId: z.string().describe("User ID, UPN, or display name"),
      skuId: z.string().optional().describe("License SKU ID to remove"),
      skuPartNumber: z.string().optional().describe("License SKU part number (e.g. MCOEV, ENTERPRISEPREMIUM)"),
    },
    async ({ userId, skuId, skuPartNumber }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }
      if (!skuId && !skuPartNumber) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "BadRequest", message: "Provide either skuId or skuPartNumber." }) }] };
      }

      const license = user.licenses.find(
        (l) => (skuId && l.skuId === skuId) || (skuPartNumber && l.skuPartNumber.toLowerCase() === skuPartNumber.toLowerCase())
      );
      if (!license) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "NotFound", message: `License '${skuId ?? skuPartNumber}' not assigned to this user.` }) }] };
      }

      const t = randomDuration(300, 900);
      store.updateUser(user.id, { licenses: user.licenses.filter((l) => l.skuId !== license.skuId) });
      store.addAuditEntry(user.id, user.displayName, "REMOVE_LICENSE", "Licensing",
        `Removed license: ${license.displayName} (${license.skuPartNumber})`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Removed license '${license.displayName}' from ${user.displayName}`,
              removedLicense: license,
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Check License Availability ----
  server.tool(
    "check_license_availability",
    "Check the number of available (unassigned) licenses in the tenant for each SKU. Useful for new hire provisioning — confirms a license is available before assigning.",
    {},
    async () => {
      const users = store.getAllUsers();
      const assigned: Record<string, number> = {};
      users.forEach((u) => u.licenses.forEach((l) => { assigned[l.skuPartNumber] = (assigned[l.skuPartNumber] ?? 0) + 1; }));

      const pool = { E5: 25, TEAMS_CALLING: 25, AUDIO_CONF: 25, INTUNE: 25 };
      const report = Object.entries(LICENSE_CATALOG).map(([key, meta]) => ({
        displayName: meta.displayName,
        skuPartNumber: meta.skuPartNumber,
        skuId: meta.skuId,
        totalInPool: pool[key as keyof typeof pool] ?? 0,
        assigned: assigned[meta.skuPartNumber] ?? 0,
        available: (pool[key as keyof typeof pool] ?? 0) - (assigned[meta.skuPartNumber] ?? 0),
      }));

      return {
        content: [{ type: "text", text: JSON.stringify({ tenantId: "M365x12345", licenses: report }, null, 2) }],
      };
    }
  );

  // ---- Assign License (New Hire) ----
  server.tool(
    "assign_license",
    "Assign a Microsoft 365 license to a user (e.g. for a new hire). Equivalent to POST /v1.0/users/{id}/assignLicense.",
    {
      userId: z.string().describe("User ID, UPN, or display name"),
      skuPartNumber: z.string().describe("License SKU part number to assign (e.g. ENTERPRISEPREMIUM, MCOEV, MCOMEETADV)"),
    },
    async ({ userId, skuPartNumber }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }

      const licenseMeta = Object.values(LICENSE_CATALOG).find(
        (l) => l.skuPartNumber.toLowerCase() === skuPartNumber.toLowerCase()
      );
      if (!licenseMeta) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "NotFound", message: `Unknown SKU '${skuPartNumber}'. Valid options: ${Object.values(LICENSE_CATALOG).map((l) => l.skuPartNumber).join(", ")}` }) }] };
      }
      if (user.licenses.find((l) => l.skuId === licenseMeta.skuId)) {
        return { content: [{ type: "text", text: JSON.stringify({ success: true, message: `ℹ️ ${user.displayName} already has ${licenseMeta.displayName}.`, skipped: true }) }] };
      }

      const t = randomDuration(400, 1200);
      const newLicense = { ...licenseMeta, assignedDateTime: new Date().toISOString() };
      user.licenses.push(newLicense);
      store.updateUser(user.id, { licenses: user.licenses });

      store.addAuditEntry(user.id, user.displayName, "ASSIGN_LICENSE", "Licensing",
        `Assigned license: ${licenseMeta.displayName} (${licenseMeta.skuPartNumber})`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Assigned '${licenseMeta.displayName}' to ${user.displayName}`,
              license: newLicense,
              graphEndpoint: `POST /v1.0/users/${user.id}/assignLicense`,
              payload: { addLicenses: [{ skuId: licenseMeta.skuId }], removeLicenses: [] },
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );
}
