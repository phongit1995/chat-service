<#
  Chat Desktop installer/updater for Windows.
  Usage:
    powershell -ExecutionPolicy Bypass -File install-win.ps1 [tag]
#>

param(
    [string]$Tag = "latest"
)

$ErrorActionPreference = 'Stop'
$Repo = if ($env:REPO) { $env:REPO } else { "phongit1995/chat-service" }

Write-Host "Chat Desktop Installer / Updater for Windows"
Write-Host "============================================="

$apiBase = "https://api.github.com/repos/$Repo"
$releaseUrl = if ($Tag -eq "latest") { "$apiBase/releases/latest" } else { "$apiBase/releases/tags/$Tag" }
$release = Invoke-RestMethod -Uri $releaseUrl -Headers @{ 'User-Agent' = 'chat-installer' }
$newVersion = $release.tag_name

$asset = $release.assets | Where-Object { $_.name -match 'Chat-.*-win-.*\.exe$' } | Select-Object -First 1
if (-not $asset) {
    Write-Error "No Windows .exe asset found in release $newVersion"
    exit 1
}

$versionFile = Join-Path $env:LOCALAPPDATA 'chat-app\.version'
if (Test-Path $versionFile) {
    $current = Get-Content $versionFile -Raw
    if ($current.Trim() -eq $newVersion) {
        Write-Host "Already up to date: $current"
        exit 0
    }
    Write-Host "Update available: $current -> $newVersion"
} else {
    Write-Host "Installing version: $newVersion"
}

$tmp = [IO.Path]::Combine($env:TEMP, "chat-desktop-$(Get-Random).exe")
Write-Host "Downloading $($asset.name)..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmp -UseBasicParsing

Write-Host "Launching installer (silent mode)..."
Start-Process -FilePath $tmp -ArgumentList '/S' -Wait
Remove-Item $tmp

New-Item -ItemType Directory -Force -Path (Split-Path $versionFile) | Out-Null
$newVersion | Out-File -FilePath $versionFile -Encoding utf8 -NoNewline

Write-Host ""
Write-Host "Done! Version $newVersion installed."
