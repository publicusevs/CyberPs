# Setup dependencies for CyberPS Portable Build
# Downloads and packages Tesseract OCR and Poppler binaries

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (!$RootDir) { $RootDir = Get-Location }

$BinDir = Join-Path $RootDir "bin"
if (!(Test-Path $BinDir)) {
    Write-Host "Creating bin directory: $BinDir"
    New-Item -ItemType Directory -Path $BinDir | Out-Null
}

$TesseractDest = Join-Path $BinDir "Tesseract-OCR"
$TessExe = Join-Path $TesseractDest "tesseract.exe"

if (!(Test-Path $TessExe)) {
    Write-Host "Tesseract-OCR not found locally in $TesseractDest."
    
    # 1. Try local copy from Program Files (Developer machine optimization)
    $LocalProgramFiles = "C:\Program Files\Tesseract-OCR"
    $LocalProgramFilesX86 = "C:\Program Files (x86)\Tesseract-OCR"
    
    if (Test-Path (Join-Path $LocalProgramFiles "tesseract.exe")) {
        Write-Host "Found local Tesseract installation at $LocalProgramFiles. Copying files..."
        New-Item -ItemType Directory -Path $TesseractDest -Force | Out-Null
        Copy-Item -Path "$LocalProgramFiles\*" -Destination $TesseractDest -Recurse -Force
        Write-Host "Tesseract-OCR successfully copied from Program Files."
    }
    elseif (Test-Path (Join-Path $LocalProgramFilesX86 "tesseract.exe")) {
        Write-Host "Found local Tesseract installation at $LocalProgramFilesX86. Copying files..."
        New-Item -ItemType Directory -Path $TesseractDest -Force | Out-Null
        Copy-Item -Path "$LocalProgramFilesX86\*" -Destination $TesseractDest -Recurse -Force
        Write-Host "Tesseract-OCR successfully copied from Program Files (x86)."
    }
    else {
        # 2. Fallback: Non-admin NuGet download & official language data downloads
        Write-Host "No local installation found. Downloading portable Tesseract from NuGet..."
        $NugetUrl = "https://www.nuget.org/api/v2/package/NAPS2.Tesseract.Binaries"
        $ZipPath = Join-Path $BinDir "tesseract_nuget.zip"
        $TempExtract = Join-Path $BinDir "tesseract_temp"
        
        try {
            Invoke-WebRequest -Uri $NugetUrl -OutFile $ZipPath -UserAgent "Mozilla/5.0"
            
            Write-Host "Extracting Tesseract binaries..."
            if (Test-Path $TempExtract) { Remove-Item $TempExtract -Recurse -Force }
            Expand-Archive -Path $ZipPath -DestinationPath $TempExtract -Force
            
            # Create destination folder
            New-Item -ItemType Directory -Path $TesseractDest -Force | Out-Null
            
            # Copy tesseract.exe
            $SourceExe = Join-Path $TempExtract "contentFiles\_win64\tesseract.exe"
            if (Test-Path $SourceExe) {
                Copy-Item -Path $SourceExe -Destination $TessExe -Force
                Write-Host "Tesseract binary successfully unpacked."
            } else {
                throw "Could not find tesseract.exe in the extracted NuGet package!"
            }
            
            # Create tessdata directory
            $TessdataPath = Join-Path $TesseractDest "tessdata"
            New-Item -ItemType Directory -Path $TessdataPath -Force | Out-Null
            
            # Download Hindi and English traineddata files
            Write-Host "Downloading English language model (eng.traineddata)..."
            $EngUrl = "https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata"
            Invoke-WebRequest -Uri $EngUrl -OutFile (Join-Path $TessdataPath "eng.traineddata") -UserAgent "Mozilla/5.0"
            
            Write-Host "Downloading Hindi language model (hin.traineddata)..."
            $HinUrl = "https://github.com/tesseract-ocr/tessdata/raw/main/hin.traineddata"
            Invoke-WebRequest -Uri $HinUrl -OutFile (Join-Path $TessdataPath "hin.traineddata") -UserAgent "Mozilla/5.0"
            
            Write-Host "Tesseract-OCR successfully set up and configured."
        } catch {
            Write-Error "Failed to set up portable Tesseract fallback: $_"
        } finally {
            # Cleanup temp files
            if (Test-Path $TempExtract) { Remove-Item $TempExtract -Recurse -Force }
            if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
        }
    }
} else {
    Write-Host "Tesseract-OCR already exists locally. Skipping setup."
}

$PopplerDest = Join-Path $BinDir "poppler"
$PopplerLibExe = Join-Path $PopplerDest "Library\bin\pdftoppm.exe"
$PopplerBinExe = Join-Path $PopplerDest "bin\pdftoppm.exe"

if (!(Test-Path $PopplerLibExe) -and !(Test-Path $PopplerBinExe)) {
    Write-Host "Poppler not found locally. Downloading binaries..."
    $Url = "https://github.com/oschwartz10612/poppler-windows/releases/download/v24.07.0-0/Release-24.07.0-0.zip"
    $ZipPath = Join-Path $BinDir "poppler.zip"
    
    Invoke-WebRequest -Uri $Url -OutFile $ZipPath -UserAgent "Mozilla/5.0"
    
    Write-Host "Extracting Poppler binaries..."
    $TempExtract = Join-Path $BinDir "poppler_temp"
    if (Test-Path $TempExtract) { Remove-Item $TempExtract -Recurse -Force }
    
    Expand-Archive -Path $ZipPath -DestinationPath $TempExtract
    
    # Move extracted files to bin/poppler
    if (Test-Path $PopplerDest) { Remove-Item $PopplerDest -Recurse -Force }
    New-Item -ItemType Directory -Path $PopplerDest | Out-Null
    
    $InnerDir = Get-ChildItem -Path $TempExtract -Directory | Select-Object -First 1
    if ($InnerDir) {
        Move-Item -Path "$($InnerDir.FullName)\*" -Destination $PopplerDest -Force
    } else {
        Move-Item -Path "$TempExtract\*" -Destination $PopplerDest -Force
    }
    
    Write-Host "Poppler successfully packaged locally."
    
    # Cleanup temp files
    if (Test-Path $TempExtract) { Remove-Item $TempExtract -Recurse -Force }
    if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
} else {
    Write-Host "Poppler already exists locally. Skipping download."
}
