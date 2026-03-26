# Getting Started — OffboardIQ Demo

This guide is written for everyone — no coding experience required. Follow it top to bottom and you'll have a running demo in under 10 minutes.

---

## Prerequisites — What You Need Installed

You only need **one thing** installed before running setup:

### Node.js (required)

Node.js is the runtime that powers the mock server.

1. Go to **https://nodejs.org/en/download**
2. Download the **"LTS" (Long Term Support)** version for Windows
3. Run the installer with all default settings
4. When it finishes, open a new Command Prompt and type: `node --version`
   - You should see something like `v22.0.0` — any version 18 or higher is fine

> **That's it.** Node.js includes npm (the package manager) automatically.

---

## Step 1 — Download the Project

### Option A — Clone with Git (if you have Git installed)
```
git clone https://github.com/YOUR-ORG/hackathon-offboarding-mcp.git
cd hackathon-offboarding-mcp
```

### Option B — Download ZIP (no Git required)
1. Go to the GitHub repository page
2. Click the green **Code** button
3. Click **Download ZIP**
4. Extract the ZIP to a folder on your desktop, e.g. `C:\hackathon-offboarding-mcp`

---

## Step 2 — Run Setup (once only)

Double-click **`SETUP.bat`** in the project folder.

What it does:
- Checks that Node.js is installed
- Downloads all required packages (takes ~1 minute, needs internet)
- Compiles the TypeScript source code

You should see this at the end:
```
[4/4] Building project...
OK  Build complete.

SETUP COMPLETE!
```

> **If you see an error** — see [Troubleshooting](#troubleshooting) at the bottom of this page.

---

## Step 3 — Start the Server

Double-click **`START-SERVER.bat`**.

- A terminal window opens showing the server is running
- Your default browser automatically opens to **http://localhost:3000**
- You should see the OffboardIQ dashboard with 25 active users

> **Keep this window open** while you demo. Closing it stops the server.

---

## Step 4 — Run a Demo

Double-click **`RUN-DEMO.bat`** and pick a scenario from the menu:

```
  [1]  Offboard Adele Vance              (standard resignation)
  [2]  Offboard Isaiah Langer            (admin user with Global Admin role)
  [3]  Offboard Joni Sherman             (Legal dept - New York)
  [4]  Offboard Megan Bowen             (with Teams API throttle error simulation)
  [5]  Offboard a CUSTOM user
  [6]  Open dashboard in browser
  [7]  Reset all users to Active state
```

While the demo runs, switch to the browser and watch the dashboard update live.

---

## Step 5 — Reset Between Runs

When you want to start fresh for the next audience:

- Double-click **`RESET-DEMO.bat`**, or
- Click "🔄 Reset Demo" in the dashboard sidebar, or
- Choose option `[7]` in `RUN-DEMO.bat`

This restores all 25 users to Active status and clears the audit log.

---

## Using with GitHub Copilot (the "wow" demo)

If you have VS Code with GitHub Copilot, you can demo the AI-driven workflow:

1. Make sure the server is running (`START-SERVER.bat`)
2. Open **VS Code** in the project folder
3. Open **Copilot Chat** (Ctrl+Alt+I) and switch to **Agent** mode
4. Type a natural language command:

```
Offboard Adele Vance
```

Copilot will automatically call the MCP tools in the right order. Watch the dashboard update as each step executes.

**Other things to ask:**
```
What phone number does Isaiah Langer have?
Show me all hardware assigned to Allan Deyoung
Check Megan Bowen's Teams Calling configuration
Get a full offboarding status report for all users
Assign the Teams Phone license to Grady Archie
```

---

## What the Demo Shows

| Dashboard Panel | What It Demonstrates |
|---|---|
| **Checklist tab** | 7-step offboarding checklist updating in real time |
| **Identity tab** | Account disable, session revoke, group membership removal |
| **Teams tab** | Phone number released, Enterprise Voice disabled |
| **Hardware tab** | CMDB asset discovery, return ticket number |
| **AVD tab** | Session disconnect, host pool access removal |
| **Audit Log tab** | Full action log with timestamps and simulated API latency |
| **Live Action Log** (bottom bar) | Scrolling feed of every action across all users |

---

## Troubleshooting

### "Node.js is not installed"
Download from https://nodejs.org — choose the LTS version. Restart your terminal after installing.

### "npm install failed"
- Check your internet connection
- If you're on a corporate network, you may need to configure a proxy: `npm config set proxy http://your-proxy:port`

### "Cannot reach the server at http://localhost:3000"
- Make sure `START-SERVER.bat` is running and its window is still open
- Check if something else is using port 3000: open Command Prompt and run `netstat -ano | findstr :3000`
- Try a different port: edit `START-SERVER.bat` and add `set PORT=3001` before the `node` line, then update `RUN-DEMO.bat` URLs to match

### "Build failed" / TypeScript errors
Run `SETUP.bat` again. If the error persists, open Command Prompt in the project folder and run:
```
npm run build
```
Copy the error message and share with the team.

### Dashboard shows blank / no users
Hard-refresh the browser (Ctrl+Shift+R). If still blank, check the server window for error messages.

---

## The Fake Tenant

The demo includes 25 pre-built users based on the Microsoft 365 Developer Program sample data pack. All are based in Seattle, New York, or Chicago with:

- Microsoft 365 E5 license
- Teams Phone Standard license
- Direct Routing phone number
- Azure Virtual Desktop host pool assignment
- 2 hardware assets (laptop + mobile)
- Various printer and group assignments

**Interesting users for demos:**
| User | Why interesting |
|---|---|
| **Isaiah Langer** | Has Global Admin + Exchange Admin roles — shows privileged user offboarding |
| **Patti Fernandez** | CEO — has Exec group, Global Admin |
| **Miriam Graham** | CFO — has Billing Administrator role |
| **Allan Deyoung** | IT Admin — has Teams Administrator role |
| **Emily Braun** | Has Azure Contributor role on a subscription |
