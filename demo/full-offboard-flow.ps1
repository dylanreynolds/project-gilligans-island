<#
.SYNOPSIS
  Full End-to-End Offboarding Flow Simulation
  ServiceNow RITM  >>  Logic App Webhook  >>  Azure Automation Runbook  >>  ServiceNow Closure

.DESCRIPTION
  Fully automated - no user prompts. Runs the complete pipeline and shows real
  PowerShell output as it would appear when executing against live Azure and ServiceNow.

  Production equivalents shown in comments:
    ServiceNow  : Invoke-RestMethod -Uri "https://<tenant>.service-now.com/api/now/table/..."
    Logic App   : Invoke-RestMethod -Uri "https://management.azure.com/.../Microsoft.Logic/workflows/..."
    Az Automation: New-AzAutomationJob / Get-AzAutomationJob / Get-AzAutomationJobOutput

  Run from RUN-DEMO.bat option [8], or directly:
    PowerShell -NoProfile -ExecutionPolicy Bypass -File demo\full-offboard-flow.ps1
    PowerShell -NoProfile -ExecutionPolicy Bypass -File demo\full-offboard-flow.ps1 -UserName "Joni Sherman"
#>

param(
    [string]$UserName     = "",
    [string]$Reason       = "Resignation",
    [string]$BaseUrl      = "http://localhost:3000",
    [string]$SnowInstance = "subway",
    [string]$AzSubId      = "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    [string]$AzRg         = "rg-automation-australiasoutheast",
    [string]$AzAaName     = "aa-offboarding-prod",
    [string]$AzLaName     = "la-offboarding-orchestrator"
)

$SnowBase = "https://$SnowInstance.service-now.com"

# ==================== Helpers ====================

function Write-Phase {
    param([int]$n, [string]$title, [string]$color = "Yellow")
    Write-Host ""
    Write-Host ("  " + ("=" * 68)) -ForegroundColor DarkGray
    Write-Host "  PHASE $n  :  $title" -ForegroundColor $color
    Write-Host ("  " + ("=" * 68)) -ForegroundColor DarkGray
    Write-Host ""
}

function Write-Cmd {
    param([string]$cmd)
    Write-Host ""
    Write-Host "  PS> $cmd" -ForegroundColor DarkGreen
    Write-Host ""
}

function Write-Field {
    param([string]$label, [string]$value, [string]$color = "White")
    Write-Host ("  {0,-24}: {1}" -f $label, $value) -ForegroundColor $color
}

function Write-RunbookLine {
    param([string]$text, [string]$status = "OK", [int]$delay = 350)
    Start-Sleep -Milliseconds $delay
    $fg = switch ($status) { "OK" { "Green" } "WARN" { "Yellow" } "ERR" { "Red" } default { "White" } }
    Write-Host ("       [{0,-4}]  {1}" -f $status, $text) -ForegroundColor $fg
}

function Invoke-MockApi {
    param([string]$Path, [string]$Method = "GET", [hashtable]$Body)
    $uri    = "$BaseUrl$Path"
    $params = @{ Uri = $uri; Method = $Method; ContentType = "application/json" }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 5) }
    try   { return Invoke-RestMethod @params }
    catch { Write-Host "  [ERR] API Error ($uri): $_" -ForegroundColor Red; return $null }
}

# ==================== BANNER ====================

Write-Host ""
Write-Host "  OffboardIQ | FULL E2E FLOW" -ForegroundColor White
Write-Host ""
Write-Host " ___   __  __ _                         _ ___ ___  " -ForegroundColor Cyan
Write-Host " / _ \/ _|/ _| |__   ___   __ _ _ __ __| |_ _/ _ \ " -ForegroundColor Cyan
Write-Host "| | | | |_| |_| '_ \ / _ \ / _` | '__/ _` || | | | |" -ForegroundColor Cyan
Write-Host "| |_| |  _|  _| |_) | (_) | (_| | | | (_| || | |_| |" -ForegroundColor Cyan
Write-Host " \___/|_| |_| |_.__/ \___/ \__,_|_|  \__,_|___\__\_\" -ForegroundColor Cyan
Write-Host ""
Write-Host "  SERVICE NOW  >>  LOGIC APP  >>  AZURE AUTOMATION  >>  SNOW CLOSURE" -ForegroundColor DarkCyan
Write-Host ""

# ==================== PRE-FLIGHT ====================

