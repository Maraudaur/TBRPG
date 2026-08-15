@echo off
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
    echo.
    echo ERROR: Node.js/npm was not found on this computer.
    echo Install it from https://nodejs.org then run this file again.
    echo.
    pause
    exit /b 1
)

if not exist node_modules\.bin\vite.cmd (
    echo Setting up dependencies for this computer, this only happens once...
    if exist node_modules rmdir /s /q node_modules
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: npm install failed. See the messages above.
        echo.
        pause
        exit /b 1
    )
)

echo Starting battle sim...
start "" cmd /c "timeout /t 4 >nul && start "" http://localhost:5173"

rem Invoke vite directly via node instead of the npm/vite .cmd shim -- the
rem shim scripts mishandle "&" in folder paths (this folder has one), which
rem corrupts the path and crashes with MODULE_NOT_FOUND.
call node "node_modules\vite\bin\vite.js"

echo.
echo Server stopped.
pause
