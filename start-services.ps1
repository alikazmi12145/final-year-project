# Start Both Services Script
# Runs Express Backend (port 5000) and Python AI Service (port 5001) concurrently

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Starting Bazm-E-Sukhan Services" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Store the root directory
$rootDir = Get-Location

# Check if backend node_modules exists
if (-Not (Test-Path "backend\node_modules")) {
    Write-Host "Backend dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location -Path "backend"
    npm install
    Set-Location -Path $rootDir
    Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
    Write-Host ""
}

# Check if Python virtual environment exists
if (-Not (Test-Path "python-ai-service\venv")) {
    Write-Host "Python virtual environment not found. Running setup..." -ForegroundColor Yellow
    & ".\setup-python-service.ps1"
    Write-Host ""
}

Write-Host "Starting services..." -ForegroundColor Yellow
Write-Host ""

# Function to cleanup jobs on exit
function Cleanup {
    Write-Host ""
    Write-Host "Stopping services..." -ForegroundColor Yellow
    Get-Job | Stop-Job
    Get-Job | Remove-Job
    Write-Host "✓ All services stopped" -ForegroundColor Green
}

# Register cleanup on script exit
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup } | Out-Null

try {
    # Start Python AI Service in background
    Write-Host "Starting Python AI Service (port 5001)..." -ForegroundColor Cyan
    $pythonJob = Start-Job -ScriptBlock {
        param($rootDir)
        Set-Location -Path $rootDir
        Set-Location -Path "python-ai-service"
        & ".\venv\Scripts\python.exe" app.py
    } -ArgumentList $rootDir

    Start-Sleep -Seconds 3

    # Start Express Backend in background
    Write-Host "Starting Express Backend (port 5000)..." -ForegroundColor Cyan
    $expressJob = Start-Job -ScriptBlock {
        param($rootDir)
        Set-Location -Path $rootDir
        Set-Location -Path "backend"
        npm start
    } -ArgumentList $rootDir

    Start-Sleep -Seconds 2

    Write-Host ""
    Write-Host "==================================" -ForegroundColor Green
    Write-Host "Services Started!" -ForegroundColor Green
    Write-Host "==================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Express Backend:      http://localhost:5000" -ForegroundColor Cyan
    Write-Host "Python AI Service:    http://localhost:5001" -ForegroundColor Cyan
    Write-Host "Frontend (Vite):      http://localhost:5173" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Service Logs:" -ForegroundColor Yellow
    Write-Host "=============" -ForegroundColor Yellow

    # Monitor jobs and display output
    while ($true) {
        # Check Python service
        if ($pythonJob.State -eq "Running") {
            $pythonOutput = Receive-Job -Job $pythonJob -ErrorAction SilentlyContinue
            if ($pythonOutput) {
                Write-Host "[Python] $pythonOutput" -ForegroundColor Blue
            }
        } else {
            Write-Host "Python service stopped unexpectedly" -ForegroundColor Red
            $pythonError = Receive-Job -Job $pythonJob -ErrorAction SilentlyContinue
            if ($pythonError) {
                Write-Host "[Python Error] $pythonError" -ForegroundColor Red
            }
            break
        }

        # Check Express service
        if ($expressJob.State -eq "Running") {
            $expressOutput = Receive-Job -Job $expressJob -ErrorAction SilentlyContinue
            if ($expressOutput) {
                Write-Host "[Express] $expressOutput" -ForegroundColor Green
            }
        } else {
            Write-Host "Express backend stopped unexpectedly" -ForegroundColor Red
            $expressError = Receive-Job -Job $expressJob -ErrorAction SilentlyContinue
            if ($expressError) {
                Write-Host "[Express Error] $expressError" -ForegroundColor Red
            }
            break
        }

        Start-Sleep -Milliseconds 500
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
} finally {
    Cleanup
}
