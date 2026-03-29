<#
  .SYNOPSIS
    Hackathon Demo - Enterprise Offboarding Automation
    Simulates an Azure Logic App / Runbook calling the MCP Mock Server via REST.

  .DESCRIPTION
    This script demonstrates the complete offboarding workflow against the
    local MCP mock server's HTTP API. Run it WITH the MCP server running.

    Usage:
      .\demo\offboarding-demo.ps1                              # pick from all active users
      .\demo\offboarding-demo.ps1 -FilterBy "admin"             # pick from Director/VP/Manager users
      .\demo\offboarding-demo.ps1 -FilterBy "contractor" -Reason "Contract End"
      .\demo\offboarding-demo.ps1 -UserName "Joni Sherman" -Reason "Resignation"
      .\demo\offboarding-demo.ps1 -FilterBy "standard" -SimulateError
#>

param(
    [string]$UserName    = "",
    [string]$Reason      = "Resignation",
    [string]$FilterBy    = "standard",
    [switch]$SimulateError,
    [string]$BaseUrl     = "http://localhost:3000"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Icon, [string]$Text, [string]$Color = "Gray")
    Write-Host ""
    Write-Host "  $Icon  $Text" -ForegroundColor $Color
}

function Invoke-MockApi {
    param([string]$Path, [string]$Method = "GET", [hashtable]$Body)
    $uri = "$BaseUrl$Path"
    $params = @{ Uri = $uri; Method = $Method; ContentType = "application/json" }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 5) }
    try {
        return Invoke-RestMethod @params
    } catch {
        Write-Host "  [ERR] API Error: $_" -ForegroundColor Red
        return $null
    }
}

# ============================================================
Write-Host ''
Write-Host '  OffboardIQ | DEMO' -ForegroundColor White
Write-Host '  Enterprise Offboarding  //  Azure Logic App + ServiceNow Simulation' -ForegroundColor Gray
Write-Host ''

# ---- Step 0: Verify server is running ----
Write-Step '[NET]' "Connecting to MCP Mock Server at $BaseUrl..."
$summary = Invoke-MockApi '/api/summary'
if (-not $summary) {
    Write-Host ''
    Write-Host '  Please start the server first: node dist/server.js' -ForegroundColor Red
    exit 1
}
Write-Host "  [OK]  Connected. Tenant: $($summary.totalUsers) users ($($summary.active) active)" -ForegroundColor Green
Write-Host "        Dashboard: $BaseUrl/dashboard" -ForegroundColor DarkGray

# ---- Step 1: Locate user ----
Write-Step '[>>]' 'Fetching user list from MCP Server...'
$users = Invoke-MockApi '/api/users'
$user  = $null

if ($UserName -ne '') {
    # Direct lookup (manual / custom scenario)
    $user = $users | Where-Object { $_.displayName -eq $UserName } | Select-Object -First 1
    if (-not $user) {
        Write-Host "  [ERR] User '$UserName' not found." -ForegroundColor Red
        $users | ForEach-Object { Write-Host "    - $($_.displayName) ($($_.department))" -ForegroundColor DarkGray }
        exit 1
    }
} else {
    # Filter-based interactive picker
    $active   = @($users | Where-Object { $_.status -eq 'active' })
    $filtered = switch ($FilterBy) {
        'admin'      { @($active | Where-Object { $_.jobTitle -match 'Director|VP|Manager|Admin|Chief|Officer' }) }
        'contractor' { @($active | Where-Object { $_.department -match 'Sales|Marketing|Legal|Finance' }) }
        default      { $active }
    }
    $filtered = @($filtered | Select-Object -First 12)
    if ($filtered.Count -eq 0) {
        Write-Host '  [ERR] No matching active users found for this scenario.' -ForegroundColor Red
        exit 1
    }
    Write-Host ''
    Write-Host '  Select the employee to offboard:' -ForegroundColor White
    Write-Host ''
    for ($i = 0; $i -lt $filtered.Count; $i++) {
        $u     = $filtered[$i]
        $dept  = if ($u.department) { $u.department } else { '-' }
        $title = if ($u.jobTitle)   { $u.jobTitle }   else { '-' }
        Write-Host ("  [{0,2}]  {1,-26} {2,-16}  {3}" -f ($i + 1), $u.displayName, $dept, $title) -ForegroundColor Gray
    }
    Write-Host ''
    $pick = Read-Host "  Enter number [1-$($filtered.Count)]"
    if ($pick -match '^\d+$') { $idx = [int]$pick - 1 } else { $idx = -1 }
    if ($idx -lt 0 -or $idx -ge $filtered.Count) {
        Write-Host '  [ERR] Invalid selection.' -ForegroundColor Red
        exit 1
    }
    $user = $filtered[$idx]
}

$phoneDisplay = if ($user.phoneNumber) { $user.phoneNumber } else { 'None' }
Write-Host ''
Write-Host "  [OK]  $($user.displayName)" -ForegroundColor Green
Write-Host "        Title:      $($user.jobTitle)" -ForegroundColor DarkGray
Write-Host "        Department: $($user.department)" -ForegroundColor DarkGray
Write-Host "        UPN:        $($user.userPrincipalName)" -ForegroundColor DarkGray
Write-Host "        Phone:      $phoneDisplay" -ForegroundColor DarkGray
Write-Host ''
Write-Host "  [!!]  Reason: $Reason" -ForegroundColor Yellow
if ($SimulateError) {
    Write-Host '  [~~]  Error simulation ENABLED -- Teams API throttle will be triggered' -ForegroundColor Magenta
}
Write-Host ''
Read-Host '  Press ENTER to begin offboarding >'

