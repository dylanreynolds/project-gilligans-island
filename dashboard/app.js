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
  document.getElementById('view-toggle-snow').checked = e.target.checked;
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
    azUsers = Array.isArray(data) ? data : (data.users || []);
    const sr = await fetch(API + '/summary');
    if (sr.ok) updateAzSummary(await sr.json());
    renderAzUsersTable();
    populateSnowEmployeeSelect();
    if (selectedUser) refreshDrawer();
  } catch {}
}

function updateAzSummary(s) {
  if (!s) return;
  setEl('az-stat-active',     s.active      ?? '-');
  setEl('az-stat-processing', s.offboarding  ?? '-');
  setEl('az-stat-done',       s.offboarded   ?? '-');
  setEl('az-stat-audit',      s.auditEntries ?? '-');
}

function renderAzUsersTable() {
  const wrap = document.getElementById('az-users-table');
  if (!wrap) return;
  const search = (document.getElementById('az-user-search')?.value || '').toLowerCase();
  const filtered = azUsers.filter(u => {
    if (search && !u.displayName.toLowerCase().includes(search) && !u.department?.toLowerCase().includes(search) && !u.userPrincipalName?.toLowerCase().includes(search)) return false;
    if (currentAzFilter === 'active' && u.status !== 'active') return false;
    if (currentAzFilter === 'offboarding' && u.status !== 'offboarding') return false;
    if (currentAzFilter === 'offboarded' && u.status !== 'offboarded') return false;
    return true;
  });
  if (filtered.length === 0) { wrap.innerHTML = '<div class="az-empty">No users match the filter.</div>'; return; }
  wrap.innerHTML = `
    <div class="az-found-count">${azUsers.length.toLocaleString()} users found</div>
    <div class="az-user-table-wrap">
      <table class="az-table">
        <thead><tr>
          <th class="az-th-chk"><input type="checkbox" /></th>
          <th>Display name &#8593;</th>
          <th>User principal name &#8593;&#8595;</th>
          <th>User type</th>
          <th>Is Agent</th>
          <th>On-premises sync</th>
          <th>Identities</th>
          <th>Company name</th>
        </tr></thead>
        <tbody>
          ${filtered.map(u => {
            const initials = u.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const upnShort = u.userPrincipalName.length > 28 ? u.userPrincipalName.substring(0, 28) + '\u2026' : u.userPrincipalName;
            const onPrem = u.status !== 'offboarded' ? 'Yes' : 'No';
            return `<tr onclick="selectUser('${u.id}')">
              <td class="az-td-chk" onclick="event.stopPropagation()"><input type="checkbox" /></td>
              <td><div class="az-user-cell"><div class="az-ucell-init">${initials}</div><span class="az-ucell-name">${u.displayName}</span></div></td>
              <td class="az-td-upn">${upnShort} <button class="az-copy-btn" title="Copy UPN" onclick="event.stopPropagation();navigator.clipboard&&navigator.clipboard.writeText('${u.userPrincipalName}')">&#128203;</button></td>
              <td><span class="az-type-badge">Member</span></td>
              <td class="az-td-meta">No</td>
              <td class="az-td-meta">${onPrem}</td>
              <td><span class="az-identity-badge">FWH.onmicrosoft.com</span></td>
              <td class="az-td-meta">Franchise World HQ</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
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

async function selectUser(id) {
  const basic = azUsers.find(u => u.id === id);
  if (!basic) return;
  azTab('users');
  try {
    const r = await fetch(API + '/users/' + encodeURIComponent(id));
    selectedUser = r.ok ? await r.json() : basic;
  } catch { selectedUser = basic; }
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
    c.innerHTML = `
      <div class="dr-section">Identity</div>
      ${drProp('User ID', u.id)}
      ${drProp('UPN', u.userPrincipalName)}
      ${drProp('Email', u.mail || u.userPrincipalName)}
      ${drProp('Status', u.status)}
      ${drProp('Account Enabled', u.accountEnabled ? 'Yes' : 'No')}
      ${drProp('Sessions Active', u.sessionsRevoked ? 'Revoked' : 'Active')}
      <div class="dr-section">Organisation</div>
      ${drProp('Job Title', u.jobTitle)}
      ${drProp('Department', u.department)}
      ${drProp('Manager', u.managerName || u.manager || '-')}
      ${drProp('Location', u.officeLocation || '-')}
      <div class="dr-section">Licensing</div>
      ${drProp('Licenses', (u.licenses || []).map(l => l.skuName || l.skuId).join(', ') || 'None')}
      ${drProp('Groups', (u.groupMemberships?.length || 0) + ' groups')}
      ${drProp('Roles', (u.roleAssignments?.length || 0) + ' roles')}
    `;
  } else if (tab === 'teams') {
    const t = u.teamsConfig || {};
    c.innerHTML = `
      <div class="dr-section">Teams Calling</div>
      ${drProp('Enterprise Voice', t.enterpriseVoiceEnabled ? 'Enabled' : 'Disabled')}
      ${drProp('Phone Number', t.phoneNumber || 'None')}
      ${drProp('Call Forwarding', t.callForwardingEnabled ? t.forwardTarget || 'On' : 'Off')}
      ${drProp('Voicemail', t.voicemailEnabled ? 'Enabled' : 'Disabled')}
      ${drProp('Teams Policy', t.teamsCallingPolicy || '-')}
    `;
  } else if (tab === 'hardware') {
    const hw = u.hardware || [];
    c.innerHTML = hw.length ? hw.map(h => `
      <div style="background:#0c1020;border:1px solid #1e2a3a;border-radius:4px;padding:12px;margin-bottom:8px">
        <div style="color:#5898d8;font-weight:600;margin-bottom:6px">${h.type} — ${h.model}</div>
        ${drProp('Serial', h.serialNumber)}
        ${drProp('Asset Tag', h.assetTag)}
        ${drProp('Status', h.returnStatus || 'Assigned')}
      </div>
    `).join('') : '<div class="az-empty">No hardware assigned.</div>';
  } else if (tab === 'avd') {
    const avd = u.avdAssignments || [];
    c.innerHTML = avd.length ? avd.map(a => `
      <div style="background:#0c1020;border:1px solid #1e2a3a;border-radius:4px;padding:12px;margin-bottom:8px">
        <div style="color:#5898d8;font-weight:600;margin-bottom:6px">${a.hostPoolName}</div>
        ${drProp('App Group', a.applicationGroup)}
        ${drProp('Subscription', a.subscriptionId || '-')}
        ${drProp('Status', a.removed ? 'Access Removed' : 'Access Active')}
      </div>
    `).join('') : '<div class="az-empty">No AVD assignments.</div>';
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
    container.innerHTML = entries.slice(-20).reverse().map(e => `
      <div class="az-audit-row">
        <span class="az-audit-time">${fmtTime(e.timestamp)}</span>
        <span class="az-audit-tool">${e.tool}</span>
        <span class="az-audit-result">${e.result?.substring(0, 80) || ''}</span>
      </div>
    `).join('');
  } catch {}
}

