@echo off
echo 🚀 Развертывание XudoBudoGame на Surge.sh
echo.

echo Проверяем Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js не установлен!
    echo Скачайте с https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js найден
echo.

echo Устанавливаем Surge...
npm install -g surge

echo.
echo 📤 Загружаем файлы...
echo Введите ваш email и пароль для Surge.sh
surge

echo.
echo ✅ Готово! Скопируйте полученный URL и используйте в @BotFather
pause