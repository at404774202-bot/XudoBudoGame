@echo off
echo 🚀 Запуск XudoBudo Crash Game Server...
echo.

REM Проверяем наличие Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js не установлен!
    echo Скачайте и установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

REM Проверяем наличие package.json
if not exist package.json (
    echo ❌ package.json не найден!
    echo Убедитесь, что вы находитесь в правильной папке
    pause
    exit /b 1
)

REM Устанавливаем зависимости если нужно
if not exist node_modules (
    echo 📦 Установка зависимостей...
    npm install
    if errorlevel 1 (
        echo ❌ Ошибка установки зависимостей!
        pause
        exit /b 1
    )
)

echo ✅ Запуск сервера на порту 3000...
echo 🌐 Откройте http://localhost:3000 в браузере
echo 🛑 Нажмите Ctrl+C для остановки сервера
echo.

REM Запускаем сервер
npm start

pause