$summary = Invoke-MockApi "/api/summary"
if (-not $summary) {
    Write-Host "  [ERR] Cannot reach mock server at $BaseUrl" -ForegroundColor Red
    Write-Host "        Start it first: node dist\server.js" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK]  MCP Server online" -ForegroundColor Green
Write-Host "        Tenant: $($summary.totalUsers) users  |  Active: $($summary.active)" -ForegroundColor DarkGray
Write-Host "        Dashboard: $BaseUrl/dashboard   (open this to watch the state change live)" -ForegroundColor DarkCyan
Write-Host ""

$users   = Invoke-MockApi "/api/users"
if (-not $users) { Write-Host "  [ERR] Could not load users"; exit 1 }

if ($UserName -ne "") {
    $user = @($users | Where-Object { $_.displayName -eq $UserName })[0]
    if (-not $user) {
        Write-Host "  [ERR] User '$UserName' not found. Available:" -ForegroundColor Red
        $users | ForEach-Object { Write-Host "    - $($_.displayName)" -ForegroundColor DarkGray }
        exit 1
    }
} else {
    $user = @($users | Where-Object { $_.status -eq "active" })[0]
}
if (-not $user) { Write-Host "  [ERR] No active users found."; exit 1 }

$fullUser = Invoke-MockApi "/api/users/$($user.id)"

$phoneDisplay = "Not assigned"
if ($user.phoneNumber) { $phoneDisplay = $user.phoneNumber }

$managerName = "Manager"
if ($fullUser -and $fullUser.managerName) { $managerName = $fullUser.managerName }

$hwCount = 0
if ($fullUser -and $fullUser.hardware) { $hwCount = $fullUser.hardware.Count }

$groupCount = Get-Random -Minimum 5 -Maximum 15

Write-Host ("  {0,-22}: {1}" -f "Target employee", $user.displayName) -ForegroundColor White
Write-Host ("  {0,-22}: {1}" -f "Title",           $user.jobTitle) -ForegroundColor DarkGray
Write-Host ("  {0,-22}: {1}" -f "Department",      $user.department) -ForegroundColor DarkGray
Write-Host ("  {0,-22}: {1}" -f "UPN",             $user.userPrincipalName) -ForegroundColor DarkGray
Write-Host ("  {0,-22}: {1}" -f "Phone",           $phoneDisplay) -ForegroundColor DarkGray
Write-Host ("  {0,-22}: {1}" -f "Manager",         $managerName) -ForegroundColor DarkGray
Write-Host ("  {0,-22}: {1}" -f "Hardware assets", $hwCount) -ForegroundColor DarkGray
Write-Host ("  {0,-22}: {1}" -f "Reason",          $Reason) -ForegroundColor Yellow
Write-Host ""
Write-Host "  Starting in 3 seconds ..." -ForegroundColor DarkCyan
Start-Sleep -Seconds 3


# ==================== PHASE 1 : ServiceNow -- Create RITM ====================

Write-Phase 1 "SERVICE NOW  --  Create Offboarding RITM"

Write-Cmd "Invoke-RestMethod -Method POST -Uri '$SnowBase/api/now/table/sc_req_item' -Headers `$SnowHeaders -Body `$body"

$ticketResp = Invoke-MockApi "/api/snow/tickets" -Method POST -Body @{
    employeeId  = $user.id
    reason      = $Reason
    requestedBy = "Jonas Grumby"
}

if (-not $ticketResp -or -not $ticketResp.ticket) {
    Write-Host "  [ERR] Failed to create ticket" -ForegroundColor Red
    exit 1
}

$ticket = $ticketResp.ticket
$number = $ticket.number
$sysId  = $ticket.sysId

Write-Host "  HTTP/1.1 201 Created" -ForegroundColor Green
Write-Host ""
Write-Field "sys_id"            $sysId
Write-Field "number"            $number
Write-Field "state"             "New [1]"                          "Yellow"
Write-Field "priority"          $ticket.priority
Write-Field "short_description" $ticket.shortDescription
Write-Field "assignment_group"  "GRP-IT-Offboarding-Automation"
Write-Field "opened_by"         "Patti Fernandez (HR)"
Write-Field "category"          "HR  /  Employee Offboarding"
Write-Field "last_day_of_work"  $ticket.lastDayOfWork
Write-Host ""
Write-Host "  [OK]  RITM created: $number  |  Awaiting manager approval" -ForegroundColor Green

