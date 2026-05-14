#Requires -Version 5.1
param(
    [string]$Repo = "phongit1995/chat-service",
    [string]$Tag = "latest",
    [string]$InstallDir = "$env:LOCALAPPDATA\ChatApp"
)

$ErrorActionPreference = "Stop"

Write-Host "Chat App Installer / Updater for Windows" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$apiBase = "https://api.github.com/repos/$Repo"
$versionFile = Join-Path $InstallDir ".version"

if ($Tag -eq "latest") {
    $release = Invoke-RestMethod "$apiBase/releases/latest"
} else {
    $release = Invoke-RestMethod "$apiBase/releases/tags/$Tag"
}

$newVersion = $release.tag_name

if (Test-Path $versionFile) {
    $currentVersion = Get-Content $versionFile -Raw | ForEach-Object { $_.Trim() }
    if ($currentVersion -eq $newVersion) {
        Write-Host "Already up to date: $currentVersion" -ForegroundColor Green
        exit 0
    }
    Write-Host "Update available: $currentVersion -> $newVersion" -ForegroundColor Yellow
} else {
    Write-Host "Installing version: $newVersion" -ForegroundColor Yellow
}

$asset = $release.assets | Where-Object { $_.name -eq "chat_app-windows.zip" }
if (-not $asset) {
    Write-Error "No windows artifact found in release $newVersion"
    exit 1
}

$tmpZip = Join-Path $env:TEMP "chat_app-windows.zip"
Write-Host "Downloading $($asset.name)..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmpZip -UseBasicParsing

if (Test-Path $InstallDir) {
    Write-Host "Removing previous installation..."
    Remove-Item $InstallDir -Recurse -Force
}
New-Item -ItemType Directory -Path $InstallDir | Out-Null

Write-Host "Extracting to $InstallDir..."
Expand-Archive -Path $tmpZip -DestinationPath $InstallDir -Force
Remove-Item $tmpZip

$newVersion | Set-Content $versionFile

$exe = Get-ChildItem $InstallDir -Filter "*.exe" | Select-Object -First 1
if (-not $exe) {
    Write-Error "No .exe found after extraction"
    exit 1
}

$shortcutPath = [System.IO.Path]::Combine([Environment]::GetFolderPath("Desktop"), "Chat App.lnk")
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exe.FullName
$shortcut.WorkingDirectory = $InstallDir
$shortcut.Save()

Write-Host ""
Write-Host "Done! Version $newVersion installed." -ForegroundColor Green
Write-Host "Installed to: $InstallDir" -ForegroundColor Green
Write-Host "Desktop shortcut: $shortcutPath" -ForegroundColor Green
