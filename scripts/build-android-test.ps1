$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskPreviousJava = $env:JAVA_HOME
$taskPreviousAndroid = $env:ANDROID_HOME
Push-Location $taskRoot
try {
    $taskStudioJava = Join-Path $env:ProgramFiles 'Android\Android Studio\jbr'
    if (Test-Path (Join-Path $taskStudioJava 'bin\java.exe')) { $env:JAVA_HOME = $taskStudioJava }
    if (!$env:JAVA_HOME -or !(Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) { throw 'Install Android Studio (including its bundled Java runtime) first.' }
    $taskLocalProperties = Join-Path $taskRoot 'android\local.properties'
    if (!$env:ANDROID_HOME) {
        if (Test-Path $taskLocalProperties) {
            $taskSdkSetting = Get-Content $taskLocalProperties | Where-Object { $_ -match '^sdk.dir=' } | Select-Object -First 1
            if ($taskSdkSetting) { $env:ANDROID_HOME = $taskSdkSetting.Substring(8).Replace('\:', ':').Replace('\\', '\') }
        }
        if (!$env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
    }
    if (!(Test-Path (Join-Path $env:ANDROID_HOME 'platforms\android-36'))) { throw 'Install Android SDK Platform 36 in Android Studio > SDK Manager.' }
    & node node_modules/@capacitor/cli/bin/capacitor sync android
    if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed.' }
    Push-Location android
    try {
        & .\gradlew.bat assembleDebug --console=plain
        if ($LASTEXITCODE -ne 0) { throw 'Android build failed. Read the first Gradle error above.' }
    } finally { Pop-Location }
    $taskVersion = (Get-Content package.json -Raw | ConvertFrom-Json).version
    $taskOutput = Join-Path $taskRoot 'output\android'
    [System.IO.Directory]::CreateDirectory($taskOutput) | Out-Null
    $taskApk = Join-Path $taskOutput "WAGIE-$taskVersion-test.apk"
    Copy-Item -LiteralPath 'android\app\build\outputs\apk\debug\app-debug.apk' -Destination $taskApk
    Write-Output "APK ready: $taskApk"
    $taskHashStream = [System.IO.File]::OpenRead($taskApk)
    $taskHasher = [System.Security.Cryptography.SHA256]::Create()
    try { Write-Output ('SHA256: ' + ([BitConverter]::ToString($taskHasher.ComputeHash($taskHashStream))).Replace('-', '')) }
    finally { $taskHashStream.Dispose(); $taskHasher.Dispose() }
} finally {
    $env:JAVA_HOME = $taskPreviousJava
    $env:ANDROID_HOME = $taskPreviousAndroid
    Pop-Location
}
