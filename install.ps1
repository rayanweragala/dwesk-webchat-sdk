# Dwesk WebChat — Windows installer
# Run from PowerShell:
#   irm https://raw.githubusercontent.com/rayanweragala/dwesk-webchat-sdk/main/install.ps1 | iex

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoUrl    = if ($env:DWESK_WEBCHAT_REPO_URL)    { $env:DWESK_WEBCHAT_REPO_URL }    else { 'https://github.com/rayanweragala/dwesk-webchat-sdk.git' }
$InstallDir = if ($env:DWESK_WEBCHAT_INSTALL_DIR) { $env:DWESK_WEBCHAT_INSTALL_DIR } else { "$HOME\.dwesk-webchat-demo" }

function Say($msg)  { Write-Host $msg }
function Ask($prompt, $default = '') {
  $hint = if ($default) { " [$default]" } else { '' }
  $val  = Read-Host "$prompt$hint"
  if ($val -eq '' -and $default -ne '') { $default } else { $val }
}
function AskSecret($prompt) {
  $ss  = Read-Host -AsSecureString $prompt
  [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss))
}

# ── Check / install Bun ────────────────────────────────────────────────────
function Ensure-Bun {
  if (Get-Command bun -ErrorAction SilentlyContinue) { return }
  Say 'Bun not found. Installing Bun…'
  irm bun.sh/install.ps1 | iex
  $env:PATH = "$HOME\.bun\bin;$env:PATH"
  if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Say 'Bun installed. Close and reopen PowerShell, then run this script again.'
    exit 1
  }
}

# ── Clone / update repo ────────────────────────────────────────────────────
function Ensure-Repo {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Say 'Git is required. Install from https://git-scm.com then rerun.'
    exit 1
  }
  if (Test-Path "$InstallDir\.git") {
    Say "Updating $InstallDir"
    git -C $InstallDir pull --ff-only
  } else {
    if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }
    git clone $RepoUrl $InstallDir
  }
}

# ── Write .env ────────────────────────────────────────────────────────────
function Write-Env {
  Say ''
  Say 'Connection settings'
  $apiUrl       = Ask 'External API URL'  'http://localhost:8080'
  $companyId    = Ask 'Company ID'        '1'
  $username     = Ask 'Username'          ''
  $password     = AskSecret 'Password'
  $custName     = Ask 'Customer name'     'Demo Customer'
  $custEmail    = Ask 'Customer email'    'demo@example.com'
  $custPhone    = Ask 'Customer phone'    '0770000000'

  $env = @"
VITE_DWESK_CRM_URL=$apiUrl
VITE_DWESK_COMPANY_ID=$companyId
VITE_DWESK_USERNAME=$username
VITE_DWESK_PASSWORD=$password
VITE_DWESK_WEBHOOK_URL=http://localhost:3000/api/webhook/chat
VITE_DWESK_PUBLIC_FORWARD_URL=
VITE_DWESK_CUSTOMER_NAME=$custName
VITE_DWESK_CUSTOMER_EMAIL=$custEmail
VITE_DWESK_CUSTOMER_PHONE=$custPhone
"@
  Set-Content -Path "$InstallDir\examples\react\.env" -Value $env -Encoding UTF8
}

# ── Install deps ──────────────────────────────────────────────────────────
function Install-Deps {
  Say 'Installing dependencies'
  Push-Location $InstallDir; bun install; Pop-Location
  Push-Location "$InstallDir\examples\react"; bun install; Pop-Location
}

# ── Write launcher bat ────────────────────────────────────────────────────
function Write-Launcher {
  $bat = "$InstallDir\dwesk-webchat.bat"
  $content = @"
@echo off
cd /d "$InstallDir"
start "" cmd /c "bun examples\server\server.ts"
cd examples\react
bun run dev
"@
  Set-Content -Path $bat -Value $content -Encoding ASCII

  $shortcut = "$HOME\Desktop\Dwesk WebChat.lnk"
  $wsh = New-Object -ComObject WScript.Shell
  $lnk = $wsh.CreateShortcut($shortcut)
  $lnk.TargetPath  = $bat
  $lnk.Description = 'Dwesk WebChat demo'
  $lnk.Save()

  Say "Launcher: $bat"
  Say "Shortcut: $shortcut"
}

# ── Main ──────────────────────────────────────────────────────────────────
Say 'Dwesk WebChat installer (Windows)'
Ensure-Bun
Ensure-Repo
Write-Env
Install-Deps
Write-Launcher
Say ''
Say 'Done. Run:  dwesk-webchat.bat'
Say 'Open:      http://127.0.0.1:5173'
