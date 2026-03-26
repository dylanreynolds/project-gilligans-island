# OffboardIQ — Enterprise Offboarding Automation Mock Server

> **Hackathon Demo Project** — A fully functional MCP (Model Context Protocol) server that simulates enterprise employee offboarding across Microsoft 365, Azure, and Teams Calling — without touching a real tenant.

![Status](https://img.shields.io/badge/status-hackathon--ready-brightgreen)
![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)

---

## What Is This?

OffboardIQ lets you demonstrate and test **enterprise IT offboarding automation** using:

- A **local MCP server** that exposes 31 tools covering every offboarding task
- A **live dashboard** at `http://localhost:3000` that shows real-time state changes
- **25 pre-built fake M365 users** (mirroring the M365 Developer Program sample tenant) complete with Teams Calling phone numbers, E5 licenses, AVD host pool assignments, and hardware

An AI agent (GitHub Copilot, Claude, etc.) or PowerShell script calls these tools and the dashboard reflects every action as it happens — no real Azure or Microsoft 365 tenant required.

---

## Quick Start (3 steps)

```
1. Double-click  SETUP.bat          ← installs everything
2. Double-click  START-SERVER.bat   ← starts the server + opens dashboard
3. Double-click  RUN-DEMO.bat       ← pick a demo scenario
```

See [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) for the full walkthrough.

---

## What Gets Automated

| # | Offboarding Task | Mock API Surfaces |
|---|---|---|
| 1 | **Identity & Access** | Entra ID account disable, session revoke, group/role removal |
| 2 | **Teams & Telephony** | Enterprise Voice, phone number release, call forwarding, voicemail |
| 3 | **New Hire Voicemail & Phone Setup** | Assign phone number, enable Teams Calling, configure voicemail |
| 4 | **M365 Licensing** | E5, Teams Phone, Audio Conferencing — assign and remove |
| 5 | **Mailbox Access** | OOO auto-reply, delegate access, convert to Shared Mailbox |
| 6 | **User Access** | Group memberships, RBAC roles, SSO sessions |
| 7 | **Azure Virtual Desktop** | Session disconnect, host pool removal |
| 8 | **Hardware Discovery** | CMDB asset lookup, return shipment ticket generation |
| 9 | **Printer Access** | Universal Print security group removal |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        OffboardIQ System                            │
│                                                                     │
│  ┌───────────────┐    stdio     ┌──────────────────────────────┐   │
│  │  AI Agent     │◄────────────►│  MCP Server (node dist/server)│   │
│  │  (Copilot /   │              │                              │   │
│  │   Claude etc) │              │  31 Tools across 8 categories│   │
│  └───────────────┘              │                              │   │
│                                 │  In-Memory State Store       │   │
│  ┌───────────────┐    HTTP      │  (25 mock M365 users)        │   │
│  │  Demo Scripts │◄────────────►│                              │   │
│  │  (PowerShell) │  :3000/api   │  Express HTTP API            │   │
│  └───────────────┘              └──────────────┬───────────────┘   │
│                                                │                   │
│  ┌─────────────────────────────────────────────▼───────────────┐   │
│  │          Live Dashboard  http://localhost:3000              │   │
│  │  User list · Checklist · Teams config · Audit log feed      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
hackathon-offboarding-mcp/
├── SETUP.bat               ← Run first — installs & builds
├── START-SERVER.bat        ← Starts server + opens dashboard
├── RUN-DEMO.bat            ← Demo menu (pick a scenario)
├── RESET-DEMO.bat          ← Restore all users to Active
│
├── src/
│   ├── server.ts           ← MCP + HTTP server entry point
│   ├── data/mockData.ts    ← 25 M365 users with full profiles
│   ├── state/store.ts      ← In-memory state (shared between tools)
│   └── tools/
│       ├── identity.ts     ← Entra ID / Azure AD tools
│       ├── teams.ts        ← Teams & Telephony tools
│       ├── licensing.ts    ← M365 license tools
│       ├── mailbox.ts      ← Exchange Online tools
│       ├── avd.ts          ← Azure Virtual Desktop tools
│       ├── hardware.ts     ← CMDB / Hardware tools
│       ├── printer.ts      ← Universal Print tools
│       └── orchestration.ts← Full workflow + audit tools
│
├── dashboard/
│   ├── index.html          ← Dashboard UI
│   ├── styles.css
│   └── app.js
│
├── demo/
│   └── offboarding-demo.ps1← PowerShell runbook simulation
│
├── docs/
│   ├── GETTING-STARTED.md  ← Full setup guide (start here)
│   ├── DEPENDENCIES.md     ← What to install
│   └── TOOLS-REFERENCE.md  ← All 31 MCP tools
│
├── dist/                   ← Compiled output (auto-generated)
├── .mcp.json               ← MCP server config for VS Code Copilot
├── package.json
└── tsconfig.json
```

---

## Using with GitHub Copilot (Agent Mode)

The `.mcp.json` file at the project root registers this server with VS Code Copilot automatically. Once the server is running:

1. Open **GitHub Copilot Chat** → switch to **Agent mode**
2. Ask in plain English:

```
Offboard Adele Vance
```
```
What Teams Calling licenses does Isaiah Langer have?
```
```
Discover all hardware assigned to Allan Deyoung and create a return ticket
```
```
Show me the offboarding status for all users currently being processed
```

---

## API Endpoints (for scripting / Postman)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | All 25 users with current status |
| GET | `/api/users/:id` | Full profile for one user |
| GET | `/api/summary` | Tenant-level counts |
| GET | `/api/audit-log` | Full audit trail (`?userId=usr-001&limit=20`) |
| GET | `/api/offboarding-tasks` | All active/completed workflows |
| POST | `/api/reset` | Reset all state to initial data |

---

## License

MIT — built for hackathon use. Not for production.
