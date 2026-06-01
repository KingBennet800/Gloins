<#
.SYNOPSIS
Packages the Glions pack and installs it into Minecraft Bedrock on Windows.
.DESCRIPTION
Creates a Glions_BP.mcpack archive from the repository's Glions_BP folder,
then installs the behavior pack and optionally the resource pack into Minecraft Bedrock.
If -InstallResourcePack is also provided, a valid Glions_RP.mcpack file is created.
.PARAMETER SourceFolder
The behavior pack folder name in this repository. Defaults to Glions_BP.
.PARAMETER InstallResourcePack
Also installs Glions_RP into Minecraft Bedrock's resource_packs directory.
.PARAMETER BuildMcpack
Builds a valid Glions_BP.mcpack archive from the behavior pack folder before installing.
If -InstallResourcePack is specified, also builds Glions_RP.mcpack from the resource pack folder.
.PARAMETER OutputFile
The output archive file name for the behavior pack. Defaults to Glions_BP.mcpack.
#>

[CmdletBinding()]
param(
    [string]$SourceFolder = 'Glions_BP',
    [switch]$InstallResourcePack,
    [switch]$BuildMcpack,
    [string]$OutputFile = 'Glions_BP.mcpack'
)

function Get-MinecraftComMojangPath {
    $paths = [System.Collections.Generic.List[string]]::new()

    if ($env:LOCALAPPDATA) {
        $paths.Add((Join-Path $env:LOCALAPPDATA 'Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang'))
        $paths.Add((Join-Path $env:LOCALAPPDATA 'Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe_8wekyb3d8bbwe\LocalState\games\com.mojang'))
    }

    if ($env:USERPROFILE) {
        $paths.Add((Join-Path $env:USERPROFILE 'AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang'))
    }

    $packagesRoot = if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA 'Packages' } else { $null }
    if ($packagesRoot -and (Test-Path $packagesRoot)) {
        Get-ChildItem -Path $packagesRoot -Directory -Filter '*Minecraft*' -ErrorAction SilentlyContinue | ForEach-Object {
            $candidate = Join-Path $_.FullName 'LocalState\games\com.mojang'
            $paths.Add($candidate)
        }
    }

    foreach ($candidate in $paths | Select-Object -Unique) {
        if ($candidate -and (Test-Path $candidate)) {
            return $candidate
        }
    }

    return $null
}

function Package-Glions {
    param(
        [Parameter(Mandatory=$true)] [string]$OutputPath,
        [Parameter(Mandatory=$true)] [string]$PackFolder
    )

    if (-not (Test-Path $PackFolder)) {
        throw "Pack folder '$PackFolder' does not exist."
    }

    if (Test-Path $OutputPath) {
        Remove-Item -Path $OutputPath -Force -ErrorAction Stop
    }

    Write-Host "Building package $OutputPath..."
    Compress-Archive -Path (Join-Path $PackFolder '*') -DestinationPath $OutputPath -Force -ErrorAction Stop
    Write-Host "Package created: $OutputPath"
}

function Copy-Pack {
    param(
        [Parameter(Mandatory=$true)] [string]$Source,
        [Parameter(Mandatory=$true)] [string]$DestinationRoot
    )

    if (-not (Test-Path $Source)) {
        throw "Source folder '$Source' does not exist. Run this script from the repository root."
    }

    if (-not (Test-Path $DestinationRoot)) {
        New-Item -ItemType Directory -Path $DestinationRoot -Force | Out-Null
    }

    $destPack = Join-Path $DestinationRoot (Split-Path -Leaf $Source)
    if (Test-Path $destPack) {
        Write-Host "Removing existing pack at: $destPack"
        Remove-Item -Path $destPack -Recurse -Force -ErrorAction Stop
    }

    Write-Host "Copying '$Source' to '$DestinationRoot'..."
    Copy-Item -Path $Source -Destination $DestinationRoot -Recurse -Force -ErrorAction Stop
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$behaviorRoot = Join-Path $root $SourceFolder
$resourceRoot = Join-Path $root 'Glions_RP'

if ($BuildMcpack) {
    $outputPath = Join-Path $root $OutputFile
    Package-Glions -OutputPath $outputPath -PackFolder $behaviorRoot

    if ($InstallResourcePack -and (Test-Path $resourceRoot)) {
        $resourceOutputPath = Join-Path $root 'Glions_RP.mcpack'
        Package-Glions -OutputPath $resourceOutputPath -PackFolder $resourceRoot
    }
}

$minecraftPath = Get-MinecraftComMojangPath
if (-not $minecraftPath) {
    throw "Unable to locate Minecraft Bedrock's com.mojang folder. Ensure Minecraft Bedrock is installed and that you are running this on Windows."
}

$behaviorDestination = Join-Path $minecraftPath 'behavior_packs'
Copy-Pack -Source $behaviorRoot -DestinationRoot $behaviorDestination

if ($InstallResourcePack) {
    $resourceDestination = Join-Path $minecraftPath 'resource_packs'
    Copy-Pack -Source $resourceRoot -DestinationRoot $resourceDestination
}

Write-Host "Glions behavior pack installed successfully."
if ($InstallResourcePack) {
    Write-Host "Glions resource pack installed successfully."
}
Write-Host "Open Minecraft Bedrock and enable the pack in World Settings."
