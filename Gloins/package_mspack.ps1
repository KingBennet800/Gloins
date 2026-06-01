<#
Creates a single .mspack archive containing both Glions_BP and Glions_RP.
Run from the repository root:
    .\package_mspack.ps1
Or specify a custom output filename:
    .\package_mspack.ps1 -OutputFile GlionsCustom.mspack
#>
Param(
    [string]$OutputFile = 'Glions.mspack'
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$behaviorPack = 'Glions_BP'
$resourcePack = 'Glions_RP'

if (-not (Test-Path $behaviorPack)) {
    Write-Error "Behavior pack folder '$behaviorPack' not found in $root"
    exit 1
}
if (-not (Test-Path $resourcePack)) {
    Write-Error "Resource pack folder '$resourcePack' not found in $root"
    exit 1
}

if (Test-Path $OutputFile) {
    Remove-Item $OutputFile -Force
}

Write-Host "Packaging $behaviorPack and $resourcePack into $OutputFile..."

Compress-Archive -Path $behaviorPack, $resourcePack -DestinationPath $OutputFile -Force

if (Test-Path $OutputFile) {
    Write-Host "Created package: $OutputFile"
    exit 0
}

Write-Error "Failed to create package: $OutputFile"
exit 1