function drProp(label, val) {
  return `<div class="dr-prop"><span class="dr-prop-label">${label}</span><span class="dr-prop-val">${val ?? '-'}</span></div>`;
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
  const wrap = document.getElementById('az-audit-full');
  if (!wrap) return;

  // Build rich Azure Monitor-style entries from live ticket data
  const rows = [];

  // Always show the Logic App and Automation Account as registered
  rows.push({
    time: new Date(Date.now() - 86400000 * 2).toISOString(),
    category: 'Administrative',
    operation: 'Microsoft.Logic/workflows/write',
    caller: 'svc-offboard-auto@subway.onmicrosoft.com',
    resource: 'la-offboarding-orchestrator',
    status: 'Succeeded',
    detail: 'Logic App workflow enabled. HTTP trigger endpoint active.'
  });
  rows.push({
    time: new Date(Date.now() - 86400000 * 2 + 5000).toISOString(),
    category: 'Administrative',
    operation: 'Microsoft.Automation/automationAccounts/runbooks/write',
    caller: 'svc-offboard-auto@subway.onmicrosoft.com',
    resource: 'Invoke-FullOffboardOrchestrator',
    status: 'Succeeded',
    detail: 'Runbook published. Version: 1.0.4'
  });

  // One row set per ticket that has been approved and triggered Azure
  for (const t of snowTickets.filter(x => x.azureLogicAppRunId)) {
    const base = new Date(t.approvedAt || t.updatedAt || Date.now()).getTime();
    rows.push({
      time: new Date(base).toISOString(),
      category: 'ServiceNow Webhook',
      operation: 'Microsoft.Logic/workflows/triggers/run',
      caller: 'svc-offboardiq@subway.service-now.com',
      resource: 'la-offboarding-orchestrator / triggers / manual',
      status: 'Accepted',
      detail: `SNOW ticket ${t.number} approved. Employee: ${t.employeeName}. HTTP 202 Accepted. Run: ${t.azureLogicAppRunId}`
    });
    rows.push({
      time: new Date(base + 1200).toISOString(),
      category: 'Logic App',
      operation: 'Microsoft.Logic/workflows/runs/actions/listExpressionTraces',
      caller: 'la-offboarding-orchestrator',
      resource: `runs/${t.azureLogicAppRunId}/actions/Parse_JSON`,
      status: 'Succeeded',
      detail: `Payload parsed. employeeId=${t.employeeId || t.affectedUserId || '-'}, ticketNumber=${t.number}`
    });
    rows.push({
      time: new Date(base + 3000).toISOString(),
      category: 'Logic App',
      operation: 'Microsoft.Automation/automationAccounts/jobs/write',
      caller: 'la-offboarding-orchestrator',
      resource: `aa-offboarding-prod / jobs / ${t.azureRunbookJobId}`,
      status: 'Created',
      detail: `New-AzAutomationJob — RunbookName: Invoke-FullOffboardOrchestrator, JobId: ${t.azureRunbookJobId}`
    });
    // Runbook task steps
    const tasks = [
      ['Invoke-IdentityOffboard',    'Account disabled. Sessions revoked. Groups removed.'],
      ['Invoke-TeamsPhoneOffboard',  'Enterprise Voice disabled. DDI released. Forwarding set.'],
      ['Invoke-LicenseReclaim',      'M365 E5 + Teams Phone + Audio Conf licenses reclaimed.'],
      ['Invoke-MailboxOffboard',     'Auto-reply set. Mailbox converted to Shared.'],
      ['Invoke-AVDOffboard',         'AVD sessions disconnected. App group access removed.'],
      ['Invoke-HardwareDiscovery',   'CMDB queried. Return shipment ticket generated.'],
    ];
    tasks.forEach(([rb, detail], i) => {
      rows.push({
        time: new Date(base + 5000 + i * 8000).toISOString(),
        category: 'Automation',
        operation: `Microsoft.Automation/automationAccounts/jobs/output`,
        caller: `aa-offboarding-prod / ${t.azureRunbookJobId}`,
        resource: rb,
        status: 'Succeeded',
        detail
      });
    });
    if (t.state === 'Resolved') {
      rows.push({
        time: new Date(base + 60000).toISOString(),
        category: 'Automation',
        operation: 'Microsoft.Automation/automationAccounts/jobs/write',
        caller: 'aa-offboarding-prod',
        resource: `jobs/${t.azureRunbookJobId}`,
        status: 'Completed',
        detail: `Job completed. ExitCode: 0. ServiceNow callback sent. Ticket ${t.number} resolved.`
      });
    }
  }

  rows.sort((a, b) => new Date(b.time) - new Date(a.time));

  const catColor = {
    'ServiceNow Webhook': '#e89040',
    'Logic App':          '#4a90d8',
    'Automation':         '#36c45a',
    'Administrative':     '#6888a8'
  };
  const statusColor = {
    'Succeeded': '#36c45a', 'Completed': '#36c45a',
    'Accepted':  '#4a90d8', 'Created':   '#4a90d8',
    'Failed':    '#e84040', 'Running':   '#e89040'
  };

  wrap.innerHTML = `
    <div style="display:grid;grid-template-columns:160px 180px 1fr 160px 80px;gap:0;border-bottom:1px solid #1e2a3a;padding:6px 0 6px 4px;margin-bottom:4px">
      <span style="font-size:10px;color:#3a5878;text-transform:uppercase;letter-spacing:.8px">Time</span>
      <span style="font-size:10px;color:#3a5878;text-transform:uppercase;letter-spacing:.8px">Category</span>
      <span style="font-size:10px;color:#3a5878;text-transform:uppercase;letter-spacing:.8px">Operation / Resource</span>
      <span style="font-size:10px;color:#3a5878;text-transform:uppercase;letter-spacing:.8px">Caller</span>
      <span style="font-size:10px;color:#3a5878;text-transform:uppercase;letter-spacing:.8px">Status</span>
    </div>
    ${rows.map(r => `
    <div class="az-audit-row" style="grid-template-columns:160px 180px 1fr 160px 80px;align-items:start;cursor:default" title="${r.detail.replace(/"/g,'&quot;')}">
      <span class="az-audit-time">${fmtTime(r.time)}</span>
      <span style="font-size:11px;color:${catColor[r.category]||'#6888a8'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.category}</span>
      <span style="display:flex;flex-direction:column;gap:2px">
        <span style="font-size:11px;color:#4a90d8;font-family:'Cascadia Code',monospace">${r.operation}</span>
        <span style="font-size:10px;color:#3a5878">${r.resource}</span>
        <span style="font-size:10px;color:#5a7a6a">${r.detail.substring(0,90)}${r.detail.length>90?'…':''}</span>
      </span>
      <span style="font-size:10px;color:#3a6888;font-family:'Cascadia Code',monospace;word-break:break-all">${r.caller.length>30?r.caller.substring(0,30)+'…':r.caller}</span>
      <span style="font-size:11px;font-weight:600;color:${statusColor[r.status]||'#6888a8'}">${r.status}</span>
    </div>`).join('')}
  `;
}

