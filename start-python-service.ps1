# Quick Start Script for Python AI Service Only
# Use this in a dedicated terminal window

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Python AI Service" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists
if (-Not (Test-Path "python-ai-service\venv")) {
    Write-Host "Virtual environment not found. Running setup first..." -ForegroundColor Yellow
    & ".\setup-python-service.ps1"
    Write-Host ""
}

# Navigate to python-ai-service directory
Set-Location -Path "python-ai-service"

Write-Host "Starting Python AI Service on port 5001..." -ForegroundColor Yellow
Write-Host ""

# Activate and run
& ".\venv\Scripts\python.exe" app.py

# Return to parent directory on exit
Set-Location -Path ".."
