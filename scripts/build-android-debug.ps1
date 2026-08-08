$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = Join-Path $env:LOCALAPPDATA 'DriverCompanion\android-tools'
$sdkRoot = Join-Path $toolRoot 'android-sdk'
$jdkHome = Get-ChildItem -LiteralPath (Join-Path $toolRoot 'jdk') -Directory -ErrorAction Stop |
  Where-Object Name -Like 'jdk-21*' |
  Sort-Object Name -Descending |
  Select-Object -First 1 -ExpandProperty FullName

if (-not $jdkHome) {
  throw 'Java 21 is not installed in the private Cantarivo tools folder. Re-run the Android tool setup first.'
}

if (-not (Test-Path -LiteralPath (Join-Path $sdkRoot 'platforms\android-36\android.jar'))) {
  throw 'Android SDK Platform 36 is not installed in the private Cantarivo tools folder. Re-run the Android tool setup first.'
}

$env:JAVA_HOME = $jdkHome
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:Path = (Join-Path $jdkHome 'bin') + ';' + (Join-Path $sdkRoot 'platform-tools') + ';' + $env:Path

Push-Location (Join-Path $projectRoot 'android')
try {
  & .\gradlew.bat --no-daemon --max-workers=1 '-Dorg.gradle.jvmargs=-Xmx512m -XX:MaxMetaspaceSize=256m' --console=plain assembleDebug
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

$apk = Join-Path $projectRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path -LiteralPath $apk)) { throw 'The build completed without producing the expected debug APK.' }

Write-Output "Debug APK ready: $apk"
