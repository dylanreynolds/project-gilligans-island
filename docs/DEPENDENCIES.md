# Dependencies

## Required to Run

| Dependency | Version | Purpose | Download |
|---|---|---|---|
| **Node.js** | v18 or higher (LTS recommended) | JavaScript runtime — powers the mock server | https://nodejs.org/en/download |

That's it. Everything else is installed automatically by `SETUP.bat` / `npm install`.

---

## Installed Automatically by SETUP.bat

These are downloaded from npm and do not require manual installation:

| Package | Version | What It Does |
|---|---|---|
| `@modelcontextprotocol/sdk` | ^1.10.2 | MCP server framework — lets AI agents call the tools |
| `express` | ^4.18.2 | HTTP server that powers the dashboard and REST API |
| `zod` | ^3.22.4 | Input validation for tool parameters |
| `typescript` | ^5.3.3 | TypeScript compiler (dev only) |
| `ts-node` | ^10.9.2 | Run TypeScript directly (dev only) |
| `@types/node` | ^20.11.5 | TypeScript type definitions |
| `@types/express` | ^4.17.21 | TypeScript type definitions for Express |

---

## Optional — For AI-Driven Demo (Recommended for Hackathon)

To use OffboardIQ with GitHub Copilot Agent mode:

| Tool | Version | Purpose | Download |
|---|---|---|---|
| **VS Code** | Latest | Editor that hosts Copilot | https://code.visualstudio.com |
| **GitHub Copilot extension** | Latest | AI agent that calls MCP tools | VS Code Extensions Marketplace |

> **Note:** GitHub Copilot requires a paid GitHub account or active Copilot trial.

---

## Optional — For the PowerShell Demo Script

The `RUN-DEMO.bat` script calls `demo\offboarding-demo.ps1`.

- **PowerShell** is included in Windows 10/11 — no installation needed
- The script uses `Invoke-RestMethod` (built into PowerShell) — no extra modules required
- `curl` is used in the batch files for the reset command — included in Windows 10 v1803+

---

## Does NOT Require

- Microsoft 365 tenant or subscription
- Azure subscription
- Teams admin access
- Any Microsoft credentials
- An internet connection after setup (only npm install needs internet)

---

## Verified Working On

- Windows 10 (version 1803 or later)
- Windows 11

---

## Port Usage

The server uses **port 3000** by default. If something else is already using port 3000:

1. Open `START-SERVER.bat` in Notepad
2. Add this line before the `node dist\server.js` line:
   ```
   set PORT=3001
   ```
3. Update the URLs in `RUN-DEMO.bat` from `3000` to `3001`
4. Access the dashboard at `http://localhost:3001`
