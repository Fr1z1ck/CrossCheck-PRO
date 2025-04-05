@echo off
setlocal enabledelayedexpansion

REM Задаем кодировку UTF-8
chcp 65001 > nul

REM Заголовок окна
title CrossCheck SBIS - Система сборки

echo ╔══════════════════════════════════════════════════════════════╗
echo ║               CrossCheck SBIS - Система сборки                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Проверяем наличие Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Ошибка: Node.js не установлен.
    echo [!] Пожалуйста, установите Node.js с сайта https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Проверяем наличие npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Ошибка: npm не установлен.
    echo [!] Пожалуйста, переустановите Node.js с сайта https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Проверяем, установлены ли зависимости
if not exist node_modules (
    echo [i] Зависимости не установлены. Устанавливаем...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [!] Ошибка: Не удалось установить зависимости.
        echo.
        pause
        exit /b 1
    )
    echo [√] Зависимости успешно установлены.
    echo.
)

:menu
cls
echo ╔══════════════════════════════════════════════════════════════╗
echo ║               CrossCheck SBIS - Система сборки                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Выберите действие:
echo.
echo  [1] Запустить приложение в режиме разработки
echo  [2] Собрать инсталлятор (Windows)
echo  [3] Собрать портативную версию (Windows)
echo  [4] Установить/обновить зависимости
echo  [5] Очистить кэш и временные файлы
echo  [0] Выход
echo.
echo ──────────────────────────────────────────────────────────────

set /p choice="Выберите опцию (0-5): "

if "%choice%"=="1" (
    call :run_dev
) else if "%choice%"=="2" (
    call :build_installer
) else if "%choice%"=="3" (
    call :build_portable
) else if "%choice%"=="4" (
    call :update_deps
) else if "%choice%"=="5" (
    call :clean
) else if "%choice%"=="0" (
    exit /b 0
) else (
    echo.
    echo [!] Неверный выбор. Пожалуйста, выберите от 0 до 5.
    timeout /t 2 >nul
    goto menu
)

goto menu

:run_dev
cls
echo ╔══════════════════════════════════════════════════════════════╗
echo ║         Запуск CrossCheck SBIS в режиме разработки           ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo [i] Запускаем приложение в режиме разработки...
echo [i] Для завершения нажмите Ctrl+C
echo.
set NODE_ENV=development
call npm start
echo.
echo [i] Приложение завершило работу.
echo.
pause
goto :eof

:build_installer
cls
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          Сборка инсталлятора CrossCheck SBIS                 ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo [i] Начинаем сборку инсталлятора для Windows...
echo.
set NODE_ENV=production
call npm run build-win
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Ошибка при сборке инсталлятора.
    echo.
    pause
    goto :eof
)
echo.
echo [√] Инсталлятор успешно собран!
echo [i] Инсталлятор доступен в папке: %cd%\dist
echo.
start "" "%cd%\dist"
pause
goto :eof

:build_portable
cls
echo ╔══════════════════════════════════════════════════════════════╗
echo ║        Сборка портативной версии CrossCheck SBIS             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo [i] Начинаем сборку портативной версии для Windows...
echo.
set NODE_ENV=production
call npm run build-win-portable
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Ошибка при сборке портативной версии.
    echo.
    pause
    goto :eof
)
echo.
echo [√] Портативная версия успешно собрана!
echo [i] Портативная версия доступна в папке: %cd%\dist
echo.
start "" "%cd%\dist"
pause
goto :eof

:update_deps
cls
echo ╔══════════════════════════════════════════════════════════════╗
echo ║              Обновление зависимостей проекта                 ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo [i] Обновляем зависимости проекта...
echo.
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Ошибка при обновлении зависимостей.
    echo.
    pause
    goto :eof
)
echo.
echo [√] Зависимости успешно обновлены!
echo.
pause
goto :eof

:clean
cls
echo ╔══════════════════════════════════════════════════════════════╗
echo ║               Очистка временных файлов                       ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo [i] Очищаем временные файлы и кэш...
echo.

if exist dist (
    echo [i] Удаляем папку dist...
    rmdir /s /q dist
)

if exist node_modules (
    echo [i] Удаляем папку node_modules...
    rmdir /s /q node_modules
)

echo [i] Очищаем кэш npm...
call npm cache clean --force
if %ERRORLEVEL% NEQ 0 (
    echo [!] Предупреждение: не удалось очистить кэш npm.
) else (
    echo [√] Кэш npm успешно очищен.
)

echo.
echo [√] Очистка успешно завершена!
echo.
pause
goto :eof 