Start-Sleep -Seconds 2


# ==================== PHASE 2 : ServiceNow -- Manager Approves ====================

Write-Phase 2 "SERVICE NOW  --  Manager Approval  (triggers Outbound REST to Azure)"

Write-Cmd "Invoke-RestMethod -Method PATCH -Uri '$SnowBase/api/now/table/sysapproval_approver/`$approvalSysId' -Body @{state='approved';comments='Approved - proceed'}"

$approveResp = Invoke-MockApi "/api/snow/tickets/$number/approve" -Method POST -Body @{ approver = "IT Admin" }

if (-not $approveResp -or -not $approveResp.ticket) {
    Write-Host "  [ERR] Approval failed" -ForegroundColor Red; exit 1
}
$ticket    = $approveResp.ticket
$laRunId   = $ticket.azureLogicAppRunId
$jobId     = $ticket.azureRunbookJobId
$approvedBy = $ticket.approvedBy

Write-Host "  HTTP/1.1 200 OK" -ForegroundColor Green
Write-Host ""
Write-Field "approval_state" "approved"      "Green"
Write-Field "approved_by"    $approvedBy
Write-Field "ticket_state"   "In Progress [2]" "Cyan"
Write-Field "la_run_id"      $laRunId
Write-Field "job_id"         $jobId
Write-Host ""
Write-Host "  [>>]  Outbound REST Message fired to Azure Logic App" -ForegroundColor Yellow
Write-Host ""
Write-Host "  POST $AzLaName.australiasoutheast.logic.azure.com/.../triggers/manual/run" -ForegroundColor DarkGreen
Write-Host ""
Write-Host "  Payload:" -ForegroundColor DarkGray
Write-Host "    { ticketNumber: `"$number`"," -ForegroundColor DarkGray
Write-Host "      employeeId:   `"$($user.id)`"," -ForegroundColor DarkGray
Write-Host "      displayName:  `"$($user.displayName)`"," -ForegroundColor DarkGray
Write-Host "      reason:       `"$Reason`"," -ForegroundColor DarkGray
Write-Host "      lastDayWork:  `"$($ticket.lastDayOfWork)`" }" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  HTTP/1.1 202 Accepted  |  Logic App run created: $laRunId" -ForegroundColor Green

Start-Sleep -Seconds 2


# ==================== PHASE 3 : Azure Logic App -- Run Executing ====================

Write-Phase 3 "AZURE LOGIC APP  --  $AzLaName  Run: $laRunId"

$laRunUri = "https://management.azure.com/subscriptions/$AzSubId/resourceGroups/$AzRg/providers/Microsoft.Logic/workflows/$AzLaName/runs/$($laRunId)?api-version=2016-06-01"
Write-Cmd "`$run = Invoke-RestMethod -Method GET -Uri `$laRunUri -Headers `$azHeaders"

