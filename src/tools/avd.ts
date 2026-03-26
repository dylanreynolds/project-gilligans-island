// ============================================================
// AVD Tools — Azure Virtual Desktop
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { store } from "../state/store.js";

const randomDuration = (min = 300, max = 1800) =>
  Math.floor(Math.random() * (max - min) + min);

export function registerAvdTools(server: McpServer) {
  // ---- Get AVD Assignments ----
  server.tool(
    "get_avd_assignments",
    "Get all Azure Virtual Desktop host pool and application group assignments for a user. Shows active sessions and workspace access.",
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
              assignmentCount: user.avdAssignments.length,
              assignments: user.avdAssignments,
              azureEndpoint: `GET /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.DesktopVirtualization/hostPools/{hostpool}/userSessionHosts`,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Get Active AVD Sessions ----
  server.tool(
    "get_active_avd_sessions",
    "List all currently active Azure Virtual Desktop sessions for a user across all host pools. Identifies sessions that need to be disconnected before removing access.",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }

      const activeSessions = user.avdAssignments
        .filter((a) => a.sessionStatus === "active" && a.activeSessions > 0)
        .map((a) => ({
          hostPoolName: a.hostPoolName,
          sessionHostName: `avd-host-${a.hostPoolId}-001.M365x12345.onmicrosoft.com`,
          sessionId: Math.floor(Math.random() * 9000 + 1000),
          userPrincipalName: user.userPrincipalName,
          sessionState: "Active",
          applicationType: "Desktop",
          createTime: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString(),
        }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              userId: user.id,
              displayName: user.displayName,
              activeSessionCount: activeSessions.length,
              sessions: activeSessions,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Disconnect AVD Sessions ----
  server.tool(
    "disconnect_avd_sessions",
    "Force disconnect all active Azure Virtual Desktop sessions for a user. Sends a 2-minute warning to the user before terminating sessions. Equivalent to Remove-AzWvdUserSession.",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }

      const hadActiveSessions = user.avdAssignments.filter((a) => a.sessionStatus === "active" && a.activeSessions > 0);
      if (hadActiveSessions.length === 0) {
        return { content: [{ type: "text", text: JSON.stringify({ success: true, message: `ℹ️ No active AVD sessions for ${user.displayName}.`, skipped: true }) }] };
      }

      const t = randomDuration(500, 2500);
      user.avdAssignments.forEach((a) => {
        a.activeSessions = 0;
        a.sessionStatus = "disconnected";
      });
      store.updateUser(user.id, { avdAssignments: user.avdAssignments });

      store.addAuditEntry(user.id, user.displayName, "DISCONNECT_AVD_SESSIONS", "AVD",
        `Disconnected ${hadActiveSessions.length} active session(s) across: ${hadActiveSessions.map((a) => a.hostPoolName).join(", ")}`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Disconnected ${hadActiveSessions.length} AVD session(s) for ${user.displayName}`,
              disconnectedPools: hadActiveSessions.map((a) => a.hostPoolName),
              psCommand: `Get-AzWvdUserSession -HostPoolName "{name}" -ResourceGroupName "{rg}" | Where-Object {$_.UserPrincipalName -eq "${user.userPrincipalName}"} | Remove-AzWvdUserSession`,
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Remove AVD Access ----
  server.tool(
    "remove_avd_access",
    "Remove a user from all Azure Virtual Desktop host pools and application groups. Prevents future sign-in to any AVD workspace. Equivalent to Remove-AzRoleAssignment for WVD application groups.",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }

      const activeAssignments = user.avdAssignments.filter((a) => a.sessionStatus !== "removed");
      if (activeAssignments.length === 0) {
        return { content: [{ type: "text", text: JSON.stringify({ success: true, message: `ℹ️ ${user.displayName} already removed from all AVD host pools.`, skipped: true }) }] };
      }

      const t = randomDuration(400, 1500);
      user.avdAssignments.forEach((a) => (a.sessionStatus = "removed"));
      store.updateUser(user.id, { avdAssignments: user.avdAssignments });

      store.addAuditEntry(user.id, user.displayName, "REMOVE_AVD_ACCESS", "AVD",
        `Removed from ${activeAssignments.length} AVD assignment(s): ${activeAssignments.map((a) => a.hostPoolName).join(", ")}`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Removed ${user.displayName} from ${activeAssignments.length} AVD host pool(s)`,
              removedPools: activeAssignments.map((a) => ({
                hostPoolName: a.hostPoolName,
                applicationGroupName: a.applicationGroupName,
                workspace: a.workspace,
              })),
              psCommand: `Remove-AzRoleAssignment -SignInName "${user.userPrincipalName}" -RoleDefinitionName "Desktop Virtualization User" -ResourceGroupName "{rg}"`,
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );
}
