// ============================================================
// Teams & Telephony Tools — Teams Calling / Voice offboarding
// Also handles new-hire voicemail setup
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { store } from "../state/store.js";

const randomDuration = (min = 300, max = 1800) =>
  Math.floor(Math.random() * (max - min) + min);

export function registerTeamsTools(server: McpServer) {
  // ---- Get Teams Profile ----
  server.tool(
    "get_teams_profile",
    "Get the Microsoft Teams and Teams Calling configuration for a user, including phone number, voice routing policy, Enterprise Voice status, and voicemail settings.",
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
              teamsConfig: user.teamsConfig,
              graphEndpoints: {
                userDetail: `GET /v1.0/users/${user.id}`,
                teamsCallSettings: `GET /v1.0/users/${user.id}/teamwork/associatedTeams`,
              },
              pstnNote: "Phone number assignment managed via Teams Admin Center or Set-CsUser PowerShell cmdlet.",
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Disable Enterprise Voice ----
  server.tool(
    "disable_teams_calling",
    "Disable Enterprise Voice for a user in Microsoft Teams Phone. Removes voice routing policies, clears the calling policy, and disables the phone system. Real-world equivalent: Set-CsUser -EnterpriseVoiceEnabled $false -HostedVoiceMail $false",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }

      if (!user.teamsConfig.enterpriseVoiceEnabled) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, message: `ℹ️ Enterprise Voice already disabled for ${user.displayName}.`, skipped: true }) }],
        };
      }

      const t = randomDuration(800, 2200);
      const previousConfig = { ...user.teamsConfig };

      user.teamsConfig.enterpriseVoiceEnabled = false;
      user.teamsConfig.voiceRoutingPolicy = null;
      user.teamsConfig.callingPolicy = null;
      user.teamsConfig.dialPlan = null;
      store.updateUser(user.id, { teamsConfig: user.teamsConfig });

      store.addAuditEntry(user.id, user.displayName, "DISABLE_ENTERPRISE_VOICE", "Teams & Calling",
        `Enterprise Voice disabled. Removed voice routing policy '${previousConfig.voiceRoutingPolicy}' and calling policy '${previousConfig.callingPolicy}'.`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Enterprise Voice disabled for ${user.displayName}`,
              pstnCommand: `Set-CsUser -Identity "${user.userPrincipalName}" -EnterpriseVoiceEnabled $false -HostedVoiceMail $false`,
              removedPolicies: {
                voiceRoutingPolicy: previousConfig.voiceRoutingPolicy,
                callingPolicy: previousConfig.callingPolicy,
                dialPlan: previousConfig.dialPlan,
              },
              simulatedLatencyMs: t,
              note: "In production, policy de-provisioning may take 5–10 minutes to propagate across all Teams clients.",
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Remove Phone Number ----
  server.tool(
    "remove_phone_number",
    "Unassign the Direct Routing or Calling Plan phone number from a user and return it to the available number pool. Real-world equivalent: Set-CsUser -LineUri $null. This number can then be reassigned to a new hire.",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }

      const previousNumber = user.teamsConfig.phoneNumber;
      const previousLineUri = user.teamsConfig.lineUri;

      if (!previousNumber) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, message: `ℹ️ No phone number assigned to ${user.displayName}.`, skipped: true }) }],
        };
      }

      const t = randomDuration(600, 1800);
      user.teamsConfig.phoneNumber = null;
      user.teamsConfig.lineUri = null;
      store.updateUser(user.id, { teamsConfig: user.teamsConfig });

      store.addAuditEntry(user.id, user.displayName, "REMOVE_PHONE_NUMBER", "Teams & Calling",
        `Phone number ${previousNumber} (${previousLineUri}) unassigned and returned to pool.`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Phone number unassigned from ${user.displayName}`,
              releasedNumber: previousNumber,
              releasedLineUri: previousLineUri,
              pstnCommand: `Set-CsUser -Identity "${user.userPrincipalName}" -LineUri $null`,
              numberStatus: "RETURNED_TO_POOL — available for new hire assignment",
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Set Call Forwarding ----
  server.tool(
    "set_call_forwarding",
    "Configure temporary call forwarding for a departing user so inbound calls route to their manager during the transition period. Real-world equivalent: Set-CsUserCallForwardingSettings.",
    {
      userId: z.string().describe("User ID, UPN, or display name of the departing user"),
      forwardToUserId: z.string().optional().describe("User ID or display name of the manager to forward to (defaults to the user's manager)"),
    },
    async ({ userId, forwardToUserId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }

      // Resolve forward-to target
      let targetName = user.managerName;
      let targetUpn = `manager-${user.managerId}@M365x12345.onmicrosoft.com`;
      if (forwardToUserId) {
        const fwdUser = store.getUser(forwardToUserId);
        if (fwdUser) {
          targetName = fwdUser.displayName;
          targetUpn = fwdUser.userPrincipalName;
        }
      } else {
        const manager = store.getUser(user.managerId);
        if (manager) {
          targetName = manager.displayName;
          targetUpn = manager.userPrincipalName;
        }
      }

      const t = randomDuration(400, 1200);
      user.teamsConfig.callForwardingTarget = targetUpn;
      store.updateUser(user.id, { teamsConfig: user.teamsConfig });

      store.addAuditEntry(user.id, user.displayName, "SET_CALL_FORWARDING", "Teams & Calling",
        `Call forwarding configured → ${targetName} (${targetUpn})`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Call forwarding set for ${user.displayName} → ${targetName}`,
              forwardingTarget: { name: targetName, upn: targetUpn },
              pstnCommand: `Set-CsUserCallForwardingSettings -Identity "${user.userPrincipalName}" -IsForwardingEnabled $true -ForwardingTarget "${targetUpn}" -ForwardingTargetType SingleTarget`,
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Configure Offboarding Voicemail ----
  server.tool(
    "configure_offboarding_voicemail",
    "Set a professional offboarding voicemail greeting informing callers that the employee has left and redirecting them to the appropriate contact. Updates Exchange Online Unified Messaging / Teams voicemail.",
    {
      userId: z.string().describe("User ID, UPN, or display name"),
      customMessage: z.string().optional().describe("Custom voicemail message (optional — a default message will be generated)"),
    },
    async ({ userId, customMessage }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }

      const manager = store.getUser(user.managerId);
      const managerName = manager?.displayName ?? user.managerName;
      const defaultMessage = `You have reached the voicemail of ${user.displayName}, who is no longer with our organisation. ` +
        `For immediate assistance, please contact ${managerName} or email ${manager?.mail ?? "helpdesk@company.com"}. Thank you.`;

      const message = customMessage ?? defaultMessage;
      const t = randomDuration(500, 1200);

      store.addAuditEntry(user.id, user.displayName, "CONFIGURE_VOICEMAIL", "Teams & Calling",
        `Offboarding voicemail greeting configured. Redirects callers to ${managerName}.`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Voicemail greeting updated for ${user.displayName}`,
              voicemailMessage: message,
              graphEndpoint: `PATCH /v1.0/users/${user.id}/mailboxSettings`,
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- New Hire — Assign Phone Number ----
  server.tool(
    "assign_phone_number",
    "Assign a phone number and voice policies to a new hire, enabling Teams Calling. This is the new-hire counterpart to remove_phone_number. Simulates assigning a number from the available pool.",
    {
      userId: z.string().describe("User ID, UPN, or display name of the new hire"),
      phoneNumber: z.string().optional().describe("Phone number to assign (e.g. +1 425 555 0199). If omitted, one is auto-selected from the pool."),
    },
    async ({ userId, phoneNumber }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }
      if (user.teamsConfig.phoneNumber) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Conflict", message: `User already has phone number ${user.teamsConfig.phoneNumber}. Remove it first.` }) }],
        };
      }

      const assignedNumber = phoneNumber ?? `+1 ${Math.floor(Math.random() * 900 + 100)} 555 ${Math.floor(Math.random() * 9000 + 1000)}`;
      const t = randomDuration(700, 2000);

      user.teamsConfig.phoneNumber = assignedNumber;
      user.teamsConfig.lineUri = `tel:${assignedNumber.replace(/ /g, "")}`;
      user.teamsConfig.enterpriseVoiceEnabled = true;
      user.teamsConfig.voiceRoutingPolicy = "US-Domestic-International";
      user.teamsConfig.callingPolicy = "AllowCalling";
      user.teamsConfig.dialPlan = "US-DialPlan";
      store.updateUser(user.id, { teamsConfig: user.teamsConfig });

      store.addAuditEntry(user.id, user.displayName, "ASSIGN_PHONE_NUMBER", "Teams & Calling",
        `Phone number ${assignedNumber} assigned. Enterprise Voice enabled.`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Phone number ${assignedNumber} assigned to ${user.displayName}`,
              pstnCommand: `Set-CsUser -Identity "${user.userPrincipalName}" -EnterpriseVoiceEnabled $true -LineUri "tel:${assignedNumber.replace(/ /g, "")}"`,
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Archive Teams Data ----
  server.tool(
    "archive_teams_data",
    "Create an export of the user's Teams chat history and files for compliance/eDiscovery, then flag the account for Teams data archival. Uses the Teams Export APIs.",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }
      const t = randomDuration(1200, 3500);
      const exportId = `export-${user.id}-${Date.now()}`;

      store.addAuditEntry(user.id, user.displayName, "ARCHIVE_TEAMS_DATA", "Teams & Calling",
        `Teams data export initiated. Export ID: ${exportId}. Includes chat history, files, and meeting recordings.`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Teams data archival initiated for ${user.displayName}`,
              exportId,
              graphEndpoint: `POST /v1.0/users/${user.id}/chats/getAllMessages`,
              estimatedCompletionMinutes: 15,
              archiveLocation: `blob://compliance-archive/teams/${user.id}/${exportId}.zip`,
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );
}