Write-Field "name"          $laRunId
Write-Field "workflow"      $AzLaName
Write-Field "resourceGroup" $AzRg
Write-Field "subscription"  $AzSubId
Write-Field "startTime"     (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
Write-Field "status"        "Running" "Yellow"
Write-Host ""
Write-Host "  Actions:" -ForegroundColor DarkGray

$laActions = @(
    "manual                  HTTP Webhook received               200 OK",
    "Parse_JSON               Extract employee payload           Succeeded",
    "Condition                approval_state == 'approved'       True",
    "Get_User_Details         Graph API - user profile           Succeeded",
    "Create_Automation_Job    New-AzAutomationJob                Succeeded",
    "Until_Job_Complete       Polling every 30s                  Running"
)
foreach ($a in $laActions) {
    Start-Sleep -Milliseconds 500
    Write-Host "    [->]  $a" -ForegroundColor DarkCyan
}

Write-Host ""
Write-Field "status" "Succeeded" "Green"

Start-Sleep -Seconds 1


# ==================== PHASE 4 : Azure Automation -- Job Created ====================

Write-Phase 4 "AZURE AUTOMATION  --  Job created: $jobId"

Write-Cmd "New-AzAutomationJob -ResourceGroupName '$AzRg' -AutomationAccountName '$AzAaName' -RunbookName 'Invoke-FullOffboardOrchestrator' -Parameters @{EmployeeId='$($user.id)';TicketNumber='$number';Reason='$Reason'}"

Write-Field "JobId"             $jobId
Write-Field "RunbookName"       "Invoke-FullOffboardOrchestrator"
Write-Field "AutomationAccount" $AzAaName
Write-Field "ResourceGroup"     $AzRg
Write-Field "Subscription"      $AzSubId
Write-Field "Status"            "Running" "Yellow"
Write-Field "CreationTime"      (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
Write-Field "StartTime"         (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")

Start-Sleep -Seconds 1


# ==================== PHASE 5 : Runbook Output Stream ====================

Write-Phase 5 "AZURE AUTOMATION  --  Runbook Output  (Invoke-FullOffboardOrchestrator)" "Cyan"

Write-Cmd "Get-AzAutomationJobOutput -ResourceGroupName '$AzRg' -AutomationAccountName '$AzAaName' -Id '$jobId' -Stream Output"

Write-Host "  --- BEGIN JOB OUTPUT STREAM ---" -ForegroundColor DarkGray
Write-Host ""

# [ID] Identity & Access
Write-Host "  [ID]   Identity & Access" -ForegroundColor Cyan
Write-RunbookLine "Authenticating to Microsoft Graph with Managed Identity..." "OK" 400
Write-RunbookLine "Disabling Entra ID account: $($user.userPrincipalName)" "OK" 600
Write-RunbookLine "Revoking all active sign-in sessions" "OK" 400
Write-RunbookLine "Removing $groupCount group memberships" "OK" 700
Write-RunbookLine "Removing PIM eligible and active role assignments" "OK" 500
Write-RunbookLine "Resetting password to randomised 32-char string" "OK" 300
Write-Host ""

# [TEL] Teams & Telephony
Write-Host "  [TEL]  Teams and Telephony" -ForegroundColor Cyan
Write-RunbookLine "Connecting to MicrosoftTeams PowerShell module" "OK" 500
Write-RunbookLine "Disabling Enterprise Voice: $($user.userPrincipalName)" "OK" 600
Write-RunbookLine "Releasing DDI: $phoneDisplay  (returned to number pool)" "OK" 400
Write-RunbookLine "Setting call forwarding to manager: $managerName" "OK" 400
Write-RunbookLine "Configuring offboarding voicemail greeting" "OK" 300
Write-Host ""

# [LIC] M365 Licensing
Write-Host "  [LIC]  M365 Licensing" -ForegroundColor Cyan
Write-RunbookLine "Removing Microsoft 365 E5 (ENTERPRISEPREMIUM)" "OK" 500
Write-RunbookLine "Removing Teams Phone Standard (MCOEV)" "OK" 400
Write-RunbookLine "Removing Audio Conferencing (MCOMEETADV)" "OK" 400
Write-RunbookLine "Licenses returned to tenant pool. Total reclaimed: 3" "OK" 200
Write-Host ""

# [MAIL] Exchange Mailbox
Write-Host "  [MAIL] Exchange Mailbox" -ForegroundColor Cyan
Write-RunbookLine "Connecting to Exchange Online PowerShell" "OK" 500
Write-RunbookLine "Configuring auto-reply: '$($user.displayName) is no longer with Contoso'" "OK" 500
Write-RunbookLine "Granting Full Access to manager: $managerName" "OK" 500
Write-RunbookLine "Converting mailbox to Shared (ConvertTo-MailboxType -Type Shared)" "OK" 700
Write-RunbookLine "Blocking new outbound email sends" "OK" 300
Write-Host ""

# [PC] Azure Virtual Desktop
Write-Host "  [PC]   Azure Virtual Desktop" -ForegroundColor Cyan
Write-RunbookLine "Querying AVD host pools for active sessions" "OK" 500
if ($fullUser -and $fullUser.avdAssignments) {
    Write-RunbookLine "Force-disconnecting session: AUS-HP-PROD01 (Disconnect-AzWvdUserSession)" "OK" 600
    Write-RunbookLine "Removing application group assignments" "OK" 400
} else {
    Write-RunbookLine "No active AVD sessions found" "OK" 300
}
Write-Host ""

# [HW] Hardware Discovery
Write-Host "  [HW]   Hardware Discovery" -ForegroundColor Cyan
Write-RunbookLine "Querying ServiceNow CMDB for assets assigned to $($user.displayName)" "OK" 600
Write-RunbookLine "$hwCount asset(s) found. Generating return shipment request." "OK" 400
Write-RunbookLine "CMDB return ticket created. IT Asset Management notified." "OK" 300
Write-Host ""

# [PRT] Printing
Write-Host "  [PRT]  Universal Print" -ForegroundColor Cyan
Write-RunbookLine "Removing Universal Print group memberships" "OK" 400
Write-RunbookLine "Printer access revoked" "OK" 200
Write-Host ""

Write-Host "  --- END JOB OUTPUT STREAM ---" -ForegroundColor DarkGray
Write-Host ""

# Post work note to ticket
Invoke-MockApi "/api/snow/tickets/$number/work-note" -Method POST -Body @{
    author = "Azure Automation"
    note   = "Runbook Invoke-FullOffboardOrchestrator completed. Job: $jobId. All 7 categories processed successfully. Account disabled, licenses reclaimed, Teams phone released, mailbox shared, AVD sessions terminated."
    type   = "system"
} | Out-Null

Start-Sleep -Seconds 1


# ==================== PHASE 6 : Azure Automation -- Job Completed ====================

Write-Phase 6 "AZURE AUTOMATION  --  Job Completed"

Write-Cmd "Get-AzAutomationJob -ResourceGroupName '$AzRg' -AutomationAccountName '$AzAaName' -Id '$jobId'"

Write-Field "JobId"       $jobId
Write-Field "Status"      "Completed"    "Green"
Write-Field "EndTime"     (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
Write-Field "Exception"   "(none)"
Write-Field "ExitCode"    "0"
Write-Host ""
Write-Host "  [OK]  Job completed successfully. Logic App 'Until' loop exited." -ForegroundColor Green

Start-Sleep -Seconds 1


# ==================== PHASE 7 : ServiceNow -- Callback + Resolve ====================

Write-Phase 7 "SERVICE NOW  --  Outbound callback from Azure: closing RITM $number"

$resolution = "All offboarding tasks completed by Azure Automation. Job $jobId executed Invoke-FullOffboardOrchestrator. Account disabled, licenses reclaimed, Teams phone released, mailbox delegated, AVD sessions terminated."

Write-Cmd "Invoke-RestMethod -Method PATCH -Uri '$SnowBase/api/now/table/sc_req_item/$sysId' -Body @{state=3;close_code='Solved (Permanently)';close_notes=`$resolution}"

$resolveResp = Invoke-MockApi "/api/snow/tickets/$number/resolve" -Method POST -Body @{
    completedBy = "Azure Automation"
    resolution  = $resolution
    jobId       = $jobId
}

Write-Host "  HTTP/1.1 200 OK" -ForegroundColor Green
Write-Host ""
Write-Field "number"       $number
Write-Field "sys_id"       $sysId
Write-Field "state"        "Closed Complete [3]" "Green"
Write-Field "close_code"   "Solved (Permanently)"
Write-Field "close_notes"  "Azure Automation job $jobId completed all tasks"
Write-Field "resolved_by"  "Azure Automation (svc-offboard-auto)"
Write-Field "resolved_at"  (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
Write-Host ""
Write-Host "  [OK]  RITM $number resolved and closed." -ForegroundColor Green

Start-Sleep -Milliseconds 800


# ==================== SUMMARY ====================

Write-Host ""
Write-Host ("  " + ("=" * 68)) -ForegroundColor Green
Write-Host "  OFFBOARDING PIPELINE COMPLETE" -ForegroundColor Green
Write-Host ("  " + ("=" * 68)) -ForegroundColor Green
Write-Host ""
Write-Host "  Employee        : $($user.displayName)" -ForegroundColor White
Write-Host "  Department      : $($user.department)" -ForegroundColor White
Write-Host "  SNOW Ticket     : $number  [Closed Complete]" -ForegroundColor Green
Write-Host "  Logic App Run   : $laRunId" -ForegroundColor Cyan
Write-Host "  Runbook Job     : $jobId  [Completed]" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Evidence links (production equivalents):" -ForegroundColor DarkGray
Write-Host "  ServiceNow  : $SnowBase/sc_request.do?sys_id=$sysId" -ForegroundColor DarkCyan
Write-Host "  Azure Portal: portal.azure.com/#resource/subscriptions/$AzSubId/resourceGroups/$AzRg/" -ForegroundColor DarkCyan
Write-Host "                providers/Microsoft.Automation/automationAccounts/$AzAaName/jobs/$jobId" -ForegroundColor DarkCyan
Write-Host "  Dashboard   : $BaseUrl/dashboard" -ForegroundColor DarkCyan
Write-Host ""
