# Install Tesseract Language Files
# Run this script as Administrator: Right-click -> Run with PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installing Tesseract Language Data" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$source = "$env:TEMP\tesseract-langs"
$dest = "C:\Program Files\Tesseract-OCR\tessdata"

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "How to run as Administrator:" -ForegroundColor Yellow
    Write-Host "1. Right-click on this script file" -ForegroundColor Yellow
    Write-Host "2. Select 'Run with PowerShell' or 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Check if source files exist
if (-not (Test-Path "$source\urd.traineddata")) {
    Write-Host "❌ Language files not found in: $source" -ForegroundColor Red
    Write-Host "   Files should have been downloaded already." -ForegroundColor Yellow
    Write-Host "   If not, run the download command first." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Copy files
Write-Host "Copying language files to Tesseract..." -ForegroundColor Yellow
Write-Host "From: $source" -ForegroundColor Gray
Write-Host "To:   $dest" -ForegroundColor Gray
Write-Host ""

try {
    Copy-Item "$source\urd.traineddata" -Destination "$dest\urd.traineddata" -Force
    Write-Host "✅ Copied urd.traineddata (Urdu)" -ForegroundColor Green
    
    Copy-Item "$source\ara.traineddata" -Destination "$dest\ara.traineddata" -Force
    Write-Host "✅ Copied ara.traineddata (Arabic)" -ForegroundColor Green
    
    Copy-Item "$source\hin.traineddata" -Destination "$dest\hin.traineddata" -Force
    Write-Host "✅ Copied hin.traineddata (Hindi)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Installation Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Verify installation
    Write-Host "Verifying languages..." -ForegroundColor Yellow
    $env:Path += ";C:\Program Files\Tesseract-OCR"
    & tesseract --list-langs
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Restart VS Code" -ForegroundColor White
    Write-Host "2. Restart Python service: python app.py" -ForegroundColor White
    Write-Host "3. Enable Python OCR in frontend (ImageSearch.jsx line 30)" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error copying files: $_" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to exit"
