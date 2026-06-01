<#
Creates a single `Glions_Addon.mcpack` archive containing both the behavior pack and resource pack.
Run from the repository root:
    .\package_mcpack.ps1
Or specify a custom output filename:
    .\package_mcpack.ps1 -OutputFile Glions_Addon.mcpack
#>
Param(
    [string]$OutputFile = 'Glions_Addon.mcpack',
    [string]$BehaviorFolder = 'Glions_BP',
    [string]$ResourceFolder = 'Glions_RP'
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$behaviorRoot = Join-Path $root $BehaviorFolder
$resourceRoot = Join-Path $root $ResourceFolder

if (-not (Test-Path $behaviorRoot)) {
    throw "Behavior pack folder '$behaviorRoot' does not exist."
}
if (-not (Test-Path $resourceRoot)) {
    throw "Resource pack folder '$resourceRoot' does not exist."
}

$tempRoot = Join-Path $root '__GlionsMcpackTemp'
if (Test-Path $tempRoot) {
    Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction Stop
}
New-Item -ItemType Directory -Path $tempRoot | Out-Null

Write-Host "Copying Behavior Pack contents..."
Copy-Item -Path (Join-Path $behaviorRoot '*') -Destination $tempRoot -Recurse -Force -ErrorAction Stop
Write-Host "Copying Resource Pack contents..."
Copy-Item -Path (Join-Path $resourceRoot '*') -Destination $tempRoot -Recurse -Force -ErrorAction Stop

$combinedManifest = [ordered]@{
    format_version = 2
    header = [ordered]@{
        description = 'Glions Economy & Trading - combined behavior + resource addon'
        name = 'Glions - Economy & Trading'
        uuid = 'f1a4b5c6-d7e8-4f9a-8b2c-1234567890ab'
        version = @(1, 0, 0)
        min_engine_version = @(1, 18, 0)
    }
    modules = @(
        [ordered]@{
            type = 'resources'
            uuid = 'c1a2b3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'
            version = @(1, 0, 0)
        },
        [ordered]@{
            type = 'scripting'
            uuid = 'a1f9b2d4-3d5a-4c7f-8b2d-9e7f6a5c4b3d'
            version = @(1, 0, 0)
            entry = 'scripts/glions.js'
        }
    )
}

$manifestPath = Join-Path $tempRoot 'manifest.json'
$combinedManifest | ConvertTo-Json -Depth 10 | Set-Content -Path $manifestPath -Encoding UTF8

$outputPath = Join-Path $root $OutputFile
if (Test-Path $outputPath) {
    Remove-Item -Path $outputPath -Force -ErrorAction Stop
}

Write-Host "Building combined mcpack: $OutputFile"
Compress-Archive -Path (Join-Path $tempRoot '*') -DestinationPath $outputPath -Force -ErrorAction Stop

Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction Stop
Write-Host "Created combined package: $OutputFile"
