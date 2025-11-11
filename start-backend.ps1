# Quick Start Script for Express Backend Only
# Use this in a dedicated terminal window

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Express Backend" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if node_modules exists
if (-Not (Test-Path "backend\node_modules")) {
    Write-Host "Dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location -Path "backend"
    npm install
    Set-Location -Path ".."
    Write-Host ""
}

# Navigate to backend directory
Set-Location -Path "backend"

Write-Host "Starting Express Backend on port 5000..." -ForegroundColor Yellow
Write-Host ""

# Run backend
npm start

# Return to parent directory on exit
Set-Location -Path ".."
