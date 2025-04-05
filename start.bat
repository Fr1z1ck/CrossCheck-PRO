@echo off
setlocal enabledelayedexpansion

REM Заголовок окна
title CrossCheck SBIS - Запуск

REM Проверяем, существует ли исполняемый файл приложения
if exist "dist\win-unpacked\CrossCheck SBIS.exe" (
    echo Запуск CrossCheck SBIS...
    start "" "dist\win-unpacked\CrossCheck SBIS.exe"
    exit /b 0
)

REM Запускаем через npm, если исполняемый файл не найден
echo Запуск через npm...
call npm start

REM Если npm start не сработал, запускаем build.bat
if %ERRORLEVEL% NEQ 0 (
    echo Запуск через сборочный скрипт...
    call build.bat
) 