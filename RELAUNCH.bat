@echo off
setlocal enabledelayedexpansion
title Clash Royale v15 - Relaunch (daily use)
cd /d "%~dp0"

echo ============================================================
echo   Clash Royale v15 - relaunch (keeps progress)
echo ============================================================
echo.
echo   Use this every day. It does NOT re-patch libg.so and does
echo   NOT reset your account - it only:
echo     1) re-applies the network redirect (iptables)
echo     2) starts the server (framed)
echo     3) launches the client
echo   Run START.bat instead only after a game update / reinstall.
echo.

where node >nul 2>nul
if errorlevel 1 ( echo [ERROR] Node.js not found. & pause & exit /b 1 )

set "ADB=adb"
where adb >nul 2>nul
if errorlevel 1 (
  if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
  ) else ( echo [ERROR] adb not found. & pause & exit /b 1 )
)
set "PKG=nullsroyale.rel.free"
set "ACT=%PKG%/com.supercell.clashroyale.GameApp"

echo == 1/4 Checking device ==
"%ADB%" get-state 1>nul 2>nul
if errorlevel 1 ( echo [ERROR] No device/emulator connected. & pause & exit /b 1 )

echo == 2/4 Applying the network redirect ==
"%ADB%" push "%~dp0scripts\cr_redirect.sh" /data/local/tmp/cr_redirect.sh
"%ADB%" shell sed -i "s/\r//" /data/local/tmp/cr_redirect.sh
"%ADB%" shell su -c "sh /data/local/tmp/cr_redirect.sh"

echo == 3/4 Starting the server (framed) ==
set "CR_FRAMED=1"
start "Clash Royale v15 - Server" /D "%~dp0" cmd /k "node index.js"
timeout /t 3 >nul

echo == 4/4 Launching the client ==
"%ADB%" shell am force-stop %PKG%
"%ADB%" shell am start -n %ACT%

echo.
echo Done. Wait ~30-40s. Your name / gold / gems are kept.
pause
