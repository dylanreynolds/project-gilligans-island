<#
  .SYNOPSIS
    Hackathon Demo — Enterprise Offboarding Automation
    Simulates an Azure Logic App / Runbook calling the MCP Mock Server via REST.

  .DESCRIPTION
    This script demonstrates the complete offboarding workflow against the
    local MCP mock server's HTTP API. Run it WITH the MCP server running.

    Usage:
      .\demo\offboarding-demo.ps1                        # offboard Adele Vance
      .\demo\offboarding-demo.ps1 -UserName "Joni Sherman"
      .\demo\offboarding-demo.ps1 -UserName "Isaiah Langer" -Reason "Termination" -SimulateError
#>

param(
    [string]$UserName    = "Adele Vance",
    [string]$Reason      = "Resignation",
    [switch]$SimulateError,
    [string]$BaseUrl     = "http://localhost:3000"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Icon, [string]$Text, [string]$Color = "Cyan")
    Write-Host "`n  $Icon  $Text" -ForegroundColor $Color
}

function Invoke-MockApi {
    param([string]$Path, [string]$Method = "GET", [hashtable]$Body)
    $uri = "$BaseUrl$Path"
    $params = @{ Uri = $uri; Method = $Method; ContentType = "application/json" }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 5) }
    try {
        return Invoke-RestMethod @params
    } catch {
        Write-Host "  ❌ API Error: $_" -ForegroundColor Red
        return $null
    }
}