function renderLogicAppRuns() {
  const el = document.getElementById('az-la-runs');
  if (!el) return;
  const azTickets = snowTickets.filter(t => t.azureLogicAppRunId);
  if (!azTickets.length) { el.innerHTML = '<div class="az-empty">No runs yet.</div>'; return; }
  el.innerHTML = azTickets.map(t => {
    const cls = t.state === 'Resolved' ? 'run-succeeded' : t.state === 'In Progress' ? 'run-running' : 'run-running';
    const label = t.state === 'Resolved' ? 'Succeeded' : 'Running';
    return `<div class="az-la-run">
      <span class="az-la-run-id">${t.azureLogicAppRunId}</span>
      <span style="font-size:11px;color:#3a6888">${t.number}</span>
      <span style="font-size:11px;color:#6888a8">${t.employeeName}</span>
      <span class="az-la-run-status ${cls}">${label}</span>
    </div>`;
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
  const steps = t.workNotes ? t.workNotes.filter(n => n.type === 'azure').map(n => n.text).join('\n') : '(waiting for runbook output...)';
  return `
    <div class="az-job-item">
      <div class="az-job-header">
        <span class="az-job-name">Invoke-FullOffboardOrchestrator</span>
        <span class="az-job-id">${t.azureRunbookJobId}</span>
        <span class="az-la-run-status ${state === 'Completed' ? 'run-succeeded' : 'run-running'}">${state}</span>
      </div>
      <div style="font-size:12px;color:#4a6888;margin-bottom:8px">Employee: ${t.employeeName} · Ticket: ${t.number}</div>
      <div class="az-job-output">${steps || '> Waiting for Runbook output...'}</div>
    </div>
  `;
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
    if (currentAzTab === 'audit') loadFullAudit();
    if (currentAzTab === 'logicapps') renderLogicAppRuns();
    if (currentAzTab === 'jobs') renderJobsTab();
    if (currentAzTab === 'audit') loadFullAudit();
    renderJobsPanel(snowTickets);
  } catch {}
}

function updateSnBadges() {
  const open = snowTickets.filter(t => t.state !== 'Resolved' && t.state !== 'Cancelled').length;
  const pend = snowTickets.filter(t => t.approvalState === 'requested').length;
  setEl('sn-badge-open', open);
  setEl('sn-badge-approvals', pend);
}

// ── Populate snow employee select ────────────────────────────────────────────
function populateSnowEmployeeSelect() {
  const sel = document.getElementById('sn-emp-select');
  if (azUsers.length === 0) return;
  const active = azUsers.filter(u => u.status === 'active');
  const opts = active.map(u => `<option value="${u.id}">${u.displayName} — ${u.department || ''}</option>`).join('');
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = '<option value="">-- Select employee --</option>' + opts;
    if (cur) sel.value = cur;
  }
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
    body: JSON.stringify({ employeeId: emp.id, employeeName: emp.displayName, employeeEmail: emp.userPrincipalName, reason, requestedBy: reqBy, notes })
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
  el.innerHTML = `
    <div class="sn-table-header">
      <div>Number</div><div>Employee</div><div>Reason</div><div>State</div><div>Approval</div><div>Requested</div>
    </div>
    ${snowTickets.map(t => `
      <div class="sn-table-row" onclick="openTicketModal('${t.number}')">
        <div style="font-family:'Cascadia Code',monospace;color:#5830a0;font-size:12px">${t.number}</div>
        <div style="font-weight:500">${t.employeeName}</div>
        <div style="color:#666">${t.reason}</div>
        <div><span class="sn-status ${snStateCss(t.state)}">${t.state}</span></div>
        <div><span class="sn-approval ${snaStateCss(t.approvalState)}">${t.approvalState}</span></div>
        <div style="font-size:11px;color:#9090a0">${fmtDate(t.createdAt)}</div>
      </div>
    `).join('')}
  `;
}

