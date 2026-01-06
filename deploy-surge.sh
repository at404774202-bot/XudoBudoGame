#!/bin/bash

echo "🚀 Развертывание XudoBudoGame на Surge.sh"
echo

# Проверяем Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен!"
    echo "Скачайте с https://nodejs.org"
    exit 1
fi

echo "✅ Node.js найден"
echo

echo "Устанавливаем Surge..."
npm install -g surge

echo
echo "📤 Загружаем файлы..."
echo "Введите ваш email и пароль для Surge.sh"
surge

echo
echo "✅ Готово! Скопируйте полученный URL и используйте в @BotFather"