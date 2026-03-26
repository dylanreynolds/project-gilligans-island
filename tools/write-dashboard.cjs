const fs = require('fs');
const path = require('path');

const dashDir = path.join(__dirname, '..', 'dashboard');

// ─── index.html ───────────────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OffboardIQ — Enterprise Automation Demo</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>

<!-- TOP NAV -->
<nav class="topnav" id="topnav">
  <div class="nav-azure" id="nav-azure">
    <div class="nav-logo">
      <div class="az-logo-badge">Az</div>
      <span class="nav-product">Microsoft Azure</span>
    </div>
    <div class="nav-items">
      <span class="nav-item active">Home</span>
      <span class="nav-item">Automation</span>
      <span class="nav-item">Logic Apps</span>
      <span class="nav-item">Entra ID</span>
    </div>
    <div class="nav-right">
      <div class="toggle-wrap">
        <span class="toggle-lbl snow-lbl">ServiceNow</span>
        <label class="toggle-pill">
          <input type="checkbox" id="view-toggle" checked />
          <span class="pill-track"></span>
        </label>
        <span class="toggle-lbl azure-lbl active-lbl">Azure</span>
      </div>
      <div class="nav-user"><div class="nav-avatar az-avatar">IT</div><span>IT Admin</span></div>
    </div>
  </div>
  <div class="nav-snow hidden" id="nav-snow">
    <div class="nav-logo">
      <div class="sn-logo-badge">SN</div>
      <span class="nav-product sn-product">ServiceNow</span>
    </div>
    <div class="nav-items sn-nav-items">
      <span class="nav-item active">Service Catalog</span>
      <span class="nav-item">My Requests</span>
      <span class="nav-item">Approvals</span>
      <span class="nav-item">IT Workflows</span>
    </div>
    <div class="nav-right">
      <div class="toggle-wrap">
        <span class="toggle-lbl snow-lbl active-lbl">ServiceNow</span>
        <label class="toggle-pill">
          <input type="checkbox" id="view-toggle-snow" />
          <span class="pill-track sn-track"></span>
        </label>
        <span class="toggle-lbl azure-lbl">Azure</span>
      </div>
      <div class="nav-user"><div class="nav-avatar sn-avatar">IT</div><span>IT Admin</span></div>
    </div>
  </div>
</nav>

<!-- AZURE VIEW -->
<div id="view-azure" class="view">
  <div class="az-layout">
    <aside class="az-sidebar">
      <div class="az-sidebar-title">Automation Account</div>
      <div class="az-sidebar-sub">offboarding-automation</div>
      <div class="az-nav">
        <div class="az-nav-section">Overview</div>
        <div class="az-nav-item active" onclick="azTab('runbooks')">&#128203; Runbooks</div>
        <div class="az-nav-item" onclick="azTab('logicapps')">&#9889; Logic Apps</div>
        <div class="az-nav-item" onclick="azTab('users')">&#128101; Entra ID Users</div>
        <div class="az-nav-item" onclick="azTab('jobs')">&#9881; Jobs</div>
        <div class="az-nav-section">Monitor</div>
        <div class="az-nav-item" onclick="azTab('audit')">&#128221; Audit Log</div>
      </div>
      <div class="az-tenant-summary">
        <div class="az-tenant-label">Tenant Status</div>
        <div class="az-stat-row"><span>Active Users</span><span id="az-stat-active" class="az-stat-val">-</span></div>
        <div class="az-stat-row"><span>Processing</span><span id="az-stat-processing" class="az-stat-val az-warn">-</span></div>
        <div class="az-stat-row"><span>Completed</span><span id="az-stat-done" class="az-stat-val az-ok">-</span></div>
        <div class="az-stat-row"><span>Audit Events</span><span id="az-stat-audit" class="az-stat-val">-</span></div>
        <button class="az-reset-btn" onclick="resetDemo()">Reset Demo State</button>
      </div>
    </aside>
    <main class="az-main">
      <div class="az-breadcrumb">
        <span>Home</span><span class="az-bc-sep"> &gt; </span>
        <span>Automation Accounts</span><span class="az-bc-sep"> &gt; </span>
        <span>offboarding-automation</span><span class="az-bc-sep"> &gt; </span>
        <span class="az-bc-active" id="az-bc-current">Runbooks</span>
      </div>

      <!-- RUNBOOKS TAB -->
      <div id="aztab-runbooks" class="az-tab">
        <div class="az-page-header">
          <h1 class="az-page-title">Runbooks</h1>
          <div class="az-conn-badge" id="az-connection"><span class="dot-live"></span> Connected to MCP Server</div>
        </div>
        <div class="az-runbook-grid">
          <div class="az-rb-card" onclick="azTab('users')">
            <div class="az-rb-icon">&#128274;</div>
            <div class="az-rb-name">Invoke-IdentityOffboard</div>
            <div class="az-rb-desc">Disables Entra ID account, revokes sessions, removes groups and role assignments</div>
            <div class="az-rb-tags"><span class="az-tag">PowerShell</span><span class="az-tag">Microsoft.Graph</span></div>
          </div>
          <div class="az-rb-card">
            <div class="az-rb-icon">&#128222;</div>
            <div class="az-rb-name">Invoke-TeamsPhoneOffboard</div>
            <div class="az-rb-desc">Disables Enterprise Voice, releases DDI, configures call forwarding and voicemail</div>
            <div class="az-rb-tags"><span class="az-tag">PowerShell</span><span class="az-tag">MicrosoftTeams</span></div>
          </div>
          <div class="az-rb-card">
            <div class="az-rb-icon">&#127915;</div>
            <div class="az-rb-name">Invoke-LicenseReclaim</div>
            <div class="az-rb-desc">Removes all M365 licenses (E5, Teams Phone, Audio Conferencing) and returns them to pool</div>
            <div class="az-rb-tags"><span class="az-tag">PowerShell</span><span class="az-tag">Microsoft.Graph</span></div>
          </div>
          <div class="az-rb-card">
            <div class="az-rb-icon">&#128231;</div>
            <div class="az-rb-name">Invoke-MailboxOffboard</div>
            <div class="az-rb-desc">Sets OOO reply, grants delegate access, converts to Shared Mailbox via Exchange Online</div>
            <div class="az-rb-tags"><span class="az-tag">PowerShell</span><span class="az-tag">ExchangeOnlineManagement</span></div>
          </div>
          <div class="az-rb-card">
            <div class="az-rb-icon">&#128187;</div>
            <div class="az-rb-name">Invoke-AVDOffboard</div>
            <div class="az-rb-desc">Disconnects active sessions and removes AVD host pool application group assignments</div>
            <div class="az-rb-tags"><span class="az-tag">PowerShell</span><span class="az-tag">Az.DesktopVirtualization</span></div>
          </div>
          <div class="az-rb-card">
            <div class="az-rb-icon">&#128105;</div>
            <div class="az-rb-name">Invoke-HardwareDiscovery</div>
            <div class="az-rb-desc">Queries ServiceNow CMDB for assigned assets and generates return shipment label</div>
            <div class="az-rb-tags"><span class="az-tag">PowerShell</span><span class="az-tag">ServiceNow REST API</span></div>
          </div>
          <div class="az-rb-card az-rb-card-primary">
            <div class="az-rb-icon">&#9889;</div>
            <div class="az-rb-name">Invoke-FullOffboardOrchestrator</div>
            <div class="az-rb-desc">Master runbook triggered by Logic App webhook on ServiceNow approval. Calls all child runbooks in sequence.</div>
            <div class="az-rb-tags"><span class="az-tag az-tag-primary">Master Runbook</span><span class="az-tag">Webhook Trigger</span></div>
          </div>
        </div>
        <div class="az-section-title">Active &amp; Recent Jobs</div>
        <div id="az-jobs-panel"><div class="az-empty">No jobs running. Trigger from ServiceNow or ask the AI to run an offboarding.</div></div>
      </div>

      <!-- LOGIC APPS TAB -->
      <div id="aztab-logicapps" class="az-tab hidden">
        <div class="az-page-header"><h1 class="az-page-title">Logic Apps</h1></div>
        <div class="az-la-card">
          <div class="az-la-header">
            <div class="az-la-icon">&#9889;</div>
            <div>
              <div class="az-la-name">offboarding-orchestrator</div>
              <div class="az-la-sub">australiasoutheast &middot; Standard &middot; Enabled</div>
            </div>
            <div class="az-la-status">&#9679; Enabled</div>
          </div>
          <div class="az-la-flow">
            <div class="az-flow-step az-step-trigger"><div class="az-fs-icon">&#128276;</div><div class="az-fs-label">HTTP Webhook</div><div class="az-fs-sub">POST from ServiceNow</div></div>
            <div class="az-flow-arr">&#8659;</div>
            <div class="az-flow-step"><div class="az-fs-icon">&#10003;</div><div class="az-fs-label">Parse JSON</div><div class="az-fs-sub">Extract employeeId, ticket, reason</div></div>
            <div class="az-flow-arr">&#8659;</div>
            <div class="az-flow-step"><div class="az-fs-icon">&#9881;</div><div class="az-fs-label">Create Automation Job</div><div class="az-fs-sub">Start Invoke-FullOffboardOrchestrator</div></div>
            <div class="az-flow-arr">&#8659;</div>
            <div class="az-flow-step"><div class="az-fs-icon">&#128260;</div><div class="az-fs-label">Until - Job Complete</div><div class="az-fs-sub">Poll job status every 30s</div></div>
            <div class="az-flow-arr">&#8659;</div>
            <div class="az-flow-step"><div class="az-fs-icon">&#128221;</div><div class="az-fs-label">Update ServiceNow</div><div class="az-fs-sub">PUT /api/now/table/sc_request</div></div>
          </div>
          <div class="az-section-title" style="margin-top:1.5rem">Recent Runs</div>
          <div id="az-la-runs"><div class="az-empty">No runs yet. Approve a ServiceNow ticket to trigger this Logic App.</div></div>
        </div>
      </div>

      <!-- ENTRA ID USERS TAB -->
      <div id="aztab-users" class="az-tab hidden">
        <div class="az-page-header">
          <h1 class="az-page-title">Microsoft Entra ID &mdash; Users</h1>
          <input class="az-search" id="az-user-search" type="text" placeholder="Search by name or department..." oninput="filterAzUsers()" />
        </div>
        <div class="az-user-filters">
          <button class="az-filter active" data-filter="all" onclick="setAzFilter(this,'all')">All users</button>
          <button class="az-filter" data-filter="active" onclick="setAzFilter(this,'active')">Active</button>
          <button class="az-filter" data-filter="offboarding" onclick="setAzFilter(this,'offboarding')">Processing</button>
          <button class="az-filter" data-filter="offboarded" onclick="setAzFilter(this,'offboarded')">Offboarded</button>
        </div>
        <div id="az-users-table"></div>
        <div id="az-user-drawer" class="az-drawer hidden">
          <div class="az-drawer-header">
            <div class="az-dr-avatar" id="az-dr-avatar"></div>
            <div><div class="az-dr-name" id="az-dr-name"></div><div class="az-dr-sub" id="az-dr-sub"></div></div>
            <button class="az-dr-close" onclick="closeDrawer()">&#10005;</button>
          </div>
          <div class="az-dr-tabs">
            <button class="az-dr-tab active" onclick="drTab('overview',this)">Overview</button>
            <button class="az-dr-tab" onclick="drTab('teams',this)">Teams &amp; Calling</button>
            <button class="az-dr-tab" onclick="drTab('hardware',this)">Hardware</button>
            <button class="az-dr-tab" onclick="drTab('avd',this)">AVD</button>
            <button class="az-dr-tab" onclick="drTab('auditdr',this)">Audit</button>
          </div>
          <div id="az-dr-content"></div>
        </div>
      </div>

      <!-- JOBS TAB -->
      <div id="aztab-jobs" class="az-tab hidden">
        <div class="az-page-header"><h1 class="az-page-title">Automation Jobs</h1></div>
        <div id="az-jobs-full"><div class="az-empty">No jobs yet.</div></div>
      </div>

      <!-- AUDIT TAB -->
      <div id="aztab-audit" class="az-tab hidden">
        <div class="az-page-header"><h1 class="az-page-title">Audit Log</h1></div>
        <div id="az-audit-full" class="az-audit-wrap"></div>
      </div>
    </main>
  </div>