# ============================================================
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "  ║    OffboardIQ — Enterprise Offboarding Demo          ║" -ForegroundColor Blue
Write-Host "  ║    MCP Mock Server  ·  Azure Logic App Simulation    ║" -ForegroundColor Blue
Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# ---- Step 0: Verify server is running ----
Write-Step "🌐" "Connecting to MCP Mock Server at $BaseUrl..."
$summary = Invoke-MockApi "/api/summary"
if (-not $summary) {
    Write-Host "`n  Please start the server first: npm run start" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Connected. Tenant: $($summary.totalUsers) users ($($summary.active) active)" -ForegroundColor Green
Write-Host "  🖥️  Dashboard: $BaseUrl" -ForegroundColor DarkGray

# ---- Step 1: Find user ----
Write-Step "🔍" "Locating user: $UserName"
$users = Invoke-MockApi "/api/users"
$user = $users | Where-Object { $_.displayName -eq $UserName } | Select-Object -First 1

if (-not $user) {
    Write-Host "  ❌ User '$UserName' not found." -ForegroundColor Red
    Write-Host "  Available users:" -ForegroundColor DarkGray
    $users | ForEach-Object { Write-Host "    - $($_.displayName) ($($_.department))" -ForegroundColor DarkGray }
    exit 1
}

Write-Host "  ✅ Found: $($user.displayName)" -ForegroundColor Green
Write-Host "     ├─ Title:      $($user.jobTitle)" -ForegroundColor DarkGray
Write-Host "     ├─ Department: $($user.department)" -ForegroundColor DarkGray
Write-Host "     ├─ Location:   $($user.officeLocation)" -ForegroundColor DarkGray
Write-Host "     ├─ UPN:        $($user.userPrincipalName)" -ForegroundColor DarkGray
Write-Host "     ├─ Phone:      $($user.phoneNumber ?? 'None')" -ForegroundColor DarkGray
Write-Host "     └─ Licenses:   $($user.licenseCount)" -ForegroundColor DarkGray

Write-Host ""
Write-Host "  ⚠️  Reason: $Reason" -ForegroundColor Yellow
if ($SimulateError) {
    Write-Host "  ⚡ Error simulation ENABLED — Teams API throttle will be triggered" -ForegroundColor Magenta
}
Write-Host ""
Read-Host "  Press ENTER to begin offboarding >"

# ---- Step 2: Discover hardware ----
Write-Step "💻" "HARDWARE DISCOVERY — querying CMDB..."
$fullUser = Invoke-MockApi "/api/users/$($user.id)"
if ($fullUser.hardware) {
    Write-Host ""
    Write-Host "  Found $($fullUser.hardware.Count) hardware asset(s):" -ForegroundColor White
    $fullUser.hardware | ForEach-Object {
        Write-Host "    [$($_.assetTag)] $($_.make) $($_.model) ($($_.type)) — S/N: $($_.serialNumber)" -ForegroundColor DarkGray
    }
} else {
    Write-Host "  No hardware found in CMDB." -ForegroundColor DarkGray
}

# ---- Step 3: Check AVD sessions ----
Write-Step "🖥️ " "AZURE VIRTUAL DESKTOP — checking active sessions..."
if ($fullUser.avdAssignments) {
    $activeSessions = $fullUser.avdAssignments | Where-Object { $_.sessionStatus -eq "active" }
    if ($activeSessions) {
        Write-Host "  ⚠️  $($activeSessions.Count) active session(s) found — will be force-disconnected" -ForegroundColor Yellow
        $activeSessions | ForEach-Object { Write-Host "    [$($_.hostPoolName)] $($_.applicationGroupName)" -ForegroundColor DarkGray }
    } else {
        Write-Host "  ✅ No active sessions" -ForegroundColor Green
    }
}

# ---- Step 4: Run the full offboarding ----
Write-Step "🚀" "EXECUTING FULL OFFBOARDING WORKFLOW..." "Yellow"
Write-Host ""

# NOTE: In a real deployment this would call Azure Automation via Webhook.
# Here we demonstrate what the Logic App runbook would report back.
Write-Host "  [Simulated] POST https://prod-xx.australiasouth.logic.azure.com/workflows/offboarding/triggers/manual/run" -ForegroundColor DarkGray
Write-Host "  [Simulated] Azure Runbook: Invoke-OffboardingWorkflow -EmployeeId $($user.id) -Reason '$Reason'" -ForegroundColor DarkGray
Write-Host ""

$categories = @(
    @{ Icon="🔐"; Name="Identity & Access";      Steps=@("Disable Entra ID account", "Revoke all sessions", "Remove group memberships", "Remove role assignments", "Reset password") },
    @{ Icon="📞"; Name="Teams & Telephony";        Steps=@("Disable Enterprise Voice", "Remove phone number", "Set call forwarding to manager", "Configure offboarding voicemail") },
    @{ Icon="🎫"; Name="M365 Licensing";           Steps=@("Remove Microsoft 365 E5", "Remove Teams Phone Standard", "Remove Audio Conferencing") },
    @{ Icon="📧"; Name="Exchange Mailbox";          Steps=@("Configure out-of-office reply", "Grant delegate access to manager", "Convert to Shared Mailbox", "Disable email send") },
    @{ Icon="🖥️ "; Name="Azure Virtual Desktop";   Steps=@("Query active sessions", "Force disconnect sessions", "Remove host pool assignments") },
    @{ Icon="💻"; Name="Hardware Discovery";        Steps=@("Query CMDB for assigned assets", "Generate return shipment ticket") },
    @{ Icon="🖨️ "; Name="Printer Access";           Steps=@("Remove from Universal Print groups") }
)

foreach ($cat in $categories) {
    $shouldError = $SimulateError -and ($cat.Name -eq "Teams & Telephony")
    Write-Host "  $($cat.Icon)  $($cat.Name)" -ForegroundColor Cyan

    foreach ($step in $cat.Steps) {
        Start-Sleep -Milliseconds (Get-Random -Minimum 120 -Maximum 500)
        if ($shouldError -and $step -eq "Disable Enterprise Voice") {
            Write-Host "     ❌  $step — 429 Too Many Requests (Teams API throttled)" -ForegroundColor Red
            Write-Host "        Retry-After: 60 seconds. Recording error in audit log." -ForegroundColor DarkGray
        } else {
            Write-Host "     ✅  $step" -ForegroundColor Green
        }
    }
    Write-Host ""
}

# ---- Step 5: Summary ----
Start-Sleep -Milliseconds 800
$finalUser = Invoke-MockApi "/api/users/$($user.id)"
$auditData = Invoke-MockApi "/api/audit-log?userId=$($user.id)&limit=20"

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║   OFFBOARDING COMPLETE — SUMMARY REPORT              ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Employee:      $($user.displayName)" -ForegroundColor White
Write-Host "  Status:        $($finalUser.status.ToUpper())" -ForegroundColor $(if ($finalUser.status -eq "offboarded") { "Green" } else { "Yellow" })
Write-Host "  Account:       $(if ($finalUser.accountEnabled) { 'ENABLED ⚠️' } else { 'DISABLED ✅' })" -ForegroundColor $(if ($finalUser.accountEnabled) { "Yellow" } else { "Green" })
Write-Host "  Phone Released:$(if ($null -eq $finalUser.phoneNumber) { ' YES ✅ — returned to pool' } else { " NO — $($finalUser.phoneNumber)" })" -ForegroundColor $(if ($null -eq $finalUser.phoneNumber) { "Green" } else { "Yellow" })
Write-Host "  Licenses:      $($finalUser.licenseCount) remaining" -ForegroundColor $(if ($finalUser.licenseCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "  Audit Entries: $($auditData.total) actions logged" -ForegroundColor White
Write-Host ""
Write-Host "  📊 View live dashboard: $BaseUrl" -ForegroundColor Cyan
Write-Host ""
