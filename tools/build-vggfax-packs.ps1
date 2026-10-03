<#
.SYNOPSIS
Creates the minified, one-request VGGFAX pack files used by the game.

.DESCRIPTION
The individual club JSON files remain the editable source data. This script
combines every club in each data\vggfaxNNN folder into data\vggfaxNNN.json.
Run it after changing, adding, or removing a club source file. Each exported
pack also has one permanent formation shared by every club in that pack.

Use -RerollFormation <pack number> only when you deliberately want a new
formation, for example: .\build-vggfax-packs.ps1 -RerollFormation 004
#>

[CmdletBinding()]
param(
    [string]$DataDirectory,
    [string[]]$RerollFormation = @()
)

if ([string]::IsNullOrWhiteSpace($DataDirectory)) {
    $DataDirectory = Join-Path $PSScriptRoot "..\data"
}

$utf8WithoutBom = [System.Text.UTF8Encoding]::new($false)
$supportedFormations = @("4-4-2", "4-3-3", "5-4-1", "4-5-1")
$legacyFormations = @{
    "001" = "4-4-2"
    "002" = "4-3-3"
    "003" = "5-4-1"
}

function Test-SupportedFormation {
    param([string]$Formation)
    return $supportedFormations -contains $Formation
}

function Get-RandomFormation {
    return Get-Random -InputObject $supportedFormations
}

$packDirectories = Get-ChildItem -LiteralPath $DataDirectory -Directory -Filter "vggfax*" |
    Sort-Object Name

foreach ($packDirectory in $packDirectories) {
    $packNumber = $packDirectory.Name.Substring("vggfax".Length)
    $packPath = Join-Path $DataDirectory ($packDirectory.Name + ".json")
    $shouldReroll = $RerollFormation -contains $packNumber -or $RerollFormation -contains "all"

    $existingPack = $null
    if (Test-Path -LiteralPath $packPath) {
        $existingPack = Get-Content -LiteralPath $packPath -Raw -Encoding UTF8 |
            ConvertFrom-Json
    }

    if ($shouldReroll) {
        $formation = Get-RandomFormation
    }
    elseif ($null -ne $existingPack -and $existingPack.PSObject.Properties.Name -contains "formation") {
        $formation = [string]$existingPack.formation
    }
    elseif ($legacyFormations.ContainsKey($packNumber)) {
        # One-time migration path for the original array-only pack files.
        $formation = $legacyFormations[$packNumber]
    }
    else {
        $formation = Get-RandomFormation
    }

    if (-not (Test-SupportedFormation $formation)) {
        throw "VGGFAX $packNumber has invalid formation '$formation'. Expected one of: $($supportedFormations -join ', ')."
    }

    $clubs = @(
        Get-ChildItem -LiteralPath $packDirectory.FullName -File -Filter "*.json" |
            Sort-Object Name |
            ForEach-Object {
                Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8 |
                    ConvertFrom-Json
            }
    )

    if ($clubs.Count -eq 0) {
        throw "No club JSON files found in $($packDirectory.FullName)."
    }

    $pack = [ordered]@{
        packNumber = $packNumber
        formation  = $formation
        clubs      = $clubs
    }
    $packJson = ConvertTo-Json -InputObject $pack -Depth 100 -Compress

    [System.IO.File]::WriteAllText($packPath, $packJson, $utf8WithoutBom)
    Write-Host "Built $($packDirectory.Name).json with $($clubs.Count) clubs and formation $formation."
}
