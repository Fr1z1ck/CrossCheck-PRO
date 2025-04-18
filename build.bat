@echo off
chcp 65001 > nul
cd /d "%~dp0"

:menu
cls
echo +---------------------------------------------------------------+
echo :               CrossCheck SBIS - System Builder                :
echo +---------------------------------------------------------------+
echo.
echo  Select action:
echo.
echo  [1] Run application in development mode
echo  [2] Build installer (Windows)
echo  [3] Build portable version (Windows)
echo  [4] Install/update dependencies
echo  [5] Clean cache and temporary files
echo  [6] Publish update to GitHub
echo  [0] Exit
echo.

set /p choice="Your choice: "

if "%choice%"=="1" goto dev
if "%choice%"=="2" goto installer
if "%choice%"=="3" goto portable
if "%choice%"=="4" goto dependencies
if "%choice%"=="5" goto clean
if "%choice%"=="6" goto publish
if "%choice%"=="0" goto exit
goto menu

:dev
echo.
echo Starting app in development mode...
npm run dev
goto menu

:installer
echo.
echo Building Windows installer...
npm run dist -- --win --x64 --config.win.target=nsis
echo.
echo Installer created in dist/ folder
pause
goto menu

:portable
echo.
echo Building portable version for Windows...
npm run dist -- --win --x64 --config.win.target=portable
echo.
echo Portable version created in dist/ folder
pause
goto menu

:dependencies
echo.
echo Installing/updating dependencies...
npm install
echo.
echo Dependencies installed.
pause
goto menu

:clean
echo.
echo Cleaning cache and temporary files...
if exist node_modules rmdir /s /q node_modules
if exist dist rmdir /s /q dist
if exist .cache rmdir /s /q .cache
if exist package-lock.json del package-lock.json
echo.
echo Cleanup complete.
pause
goto menu

:publish
echo.
echo For publishing, you'll need a GitHub token.
echo If you don't have one, create it in GitHub Settings -^> Developer settings -^> Personal access tokens.
echo.
echo Before publishing, make sure:
echo  1. You've updated the version in package.json
echo  2. You have repository access
echo  3. You have saved GitHub token as GH_TOKEN environmental variable
echo.
set /p confirm="Continue publishing? (y/n): "
if /i "%confirm%"=="y" (
    npm run publish
    echo.
    echo Publication completed.
    pause
) else (
    echo.
    echo Publication cancelled.
    pause
)
goto menu

:exit
echo.
echo Goodbye!
timeout /t 2 > nul
exit 