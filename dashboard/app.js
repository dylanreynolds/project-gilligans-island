// ============================================================
// OffboardIQ Dashboard — Live polling UI
// Polls /api/users and /api/audit-log every 2 seconds
// ============================================================

const POLL_INTERVAL = 2000;

let allUsers = [];
let selectedUserId = null;
let currentFilter = "all";
let searchQuery = "";
let lastAuditCount = 0;
let activeTab = "checklist";

const AVATAR_COLORS = [
  "#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981",
  "#06b6d4","#6366f1","#ef4444","#84cc16","#f97316",
];

function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name) {
  const parts = name.split(" ");
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// ---- Fetch & Render ----

async function fetchAll() {
  try {
    const [usersRes, auditRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/audit-log?limit=6"),
    ]);
    allUsers = await usersRes.json();
    const { entries: auditEntries } = await auditRes.json();

    renderSummary();
    renderUserList();
    if (selectedUserId) renderUserDetail(allUsers.find((u) => u.id === selectedUserId));
    renderAuditFeed(auditEntries);

    document.getElementById("connection-status").innerHTML =
      `<span class="dot green"></span> Live`;
  } catch {
    document.getElementById("connection-status").innerHTML =
      `<span class="dot red"></span> Disconnected`;
  }
}

function renderSummary() {
  document.getElementById("stat-active").textContent =
    allUsers.filter((u) => u.status === "active").length;
  document.getElementById("stat-offboarding").textContent =
    allUsers.filter((u) => u.status === "offboarding").length;
  document.getElementById("stat-offboarded").textContent =
    allUsers.filter((u) => u.status === "offboarded").length;
}

function filteredUsers() {
  return allUsers
    .filter((u) => currentFilter === "all" || u.status === currentFilter)
    .filter((u) =>
      !searchQuery ||
      u.displayName.toLowerCase().includes(searchQuery) ||
      u.department.toLowerCase().includes(searchQuery)
    );
}

function renderUserList() {
  const ul = document.getElementById("user-list");
  const users = filteredUsers();
  if (!users.length) {
    ul.innerHTML = `<div class="loading">No users match filter</div>`;
    return;
  }

  ul.innerHTML = users.map((u) => {
    const color = avatarColor(u.displayName);
    const dotClass = `dot-${u.status}`;
    const selected = u.id === selectedUserId ? " selected" : "";
    return `
      <div class="user-item${selected}" onclick="selectUser('${u.id}')">
        <div class="user-avatar-sm" style="background:${color}22;color:${color};">${initials(u.displayName)}</div>
        <div class="user-item-info">
          <div class="user-item-name">${u.displayName}</div>
          <div class="user-item-dept">${u.department}</div>
        </div>
        <div class="user-status-dot ${dotClass}" title="${u.status}"></div>
      </div>`;
  }).join("");
}

function renderAuditFeed(entries) {
  if (entries.length === lastAuditCount) return;
  lastAuditCount = entries.length;

  const feed = document.getElementById("audit-feed");
  feed.innerHTML = entries.map((e) => {
    const time = new Date(e.timestamp).toLocaleTimeString("en-AU");
    return `<div class="audit-entry">
      <span class="ae-user">${e.userName.split(" ")[0]}</span>
      <span class="ae-action">→ ${e.action}</span>
      <span class="ae-time">${time}</span>
    </div>`;
  }).reverse().join("");
}

// ---- User Detail ----

function selectUser(id) {
  selectedUserId = id;
  document.getElementById("welcome-panel").classList.add("hidden");
  document.getElementById("user-panel").classList.remove("hidden");
  renderUserList();
  const user = allUsers.find((u) => u.id === id);
  if (user) renderUserDetail(user);
}

function renderUserDetail(user) {
  if (!user) return;

  const color = avatarColor(user.displayName);
  document.getElementById("detail-avatar").textContent = initials(user.displayName);
  document.getElementById("detail-avatar").style.background = `${color}22`;
  document.getElementById("detail-avatar").style.color = color;
  document.getElementById("detail-name").textContent = user.displayName;
  document.getElementById("detail-title-dept").textContent = `${user.jobTitle} · ${user.department} · ${user.officeLocation}`;
  document.getElementById("detail-contact").textContent = `${user.userPrincipalName} · ${user.phoneNumber ?? ""}`;

  const badge = document.getElementById("detail-status-badge");
  badge.textContent = user.status.charAt(0).toUpperCase() + user.status.slice(1);
  badge.className = `status-badge status-${user.status}`;
  document.getElementById("detail-account-state").textContent =
    user.accountEnabled ? "✅ Account Enabled" : "🔒 Account Disabled";
  document.getElementById("detail-account-state").style.color =
    user.accountEnabled ? "var(--success)" : "var(--error)";
  document.getElementById("detail-account-state").style.fontSize = "12px";
  document.getElementById("detail-account-state").style.marginTop = "4px";

  // Render active tab
  if (activeTab === "checklist") renderChecklist(user);
  else if (activeTab === "identity") renderIdentity(user);
  else if (activeTab === "teams") renderTeams(user);
  else if (activeTab === "hardware") renderHardware(user);
  else if (activeTab === "avd") renderAvd(user);
  else if (activeTab === "audit") renderAuditTab(user.id);
}

