@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "NODE_EXE=%ROOT%node\node.exe"
set "SERVER=%ROOT%app\server.js"
set "PORT=3000"

:: Verify node.exe exists
if not exist "%NODE_EXE%" (
    echo ERROR: node\node.exe not found.
    echo Please ensure you have extracted the full zip package.
    pause
    exit /b 1
)

:: Verify server.js exists
if not exist "%SERVER%" (
    echo ERROR: app\server.js not found.
    echo Please ensure you have extracted the full zip package.
    pause
    exit /b 1
)

:: Find a free port — only match local LISTENING sockets to avoid false positives
for %%P in (3000 3001 3002) do (
    if "!PORT_FOUND!" == "" (
        netstat -ano 2>nul | findstr /R "TCP.*:%%P .*LISTENING" >nul 2>&1
        if errorlevel 1 (
            set "PORT=%%P"
            set "PORT_FOUND=1"
        )
    )
)

if "!PORT_FOUND!" == "" (
    echo ERROR: Ports 3000, 3001, and 3002 are all in use.
    echo Please close another instance of the application and try again.
    pause
    exit /b 1
)

echo ===============================================
echo   MACC Monitoring Tool
echo   Starting on http://localhost:%PORT%
echo ===============================================
echo.
echo Press Ctrl+C or close this window to stop.
echo.

:: Start the Next.js server in the background, then open the browser
set "PORT=%PORT%"
set "HOSTNAME=127.0.0.1"

:: Launch browser after a short delay using a detached process
start "" /B cmd /C "timeout /t 2 /nobreak >nul && start http://localhost:%PORT%"

:: Run the server in the foreground (Ctrl+C stops everything)
"%NODE_EXE%" "%SERVER%"

endlocal
