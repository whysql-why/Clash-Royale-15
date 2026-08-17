@echo off
setlocal enabledelayedexpansion
title Clash Royale v15 - Launcher
cd /d "%~dp0"

echo ============================================================
echo   Clash Royale v15 - private server launcher
echo ============================================================
echo.

REM ---- locate node ----
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install it from https://nodejs.org and try again.
  pause & exit /b 1
)

REM ---- locate adb (PATH, then the default Android SDK location) ----
set "ADB=adb"
where adb >nul 2>nul
if errorlevel 1 (
  if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
  ) else (
    echo [ERROR] adb not found. Install Android platform-tools or add adb to PATH.
    pause & exit /b 1
  )
)

set "PKG=nullsroyale.rel.free"
set "ACT=%PKG%/com.supercell.clashroyale.GameApp"

echo == 1/7 Checking for a connected device / emulator ==
"%ADB%" get-state 1>nul 2>nul
if errorlevel 1 (
  echo [ERROR] No rooted device/emulator connected. Start one and enable USB debugging + root.
  pause & exit /b 1
)

REM ---- make sure dependencies are present ----
if not exist "%~dp0node_modules" (
  echo == Installing Node dependencies ^(first run^) ==
  call npm install
)

echo == 2/7 Pushing the patched libg.so ==
"%ADB%" push "%~dp0game_files\libg.so" /sdcard/libg_patched.so

echo == 3/7 Installing libg.so into the game folder ==
"%ADB%" shell su -c "L=`find /data/app -name libg.so 2>/dev/null | grep %PKG% | grep arm64 | head -1`; if [ -z \"$L\" ]; then echo LIBG_NOT_FOUND; else cat /sdcard/libg_patched.so > $L; chmod 644 $L; echo installed to $L; fi"

echo == 4/7 Resetting the account ^(fresh start^) ==
"%ADB%" shell am force-stop %PKG%
"%ADB%" shell su -c "rm -f /data/data/%PKG%/shared_prefs/storage.xml /data/data/%PKG%/shared_prefs/storage_new.xml; rm -rf /data/data/%PKG%/save"

echo == 5/7 Applying the network redirect ==
"%ADB%" push "%~dp0scripts\cr_redirect.sh" /data/local/tmp/cr_redirect.sh
"%ADB%" shell sed -i "s/\r//" /data/local/tmp/cr_redirect.sh
"%ADB%" shell su -c "sh /data/local/tmp/cr_redirect.sh"

echo == 6/7 Starting the server ^(new window^) ==
REM set the env var cleanly (no trailing space) - the spawned cmd/node inherit it
set "CR_FRAMED=1"
start "Clash Royale v15 - Server" /D "%~dp0" cmd /k "node index.js"
timeout /t 3 >nul

echo == 7/7 Launching the client ==
"%ADB%" shell am start -n %ACT%

echo.
echo ============================================================
echo   Done. Wait ~30-40s for the client to load.
echo   - First run shows the "choose your name" popup ^(new account^).
echo   - If a "crash report" popup appears, just dismiss it.
echo   - Edit config.json to change gold/gems, then relaunch this .bat.
echo ============================================================
pause