</div>

<!-- SERVICENOW VIEW -->
<div id="view-snow" class="view hidden">
  <div class="sn-layout">
    <aside class="sn-sidebar">
      <div class="sn-sidebar-section">FAVORITES</div>
      <div class="sn-nav-item active" onclick="snTab('catalog')"><span class="sn-nav-icon">&#128722;</span>Service Catalog</div>
      <div class="sn-nav-item" onclick="snTab('requests')"><span class="sn-nav-icon">&#128203;</span>My Requests<span class="sn-badge" id="sn-badge-open">0</span></div>
      <div class="sn-nav-item" onclick="snTab('approvals')"><span class="sn-nav-icon">&#10003;</span>My Approvals<span class="sn-badge sn-badge-warn" id="sn-badge-approvals">0</span></div>
      <div class="sn-sidebar-section">AUTOMATION</div>
      <div class="sn-nav-item" onclick="snTab('outbound')"><span class="sn-nav-icon">&#128279;</span>Outbound REST</div>
      <div class="sn-nav-item" onclick="snTab('workflows')"><span class="sn-nav-icon">&#9889;</span>Workflows</div>
      <div class="sn-sidebar-section">REPORTING</div>
      <div class="sn-nav-item" onclick="snTab('reports')"><span class="sn-nav-icon">&#128202;</span>Reports</div>
    </aside>
    <main class="sn-main">

      <!-- SERVICE CATALOG TAB -->
      <div id="sntab-catalog" class="sn-tab">
        <div class="sn-page-header"><h1 class="sn-page-title">Service Catalog</h1></div>
        <div class="sn-catalog-card">
          <div class="sn-cat-header">
            <div class="sn-cat-icon">&#128100;</div>
            <div>
              <div class="sn-cat-name">Employee Offboarding Request</div>
              <div class="sn-cat-sub">IT &middot; Human Resources &middot; Offboarding</div>
            </div>
          </div>
          <p class="sn-cat-desc">Raise this request to initiate automated employee offboarding. Upon manager approval, an Outbound REST Message fires to the Azure Logic App webhook which orchestrates all IT tasks via Azure Automation Runbooks.</p>
          <form class="sn-form" id="sn-form" onsubmit="submitSnowForm(event)">
            <div class="sn-form-section">Request Details</div>
            <div class="sn-form-row">
              <label class="sn-label">Employee <span class="sn-req">*</span></label>
              <select class="sn-select" id="sn-emp-select" required><option value="">-- Select employee --</option></select>
            </div>
            <div class="sn-form-row">
              <label class="sn-label">Requested For <span class="sn-req">*</span></label>
              <input class="sn-input" id="sn-requestedby" type="text" value="Patti Fernandez" required />
            </div>
            <div class="sn-form-row">
              <label class="sn-label">Offboarding Reason <span class="sn-req">*</span></label>
              <select class="sn-select" id="sn-reason-select" required>
                <option value="Resignation">Resignation</option>
                <option value="Termination">Termination</option>
                <option value="Retirement">Retirement</option>
                <option value="Contract End">Contract End</option>
              </select>
            </div>
            <div class="sn-form-row">
              <label class="sn-label">Additional Notes</label>
              <textarea class="sn-textarea" id="sn-notes" rows="3" placeholder="Any additional context for the IT team..."></textarea>
            </div>
            <div class="sn-form-actions">
              <button type="submit" class="sn-btn-primary">Submit Request</button>
              <button type="button" class="sn-btn-secondary" onclick="snTab('requests')">View My Requests</button>
            </div>
          </form>
        </div>
      </div>

      <!-- REQUESTS TAB -->
      <div id="sntab-requests" class="sn-tab hidden">
        <div class="sn-page-header">
          <h1 class="sn-page-title">My Requests</h1>
          <button class="sn-btn-secondary" onclick="snTab('catalog')">+ New Request</button>
        </div>
        <div id="sn-tickets-table"><div class="sn-empty">No requests yet. Submit an offboarding request from Service Catalog.</div></div>
      </div>

      <!-- APPROVALS TAB -->
      <div id="sntab-approvals" class="sn-tab hidden">
        <div class="sn-page-header"><h1 class="sn-page-title">My Approvals</h1></div>
        <div id="sn-approvals-table"><div class="sn-empty">No pending approvals.</div></div>
      </div>

      <!-- OUTBOUND REST TAB -->
      <div id="sntab-outbound" class="sn-tab hidden">
        <div class="sn-page-header"><h1 class="sn-page-title">Outbound REST Messages</h1></div>
        <div class="sn-outbound-card">
          <div class="sn-ob-title">REST Message: trigger_azure_offboarding</div>
          <div class="sn-ob-grid">
            <div class="sn-ob-row"><span class="sn-ob-label">Endpoint</span><code class="sn-code">https://prod-xx.australiasoutheast.logic.azure.com/workflows/offboarding-orchestrator/triggers/manual/run</code></div>
            <div class="sn-ob-row"><span class="sn-ob-label">Method</span><code class="sn-code">POST</code></div>
            <div class="sn-ob-row"><span class="sn-ob-label">Authentication</span><code class="sn-code">Managed Credential (SAS Token)</code></div>
            <div class="sn-ob-row"><span class="sn-ob-label">Triggered By</span><code class="sn-code">Workflow: Offboarding Approval on sc_request</code></div>
          </div>
          <div class="sn-ob-payload-label">Payload Schema</div>
          <pre class="sn-code-block">{
  "employeeId": "{{requestItem.variables.employee_id}}",
  "employeeEmail": "{{requestItem.variables.employee_email}}",
  "ticketNumber": "{{request.number}}",
  "reason": "{{requestItem.variables.offboarding_reason}}",
  "requestedBy": "{{request.requested_for.name}}",
  "approvedBy": "{{approval.approver.name}}"
}</pre>
          <div class="sn-section-title">Recent Calls</div>
          <div id="sn-outbound-log"><div class="sn-empty">No outbound calls yet. Approve a ticket to trigger.</div></div>
        </div>
      </div>

      <!-- WORKFLOWS TAB -->
      <div id="sntab-workflows" class="sn-tab hidden">
        <div class="sn-page-header"><h1 class="sn-page-title">Workflows</h1></div>
        <div class="sn-wf-card">
          <div class="sn-wf-title">Offboarding Approval &amp; Azure Trigger</div>
          <div class="sn-wf-flow">
            <div class="sn-wf-step">&#128229;<br>RITM Created</div>
            <div class="sn-wf-arr">&#8594;</div>
            <div class="sn-wf-step">&#128232;<br>Notify Manager</div>
            <div class="sn-wf-arr">&#8594;</div>
            <div class="sn-wf-step">&#8987;<br>Await Approval</div>
            <div class="sn-wf-arr">&#8594;</div>
            <div class="sn-wf-step sn-wf-highlight">&#128279;<br>Outbound REST<br>to Azure</div>
            <div class="sn-wf-arr">&#8594;</div>
            <div class="sn-wf-step">&#10003;<br>Resolve Ticket</div>
          </div>
          <p class="sn-wf-note">When the manager approves the RITM, ServiceNow fires an Outbound REST Message to the Azure Logic App webhook. The Logic App starts the Azure Automation Runbook which calls Microsoft.Graph and MicrosoftTeams PowerShell modules. Upon completion, the Logic App calls back to the ServiceNow REST API to resolve the ticket.</p>
        </div>
      </div>

      <!-- REPORTS TAB -->
      <div id="sntab-reports" class="sn-tab hidden">
        <div class="sn-page-header"><h1 class="sn-page-title">Offboarding Reports</h1></div>
        <div class="sn-report-grid">
          <div class="sn-report-card"><div class="sn-rc-val" id="rpt-total">0</div><div class="sn-rc-label">Total Tickets</div></div>
          <div class="sn-report-card sn-rc-ok"><div class="sn-rc-val" id="rpt-resolved">0</div><div class="sn-rc-label">Resolved</div></div>
          <div class="sn-report-card sn-rc-warn"><div class="sn-rc-val" id="rpt-pending">0</div><div class="sn-rc-label">In Progress</div></div>
          <div class="sn-report-card"><div class="sn-rc-val" id="rpt-azure">0</div><div class="sn-rc-label">Azure Triggered</div></div>
        </div>
      </div>

    </main>
  </div>