function renderChecklist(user) {
  const grid = document.getElementById("checklist-grid");
  const cl = user.checklist;
  if (!cl) {
    grid.innerHTML = `<div class="loading" style="grid-column:1/-1">No offboarding task started. Ask the AI: <em>Offboard ${user.displayName}</em></div>`;
    return;
  }
  const items = [
    { key: "identity",        icon: "🔐", label: "Identity & Access",        sub: "Disable account, revoke sessions, remove groups/roles" },
    { key: "teamsAndCalling", icon: "📞", label: "Teams & Calling",           sub: "Disable voice, release phone number, set voicemail" },
    { key: "licensing",       icon: "🎫", label: "M365 Licensing",            sub: "Remove all assigned licenses" },
    { key: "mailbox",         icon: "📧", label: "Mailbox",                   sub: "OOO reply, delegate access, convert to shared" },
    { key: "avd",             icon: "🖥️", label: "Azure Virtual Desktop",     sub: "Disconnect sessions, remove host pool access" },
    { key: "hardware",        icon: "💻", label: "Hardware Discovery",         sub: "Asset report and return shipment created" },
    { key: "printerAccess",   icon: "🖨️", label: "Printer Access",            sub: "Removed from all printer security groups" },
  ];
  grid.innerHTML = items.map((item) => {
    const done = cl[item.key];
    const cls = done ? "done" : "pending";
    return `
      <div class="checklist-card ${cls}">
        <div class="checklist-icon">${item.icon}</div>
        <div>
          <div class="checklist-label">${item.label}</div>
          <div class="checklist-sub">${item.sub}</div>
        </div>
        <div class="checklist-tick">${done ? "✅" : "⬜"}</div>
      </div>`;
  }).join("");
}

function renderIdentity(user) {
  const grid = document.getElementById("identity-grid");
  grid.innerHTML = `
    ${infoCard("Account State",   user.accountEnabled ? "Enabled" : "Disabled",       user.accountEnabled ? "ok" : "error")}
    ${infoCard("Sessions Revoked", user.sessionsRevoked ? "Yes — all tokens invalidated" : "No", user.sessionsRevoked ? "ok" : "warn")}
    ${infoCard("Password Reset",  user.passwordReset ? "Yes" : "No", user.passwordReset ? "ok" : "warn")}
    ${infoCard("Group Memberships", user.licenseCount + " licenses",   "")}
    ${infoCard("UPN",             user.userPrincipalName, "muted")}
    ${infoCard("User ID",         user.id, "muted")}
  `;
}

function renderTeams(user) {
  const t = user.teamsConfig ?? {};
  const grid = document.getElementById("teams-grid");
  grid.innerHTML = `
    ${infoCard("Enterprise Voice",  t.enterpriseVoiceEnabled ? "Enabled" : "Disabled",  t.enterpriseVoiceEnabled ? "ok" : "error")}
    ${infoCard("Phone Number",       t.phoneNumber ?? "None — Released to pool",          t.phoneNumber ? "ok" : "muted")}
    ${infoCard("Voice Routing Policy", t.voiceRoutingPolicy ?? "None",                   t.voiceRoutingPolicy ? "ok" : "muted")}
    ${infoCard("Calling Policy",     t.callingPolicy ?? "None",                           t.callingPolicy ? "ok" : "muted")}
    ${infoCard("Dial Plan",          t.dialPlan ?? "None",                                t.dialPlan ? "ok" : "muted")}
    ${infoCard("Call Forwarding",    t.callForwardingTarget ?? "Not set",                 t.callForwardingTarget ? "warn" : "muted")}
    ${infoCard("M365 Licenses",      (user.licenseCount ?? 0) + " assigned",             user.licenseCount > 0 ? "ok" : "error")}
    ${infoCard("Teams Calling License", user.licenseCount > 0 ? "Assigned" : "Removed",  user.licenseCount > 0 ? "ok" : "error")}
  `;
}

