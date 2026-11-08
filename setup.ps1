<#
.SYNOPSIS
  Prepwise one-shot setup for Windows.
  Installs missing prerequisites (only if not already installed), VS Code extensions,
  then installs dependencies and builds the project. Prints a summary of everything it
  checked/installed, writes a log to .\logs\, and waits for Enter before closing.

.EXAMPLE
  .\setup.cmd                      # required tools + build
  .\setup.cmd -Docker -Ollama      # also Docker Desktop (self-host mode) and Ollama (local AI)
  .\setup.cmd -CheckOnly           # just report what is installed / missing
#>
param(
  [switch]$Docker,          # install WSL2 + Docker Desktop if missing
  [switch]$Ollama,          # install Ollama (local AI models) if missing
  [switch]$SkipExtensions,  # don't install VS Code extensions
  [switch]$SkipCompiler,    # don't install a C++ compiler (only used by a dev test)
  [switch]$SkipBuild,       # don't run pnpm install / build
  [switch]$Start,           # start the app after building
  [switch]$CheckOnly,       # report only, change nothing
  [switch]$NoPause          # don't wait for Enter at the end (for CI / scripts)
)

# 'Continue' (not 'Stop'): in Windows PowerShell 5.1, stderr output from native tools
# (winget, npm, wsl) would otherwise abort the script. Exit codes are checked explicitly.
$ErrorActionPreference = 'Continue'
$Root = $PSScriptRoot
$MinNodeMajor = 20
$script:Results = New-Object System.Collections.ArrayList
$script:NeedsRestart = $false