</div>

<!-- TICKET DETAIL MODAL -->
<div id="ticket-modal" class="modal-overlay hidden" onclick="closeModal(event)">
  <div class="modal-box" onclick="event.stopPropagation()">
    <div class="modal-header">
      <div><div class="modal-ticket-num" id="modal-num"></div><div class="modal-ticket-desc" id="modal-desc"></div></div>
      <button class="modal-close" onclick="closeModal()">&#10005;</button>
    </div>
    <div class="modal-body" id="modal-body"></div>
    <div class="modal-footer" id="modal-footer"></div>
  </div>
</div>

<!-- LIVE ACTION STRIP -->
<div class="action-strip" id="action-strip">
  <div class="action-strip-label">&#9889; Live</div>
  <div class="action-feed" id="action-feed"></div>
</div>

<script src="app.js"></script>
</body>
</html>`;

fs.writeFileSync(path.join(dashDir, 'index.html'), html, 'utf8');
console.log('index.html written (' + html.length + ' bytes)');

// ─── styles.css ───────────────────────────────────────────────────────────────
const css = `
/* ══════════════════════════════════════════════════════
   BASE RESET & FONTS
══════════════════════════════════════════════════════ */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.5; }
.hidden { display: none !important; }
a { text-decoration: none; }

/* ══════════════════════════════════════════════════════
   TOP NAV — shared
══════════════════════════════════════════════════════ */
.topnav { height: 48px; display: flex; align-items: stretch; position: fixed; top: 0; left: 0; right: 0; z-index: 1000; }
.nav-azure, .nav-snow { display: flex; align-items: center; width: 100%; padding: 0 16px; gap: 24px; }
.nav-azure { background: #0c0e14; border-bottom: 1px solid #1a1f2e; }
.nav-snow  { background: #1a0533; border-bottom: 2px solid #7b00d4; }

.nav-logo { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.az-logo-badge { background: #0078d4; color: #fff; font-weight: 700; font-size: 11px; padding: 3px 6px; border-radius: 4px; letter-spacing: 1px; }
.sn-logo-badge { background: #7b00d4; color: #fff; font-weight: 700; font-size: 11px; padding: 3px 6px; border-radius: 4px; letter-spacing: 1px; }
.nav-product { font-size: 15px; font-weight: 600; color: #fff; letter-spacing: .3px; }
.sn-product  { color: #e0aaff; }

.nav-items { display: flex; gap: 4px; flex: 1; }
.sn-nav-items .nav-item { color: #c4a0e0; }
.nav-item { color: #b0b8c8; font-size: 13px; padding: 6px 12px; border-radius: 4px; cursor: pointer; white-space: nowrap; }
.nav-item:hover { background: rgba(255,255,255,.08); color: #fff; }
.nav-item.active { color: #fff; }

.nav-right { display: flex; align-items: center; gap: 16px; margin-left: auto; flex-shrink: 0; }
.nav-user  { display: flex; align-items: center; gap: 8px; color: #b0b8c8; font-size: 13px; }
.nav-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; color: #fff; }
.az-avatar { background: #0078d4; }
.sn-avatar { background: #7b00d4; }

/* Toggle pill */
.toggle-wrap { display: flex; align-items: center; gap: 8px; }
.toggle-lbl { font-size: 12px; color: #888; }
.toggle-lbl.active-lbl { color: #fff; font-weight: 600; }
.toggle-pill { position: relative; display: inline-block; width: 44px; height: 22px; }
.toggle-pill input { opacity: 0; width: 0; height: 0; }
.pill-track { position: absolute; inset: 0; background: #444; border-radius: 11px; cursor: pointer; transition: background .25s; }
.pill-track::after { content: ''; position: absolute; width: 16px; height: 16px; background: #fff; border-radius: 50%; top: 3px; left: 3px; transition: transform .25s; }
.toggle-pill input:checked + .pill-track { background: #0078d4; }
.toggle-pill input:checked + .pill-track::after { transform: translateX(22px); }
.sn-track { background: #555; }
.toggle-pill input:checked + .sn-track { background: #7b00d4; }

/* ══════════════════════════════════════════════════════
   VIEW CONTAINERS
══════════════════════════════════════════════════════ */
.view { position: fixed; top: 48px; left: 0; right: 0; bottom: 36px; overflow: hidden; }

/* ══════════════════════════════════════════════════════
   AZURE LAYOUT
══════════════════════════════════════════════════════ */
.az-layout { display: flex; height: 100%; background: #1b1f2a; }

/* Azure Sidebar */
.az-sidebar { width: 220px; flex-shrink: 0; background: #111520; border-right: 1px solid #1e2436; display: flex; flex-direction: column; overflow-y: auto; padding-bottom: 16px; }
.az-sidebar-title { padding: 16px 16px 2px; font-size: 11px; font-weight: 700; color: #4a8fd4; text-transform: uppercase; letter-spacing: 1px; }
.az-sidebar-sub { padding: 0 16px 12px; font-size: 12px; color: #4a6080; border-bottom: 1px solid #1e2436; margin-bottom: 8px; }
.az-nav-section { padding: 10px 16px 4px; font-size: 10px; color: #3a5080; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
.az-nav-item { padding: 7px 16px; color: #8aa0be; font-size: 13px; cursor: pointer; border-radius: 4px; margin: 1px 6px; transition: background .15s, color .15s; }
.az-nav-item:hover { background: rgba(0,120,212,.15); color: #60a8e8; }
.az-nav-item.active { background: rgba(0,120,212,.25); color: #4a9fe8; font-weight: 500; }
.az-tenant-summary { margin: auto 12px 0; background: #151921; border: 1px solid #1e2d42; border-radius: 6px; padding: 12px; }
.az-tenant-label { font-size: 10px; color: #3a6090; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
.az-stat-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; color: #6888a8; border-bottom: 1px solid #1a2236; }
.az-stat-row:last-of-type { border: none; }
.az-stat-val { font-weight: 600; color: #8ab0d8; }
.az-warn { color: #e8a030 !important; }
.az-ok   { color: #36c45a !important; }
.az-reset-btn { margin-top: 12px; width: 100%; padding: 7px; background: transparent; border: 1px solid #1e3454; border-radius: 4px; color: #4a88c0; font-size: 12px; cursor: pointer; transition: background .15s; }
.az-reset-btn:hover { background: rgba(0,120,212,.2); color: #70b0e8; }

/* Azure Main */
.az-main { flex: 1; overflow-y: auto; padding: 0; background: #1b1f2a; }
.az-breadcrumb { padding: 10px 24px; font-size: 12px; color: #4a6888; background: #141820; border-bottom: 1px solid #1e2a3a; }
.az-bc-sep { margin: 0 4px; }
.az-bc-active { color: #8ab0d8; }

/* Azure Tabs */
.az-tab { padding: 24px; }
.az-page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 16px; }
.az-page-title { font-size: 22px; font-weight: 300; color: #d0dff0; }
.az-conn-badge { display: flex; align-items: center; gap: 6px; background: #0c1a2e; border: 1px solid #1e3a58; border-radius: 20px; padding: 5px 12px; font-size: 12px; color: #5898d8; }
.dot-live { width: 8px; height: 8px; background: #36c45a; border-radius: 50%; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
.az-section-title { font-size: 13px; font-weight: 600; color: #5888b8; text-transform: uppercase; letter-spacing: .8px; margin: 20px 0 10px; }

/* Runbook grid */
.az-runbook-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-bottom: 24px; }
.az-rb-card { background: #141820; border: 1px solid #1e2a3a; border-radius: 6px; padding: 16px; cursor: pointer; transition: border-color .2s, box-shadow .2s; }
.az-rb-card:hover { border-color: #0078d4; box-shadow: 0 0 0 1px #0078d4; }
.az-rb-card-primary { border-color: #0050a0; background: #0c1828; }
.az-rb-card-primary:hover { border-color: #0078d4; }
.az-rb-icon { font-size: 24px; margin-bottom: 8px; }
.az-rb-name { font-size: 13px; font-weight: 600; color: #5898d8; margin-bottom: 6px; font-family: 'Cascadia Code', 'Consolas', monospace; }
.az-rb-desc { font-size: 12px; color: #6888a8; line-height: 1.5; margin-bottom: 10px; }
.az-rb-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.az-tag { background: #0c1828; border: 1px solid #1e3454; color: #4a80b8; font-size: 11px; padding: 2px 6px; border-radius: 3px; }
.az-tag-primary { background: rgba(0,80,160,.3); border-color: #0060c0; color: #60a0e8; }

/* Logic App card */
.az-la-card { background: #141820; border: 1px solid #1e2a3a; border-radius: 6px; padding: 24px; }
.az-la-header { display: flex; align-items: center; gap: 16px; padding-bottom: 20px; border-bottom: 1px solid #1e2a3a; margin-bottom: 24px; }
.az-la-icon { font-size: 32px; }
.az-la-name { font-size: 16px; font-weight: 600; color: #8ab0d8; }
.az-la-sub { font-size: 12px; color: #4a6888; margin-top: 2px; }
.az-la-status { margin-left: auto; background: #0a2010; border: 1px solid #1a4020; color: #36c45a; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
.az-la-flow { display: flex; flex-direction: column; align-items: flex-start; gap: 0; }
.az-flow-step { background: #1a2030; border: 1px solid #1e3050; border-radius: 6px; padding: 12px 16px; min-width: 280px; position: relative; }
.az-step-trigger { border-color: #0060c0; background: #0c1828; }
.az-fs-icon { font-size: 18px; margin-bottom: 4px; }
.az-fs-label { font-size: 13px; font-weight: 600; color: #8ab0d8; }
.az-fs-sub { font-size: 11px; color: #4a6888; margin-top: 2px; }
.az-flow-arr { font-size: 16px; color: #2a4a70; margin: 4px 0 4px 24px; }

/* Logic App run items */
.az-la-run { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #141820; border: 1px solid #1e2a3a; border-radius: 5px; margin-bottom: 8px; }
.az-la-run-id { font-family: 'Cascadia Code', monospace; font-size: 11px; color: #4a7099; flex: 1; }
.az-la-run-status { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.run-succeeded { background: #0a2010; color: #36c45a; }
.run-running   { background: #0a1828; color: #4a90d8; }
.run-failed    { background: #2a0808; color: #e84040; }

/* Users Table */
.az-search { background: #0c1020; border: 1px solid #1e2a3a; border-radius: 4px; color: #c0d0e0; padding: 7px 12px; font-size: 13px; width: 280px; outline: none; }
.az-search:focus { border-color: #0078d4; }
.az-user-filters { display: flex; gap: 8px; margin-bottom: 16px; }
.az-filter { background: transparent; border: 1px solid #1e2a3a; color: #6888a8; padding: 5px 14px; border-radius: 20px; font-size: 12px; cursor: pointer; transition: all .15s; }
.az-filter.active, .az-filter:hover { background: rgba(0,120,212,.2); border-color: #0068b8; color: #60a0e8; }
.az-user-table-wrap { overflow-x: auto; }
.az-table { width: 100%; border-collapse: collapse; }
.az-table th { text-align: left; padding: 8px 12px; font-size: 11px; color: #3a5878; text-transform: uppercase; letter-spacing: .8px; border-bottom: 1px solid #1e2a3a; background: #0f1420; }
.az-table td { padding: 10px 12px; font-size: 13px; color: #8ab0d8; border-bottom: 1px solid #151c28; }
.az-table tr:hover td { background: #141f30; cursor: pointer; }
.az-status-badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.badge-active { background: #0a2010; color: #36c45a; }
.badge-offboarding { background: #281800; color: #e89030; }
.badge-offboarded { background: #181818; color: #6888a8; }

/* User Drawer */
.az-drawer { position: fixed; right: 0; top: 48px; bottom: 36px; width: 480px; background: #0f1420; border-left: 1px solid #1e2a3a; z-index: 500; display: flex; flex-direction: column; box-shadow: -4px 0 24px rgba(0,0,0,.5); overflow-y: auto; }
.az-drawer-header { display: flex; align-items: center; gap: 16px; padding: 20px; border-bottom: 1px solid #1e2a3a; flex-shrink: 0; }
.az-dr-avatar { width: 48px; height: 48px; border-radius: 50%; background: #0060a8; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: #fff; flex-shrink: 0; }
.az-dr-name { font-size: 16px; font-weight: 600; color: #c0d8f0; }
.az-dr-sub { font-size: 12px; color: #4a7090; margin-top: 2px; }
.az-dr-close { margin-left: auto; background: none; border: none; color: #6888a8; font-size: 18px; cursor: pointer; padding: 4px 8px; }
.az-dr-close:hover { color: #fff; }
.az-dr-tabs { display: flex; border-bottom: 1px solid #1e2a3a; flex-shrink: 0; background: #0c1020; }
.az-dr-tab { background: none; border: none; border-bottom: 2px solid transparent; padding: 10px 14px; color: #5878a0; font-size: 13px; cursor: pointer; transition: all .15s; }
.az-dr-tab:hover { color: #8ab0d8; }
.az-dr-tab.active { color: #4a90d8; border-bottom-color: #0078d4; }
#az-dr-content { padding: 16px 20px; flex: 1; font-size: 13px; color: #8ab0d8; }
.dr-prop { display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid #141c28; }
.dr-prop-label { color: #3a5878; width: 140px; flex-shrink: 0; }
.dr-prop-val { color: #8ab0d8; flex: 1; word-break: break-all; }
.dr-section { font-size: 11px; color: #3a5878; text-transform: uppercase; letter-spacing: .8px; margin: 14px 0 8px; font-weight: 600; }

/* Jobs panel */
.az-job-item { background: #141820; border: 1px solid #1e2a3a; border-radius: 5px; padding: 14px 16px; margin-bottom: 10px; }
.az-job-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.az-job-name { font-size: 13px; font-weight: 600; color: #5898d8; font-family: 'Cascadia Code', monospace; }
.az-job-id { font-size: 11px; color: #3a5878; font-family: 'Cascadia Code', monospace; flex: 1; }
.az-job-output { background: #0a0e16; border: 1px solid #141e2e; border-radius: 4px; padding: 10px 14px; font-size: 11px; font-family: 'Cascadia Code', 'Consolas', monospace; color: #5a9a78; max-height: 150px; overflow-y: auto; line-height: 1.6; }

/* Audit */
.az-audit-wrap { padding: 0 24px 24px; }
.az-audit-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid #141c28; font-size: 12px; }
.az-audit-time { color: #3a5878; width: 160px; flex-shrink: 0; font-family: 'Cascadia Code', monospace; }
.az-audit-tool { color: #4a90d8; width: 200px; flex-shrink: 0; font-family: 'Cascadia Code', monospace; }
.az-audit-user { color: #5898b8; width: 140px; flex-shrink: 0; }
.az-audit-result { color: #6a9888; flex: 1; }

.az-empty { color: #3a5878; font-size: 13px; padding: 20px 0; font-style: italic; }

/* ══════════════════════════════════════════════════════
   SERVICENOW LAYOUT
══════════════════════════════════════════════════════ */
.sn-layout { display: flex; height: 100%; background: #f5f5f7; }

/* SN Sidebar */
.sn-sidebar { width: 220px; flex-shrink: 0; background: #1a0533; display: flex; flex-direction: column; overflow-y: auto; padding: 4px 0 16px; }
.sn-sidebar-section { padding: 12px 16px 4px; font-size: 10px; color: #7a50a0; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
.sn-nav-item { display: flex; align-items: center; gap: 8px; padding: 8px 16px; color: #c090e8; font-size: 13px; cursor: pointer; position: relative; transition: background .15s; }
.sn-nav-item:hover { background: rgba(180,100,255,.15); color: #e0c0ff; }
.sn-nav-item.active { background: rgba(150,80,220,.25); color: #fff; border-left: 3px solid #9050d8; padding-left: 13px; }
.sn-nav-icon { font-size: 15px; width: 20px; text-align: center; }
.sn-badge { margin-left: auto; background: #3a0870; color: #b080e0; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 8px; min-width: 18px; text-align: center; }
.sn-badge-warn { background: #5a2000; color: #f08020; }

/* SN Main */
.sn-main { flex: 1; overflow-y: auto; padding: 24px; background: #f5f5f7; }
.sn-tab { /* visible */ }
.sn-page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 16px; }
.sn-page-title { font-size: 20px; font-weight: 400; color: #1a0533; }

/* SN Catalog Card */
.sn-catalog-card { background: #fff; border: 1px solid #d0d0d8; border-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.sn-cat-header { display: flex; align-items: center; gap: 16px; padding: 20px 24px 16px; border-bottom: 1px solid #e8e8ee; }
.sn-cat-icon { font-size: 36px; }
.sn-cat-name { font-size: 16px; font-weight: 600; color: #1a0533; }
.sn-cat-sub { font-size: 12px; color: #7a60a0; margin-top: 2px; }
.sn-cat-desc { padding: 16px 24px; font-size: 13px; color: #444; line-height: 1.6; border-bottom: 1px solid #e8e8ee; }

/* SN Form */
.sn-form { padding: 0 24px 24px; }
.sn-form-section { font-size: 12px; font-weight: 700; color: #7a60a0; text-transform: uppercase; letter-spacing: .8px; padding: 16px 0 8px; border-bottom: 2px solid #8030d8; margin-bottom: 16px; }
.sn-form-row { display: flex; align-items: flex-start; gap: 16px; padding: 8px 0; border-bottom: 1px solid #eeeeee; }
.sn-label { font-size: 13px; color: #333; width: 180px; flex-shrink: 0; padding-top: 7px; }
.sn-req { color: #d83020; }
.sn-select, .sn-input, .sn-textarea { flex: 1; border: 1px solid #c8c8d0; border-radius: 3px; padding: 6px 10px; font-size: 13px; color: #333; outline: none; font-family: inherit; background: #fff; }
.sn-select:focus, .sn-input:focus, .sn-textarea:focus { border-color: #7b00d4; box-shadow: 0 0 0 2px rgba(123,0,212,.15); }
.sn-textarea { resize: vertical; }
.sn-form-actions { display: flex; gap: 12px; padding: 16px 0 0; }
.sn-btn-primary { background: #8030d8; color: #fff; border: none; border-radius: 3px; padding: 8px 20px; font-size: 13px; cursor: pointer; transition: background .15s; }
.sn-btn-primary:hover { background: #6820b8; }
.sn-btn-secondary { background: #fff; color: #5a40a0; border: 1px solid #c0a8e0; border-radius: 3px; padding: 8px 16px; font-size: 13px; cursor: pointer; transition: background .15s; }
.sn-btn-secondary:hover { background: #f0e8ff; }

/* SN Tickets Table */
.sn-table-header { display: grid; grid-template-columns: 130px 1fr 100px 110px 80px 100px; gap: 8px; padding: 8px 14px; background: #1a0533; color: #b080e0; font-size: 11px; text-transform: uppercase; letter-spacing: .7px; border-radius: 3px 3px 0 0; }
.sn-table-row { display: grid; grid-template-columns: 130px 1fr 100px 110px 80px 100px; gap: 8px; padding: 10px 14px; background: #fff; border-bottom: 1px solid #e8e8ee; font-size: 13px; color: #333; cursor: pointer; transition: background .15s; }
.sn-table-row:hover { background: #f8f0ff; }
.sn-table-row:last-child { border-radius: 0 0 3px 3px; }

/* SN Status badges */
.sn-status { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.sn-new      { background: #e8f0ff; color: #1840a0; }
.sn-open     { background: #fff0d8; color: #a05010; }
.sn-inprog   { background: #e8f8ff; color: #006898; }
.sn-approved { background: #e8fff0; color: #107838; }
.sn-resolved { background: #f0f0f0; color: #607070; }
.sn-cancelled{ background: #fff0f0; color: #a02020; }

/* SN Approval badge */
.sn-approval  { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.sna-requested { background: #fff0d8; color: #a05010; }
.sna-approved  { background: #e8fff0; color: #107838; }
.sna-rejected  { background: #fff0f0; color: #a02020; }

/* SN Outbound REST card */
.sn-outbound-card { background: #fff; border: 1px solid #d0d0d8; border-radius: 4px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.sn-ob-title { font-size: 15px; font-weight: 600; color: #1a0533; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e8e8ee; }
.sn-ob-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.sn-ob-row { display: flex; align-items: flex-start; gap: 12px; }
.sn-ob-label { width: 120px; flex-shrink: 0; font-size: 12px; color: #7a60a0; font-weight: 600; padding-top: 4px; }
.sn-code { background: #f5f0ff; border: 1px solid #d8c8f0; color: #4a2088; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-family: 'Cascadia Code', monospace; word-break: break-all; }
.sn-ob-payload-label { font-size: 11px; font-weight: 700; color: #7a60a0; text-transform: uppercase; letter-spacing: .8px; margin: 16px 0 8px; }
.sn-code-block { background: #1a0533; color: #d0a0ff; padding: 16px; border-radius: 4px; font-size: 12px; font-family: 'Cascadia Code', monospace; line-height: 1.7; overflow-x: auto; margin-bottom: 20px; }
.sn-section-title { font-size: 12px; font-weight: 700; color: #7a60a0; text-transform: uppercase; letter-spacing: .8px; margin: 16px 0 10px; }

.sn-ob-call { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #f8f0ff; border: 1px solid #d8c8f0; border-radius: 4px; margin-bottom: 8px; font-size: 12px; }
.sn-ob-call-time { color: #7a60a0; width: 160px; font-family: 'Cascadia Code', monospace; }
.sn-ob-call-ticket { color: #5830a0; font-weight: 600; width: 120px; }
.sn-ob-call-status { padding: 2px 8px; border-radius: 8px; font-weight: 600; }
.ob-ok  { background: #e8fff0; color: #107838; }
.ob-err { background: #fff0f0; color: #a02020; }
.sn-ob-az-id { color: #1840a0; font-family: 'Cascadia Code', monospace; font-size: 11px; flex: 1; }

/* SN Workflow */
.sn-wf-card { background: #fff; border: 1px solid #d0d0d8; border-radius: 4px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.sn-wf-title { font-size: 15px; font-weight: 600; color: #1a0533; margin-bottom: 24px; }
.sn-wf-flow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.sn-wf-step { text-align: center; background: #f5f0ff; border: 1px solid #d0b8f0; border-radius: 6px; padding: 14px 18px; font-size: 12px; color: #4a2088; line-height: 1.5; min-width: 80px; }
.sn-wf-highlight { background: #1a0533; color: #d0a0ff; border-color: #8030d8; }
.sn-wf-arr { font-size: 18px; color: #b090d8; }
.sn-wf-note { font-size: 13px; color: #555; line-height: 1.7; background: #faf8ff; border-left: 3px solid #8030d8; padding: 12px 16px; border-radius: 0 4px 4px 0; }

/* SN Reports */
.sn-report-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
.sn-report-card { background: #fff; border: 1px solid #d0d0d8; border-radius: 4px; padding: 24px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.sn-rc-ok   { border-top: 3px solid #28a050; }
.sn-rc-warn { border-top: 3px solid #e89020; }
.sn-rc-val  { font-size: 40px; font-weight: 200; color: #1a0533; margin-bottom: 6px; }
.sn-rc-label{ font-size: 12px; color: #7a60a0; text-transform: uppercase; letter-spacing: .8px; }

.sn-empty { color: #9090a0; font-size: 13px; padding: 20px; font-style: italic; }

/* ══════════════════════════════════════════════════════
   TICKET MODAL
══════════════════════════════════════════════════════ */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 2000; display: flex; align-items: center; justify-content: center; }
.modal-box { background: #fff; border-radius: 6px; width: 720px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 8px 48px rgba(0,0,0,.4); }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #e0e0e8; background: #1a0533; border-radius: 6px 6px 0 0; }
.modal-ticket-num { font-size: 13px; font-weight: 700; color: #c090ff; font-family: 'Cascadia Code', monospace; }
.modal-ticket-desc { font-size: 16px; color: #fff; margin-top: 4px; }
.modal-close { background: none; border: none; color: #c090ff; font-size: 20px; cursor: pointer; padding: 0 4px; }
.modal-close:hover { color: #fff; }
.modal-body { flex: 1; overflow-y: auto; padding: 24px; }
.modal-footer { padding: 16px 24px; border-top: 1px solid #e0e0e8; display: flex; gap: 12px; flex-wrap: wrap; }

/* Modal field grid */
.modal-field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-bottom: 20px; }
.modal-field { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.modal-field-label { font-size: 11px; color: #7a60a0; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 3px; }
.modal-field-val { font-size: 13px; color: #333; }

/* Work Notes */
.worknotes { display: flex; flex-direction: column; gap: 0; }
.wn-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.wn-avatar { width: 32px; height: 32px; border-radius: 50%; background: #8030d8; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.wn-content { flex: 1; }
.wn-header  { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.wn-author  { font-size: 13px; font-weight: 600; color: #333; }
.wn-time    { font-size: 11px; color: #9090a0; }
.wn-type-badge { font-size: 10px; padding: 1px 6px; border-radius: 8px; }
.wn-type-system { background: #e8e8ff; color: #4050a0; }
.wn-type-az     { background: #e0eeff; color: #1840a0; }
.wn-text    { font-size: 13px; color: #444; line-height: 1.5; }

/* Approval section */
.modal-section-title { font-size: 12px; font-weight: 700; color: #7a60a0; text-transform: uppercase; letter-spacing: .8px; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #e8e0f8; }
.approval-block { display: flex; align-items: center; gap: 16px; padding: 14px; background: #faf8ff; border: 1px solid #d8c8f0; border-radius: 4px; }
.approval-name  { font-size: 14px; color: #333; }
.approval-status { margin-left: auto; }

/* Azure connection info */
.az-conn-info { background: #f0f4ff; border: 1px solid #c0d0f0; border-radius: 4px; padding: 14px; margin-top: 16px; }
.az-conn-row { display: flex; gap: 8px; margin-bottom: 4px; font-size: 12px; }
.az-conn-lbl { color: #4060a0; width: 130px; flex-shrink: 0; font-weight: 600; }
.az-conn-val { color: #1840a0; font-family: 'Cascadia Code', monospace; word-break: break-all; }

/* ══════════════════════════════════════════════════════
   LIVE ACTION STRIP
══════════════════════════════════════════════════════ */
.action-strip { position: fixed; bottom: 0; left: 0; right: 0; height: 36px; background: #0a0e18; border-top: 1px solid #1e2438; display: flex; align-items: center; gap: 12px; padding: 0 16px; z-index: 1000; overflow: hidden; }
.action-strip-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #36c45a; font-weight: 700; white-space: nowrap; }
.action-feed { display: flex; gap: 16px; overflow: hidden; flex: 1; }
.action-item { font-size: 11px; color: #3a6888; white-space: nowrap; font-family: 'Cascadia Code', monospace; }
.action-item.new-item { color: #4a90d8; animation: fadeInSlide .4s ease; }
@keyframes fadeInSlide { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

/* ══════════════════════════════════════════════════════
   SCROLLBARS
══════════════════════════════════════════════════════ */
.az-sidebar::-webkit-scrollbar, .az-main::-webkit-scrollbar, .az-drawer::-webkit-scrollbar { width: 6px; }
.az-sidebar::-webkit-scrollbar-track, .az-main::-webkit-scrollbar-track, .az-drawer::-webkit-scrollbar-track { background: transparent; }
.az-sidebar::-webkit-scrollbar-thumb, .az-main::-webkit-scrollbar-thumb, .az-drawer::-webkit-scrollbar-thumb { background: #1e3050; border-radius: 3px; }
.sn-sidebar::-webkit-scrollbar, .sn-main::-webkit-scrollbar, .modal-body::-webkit-scrollbar { width: 6px; }
.sn-sidebar::-webkit-scrollbar-track, .sn-main::-webkit-scrollbar-track, .modal-body::-webkit-scrollbar-track { background: transparent; }
.sn-sidebar::-webkit-scrollbar-thumb, .sn-main::-webkit-scrollbar-thumb, .modal-body::-webkit-scrollbar-thumb { background: #c0b0d8; border-radius: 3px; }
`;

fs.writeFileSync(path.join(dashDir, 'styles.css'), css.trimStart(), 'utf8');
console.log('styles.css written (' + css.length + ' bytes)');

// ─── app.js ───────────────────────────────────────────────────────────────────
const js = `
/* OffboardIQ Dual-Pane Dashboard — app.js */
'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let currentView    = 'azure';   // 'azure' | 'snow'
let currentAzTab   = 'runbooks';
let currentSnTab   = 'catalog';
let currentAzFilter= 'all';
let azUsers        = [];
let snowTickets    = [];
let selectedUser   = null;
let currentDrTab   = 'overview';
let pollTimer      = null;
let actionQueue    = [];

const API = 'http://localhost:3000/api';

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('view-toggle').addEventListener('change', onToggle);
  document.getElementById('view-toggle-snow').addEventListener('change', onToggleSn);
  loadUsers();
  startPolling();
});

function onToggle(e) {
  switchView(e.target.checked ? 'azure' : 'snow');
  document.getElementById('view-toggle-snow').checked = !e.target.checked;
}
function onToggleSn(e) {
  switchView(e.target.checked ? 'azure' : 'snow');
  document.getElementById('view-toggle').checked = e.target.checked;
}

function switchView(view) {
  currentView = view;
  document.getElementById('view-azure').classList.toggle('hidden', view !== 'azure');
  document.getElementById('view-snow').classList.toggle('hidden', view !== 'snow');
  document.getElementById('nav-azure').classList.toggle('hidden', view !== 'azure');
  document.getElementById('nav-snow').classList.toggle('hidden', view !== 'snow');
  if (view === 'snow') { loadSnowTickets(); }
}

// ── Polling ───────────────────────────────────────────────────────────────────
function startPolling() {
  poll();
  pollTimer = setInterval(poll, 3000);
}

async function poll() {
  await Promise.all([loadUsers(), loadSnowTickets()]).catch(() => {});
}

// ── Users ─────────────────────────────────────────────────────────────────────
async function loadUsers() {
  try {
    const r = await fetch(API + '/users');
    if (!r.ok) return;
    const data = await r.json();
    azUsers = data.users || [];
    updateAzSummary(data.summary);
    renderAzUsersTable();
    populateSnowEmployeeSelect();
    if (selectedUser) refreshDrawer();
  } catch {}
}

function updateAzSummary(s) {
  if (!s) return;
  setEl('az-stat-active',     s.active     ?? '-');
  setEl('az-stat-processing', s.offboarding ?? '-');
  setEl('az-stat-done',       s.offboarded  ?? '-');
  setEl('az-stat-audit',      s.totalAuditEntries ?? '-');
}

function renderAzUsersTable() {
  const wrap = document.getElementById('az-users-table');
  if (!wrap) return;
  const search = (document.getElementById('az-user-search')?.value || '').toLowerCase();
  const filtered = azUsers.filter(u => {
    if (search && !u.displayName.toLowerCase().includes(search) && !u.department?.toLowerCase().includes(search)) return false;
    if (currentAzFilter === 'active' && u.status !== 'active') return false;
    if (currentAzFilter === 'offboarding' && u.status !== 'offboarding') return false;
    if (currentAzFilter === 'offboarded' && u.status !== 'offboarded') return false;
    return true;
  });
  if (filtered.length === 0) { wrap.innerHTML = '<div class="az-empty">No users match the filter.</div>'; return; }
  wrap.innerHTML = \`
    <div class="az-user-table-wrap">
      <table class="az-table">
        <thead><tr>
          <th>Display Name</th><th>UPN</th><th>Department</th><th>Title</th><th>Status</th><th>Account</th>
        </tr></thead>
        <tbody>
          \${filtered.map(u => \`
            <tr onclick="selectUser('\${u.id}')">
              <td>\${u.displayName}</td>
              <td style="font-size:11px;color:#3a6888">\${u.upn}</td>
              <td>\${u.department || '-'}</td>
              <td style="font-size:12px">\${u.jobTitle || '-'}</td>
              <td><span class="az-status-badge \${statusBadgeClass(u.status)}">\${u.status}</span></td>
              <td style="font-size:11px">\${u.accountEnabled ? '<span style="color:#36c45a">Enabled</span>' : '<span style="color:#e84040">Disabled</span>'}</td>
            </tr>
          \`).join('')}
        </tbody>
      </table>
    </div>
  \`;
}

function statusBadgeClass(s) {
  return s === 'active' ? 'badge-active' : s === 'offboarding' ? 'badge-offboarding' : 'badge-offboarded';
}

function filterAzUsers() { renderAzUsersTable(); }

function setAzFilter(btn, filter) {
  currentAzFilter = filter;
  document.querySelectorAll('.az-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAzUsersTable();
}

function selectUser(id) {
  selectedUser = azUsers.find(u => u.id === id);
  if (!selectedUser) return;
  azTab('users');
  openDrawer(selectedUser);
}

// ── Drawer ────────────────────────────────────────────────────────────────────
function openDrawer(user) {
  const d = document.getElementById('az-user-drawer');
  if (!d) return;
  d.classList.remove('hidden');
  document.getElementById('az-dr-avatar').textContent = user.displayName.charAt(0);
  document.getElementById('az-dr-name').textContent = user.displayName;
  document.getElementById('az-dr-sub').textContent = (user.jobTitle || '') + ' · ' + (user.department || '');
  drTab('overview');
}

function closeDrawer() {
  document.getElementById('az-user-drawer')?.classList.add('hidden');
  selectedUser = null;
}

function refreshDrawer() {
  if (selectedUser) {
    selectedUser = azUsers.find(u => u.id === selectedUser.id) || selectedUser;
    openDrawer(selectedUser);
  }
}

function drTab(tab, btn) {
  currentDrTab = tab;
  document.querySelectorAll('.az-dr-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else { const first = document.querySelector('.az-dr-tab'); if (first) first.classList.add('active'); }
  renderDrContent(tab);
}

function renderDrContent(tab) {
  const c = document.getElementById('az-dr-content');
  if (!c || !selectedUser) return;
  const u = selectedUser;
  if (tab === 'overview') {
    c.innerHTML = \`
      <div class="dr-section">Identity</div>
      \${drProp('User ID', u.id)}
      \${drProp('UPN', u.upn)}
      \${drProp('Email', u.mail || u.upn)}
      \${drProp('Status', u.status)}
      \${drProp('Account Enabled', u.accountEnabled ? 'Yes' : 'No')}
      \${drProp('Sessions Active', u.sessionsRevoked ? 'Revoked' : 'Active')}
      <div class="dr-section">Organisation</div>
      \${drProp('Job Title', u.jobTitle)}
      \${drProp('Department', u.department)}
      \${drProp('Manager', u.manager || '-')}
      \${drProp('Location', u.officeLocation || '-')}
      <div class="dr-section">Licensing</div>
      \${drProp('Licenses', (u.licenses || []).map(l => l.skuName || l.skuId).join(', ') || 'None')}
      \${drProp('Groups', (u.groupMemberships?.length || 0) + ' groups')}
      \${drProp('Roles', (u.roleAssignments?.length || 0) + ' roles')}
    \`;
  } else if (tab === 'teams') {
    const t = u.teamsConfig || {};
    c.innerHTML = \`
      <div class="dr-section">Teams Calling</div>
      \${drProp('Enterprise Voice', t.enterpriseVoiceEnabled ? 'Enabled' : 'Disabled')}
      \${drProp('Phone Number', t.phoneNumber || 'None')}
      \${drProp('Call Forwarding', t.callForwardingEnabled ? t.forwardTarget || 'On' : 'Off')}
      \${drProp('Voicemail', t.voicemailEnabled ? 'Enabled' : 'Disabled')}
      \${drProp('Teams Policy', t.teamsCallingPolicy || '-')}
    \`;
  } else if (tab === 'hardware') {
    const hw = u.hardware || [];
    c.innerHTML = hw.length ? hw.map(h => \`
      <div style="background:#0c1020;border:1px solid #1e2a3a;border-radius:4px;padding:12px;margin-bottom:8px">
        <div style="color:#5898d8;font-weight:600;margin-bottom:6px">\${h.type} — \${h.model}</div>
        \${drProp('Serial', h.serialNumber)}
        \${drProp('Asset Tag', h.assetTag)}
        \${drProp('Status', h.returnStatus || 'Assigned')}
      </div>
    \`).join('') : '<div class="az-empty">No hardware assigned.</div>';
  } else if (tab === 'avd') {
    const avd = u.avdAssignments || [];
    c.innerHTML = avd.length ? avd.map(a => \`
      <div style="background:#0c1020;border:1px solid #1e2a3a;border-radius:4px;padding:12px;margin-bottom:8px">
        <div style="color:#5898d8;font-weight:600;margin-bottom:6px">\${a.hostPoolName}</div>
        \${drProp('App Group', a.applicationGroup)}
        \${drProp('Subscription', a.subscriptionId || '-')}
        \${drProp('Status', a.removed ? 'Access Removed' : 'Access Active')}
      </div>
    \`).join('') : '<div class="az-empty">No AVD assignments.</div>';
  } else if (tab === 'auditdr') {
    loadUserAudit(u.id, c);
  }
}

async function loadUserAudit(userId, container) {
  try {
    const r = await fetch(API + '/audit');
    if (!r.ok) return;
    const data = await r.json();
    const entries = (data.entries || []).filter(e => e.userId === userId || e.targetUser?.id === userId);
    if (!entries.length) { container.innerHTML = '<div class="az-empty">No audit entries for this user.</div>'; return; }
    container.innerHTML = entries.slice(-20).reverse().map(e => \`
      <div class="az-audit-row">
        <span class="az-audit-time">\${fmtTime(e.timestamp)}</span>
        <span class="az-audit-tool">\${e.tool}</span>
        <span class="az-audit-result">\${e.result?.substring(0, 80) || ''}</span>
      </div>
    \`).join('');
  } catch {}
}

function drProp(label, val) {
  return \`<div class="dr-prop"><span class="dr-prop-label">\${label}</span><span class="dr-prop-val">\${val ?? '-'}</span></div>\`;
}

// ── Azure Tab switching ───────────────────────────────────────────────────────
function azTab(tab) {
  currentAzTab = tab;
  document.querySelectorAll('.az-tab').forEach(t => t.classList.add('hidden'));
  const el = document.getElementById('aztab-' + tab);
  if (el) el.classList.remove('hidden');
  document.querySelectorAll('.az-nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.az-nav-item').forEach(i => {
    if (i.getAttribute('onclick') === "azTab('" + tab + "')") i.classList.add('active');
  });
  const labels = { runbooks:'Runbooks', logicapps:'Logic Apps', users:'Entra ID Users', jobs:'Jobs', audit:'Audit Log' };
  setEl('az-bc-current', labels[tab] || tab);
  if (tab === 'audit') loadFullAudit();
  if (tab === 'logicapps') renderLogicAppRuns();
  if (tab === 'jobs') renderJobsTab();
}

async function loadFullAudit() {
  try {
    const r = await fetch(API + '/audit');
    if (!r.ok) return;
    const data = await r.json();
    const wrap = document.getElementById('az-audit-full');
    if (!wrap) return;
    const entries = (data.entries || []).slice(-50).reverse();
    wrap.innerHTML = entries.length ? entries.map(e => \`
      <div class="az-audit-row">
        <span class="az-audit-time">\${fmtTime(e.timestamp)}</span>
        <span class="az-audit-tool">\${e.tool}</span>
        <span class="az-audit-user">\${e.targetUser?.displayName || ''}</span>
        <span class="az-audit-result">\${e.result?.substring(0, 100) || ''}</span>
      </div>
    \`).join('') : '<div class="az-empty">No audit entries yet.</div>';
  } catch {}
}

function renderLogicAppRuns() {
  const el = document.getElementById('az-la-runs');
  if (!el) return;
  const azTickets = snowTickets.filter(t => t.azureLogicAppRunId);
  if (!azTickets.length) { el.innerHTML = '<div class="az-empty">No runs yet.</div>'; return; }
  el.innerHTML = azTickets.map(t => {
    const cls = t.state === 'Resolved' ? 'run-succeeded' : t.state === 'In Progress' ? 'run-running' : 'run-running';
    const label = t.state === 'Resolved' ? 'Succeeded' : 'Running';
    return \`<div class="az-la-run">
      <span class="az-la-run-id">\${t.azureLogicAppRunId}</span>
      <span style="font-size:11px;color:#3a6888">\${t.number}</span>
      <span style="font-size:11px;color:#6888a8">\${t.employeeName}</span>
      <span class="az-la-run-status \${cls}">\${label}</span>
    </div>\`;
  }).join('');
}

function renderJobsPanel(tickets) {
  const el = document.getElementById('az-jobs-panel');
  if (!el) return;
  const active = tickets.filter(t => t.azureRunbookJobId);
  if (!active.length) { el.innerHTML = '<div class="az-empty">No jobs running.</div>'; return; }
  el.innerHTML = active.map(t => renderJobItem(t)).join('');
}

function renderJobsTab() {
  const el = document.getElementById('az-jobs-full');
  if (!el) return;
  const active = snowTickets.filter(t => t.azureRunbookJobId);
  if (!active.length) { el.innerHTML = '<div class="az-empty">No jobs yet.</div>'; return; }
  el.innerHTML = active.map(t => renderJobItem(t)).join('');
}

function renderJobItem(t) {
  const state = t.state === 'Resolved' ? 'Completed' : 'Running';
  const steps = t.workNotes ? t.workNotes.filter(n => n.type === 'azure').map(n => n.text).join('\\n') : '(waiting for runbook output...)';
  return \`
    <div class="az-job-item">
      <div class="az-job-header">
        <span class="az-job-name">Invoke-FullOffboardOrchestrator</span>
        <span class="az-job-id">\${t.azureRunbookJobId}</span>
        <span class="az-la-run-status \${state === 'Completed' ? 'run-succeeded' : 'run-running'}">\${state}</span>
      </div>
      <div style="font-size:12px;color:#4a6888;margin-bottom:8px">Employee: \${t.employeeName} · Ticket: \${t.number}</div>
      <div class="az-job-output">\${steps || '> Waiting for Runbook output...'}</div>
    </div>
  \`;
}

// ── ServiceNow ────────────────────────────────────────────────────────────────
function snTab(tab) {
  currentSnTab = tab;
  document.querySelectorAll('.sn-tab').forEach(t => t.classList.add('hidden'));
  const el = document.getElementById('sntab-' + tab);
  if (el) el.classList.remove('hidden');
  document.querySelectorAll('.sn-nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.sn-nav-item').forEach(i => {
    if (i.getAttribute('onclick') === "snTab('" + tab + "')") i.classList.add('active');
  });
  if (tab === 'requests') renderTicketsTable();
  if (tab === 'approvals') renderApprovalsTable();
  if (tab === 'outbound') renderOutboundLog();
  if (tab === 'reports') updateReports();
}

async function loadSnowTickets() {
  try {
    const r = await fetch(API + '/snow/tickets');
    if (!r.ok) return;
    const data = await r.json();
    snowTickets = data.tickets || [];
    updateSnBadges();
    if (currentSnTab === 'requests') renderTicketsTable();
    if (currentSnTab === 'approvals') renderApprovalsTable();
    if (currentSnTab === 'outbound') renderOutboundLog();
    if (currentSnTab === 'reports') updateReports();
    if (currentAzTab === 'logicapps') renderLogicAppRuns();
    if (currentAzTab === 'jobs') renderJobsTab();
    renderJobsPanel(snowTickets);
  } catch {}
}

function updateSnBadges() {
  const open = snowTickets.filter(t => t.state !== 'Resolved' && t.state !== 'Cancelled').length;
  const pend = snowTickets.filter(t => t.approvalState === 'requested').length;
  setEl('sn-badge-open', open);
  setEl('sn-badge-approvals', pend);
}

function populateSnowEmployeeSelect() {
  const sel = document.getElementById('sn-emp-select');
  if (!sel || azUsers.length === 0) return;
  const currentVal = sel.value;
  const active = azUsers.filter(u => u.status === 'active');
  sel.innerHTML = '<option value="">-- Select employee --</option>' +
    active.map(u => \`<option value="\${u.id}">\${u.displayName} — \${u.department || ''}</option>\`).join('');
  if (currentVal) sel.value = currentVal;
}

// Submit ServiceNow form
function submitSnowForm(e) {
  e.preventDefault();
  const empId   = document.getElementById('sn-emp-select').value;
  const reason  = document.getElementById('sn-reason-select').value;
  const reqBy   = document.getElementById('sn-requestedby').value;
  const notes   = document.getElementById('sn-notes').value;
  if (!empId) { alert('Please select an employee.'); return; }
  const emp = azUsers.find(u => u.id === empId);
  if (!emp) return;

  fetch(API + '/snow/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId: emp.id, employeeName: emp.displayName, employeeEmail: emp.upn, reason, requestedBy: reqBy, notes })
  }).then(r => r.json()).then(data => {
    addAction('ServiceNow ticket ' + data.ticket?.number + ' created for ' + emp.displayName);
    document.getElementById('sn-form').reset();
    document.getElementById('sn-requestedby').value = 'Patti Fernandez';
    snTab('requests');
    loadSnowTickets();
  }).catch(() => alert('Failed to create ticket.'));
}

function renderTicketsTable() {
  const el = document.getElementById('sn-tickets-table');
  if (!el) return;
  if (!snowTickets.length) { el.innerHTML = '<div class="sn-empty">No requests yet.</div>'; return; }
  el.innerHTML = \`
    <div class="sn-table-header">
      <div>Number</div><div>Employee</div><div>Reason</div><div>State</div><div>Approval</div><div>Requested</div>
    </div>
    \${snowTickets.map(t => \`
      <div class="sn-table-row" onclick="openTicketModal('\${t.number}')">
        <div style="font-family:'Cascadia Code',monospace;color:#5830a0;font-size:12px">\${t.number}</div>
        <div style="font-weight:500">\${t.employeeName}</div>
        <div style="color:#666">\${t.reason}</div>
        <div><span class="sn-status \${snStateCss(t.state)}">\${t.state}</span></div>
        <div><span class="sn-approval \${snaStateCss(t.approvalState)}">\${t.approvalState}</span></div>
        <div style="font-size:11px;color:#9090a0">\${fmtDate(t.createdAt)}</div>
      </div>
    \`).join('')}
  \`;
}

function renderApprovalsTable() {
  const el = document.getElementById('sn-approvals-table');
  if (!el) return;
  const pending = snowTickets.filter(t => t.approvalState === 'requested');
  if (!pending.length) { el.innerHTML = '<div class="sn-empty">No pending approvals.</div>'; return; }
  el.innerHTML = pending.map(t => \`
    <div style="background:#fff;border:1px solid #d0d0d8;border-radius:4px;padding:16px 20px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <span style="font-family:'Cascadia Code',monospace;font-size:12px;color:#5830a0">\${t.number}</span>
        <span style="font-weight:600">\${t.employeeName}</span>
        <span style="color:#666;font-size:13px">\${t.reason}</span>
        <span style="margin-left:auto;font-size:12px;color:#9090a0">\${fmtDate(t.createdAt)}</span>
      </div>
      <div style="font-size:13px;color:#666;margin-bottom:12px">Requested by: \${t.requestedBy}</div>
      <div style="display:flex;gap:10px">
        <button class="sn-btn-primary" onclick="approveTicket('\${t.number}')">Approve</button>
        <button class="sn-btn-secondary" style="border-color:#f0c0c0;color:#a04040" onclick="openTicketModal('\${t.number}')">View Details</button>
      </div>
    </div>
  \`).join('');
}

function approveTicket(number) {
  fetch(API + '/snow/tickets/' + number + '/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approver: 'IT Admin' }) })
    .then(r => r.json())
    .then(data => {
      const t = data.ticket;
      addAction('APPROVED: ' + t.number + ' → Azure Logic App triggered · Run: ' + t.azureLogicAppRunId?.substring(0, 20));
      loadSnowTickets();
      renderOutboundLog();
      if (currentSnTab === 'approvals') renderApprovalsTable();
      if (currentView === 'azure') azTab('logicapps');
    }).catch(() => alert('Approval failed.'));
}

function renderOutboundLog() {
  const el = document.getElementById('sn-outbound-log');
  if (!el) return;
  const fired = snowTickets.filter(t => t.azureLogicAppRunId);
  if (!fired.length) { el.innerHTML = '<div class="sn-empty">No outbound calls yet.</div>'; return; }
  el.innerHTML = fired.map(t => \`
    <div class="sn-ob-call">
      <span class="sn-ob-call-time">\${fmtTime(t.approvedAt || t.updatedAt)}</span>
      <span class="sn-ob-call-ticket">\${t.number}</span>
      <span class="sn-ob-call-status ob-ok">202 Accepted</span>
      <span class="sn-ob-az-id">RunId: \${t.azureLogicAppRunId}</span>
    </div>
  \`).join('');
}

function updateReports() {
  setEl('rpt-total',    snowTickets.length);
  setEl('rpt-resolved', snowTickets.filter(t => t.state === 'Resolved').length);
  setEl('rpt-pending',  snowTickets.filter(t => t.state === 'In Progress').length);
  setEl('rpt-azure',    snowTickets.filter(t => t.azureLogicAppRunId).length);
}

// ── Ticket Modal ──────────────────────────────────────────────────────────────
async function openTicketModal(number) {
  const t = snowTickets.find(x => x.number === number);
  if (!t) return;

  document.getElementById('modal-num').textContent  = t.number;
  document.getElementById('modal-desc').textContent = 'Offboarding Request — ' + t.employeeName;

  const body = document.getElementById('modal-body');
  body.innerHTML = \`
    <div class="modal-field-grid">
      <div class="modal-field"><div class="modal-field-label">Employee</div><div class="modal-field-val">\${t.employeeName}</div></div>
      <div class="modal-field"><div class="modal-field-label">Email</div><div class="modal-field-val">\${t.employeeEmail || '-'}</div></div>
      <div class="modal-field"><div class="modal-field-label">Reason</div><div class="modal-field-val">\${t.reason}</div></div>
      <div class="modal-field"><div class="modal-field-label">State</div><div class="modal-field-val"><span class="sn-status \${snStateCss(t.state)}">\${t.state}</span></div></div>
      <div class="modal-field"><div class="modal-field-label">Approval</div><div class="modal-field-val"><span class="sn-approval \${snaStateCss(t.approvalState)}">\${t.approvalState}</span></div></div>
      <div class="modal-field"><div class="modal-field-label">Requested By</div><div class="modal-field-val">\${t.requestedBy}</div></div>
      <div class="modal-field"><div class="modal-field-label">Created</div><div class="modal-field-val">\${fmtTime(t.createdAt)}</div></div>
      <div class="modal-field"><div class="modal-field-label">Updated</div><div class="modal-field-val">\${fmtTime(t.updatedAt)}</div></div>
    </div>

    \${t.approvalState !== 'requested' && t.approvalState !== 'not_required' ? '' : \`
      <div class="modal-section-title">Approval</div>
      <div class="approval-block">
        <div>
          <div class="modal-field-label">Awaiting Manager Approval</div>
          <div class="approval-name">Patti Fernandez (CEO / Global Admin)</div>
        </div>
        <div class="approval-status">
          \${t.approvalState === 'requested' ?
            '<button class="sn-btn-primary" onclick="approveTicket(\\'' + t.number + '\\');closeModal()">Approve</button>' :
            '<span class="sn-approval sna-approved">Approved</span>'}
        </div>
      </div>
    \`}

    \${t.azureLogicAppRunId ? \`
      <div class="modal-section-title">Azure Integration</div>
      <div class="az-conn-info">
        <div class="az-conn-row"><span class="az-conn-lbl">Logic App Run ID</span><span class="az-conn-val">\${t.azureLogicAppRunId}</span></div>
        <div class="az-conn-row"><span class="az-conn-lbl">Runbook Job ID</span><span class="az-conn-val">\${t.azureRunbookJobId}</span></div>
        <div class="az-conn-row"><span class="az-conn-lbl">Approved By</span><span class="az-conn-val">\${t.approvedBy || '-'}</span></div>
      </div>
    \` : ''}

    <div class="modal-section-title">Work Notes &amp; Activity</div>
    <div class="worknotes">
      \${(t.workNotes || []).map(n => \`
        <div class="wn-item">
          <div class="wn-avatar">\${n.author.charAt(0)}</div>
          <div class="wn-content">
            <div class="wn-header">
              <span class="wn-author">\${n.author}</span>
              <span class="wn-time">\${fmtTime(n.timestamp)}</span>
              <span class="wn-type-badge \${n.type === 'azure' ? 'wn-type-az' : 'wn-type-system'}">\${n.type}</span>
            </div>
            <div class="wn-text">\${n.text}</div>
          </div>
        </div>
      \`).join('') || '<div class="sn-empty">No work notes yet.</div>'}
    </div>
  \`;

  const footer = document.getElementById('modal-footer');
  footer.innerHTML = '';
  if (t.approvalState === 'requested') {
    const btn = document.createElement('button');
    btn.className = 'sn-btn-primary';
    btn.textContent = 'Approve & Trigger Azure';
    btn.onclick = () => { approveTicket(t.number); closeModal(); };
    footer.appendChild(btn);
  }
  const closebtn = document.createElement('button');
  closebtn.className = 'sn-btn-secondary';
  closebtn.textContent = 'Close';
  closebtn.onclick = closeModal;
  footer.appendChild(closebtn);

  document.getElementById('ticket-modal').classList.remove('hidden');
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('ticket-modal')) return;
  document.getElementById('ticket-modal').classList.add('hidden');
}

// ── Live action strip ─────────────────────────────────────────────────────────
function addAction(msg) {
  actionQueue.unshift(msg);
  if (actionQueue.length > 5) actionQueue.pop();
  const feed = document.getElementById('action-feed');
  if (!feed) return;
  feed.innerHTML = actionQueue.map((m, i) =>
    \`<span class="action-item \${i === 0 ? 'new-item' : ''}">\${m}</span>\`
  ).join('');
}

// ── Demo Reset ────────────────────────────────────────────────────────────────
function resetDemo() {
  if (!confirm('Reset all demo state? This will restore all users to active and clear all tickets.')) return;
  fetch(API + '/reset', { method: 'POST' })
    .then(() => { snowTickets = []; loadUsers(); loadSnowTickets(); addAction('Demo state reset'); })
    .catch(() => alert('Reset failed.'));
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function setEl(id, val) { const e = document.getElementById(id); if (e) e.textContent = val; }
function fmtTime(ts) { if (!ts) return '-'; return new Date(ts).toLocaleTimeString('en-AU', { hour:'2-digit', minute:'2-digit', second:'2-digit' }); }
function fmtDate(ts) { if (!ts) return '-'; return new Date(ts).toLocaleDateString('en-AU', { day:'2-digit', month:'short' }); }
function snStateCss(s) {
  const m = { 'New':'sn-new', 'Open':'sn-open', 'In Progress':'sn-inprog', 'Closed - Complete':'sn-resolved', 'Resolved':'sn-resolved', 'Cancelled':'sn-cancelled' };
  return m[s] || 'sn-open';
}
function snaStateCss(s) {
  const m = { 'requested':'sna-requested', 'approved':'sna-approved', 'rejected':'sna-rejected', 'not_required':'sna-approved' };
  return m[s] || 'sna-requested';
}
`;

fs.writeFileSync(path.join(dashDir, 'app.js'), js.trimStart(), 'utf8');
console.log('app.js written (' + js.length + ' bytes)');

console.log('\\nAll dashboard files written successfully.');
