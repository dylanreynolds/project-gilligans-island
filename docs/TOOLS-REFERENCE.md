# MCP Tools Reference — All 31 Tools

Each tool is callable by an AI agent (Copilot, Claude, etc.) or accessed via the REST API.

---

## Identity & Access (7 tools)
*Simulates Microsoft Entra ID / Azure AD operations*

| Tool | Description | Key Output |
|---|---|---|
| `list_users` | List all users with optional status filter | id, displayName, status, licenseCount, hasTeamsCalling |
| `get_user` | Full user profile by ID, UPN, display name or email | Complete profile including all assignments |
| `disable_user_account` | Set accountEnabled=false (blocks all sign-ins) | Confirms PATCH /v1.0/users/{id} payload |
| `revoke_user_sessions` | Invalidate all refresh tokens | Simulates POST /v1.0/users/{id}/revokeSignInSessions |
| `remove_group_memberships` | Remove from all security and M365 groups | List of removed groups |
| `remove_role_assignments` | Remove all Entra/Azure RBAC roles | Important for privileged users (Global Admin etc.) |
| `reset_user_password` | Force password rotation | Returns new random credential (not distributed) |

---

## Teams & Telephony (7 tools)
*Simulates Teams Admin Center / Set-CsUser PowerShell operations*

| Tool | Description | Key Output |
|---|---|---|
| `get_teams_profile` | Full Teams and calling configuration | Phone number, policies, voicemail state |
| `disable_teams_calling` | Set EnterpriseVoiceEnabled=false, remove policies | Real PowerShell equivalent shown |
| `remove_phone_number` | Unassign Direct Routing phone number, return to pool | Released number + Set-CsUser command |
| `set_call_forwarding` | Route calls to manager during transition | Uses Set-CsUserCallForwardingSettings |
| `configure_offboarding_voicemail` | Set professional offboarding greeting | Customisable message text |
| `assign_phone_number` | Assign number to new hire (reverse operation) | Number assigned, Voice enabled |
| `archive_teams_data` | Initiate Teams chat/file export for compliance | Export ID, blob storage location |

---

## M365 Licensing (5 tools)
*Simulates Microsoft Graph assignLicense endpoint*

| Tool | Description | Key Output |
|---|---|---|
| `get_user_licenses` | List all assigned license SKUs | displayName, skuPartNumber, skuId |
| `remove_all_licenses` | Remove every license in one call | Freed SKUs, Graph API payload |
| `remove_specific_license` | Remove one SKU (e.g. Teams Phone only) | Accepts skuId or skuPartNumber |
| `check_license_availability` | Tenant-wide available vs assigned count | Useful before assigning to new hires |
| `assign_license` | Assign a license SKU to a user | For new hire onboarding flows |

**Available SKUs:**
- `ENTERPRISEPREMIUM` — Microsoft 365 E5
- `MCOEV` — Microsoft Teams Phone Standard
- `MCOMEETADV` — Audio Conferencing
- `EMS` — Microsoft Intune

---

## Mailbox / Exchange Online (5 tools)
*Simulates Exchange Online PowerShell and Graph mailboxSettings*

| Tool | Description | Key Output |
|---|---|---|
| `get_mailbox_info` | Current mailbox state, delegates, auto-reply | isShared, autoReplyEnabled, delegates |
| `set_out_of_office` | Configure professional offboarding OOO reply | Message text, Graph PATCH payload |
| `grant_mailbox_access` | Delegate FullAccess to manager | EXO Add-MailboxPermission command |
| `convert_to_shared_mailbox` | Convert to shared (no license needed) | EXO Set-Mailbox command |
| `disable_email_send` | Block outbound email | Prevents unauthorised use of account |

---

## Azure Virtual Desktop (4 tools)
*Simulates Az.DesktopVirtualization PowerShell module*

| Tool | Description | Key Output |
|---|---|---|
| `get_avd_assignments` | All host pool and app group assignments | Pool name, workspace, session status |
| `get_active_avd_sessions` | Currently connected sessions | Session IDs, host names, connect time |
| `disconnect_avd_sessions` | Force-disconnect all active sessions | Get-AzWvdUserSession command shown |
| `remove_avd_access` | Remove from all host pool role assignments | Remove-AzRoleAssignment command shown |

---

## Hardware Discovery (4 tools)
*Simulates ServiceNow CMDB (cmdb_ci_computer / cmdb_ci_cell_phone)*

| Tool | Description | Key Output |
|---|---|---|
| `discover_user_hardware` | All assets from CMDB with serial/asset tag | Laptops, phones, accessories |
| `generate_return_shipment` | Create ServiceNow ticket + UPS return label | Ticket number, tracking number, PDF label URL |
| `mark_hardware_returned` | Record receipt in CMDB | Closes return ticket |
| `update_hardware_status` | Manually update asset status | assigned → pending_return → returned |

---

## Printer Access (4 tools)
*Simulates Microsoft Universal Print security groups*

| Tool | Description | Key Output |
|---|---|---|
| `list_printers` | All network printers in tenant | ID, location, security group |
| `get_printer_assignments` | User's current printer access | Which printers and groups |
| `remove_printer_access` | Remove from all Universal Print groups | Graph DELETE endpoints shown |
| `assign_printer_access` | Grant access to a printer (new hire) | Group membership added |

---

## Orchestration & Workflow (5 tools)
*High-level workflow automation — equivalent to Azure Logic Apps / Runbooks*

| Tool | Description |
|---|---|
| `start_offboarding_workflow` | Initialise offboarding task and checklist for a user |
| `run_complete_offboarding` | **Run the FULL 7-step workflow automatically** — the main demo tool |
| `get_offboarding_status` | Check progress for one user or all active workflows |
| `reset_demo_state` | Restore all 25 users to Active (for new demo run) |
| `get_audit_log` | Retrieve full audit trail with timestamps and latency |

---

## Example AI Prompts

```
Offboard Adele Vance — she has resigned
```
```
What is the current Teams Calling configuration for Isaiah Langer?
```
```
Discover all hardware assigned to Allan Deyoung and generate a return shipment
```
```
Remove Joni Sherman's phone number and set call forwarding to her manager
```
```
How many M365 licenses are available in the tenant?
```
```
Show me the full audit log for the last 10 offboarding actions
```
```
Assign an E5 license and Teams Phone to Grady Archie (new hire setup)
```
```
Disconnect all active AVD sessions for Megan Bowen
```
```
What is the offboarding checklist status for all currently processing users?
```
```
Reset the demo so all users are active again
```