# ---------------------------------------------------------------- logging
$logDir = Join-Path $Root 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir ("setup-{0}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
try { Start-Transcript -Path $logFile -Force | Out-Null } catch { $logFile = $null }

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Info($msg) { Write-Host "    $msg" -ForegroundColor DarkGray }

# Status values: 'ok' (already installed), 'installed', 'upgraded', 'missing' (check-only),
# 'failed', 'skipped', 'action' (needs something from you).
function Add-Result($item, $status, $detail) {
  [void]$script:Results.Add([pscustomobject]@{ Item = $item; Status = $status; Detail = $detail })
  $color = switch ($status) {
    'ok' { 'Green' } 'installed' { 'Green' } 'upgraded' { 'Green' }
    'missing' { 'Yellow' } 'skipped' { 'DarkGray' } 'action' { 'Yellow' } default { 'Red' }
  }
  Write-Host ("  [{0,-9}] {1} {2}" -f $status, $item, $(if ($detail) { "- $detail" } else { '' })) -ForegroundColor $color
}

function Update-SessionPath {
  # Pick up PATH changes made by installers without reopening the terminal.
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user    = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machine;$user"
}

function Test-Command($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }

function Test-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  return (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Runs winget; returns $true if winget reported success (or "already installed").
function Invoke-Winget($verb, $id) {
  if (-not (Test-Command 'winget')) {
    Write-Info "winget not found. Install 'App Installer' from the Microsoft Store."
    return $false
  }
  Write-Info "winget $verb --id $id ..."
  winget $verb --id $id -e --silent --accept-source-agreements --accept-package-agreements
  $code = $LASTEXITCODE
  Update-SessionPath
  # 0 = success; -1978335189 (0x8A15002B) = no applicable upgrade / already installed
  return ($code -eq 0 -or $code -eq -1978335189)
}

function Find-VSCode {
  if (Test-Command 'code') { return 'code' }
  $candidates = @(
    "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd",
    "$env:ProgramFiles\Microsoft VS Code\bin\code.cmd"
  )
  foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
  return $null
}

function Get-NodeMajor {
  if (-not (Test-Command 'node')) { return 0 }
  return [int]((node -v).TrimStart('v').Split('.')[0])
}

try {
  # Windows opened before an install keep a stale PATH; reload it from the registry so tools
  # installed by a previous run are detected instead of being "installed" again.
  Update-SessionPath
  Write-Host "Prepwise setup  -  $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor White
  if ($CheckOnly) { Write-Host '(check-only mode: nothing will be installed or changed)' -ForegroundColor Yellow }

  # -------------------------------------------------------------- prerequisites
  Write-Step 'Checking prerequisites'

  # Git
  if (Test-Command 'git') { Add-Result 'Git' 'ok' ((git --version) -replace 'git version ', '') }
  elseif ($CheckOnly) { Add-Result 'Git' 'missing' 'would install: winget install Git.Git' }
  elseif ((Invoke-Winget 'install' 'Git.Git') -and (Test-Command 'git')) { Add-Result 'Git' 'installed' ((git --version) -replace 'git version ', '') }
  else { Add-Result 'Git' 'failed' 'install manually: https://git-scm.com/download/win' }

  # Node.js LTS
  $major = Get-NodeMajor
  if ($major -ge $MinNodeMajor) { Add-Result 'Node.js' 'ok' (node -v) }
  elseif ($CheckOnly) {
    if ($major -gt 0) { Add-Result 'Node.js' 'missing' "$(node -v) is too old, need >= $MinNodeMajor" }
    else { Add-Result 'Node.js' 'missing' 'would install: winget install OpenJS.NodeJS.LTS' }
  } else {
    $verb = if ($major -gt 0) { 'upgrade' } else { 'install' }
    $null = Invoke-Winget $verb 'OpenJS.NodeJS.LTS'
    if ((Get-NodeMajor) -ge $MinNodeMajor) { Add-Result 'Node.js' $(if ($verb -eq 'upgrade') { 'upgraded' } else { 'installed' }) (node -v) }
    else { Add-Result 'Node.js' 'failed' 'install manually: https://nodejs.org/en/download' }
  }

  # npm comes with Node
  if (Test-Command 'npm') { Add-Result 'npm' 'ok' (npm -v) }
  else { Add-Result 'npm' $(if ($CheckOnly) { 'missing' } else { 'failed' }) 'comes with Node.js' }

  # pnpm
  if (Test-Command 'pnpm') { Add-Result 'pnpm' 'ok' (pnpm -v) }
  elseif ($CheckOnly) { Add-Result 'pnpm' 'missing' 'would install: npm install -g pnpm' }
  elseif (Test-Command 'npm') {
    Write-Info 'npm install -g pnpm ...'
    npm install -g pnpm
    Update-SessionPath
    if (Test-Command 'pnpm') { Add-Result 'pnpm' 'installed' (pnpm -v) }
    else { Add-Result 'pnpm' 'failed' 'install manually: https://pnpm.io/installation' }
  } else { Add-Result 'pnpm' 'skipped' 'needs npm first' }

  # PowerShell execution policy. pnpm/npm install `.ps1` launchers, which a Restricted policy
  # blocks ("running scripts is disabled"). This script itself runs under a per-process Bypass
  # (see setup.cmd), so look at the persistent scopes to see what a normal terminal will get.
  $policies = Get-ExecutionPolicy -List
  $byScope = @{}; foreach ($p in $policies) { $byScope["$($p.Scope)"] = "$($p.ExecutionPolicy)" }
  $gpo = @('MachinePolicy', 'UserPolicy') | Where-Object { $byScope[$_] -ne 'Undefined' } | Select-Object -First 1
  $effective = 'Restricted'  # Windows client default when nothing is set
  foreach ($s in 'MachinePolicy', 'UserPolicy', 'CurrentUser', 'LocalMachine') {
    if ($byScope[$s] -ne 'Undefined') { $effective = $byScope[$s]; break }
  }
  if ($effective -in 'RemoteSigned', 'Unrestricted', 'Bypass') { Add-Result 'PowerShell scripts' 'ok' "policy $effective" }
  elseif ($gpo) { Add-Result 'PowerShell scripts' 'action' "blocked by Group Policy ($gpo); use pnpm.cmd / npm.cmd instead" }
  elseif ($CheckOnly) { Add-Result 'PowerShell scripts' 'missing' "policy $effective blocks pnpm.ps1; would offer RemoteSigned for your user" }
  else {
    Write-Host ''
    Write-Host "  PowerShell's script policy is '$effective', so typing 'pnpm' or 'npm' in PowerShell fails" -ForegroundColor Yellow
    Write-Host "  with 'running scripts is disabled'. Setting it to RemoteSigned for YOUR user only allows" -ForegroundColor Yellow
    Write-Host "  local scripts (like pnpm's) and still blocks unsigned scripts downloaded from the internet." -ForegroundColor Yellow
    Write-Host "  Undo any time with: Set-ExecutionPolicy -Scope CurrentUser Undefined" -ForegroundColor DarkGray
    $answer = $null
    if (-not $NoPause) { $answer = Read-Host '  Set CurrentUser policy to RemoteSigned? [Y/n]' }
    if ($NoPause) { Add-Result 'PowerShell scripts' 'action' "policy $effective; run: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned" }
    elseif ($answer -match '^(|y|yes)$') {
      try {
        Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force -ErrorAction Stop
        Add-Result 'PowerShell scripts' 'installed' 'CurrentUser policy set to RemoteSigned'
      } catch { Add-Result 'PowerShell scripts' 'failed' $_.Exception.Message }
    } else { Add-Result 'PowerShell scripts' 'action' 'declined; use pnpm.cmd / npm.cmd in PowerShell' }
  }

  # VS Code
  $code = Find-VSCode
  if ($code) { Add-Result 'VS Code' 'ok' $(if ($code -eq 'code') { 'on PATH' } else { 'found (not on PATH)' }) }
  elseif ($CheckOnly) { Add-Result 'VS Code' 'missing' 'would install: winget install Microsoft.VisualStudioCode' }
  else {
    $null = Invoke-Winget 'install' 'Microsoft.VisualStudioCode'
    $code = Find-VSCode
    if ($code) { Add-Result 'VS Code' 'installed' '' } else { Add-Result 'VS Code' 'failed' 'https://code.visualstudio.com/download' }
  }

  # C++ compiler. Dev-only: the test that syntax-checks the C++ in the DSA articles
  # (apps/web/lib/pattern-article-code.test.ts) needs g++ or clang++; it is skipped without one.
  # The app itself never needs a compiler. winget's WinLibs package is a standalone GCC.
  if ((Test-Command 'g++') -or (Test-Command 'clang++')) {
    Add-Result 'C++ compiler' 'ok' $(if (Test-Command 'g++') { 'g++' } else { 'clang++' })
  } elseif ($SkipCompiler) { Add-Result 'C++ compiler' 'skipped' '-SkipCompiler' }
  elseif ($CheckOnly) { Add-Result 'C++ compiler' 'missing' 'would install: winget install BrechtSanders.WinLibs.POSIX.UCRT' }
  else {
    $null = Invoke-Winget 'install' 'BrechtSanders.WinLibs.POSIX.UCRT'
    if ((Test-Command 'g++') -or (Test-Command 'clang++')) { Add-Result 'C++ compiler' 'installed' 'open a new terminal to use it' }
    else { Add-Result 'C++ compiler' 'action' 'installed but not on PATH yet (open a new terminal), or skip: the article-code test is optional' }
  }

  # JDK 17. Dev-only: the test that compiles and runs the Java code in the LLD lessons
  # (apps/web/lib/lld-projects.test.ts) needs javac; it is skipped without one.
  if (Test-Command 'javac') { Add-Result 'JDK' 'ok' ((javac -version 2>&1) -join ' ') }
  elseif ($SkipCompiler) { Add-Result 'JDK' 'skipped' '-SkipCompiler' }
  elseif ($CheckOnly) { Add-Result 'JDK' 'missing' 'would install: winget install EclipseAdoptium.Temurin.17.JDK' }
  else {
    $null = Invoke-Winget 'install' 'EclipseAdoptium.Temurin.17.JDK'
    if (Test-Command 'javac') { Add-Result 'JDK' 'installed' 'open a new terminal to use it' }
    else { Add-Result 'JDK' 'action' 'installed but not on PATH yet (open a new terminal), or skip: the Java test is optional' }
  }

  # Docker (optional)
  if ($Docker) {
    $null = wsl.exe --status 2>&1
    if ($LASTEXITCODE -eq 0) { Add-Result 'WSL2' 'ok' '' }
    elseif ($CheckOnly) { Add-Result 'WSL2' 'missing' 'would run: wsl --install (admin + restart)' }
    elseif (Test-Admin) {
      wsl.exe --install
      Add-Result 'WSL2' 'installed' 'restart Windows to finish'
      $script:NeedsRestart = $true
    } else { Add-Result 'WSL2' 'action' 'right-click setup.cmd > Run as administrator, once' }

    if (Test-Command 'docker') { Add-Result 'Docker' 'ok' ((docker --version) -replace 'Docker version ', '') }
    elseif ($CheckOnly) { Add-Result 'Docker' 'missing' 'would install: winget install Docker.DockerDesktop' }
    elseif (Invoke-Winget 'install' 'Docker.DockerDesktop') {
      Add-Result 'Docker' 'installed' 'restart, then open Docker Desktop once'
      $script:NeedsRestart = $true
    } else { Add-Result 'Docker' 'failed' 'https://www.docker.com/products/docker-desktop/' }
  } else { Add-Result 'Docker' 'skipped' 'add -Docker to install' }

  # Ollama (optional)
  if ($Ollama) {
    if (Test-Command 'ollama') { Add-Result 'Ollama' 'ok' '' }
    elseif ($CheckOnly) { Add-Result 'Ollama' 'missing' 'would install: winget install Ollama.Ollama' }
    elseif (Invoke-Winget 'install' 'Ollama.Ollama') { Add-Result 'Ollama' 'installed' 'open a new terminal to use it' }
    else { Add-Result 'Ollama' 'failed' 'https://ollama.com/download' }
  } else { Add-Result 'Ollama' 'skipped' 'add -Ollama to install' }

  # -------------------------------------------------------------- VS Code extensions
  if ($SkipExtensions) { Add-Result 'VS Code extensions' 'skipped' '-SkipExtensions' }
  elseif (-not $code) { Add-Result 'VS Code extensions' 'skipped' 'VS Code not available' }
  else {
    Write-Step 'VS Code extensions'
    $extFile = Join-Path $Root '.vscode\extensions.json'
    if (-not (Test-Path $extFile)) { Add-Result 'VS Code extensions' 'skipped' '.vscode/extensions.json not found' }
    else {
      $wanted = (Get-Content $extFile -Raw | ConvertFrom-Json).recommendations
      $have = & $code --list-extensions 2>$null | ForEach-Object { $_.ToLower() }
      foreach ($e in $wanted) {
        if ($have -contains $e.ToLower()) { Add-Result $e 'ok' '' }
        elseif ($CheckOnly) { Add-Result $e 'missing' '' }
        else {
          $null = & $code --install-extension $e 2>&1
          if ($LASTEXITCODE -eq 0) { Add-Result $e 'installed' '' } else { Add-Result $e 'failed' '' }
        }
      }
    }
  }

  # -------------------------------------------------------------- project
  Write-Step 'Project dependencies and build'
  if ($CheckOnly) { Add-Result 'Build' 'skipped' 'check-only mode' }
  elseif ($SkipBuild) { Add-Result 'Build' 'skipped' '-SkipBuild' }
  elseif (-not (Test-Path (Join-Path $Root 'package.json'))) { Add-Result 'Build' 'skipped' 'no package.json yet (project not scaffolded)' }
  elseif (-not (Test-Command 'pnpm')) { Add-Result 'Build' 'failed' 'pnpm not available' }
  else {
    Push-Location $Root
    try {
      if ((Test-Path '.env.example') -and -not (Test-Path '.env')) { Copy-Item '.env.example' '.env'; Add-Result '.env' 'installed' 'created from .env.example' }
      pnpm install
      if ($LASTEXITCODE -ne 0) { Add-Result 'pnpm install' 'failed' 'see output above' }
      else {
        Add-Result 'pnpm install' 'ok' ''
        pnpm build
        if ($LASTEXITCODE -ne 0) { Add-Result 'Build' 'failed' 'see output above' }
        else {
          Add-Result 'Build' 'ok' ''
          if ($Start) { Write-Step 'Starting app (Ctrl+C to stop)'; pnpm start }
        }
      }
    } finally { Pop-Location }
  }
}
catch {
  Add-Result 'Setup script' 'failed' "unexpected error: $($_.Exception.Message)"
  Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
}

# ---------------------------------------------------------------- summary
Write-Step 'Summary'
$script:Results | Format-Table -AutoSize -Wrap | Out-String -Width 200 | Write-Host

$count = { param($s) @($script:Results | Where-Object { $_.Status -eq $s }).Count }
$failed = & $count 'failed'
Write-Host ("  Already installed: {0}   Installed now: {1}   Missing: {2}   Failed: {3}   Needs action: {4}" -f `
  (& $count 'ok'), ((& $count 'installed') + (& $count 'upgraded')), (& $count 'missing'), $failed, (& $count 'action'))

if ($failed -gt 0) { Write-Host '  Some steps FAILED. Scroll up for the error output, or open the log file.' -ForegroundColor Red }
elseif ($CheckOnly) { Write-Host '  Check complete. Run setup.cmd without -CheckOnly to install anything marked missing.' -ForegroundColor Yellow }
else { Write-Host '  Everything succeeded.' -ForegroundColor Green }
if ($script:NeedsRestart) { Write-Host '  Restart Windows, then run setup.cmd again to finish.' -ForegroundColor Yellow }
if (@($script:Results | Where-Object { $_.Status -in 'installed', 'upgraded' }).Count -gt 0) {
  Write-Host '  Open a NEW terminal / restart VS Code so newly installed tools are on PATH.' -ForegroundColor Yellow
}

if ($logFile) { try { Stop-Transcript | Out-Null } catch {}; Write-Host "  Log saved to: $logFile" }

if (-not $NoPause) {
  Write-Host ''
  Write-Host 'Press Enter to close this window...' -ForegroundColor Cyan
  [void][Console]::ReadLine()
}
if ($failed -gt 0) { exit 1 } else { exit 0 }
