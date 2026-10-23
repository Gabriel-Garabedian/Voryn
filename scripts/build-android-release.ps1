$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$configPath = if ($env:VORYN_SIGNING_CONFIG) { $env:VORYN_SIGNING_CONFIG } else { Join-Path $env:USERPROFILE '.android/voryn-production/signing.json' }
if (-not (Test-Path -LiteralPath $configPath)) { throw 'Private production signing configuration not found.' }
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
if (-not $config.storeFile -or -not (Test-Path -LiteralPath $config.storeFile) -or -not $config.storePassword -or -not $config.keyAlias -or -not $config.keyPassword) {
    throw 'Production signing configuration is incomplete.'
}
$signingValues = @{
    VORYN_RELEASE_STORE_FILE = $config.storeFile
    VORYN_RELEASE_STORE_PASSWORD = $config.storePassword
    VORYN_RELEASE_KEY_ALIAS = $config.keyAlias
    VORYN_RELEASE_KEY_PASSWORD = $config.keyPassword
}
$previousValues = @{}
foreach ($name in $signingValues.Keys) {
    $previousValues[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
    [Environment]::SetEnvironmentVariable($name, $signingValues[$name], 'Process')
}
Push-Location $projectRoot
try {
    & npm.cmd run android:sync
    if ($LASTEXITCODE -ne 0) { throw 'Android web build or sync failed.' }
    Push-Location android
    try {
        & ./gradlew.bat --no-daemon assembleRelease
        if ($LASTEXITCODE -ne 0) { throw 'Android release build failed.' }
    } finally { Pop-Location }
} finally {
    Pop-Location
    foreach ($name in $previousValues.Keys) { [Environment]::SetEnvironmentVariable($name, $previousValues[$name], 'Process') }
}
