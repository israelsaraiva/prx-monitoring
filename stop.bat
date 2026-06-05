@echo off
echo Stopping MACC Monitoring Tool...

set "ROOT=%~dp0"
set "SERVER_JS=app\server.js"

:: Use PowerShell/CIM to find node.exe processes running our specific server.js
:: This avoids the deprecated wmic command and is specific to this app only
powershell -NoProfile -Command ^
  "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*%SERVER_JS%*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

if %errorlevel%==0 (
    echo Server stopped successfully.
) else (
    echo No running server found, or PowerShell is unavailable.
    echo You can also close the start.bat window directly to stop the server.
)
