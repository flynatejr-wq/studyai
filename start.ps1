# Load .env variables
Get-Content "$PSScriptRoot\server\.env" | ForEach-Object {
    if ($_ -match "^(.+?)=(.+)$") {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
}

Write-Host "Starting Lecture Summarizer..." -ForegroundColor Cyan

# Start backend
Start-Process -FilePath "node" -ArgumentList "$PSScriptRoot\server\index.js" -WorkingDirectory "$PSScriptRoot\server" -NoNewWindow

Start-Sleep 2

# Start frontend
Start-Process -FilePath "cmd" -ArgumentList "/c cd `"$PSScriptRoot\client`" && npm run dev" -NoNewWindow

Write-Host ""
Write-Host "✅ App is running!" -ForegroundColor Green
Write-Host "👉 Open your browser to: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray

Wait-Event
