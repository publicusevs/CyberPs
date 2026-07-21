param(
    [string]$setup,
    [string]$ver,
    [string]$owner,
    [string]$repo
)

if (-not (Test-Path "dist_installer/$setup")) {
    Write-Error "Installer binary missing at dist_installer/$setup"
    exit 1
}

$hash = (Get-FileHash -Path "dist_installer/$setup" -Algorithm SHA256).Hash.ToLower()
$size = (Get-Item "dist_installer/$setup").Length

$manifest = [ordered]@{
    version       = $ver
    file_name     = $setup
    file_size     = $size
    sha256        = $hash
    download_url  = "https://github.com/$owner/$repo/releases/download/v$ver/$setup"
    published_at  = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')
    mandatory     = $false
    release_notes = "CyberPS Production Release v$ver"
}

$manifest | ConvertTo-Json | Out-File -FilePath "dist_installer/update_manifest.json" -Encoding utf8

if (-not (Test-Path "CyberPS_Release")) {
    New-Item -ItemType Directory -Force -Path "CyberPS_Release" | Out-Null
}

Copy-Item -Path "dist_installer/$setup" -Destination "CyberPS_Release/$setup" -Force
Copy-Item -Path "dist_installer/update_manifest.json" -Destination "CyberPS_Release/update_manifest.json" -Force
if (Test-Path "installer/README_INSTALL.txt") {
    Copy-Item -Path "installer/README_INSTALL.txt" -Destination "CyberPS_Release/README_INSTALL.txt" -Force
}

("$hash  $setup") | Out-File -FilePath "CyberPS_Release/SHA256SUMS" -Encoding ascii
Write-Host "[OK] Manifest and checksum generated successfully."
