#!/usr/bin/env pwsh
# Start All Services for Bazm-E-Sukhan
# بزم سخن کی تمام خدمات شروع کریں

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Bazm-E-Sukhan Services..." -ForegroundColor Cyan
Write-Host "بزم سخن کی خدمات شروع ہو رہی ہیں..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Kill any existing Node.js processes to avoid port conflicts
Write-Host "🧹 Cleaning up old processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | ForEach-Object { 
    Write-Host "   Killing process: $($_.Id)" -ForegroundColor Yellow
    Stop-Process -Id $_.Id -Force 
}
Write-Host "✅ Cleanup complete" -ForegroundColor Green
Write-Host ""

# Start Backend Server (Port 5000)
Write-Host "1️⃣ Starting Backend Server (Port 5000)..." -ForegroundColor Magenta
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd 'd:\Bazm-E-Sukhan fyp\backend'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3
Write-Host "   ✅ Backend starting at http://localhost:5000" -ForegroundColor Green
Write-Host ""

# Start Python AI Service (Port 5001)
Write-Host "2️⃣ Starting Python AI Service (Port 5001)..." -ForegroundColor Magenta
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd 'd:\Bazm-E-Sukhan fyp\python-ai-service'; python app.py" -WindowStyle Normal
Start-Sleep -Seconds 2
Write-Host "   ✅ Python AI starting at http://localhost:5001" -ForegroundColor Green
Write-Host ""

# Start Frontend (Port 5173)
Write-Host "3️⃣ Starting Frontend (Port 5173)..." -ForegroundColor Magenta
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd 'd:\Bazm-E-Sukhan fyp\frontend'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 2
Write-Host "   ✅ Frontend starting at http://localhost:5173" -ForegroundColor Green
Write-Host ""

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✨ All Services Started Successfully! ✨" -ForegroundColor Green
Write-Host "تمام خدمات کامیابی سے شروع ہو گئیں!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Service URLs:" -ForegroundColor White
Write-Host "   🌐 Frontend:    http://localhost:5173" -ForegroundColor Cyan
Write-Host "   🔧 Backend:     http://localhost:5000" -ForegroundColor Cyan
Write-Host "   🤖 Python AI:   http://localhost:5001" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   - Press Ctrl+C in any terminal to stop that service" -ForegroundColor White
Write-Host "   - Check each terminal window for logs" -ForegroundColor White
Write-Host "   - Frontend will open automatically in your browser" -ForegroundColor White
Write-Host ""
Write-Host "🎭 Happy Coding! / خوش رہیں! 🎭" -ForegroundColor Magenta
Write-Host ""

# Wait for user input before closing
Read-Host "Press Enter to close this window..."