function renderHardware(user) {
  const container = document.getElementById("hardware-table");
  // Fetch full user for hardware details
  fetch(`/api/users/${user.id}`)
    .then((r) => r.json())
    .then((full) => {
      if (!full.hardware?.length) {
        container.innerHTML = "<div class='loading'>No hardware assigned.</div>";
        return;
      }
      container.innerHTML = `<table>
        <thead><tr><th>Type</th><th>Make / Model</th><th>Serial Number</th><th>Asset Tag</th><th>Location</th><th>Status</th><th>Return Ticket</th></tr></thead>
        <tbody>${full.hardware.map((h) => `
          <tr>
            <td>${h.type}</td>
            <td>${h.make} ${h.model}</td>
            <td><code>${h.serialNumber}</code></td>
            <td><code>${h.assetTag}</code></td>
            <td>${h.location}</td>
            <td><span class="tag tag-${h.status}">${h.status.replace("_", " ")}</span></td>
            <td>${h.returnTicket ? `<code>${h.returnTicket}</code>` : "—"}</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
    });
}

function renderAvd(user) {
  const container = document.getElementById("avd-table");
  fetch(`/api/users/${user.id}`)
    .then((r) => r.json())
    .then((full) => {
      if (!full.avdAssignments?.length) {
        container.innerHTML = "<div class='loading'>No AVD assignments.</div>";
        return;
      }
      container.innerHTML = `<table>
        <thead><tr><th>Host Pool</th><th>Application Group</th><th>Workspace</th><th>Active Sessions</th><th>Status</th></tr></thead>
        <tbody>${full.avdAssignments.map((a) => `
          <tr>
            <td>${a.hostPoolName}</td>
            <td>${a.applicationGroupName}</td>
            <td>${a.workspace}</td>
            <td>${a.activeSessions}</td>
            <td><span class="tag tag-${a.sessionStatus}">${a.sessionStatus}</span></td>
          </tr>`).join("")}
        </tbody>
      </table>`;
    });
}

function renderAuditTab(userId) {
  const container = document.getElementById("audit-table");
  fetch(`/api/audit-log?userId=${userId}&limit=50`)
    .then((r) => r.json())
    .then(({ entries }) => {
      if (!entries.length) {
        container.innerHTML = "<div class='loading'>No audit entries yet.</div>";
        return;
      }
      container.innerHTML = `<table>
        <thead><tr><th>Time</th><th>Action</th><th>Category</th><th>Detail</th><th>Status</th><th>Latency</th></tr></thead>
        <tbody>${[...entries].reverse().map((e) => `
          <tr>
            <td style="white-space:nowrap">${new Date(e.timestamp).toLocaleTimeString("en-AU")}</td>
            <td><strong>${e.action}</strong></td>
            <td>${e.category}</td>
            <td style="max-width:320px;word-break:break-word;font-size:12px">${e.detail}</td>
            <td><span class="tag tag-${e.status}">${e.status}</span></td>
            <td>${e.durationMs}ms</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
    });
}

function infoCard(label, value, cls) {
  return `<div class="info-card">
    <div class="info-card-label">${label}</div>
    <div class="info-card-value ${cls}">${value}</div>
  </div>`;
}

// ---- Tab switching ----
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.add("hidden"));
    btn.classList.add("active");
    const tabId = btn.dataset.tab;
    activeTab = tabId;
    document.getElementById(`tab-${tabId}`).classList.remove("hidden");
    const user = allUsers.find((u) => u.id === selectedUserId);
    if (user) renderUserDetail(user);
  });
});

// ---- Filter buttons ----
document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderUserList();
  });
});

// ---- Search ----
document.getElementById("search").addEventListener("input", (e) => {
  searchQuery = e.target.value.toLowerCase();
  renderUserList();
});

// ---- Reset ----
async function resetDemo() {
  if (!confirm("Reset all users to Active state? This will clear the audit log and all offboarding progress.")) return;
  await fetch("/api/reset", { method: "POST" });
  selectedUserId = null;
  document.getElementById("welcome-panel").classList.remove("hidden");
  document.getElementById("user-panel").classList.add("hidden");
  lastAuditCount = 0;
  await fetchAll();
}

// ---- Init ----
fetchAll();
setInterval(fetchAll, POLL_INTERVAL);