# ---- Step 2: Discover hardware ----
Write-Step '[HW]' 'HARDWARE DISCOVERY -- querying CMDB...'
$fullUser = Invoke-MockApi "/api/users/$($user.id)"
if ($fullUser.hardware) {
    Write-Host ''
    Write-Host "  Found $($fullUser.hardware.Count) hardware asset(s):" -ForegroundColor White
    $fullUser.hardware | ForEach-Object {
        Write-Host "    [$($_.assetTag)] $($_.make) $($_.model) ($($_.type)) -- S/N: $($_.serialNumber)" -ForegroundColor DarkGray
    }
} else {
    Write-Host '  No hardware found in CMDB.' -ForegroundColor DarkGray
}

# ---- Step 3: Check AVD sessions ----
Write-Step '[PC]' 'AZURE VIRTUAL DESKTOP -- checking active sessions...'
if ($fullUser.avdAssignments) {
    $activeSessions = $fullUser.avdAssignments | Where-Object { $_.sessionStatus -eq 'active' }
    if ($activeSessions) {
        Write-Host "  [!!] $($activeSessions.Count) active session(s) found -- will be force-disconnected" -ForegroundColor Yellow
        $activeSessions | ForEach-Object { Write-Host "    [$($_.hostPoolName)] $($_.applicationGroupName)" -ForegroundColor DarkGray }
    } else {
        Write-Host '  [OK]  No active sessions' -ForegroundColor Green
    }
}

# ---- Step 4: Run the full offboarding ----
Write-Step '[>>]' 'EXECUTING FULL OFFBOARDING WORKFLOW...' 'Yellow'
Write-Host ""
Write-Host "  [Azure] POST https://prod-xx.australiasouth.logic.azure.com/workflows/offboarding/triggers/manual/run" -ForegroundColor DarkGray
Write-Host "  [Azure] Runbook: Invoke-OffboardingWorkflow -EmployeeId $($user.id) -Reason '$Reason'" -ForegroundColor DarkGray
Write-Host ""

$runBody = @{ userId = $user.id; reason = $Reason; simulateError = $SimulateError.IsPresent }
$runResult = Invoke-MockApi '/api/offboarding/run' 'POST' $runBody

if (-not $runResult) {
    Write-Host '  [ERR] Offboarding workflow API call failed.' -ForegroundColor Red
    exit 1
}

# ---- Display per-category results from the real execution ----
$iconMap = @{
    'Identity'       = '[ID] '
    'Teams & Calling'= '[TEL]'
    'Licensing'      = '[LIC]'
    'Mailbox'        = '[MAIL]'
    'AVD'            = '[PC] '
    'Hardware'       = '[HW] '
    'Printer Access' = '[PRT]'
}

$currentCategory = ''
foreach ($step in $runResult.steps) {
    if ($step.category -ne $currentCategory) {
        if ($currentCategory -ne '') { Write-Host '' }
        $icon = if ($iconMap.ContainsKey($step.category)) { $iconMap[$step.category] } else { '[??]' }
        Write-Host "  $icon  $($step.category)" -ForegroundColor White
        $currentCategory = $step.category
    }
    $ms = if ($step.ms -gt 0) { " ($($step.ms)ms)" } else { '' }
    switch ($step.status) {
        'completed' { Write-Host "     [OK]  $($step.step)$ms" -ForegroundColor Green }
        'error'     {
            Write-Host "     [ERR] $($step.step)" -ForegroundColor Red
            Write-Host "           $($step.detail)" -ForegroundColor DarkGray
        }
        'skipped'   { Write-Host "     [---] $($step.step) -- skipped" -ForegroundColor DarkGray }
    }
}
Write-Host ''

# ---- Step 5: Summary ----
Start-Sleep -Milliseconds 800
$finalUser = Invoke-MockApi "/api/users/$($user.id)"
$auditData = Invoke-MockApi "/api/audit-log?userId=$($user.id)&limit=20"

$accountState = if ($finalUser.accountEnabled) { 'ENABLED  [!!]' } else { 'DISABLED [OK]' }
$accountColor = if ($finalUser.accountEnabled) { 'Yellow' } else { 'Green' }
$phoneState   = if ($null -eq $finalUser.phoneNumber) { 'YES [OK] -- returned to pool' } else { "NO -- $($finalUser.phoneNumber)" }
$phoneColor   = if ($null -eq $finalUser.phoneNumber) { 'Green' } else { 'Yellow' }
$licColor     = if ($finalUser.licenseCount -eq 0) { 'Green' } else { 'Yellow' }
$statusColor  = if ($finalUser.status -eq 'offboarded') { 'Green' } else { 'Yellow' }

Write-Host ''
Write-Host '  +====================================================+' -ForegroundColor Green
Write-Host '  |    OFFBOARDING COMPLETE -- SUMMARY REPORT         |' -ForegroundColor Green
Write-Host '  +====================================================+' -ForegroundColor Green
Write-Host ''
Write-Host "  Employee:       $($user.displayName)" -ForegroundColor White
Write-Host "  Status:         $($finalUser.status.ToUpper())" -ForegroundColor $statusColor
Write-Host "  Account:        $accountState" -ForegroundColor $accountColor
Write-Host "  Phone Released: $phoneState" -ForegroundColor $phoneColor
Write-Host "  Licenses:       $($finalUser.licenseCount) remaining" -ForegroundColor $licColor
Write-Host "  Audit Entries:  $($auditData.total) actions logged" -ForegroundColor White
Write-Host ''
Write-Host "  View live dashboard: $BaseUrl/dashboard" -ForegroundColor Gray
Write-Host ''
