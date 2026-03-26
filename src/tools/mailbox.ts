// ============================================================
// Mailbox Tools — Exchange Online / mailbox access
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { store } from "../state/store.js";

const randomDuration = (min = 200, max = 1200) =>
  Math.floor(Math.random() * (max - min) + min);

export function registerMailboxTools(server: McpServer) {
  // ---- Get Mailbox Info ----
  server.tool(
    "get_mailbox_info",
    "Get Exchange Online mailbox information for a user including shared/enabled status, delegate access, and auto-reply settings. Equivalent to GET /v1.0/users/{id}/mailboxSettings.",
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
              mail: user.mail,
              mailboxSettings: user.mailboxSettings,
              graphEndpoint: `GET /v1.0/users/${user.id}/mailboxSettings`,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Set Out of Office ----
  server.tool(
    "set_out_of_office",
    "Configure an automatic out-of-office reply for a departing user notifying senders that they no longer work at the organisation and providing an alternative contact. Equivalent to PATCH /v1.0/users/{id}/mailboxSettings.",
    {
      userId: z.string().describe("User ID, UPN, or display name"),
      customMessage: z.string().optional().describe("Custom OOO message. Defaults to a professional offboarding template."),
    },
    async ({ userId, customMessage }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }

      const manager = store.getUser(user.managerId);
      const managerName = manager?.displayName ?? user.managerName;
      const managerEmail = manager?.mail ?? "helpdesk@company.com";

      const defaultMessage = `Thank you for your email. ${user.displayName} is no longer with our organisation as of ${new Date().toLocaleDateString("en-AU")}.\n\n` +
        `For urgent matters, please contact ${managerName} at ${managerEmail}.\n\nWe apologise for any inconvenience.`;

      const message = customMessage ?? defaultMessage;
      const t = randomDuration(300, 900);

      user.mailboxSettings.autoReplyEnabled = true;
      user.mailboxSettings.autoReplyMessage = message;
      store.updateUser(user.id, { mailboxSettings: user.mailboxSettings });

      store.addAuditEntry(user.id, user.displayName, "SET_OUT_OF_OFFICE", "Mailbox",
        `Auto-reply OOO configured. Redirects to ${managerName}.`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Out-of-office auto-reply configured for ${user.displayName}`,
              autoReplyMessage: message,
              graphEndpoint: `PATCH /v1.0/users/${user.id}/mailboxSettings`,
              payload: { automaticRepliesSetting: { status: "AlwaysEnabled", internalReplyMessage: message, externalReplyMessage: message } },
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Grant Mailbox Access ----
  server.tool(
    "grant_mailbox_access",
    "Grant full mailbox access (delegate access) to another user, typically the departing user's manager. Allows the delegate to read and manage emails. Equivalent to POST /v1.0/users/{id}/mailboxSettings + EXO Add-MailboxPermission.",
    {
      userId: z.string().describe("Departing user whose mailbox is being delegated"),
      delegateUserId: z.string().describe("User ID or display name of the person receiving access (usually the manager)"),
    },
    async ({ userId, delegateUserId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }
      const delegate = store.getUser(delegateUserId);
      if (!delegate) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `Delegate user '${delegateUserId}' not found.` }) }] };
      }

      const t = randomDuration(400, 1100);
      if (!user.mailboxSettings.fullAccessDelegates.includes(delegate.userPrincipalName)) {
        user.mailboxSettings.fullAccessDelegates.push(delegate.userPrincipalName);
        store.updateUser(user.id, { mailboxSettings: user.mailboxSettings });
      }

      store.addAuditEntry(user.id, user.displayName, "GRANT_MAILBOX_ACCESS", "Mailbox",
        `Full mailbox access granted to ${delegate.displayName} (${delegate.userPrincipalName})`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Mailbox access for ${user.displayName} granted to ${delegate.displayName}`,
              delegate: { displayName: delegate.displayName, upn: delegate.userPrincipalName },
              exoCommand: `Add-MailboxPermission -Identity "${user.userPrincipalName}" -User "${delegate.userPrincipalName}" -AccessRights FullAccess -InheritanceType All`,
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Convert to Shared Mailbox ----
  server.tool(
    "convert_to_shared_mailbox",
    "Convert the user's mailbox to a shared mailbox. This preserves email history and allows delegate access without consuming a paid license. Standard best practice for offboarding employees.",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }
      if (user.mailboxSettings.isShared) {
        return { content: [{ type: "text", text: JSON.stringify({ success: true, message: `ℹ️ ${user.displayName}'s mailbox is already shared.`, skipped: true }) }] };
      }

      const t = randomDuration(600, 2000);
      user.mailboxSettings.isShared = true;
      store.updateUser(user.id, { mailboxSettings: user.mailboxSettings });

      store.addAuditEntry(user.id, user.displayName, "CONVERT_TO_SHARED_MAILBOX", "Mailbox",
        `Mailbox converted to Shared Mailbox. License freed. Retention: 30 days.`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ ${user.displayName}'s mailbox converted to Shared Mailbox`,
              exoCommand: `Set-Mailbox -Identity "${user.userPrincipalName}" -Type Shared`,
              note: "Email history preserved for 30 days. No license required for shared mailbox.",
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );

  // ---- Disable Email Send ----
  server.tool(
    "disable_email_send",
    "Prevent the user from sending any further email by blocking the outbound SMTP/Exchange transport. Equivalent to setting mailbox as receive-only.",
    { userId: z.string().describe("User ID, UPN, or display name") },
    async ({ userId }) => {
      const user = store.getUser(userId);
      if (!user) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "404 Not Found", message: `User '${userId}' not found.` }) }] };
      }

      const t = randomDuration(200, 700);
      user.mailboxSettings.sendDisabled = true;
      store.updateUser(user.id, { mailboxSettings: user.mailboxSettings });

      store.addAuditEntry(user.id, user.displayName, "DISABLE_EMAIL_SEND", "Mailbox",
        `Email send capability disabled. Mailbox set to receive-only.`, "success", t);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `✅ Email send capability disabled for ${user.displayName}`,
              exoCommand: `Set-Mailbox -Identity "${user.userPrincipalName}" -MessageCopyForSentAsEnabled $false`,
              simulatedLatencyMs: t,
            }, null, 2),
          },
        ],
      };
    }
  );
}
