# AI-Powered Poetry Search - Quick Start Script
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "🚀 Starting Bazm-E-Sukhan AI Search System" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
Write-Host "🔍 Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found! Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
Write-Host "🔍 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Please install Node.js" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "📦 Step 1: Installing Python Dependencies" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan

Set-Location "d:\Bazm-E-Sukhan fyp\python-ai-service"

# Activate virtual environment
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "✅ Activating Python virtual environment..." -ForegroundColor Green
    & ".\venv\Scripts\Activate.ps1"
} else {
    Write-Host "⚠️  Virtual environment not found. Creating..." -ForegroundColor Yellow
    python -m venv venv
    & ".\venv\Scripts\Activate.ps1"
}

# Install dependencies
Write-Host "📥 Installing ML dependencies (this may take 5-10 minutes first time)..." -ForegroundColor Yellow
pip install --upgrade pip
pip install -r requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Python dependencies!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "🤖 Step 2: Starting Python ML Service" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan

# Start Python service in background
Write-Host "🚀 Starting Flask server on http://localhost:5001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\Bazm-E-Sukhan fyp\python-ai-service'; .\venv\Scripts\Activate.ps1; python app.py"

# Wait for service to start
Write-Host "⏳ Waiting for Python service to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test if service is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5001/health" -TimeoutSec 5
    Write-Host "✅ Python ML service is running!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Python service may still be loading ML models..." -ForegroundColor Yellow
    Write-Host "    Check the Python terminal for progress" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "📦 Step 3: Installing Backend Dependencies" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan

Set-Location "d:\Bazm-E-Sukhan fyp\backend"

if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "🚀 Step 4: Starting Backend Server" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan

Write-Host "🚀 Starting Express server on http://localhost:5000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\Bazm-E-Sukhan fyp\backend'; npm start"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "🎨 Step 5: Starting Frontend" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan

Set-Location "d:\Bazm-E-Sukhan fyp\frontend"

if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "🚀 Starting Vite dev server on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\Bazm-E-Sukhan fyp\frontend'; npm run dev"

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Green
Write-Host "✅ ALL SERVICES STARTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Application URLs:" -ForegroundColor Cyan
Write-Host "   Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host "   Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "   Python ML:   http://localhost:5001" -ForegroundColor White
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Open http://localhost:5173 in your browser" -ForegroundColor White
Write-Host "   2. Initialize ML index: POST /api/search/ml/initialize" -ForegroundColor White
Write-Host "   3. Test search with 'mirza ghalib' or 'فیض احمد فیض'" -ForegroundColor White
Write-Host ""
Write-Host "📖 For detailed documentation, see: ML_SEARCH_SETUP.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C in any terminal to stop services" -ForegroundColor Gray
Write-Host ""

# Keep script running
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