function renderApprovalsTable() {
  const el = document.getElementById('sn-approvals-table');
  if (!el) return;
  const pending = snowTickets.filter(t => t.approvalState === 'requested');
  if (!pending.length) { el.innerHTML = '<div class="sn-empty">No pending approvals.</div>'; return; }
  el.innerHTML = pending.map(t => `
    <div style="background:#fff;border:1px solid #d0d0d8;border-radius:4px;padding:16px 20px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <span style="font-family:'Cascadia Code',monospace;font-size:12px;color:#5830a0">${t.number}</span>
        <span style="font-weight:600">${t.employeeName}</span>
        <span style="color:#666;font-size:13px">${t.reason}</span>
        <span style="margin-left:auto;font-size:12px;color:#9090a0">${fmtDate(t.createdAt)}</span>
      </div>
      <div style="font-size:13px;color:#666;margin-bottom:12px">Requested by: ${t.requestedBy}</div>
      <div style="display:flex;gap:10px">
        <button class="sn-btn-primary" onclick="approveTicket('${t.number}')">Approve</button>
        <button class="sn-btn-secondary" style="border-color:#f0c0c0;color:#a04040" onclick="openTicketModal('${t.number}')">View Details</button>
      </div>
    </div>
  `).join('');
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
  el.innerHTML = fired.map(t => `
    <div class="sn-ob-call">
      <span class="sn-ob-call-time">${fmtTime(t.approvedAt || t.updatedAt)}</span>
      <span class="sn-ob-call-ticket">${t.number}</span>
      <span class="sn-ob-call-status ob-ok">202 Accepted</span>
      <span class="sn-ob-az-id">RunId: ${t.azureLogicAppRunId}</span>
    </div>
  `).join('');
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
  body.innerHTML = `
    <div class="modal-field-grid">
      <div class="modal-field"><div class="modal-field-label">Employee</div><div class="modal-field-val">${t.employeeName}</div></div>
      <div class="modal-field"><div class="modal-field-label">Email</div><div class="modal-field-val">${t.employeeEmail || '-'}</div></div>
      <div class="modal-field"><div class="modal-field-label">Reason</div><div class="modal-field-val">${t.reason}</div></div>
      <div class="modal-field"><div class="modal-field-label">State</div><div class="modal-field-val"><span class="sn-status ${snStateCss(t.state)}">${t.state}</span></div></div>
      <div class="modal-field"><div class="modal-field-label">Approval</div><div class="modal-field-val"><span class="sn-approval ${snaStateCss(t.approvalState)}">${t.approvalState}</span></div></div>
      <div class="modal-field"><div class="modal-field-label">Requested By</div><div class="modal-field-val">${t.requestedBy}</div></div>
      <div class="modal-field"><div class="modal-field-label">Created</div><div class="modal-field-val">${fmtTime(t.createdAt)}</div></div>
      <div class="modal-field"><div class="modal-field-label">Updated</div><div class="modal-field-val">${fmtTime(t.updatedAt)}</div></div>
    </div>

    ${t.approvalState !== 'requested' && t.approvalState !== 'not_required' ? '' : `
      <div class="modal-section-title">Approval</div>
      <div class="approval-block">
        <div>
          <div class="modal-field-label">Awaiting Manager Approval</div>
          <div class="approval-name">Patti Fernandez (CEO / Global Admin)</div>
        </div>
        <div class="approval-status">
          ${t.approvalState === 'requested' ?
            '<button class="sn-btn-primary" onclick="approveTicket(\'' + t.number + '\');closeModal()">Approve</button>' :
            '<span class="sn-approval sna-approved">Approved</span>'}
        </div>
      </div>
    `}

    ${t.azureLogicAppRunId ? `
      <div class="modal-section-title">Azure Integration</div>
      <div class="az-conn-info">
        <div class="az-conn-row"><span class="az-conn-lbl">Logic App Run ID</span><span class="az-conn-val">${t.azureLogicAppRunId}</span></div>
        <div class="az-conn-row"><span class="az-conn-lbl">Runbook Job ID</span><span class="az-conn-val">${t.azureRunbookJobId}</span></div>
        <div class="az-conn-row"><span class="az-conn-lbl">Approved By</span><span class="az-conn-val">${t.approvedBy || '-'}</span></div>
      </div>
    ` : ''}

    <div class="modal-section-title">Work Notes &amp; Activity</div>
    <div class="worknotes">
      ${(t.workNotes || []).map(n => `
        <div class="wn-item">
          <div class="wn-avatar">${n.author.charAt(0)}</div>
          <div class="wn-content">
            <div class="wn-header">
              <span class="wn-author">${n.author}</span>
              <span class="wn-time">${fmtTime(n.timestamp)}</span>
              <span class="wn-type-badge ${n.type === 'azure' ? 'wn-type-az' : 'wn-type-system'}">${n.type}</span>
            </div>
            <div class="wn-text">${n.text}</div>
          </div>
        </div>
      `).join('') || '<div class="sn-empty">No work notes yet.</div>'}
    </div>
  `;

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
  closebtn.onclick = () => closeModal();
  footer.appendChild(closebtn);

  const overlay = document.getElementById('ticket-modal');
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
  overlay.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('ticket-modal').classList.add('hidden');
}

// ── Live action strip ─────────────────────────────────────────────────────────
function addAction(msg) {
  actionQueue.unshift(msg);
  if (actionQueue.length > 5) actionQueue.pop();
  const feed = document.getElementById('action-feed');
  if (!feed) return;
  feed.innerHTML = actionQueue.map((m, i) =>
    `<span class="action-item ${i === 0 ? 'new-item' : ''}">${m}</span>`
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
