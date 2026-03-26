// ============================================================
// Identity & Access Tools — Entra ID / Azure AD operations
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { store } from "../state/store.js";

const randomDuration = (min = 200, max = 1200) =>
  Math.floor(Math.random() * (max - min) + min);

export function registerIdentityTools(server: McpServer) {
  // ---- List Users ----
  server.tool(
    "list_users",
    "List all users in the mock Entra ID tenant with their current status. Returns id, displayName, department, status, and accountEnabled.",
    {
      statusFilter: z
        .enum(["all", "active", "offboarding", "offboarded"])
        .optional()
        .default("all")
        .describe("Filter by offboarding status"),
    },
    async ({ statusFilter }) => {
      const users = store
        .getAllUsers()
        .filter((u) => statusFilter === "all" || u.status === statusFilter)
        .map((u) => ({
          id: u.id,
          displayName: u.displayName,
          userPrincipalName: u.userPrincipalName,
          jobTitle: u.jobTitle,
          department: u.department,
          officeLocation: u.officeLocation,
          accountEnabled: u.accountEnabled,
          status: u.status,
          licenseCount: u.licenses.length,
          hasTeamsCalling: u.teamsConfig.enterpriseVoiceEnabled,
        }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ count: users.length, users }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Get User ----
  server.tool(
    "get_user",
    "Get full user profile from Entra ID including licenses, Teams config, hardware, and group memberships. Accepts user ID, UPN, display name, or email.",
    { userId: z.string().describe("User ID, UPN, display name, or email") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return {
          content: [
            { type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' does not exist in this tenant.` }) },
          ],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(user, null, 2) }],
      };
    }
  );

  // ---- Disable User Account ----
  server.tool(
    "disable_user_account",
    "Disable a user account in Entra ID (sets accountEnabled=false). This blocks all sign-ins immediately. Equivalent to PATCH /v1.0/users/{id} with accountEnabled:false.",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }
      const t = randomDuration();
      store.updateUser(user.id, { accountEnabled: false });
      store.addAuditEntry(user.id, user.displayName, "DISABLE_ACCOUNT", "Identity", `Account disabled — all sign-ins blocked. PATCH /v1.0/users/${user.id}`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Account disabled for ${user.displayName}`,
              graphEndpoint: `PATCH /v1.0/users/${user.id}`,
              payload: { accountEnabled: false },
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Revoke All Sessions ----
  server.tool(
    "revoke_user_sessions",
    "Revoke all active refresh tokens and sign-in sessions for a user. Equivalent to POST /v1.0/users/{id}/revokeSignInSessions. Forces re-authentication on all devices.",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }
      const t = randomDuration(300, 900);
      store.updateUser(user.id, { sessionsRevoked: true });
      store.addAuditEntry(user.id, user.displayName, "REVOKE_SESSIONS", "Identity", `All refresh tokens invalidated. POST /v1.0/users/${user.id}/revokeSignInSessions`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ All sessions revoked for ${user.displayName}`,
              graphEndpoint: `POST /v1.0/users/${user.id}/revokeSignInSessions`,
              simulatedLatencyMs: t,
              note: "User will be prompted to sign in on all devices. Propagation takes up to 1 minute in production.",
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Remove Group Memberships ----
  server.tool(
    "remove_group_memberships",
    "Remove a user from all security groups and Microsoft 365 groups in Entra ID. Equivalent to DELETE /v1.0/groups/{groupId}/members/{userId}. Removes access to shared resources, SharePoint sites, and Teams.",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }

      const activeGroups = user.groupMemberships.filter((g) => !g.removed);
      const t = randomDuration(400, 1400);

      user.groupMemberships.forEach((g) => (g.removed = true));
      store.updateUser(user.id, { groupMemberships: user.groupMemberships });

      store.addAuditEntry(user.id, user.displayName, "REMOVE_GROUPS", "Identity",
        `Removed from ${activeGroups.length} groups: ${activeGroups.map((g) => g.displayName).join(", ")}`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Removed ${user.displayName} from ${activeGroups.length} groups`,
              removedGroups: activeGroups.map((g) => ({ id: g.id, displayName: g.displayName, type: g.type })),
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Remove Role Assignments ----
  server.tool(
    "remove_role_assignments",
    "Remove all Azure AD directory role assignments and Azure RBAC role assignments for a user. Critical for privileged users with admin roles.",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }

      const activeRoles = user.roleAssignments.filter((r) => !r.removed);
      const t = randomDuration(300, 900);

      if (activeRoles.length === 0) {
        return {
          content: [
            { type: "text", text: JSON.stringify({ success: true, message: `ℹ️ ${user.displayName} has no admin role assignments to remove.`, simulatedLatencyMs: t }) },
          ],
        };
      }

      user.roleAssignments.forEach((r) => (r.removed = true));
      store.updateUser(user.id, { roleAssignments: user.roleAssignments });

      store.addAuditEntry(user.id, user.displayName, "REMOVE_ROLES", "Identity",
        `Removed ${activeRoles.length} role(s): ${activeRoles.map((r) => r.displayName).join(", ")}`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Removed ${activeRoles.length} role assignment(s) from ${user.displayName}`,
              removedRoles: activeRoles,
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Reset Password ----
  server.tool(
    "reset_user_password",
    "Force-reset user password to a random value and flag mustChangePasswordOnNextLogin=false (since account is being disabled). Ensures no residual shared-credential access.",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }
      const t = randomDuration(200, 700);
      const newPassword = `Ob!${Math.random().toString(36).slice(2, 10).toUpperCase()}@${Date.now().toString(36)}`;
      store.updateUser(user.id, { passwordReset: true });
      store.addAuditEntry(user.id, user.displayName, "RESET_PASSWORD", "Identity",
        `Password reset via PATCH /v1.0/users/${user.id}. New credential not shared — account disabled.`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Password reset for ${user.displayName}`,
              graphEndpoint: `PATCH /v1.0/users/${user.id}`,
              newPassword,
              note: "Password randomised and not distributed — account is disabled. For rotation policy compliance only.",
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );
}
