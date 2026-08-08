$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$sdkRoot = Join-Path (Join-Path $env:LOCALAPPDATA 'DriverCompanion\android-tools') 'android-sdk'
$adb = Join-Path $sdkRoot 'platform-tools\adb.exe'
$apk = Join-Path $projectRoot 'android\app\build\outputs\apk\debug\app-debug.apk'

if (-not (Test-Path -LiteralPath $adb)) { throw 'Android platform tools are not installed in the private Cantarivo tools folder.' }
if (-not (Test-Path -LiteralPath $apk)) { throw 'No debug APK is present. Run build-android-debug.ps1 first.' }

& $adb start-server | Out-Null
$devices = @(& $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\tdevice$" } | ForEach-Object { ($_ -split "\t")[0] })

if ($devices.Count -eq 0) {
  throw 'No authorized Android phone is connected. Unlock the phone, enable USB debugging, approve this computer on the phone, then try again.'
}

if ($devices.Count -ne 1) {
  throw 'More than one Android device is connected. Disconnect all but the owner-controlled test phone, then try again.'
}

Write-Output 'Ready to install the local preview debug build on one connected, owner-controlled Android phone.'
Write-Output 'This is not a Play Store build. It is for stationary controlled testing only and asks for microphone access only when you explicitly choose one on-device command session.'
$confirmation = Read-Host 'Type INSTALL to continue'
if ($confirmation -cne 'INSTALL') {
  Write-Output 'Installation cancelled. No device changes were made.'
  exit 0
}

& $adb -s $devices[0] install -r $apk
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output 'Installed. Open Cantarivo on the phone in a stationary controlled test environment and follow docs/ANDROID_PREVIEW_DEVICE_SETUP.md.'
