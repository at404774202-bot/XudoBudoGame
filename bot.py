#!/usr/bin/env python3
"""
Telegram бот для XudoBudo Game с поддержкой Telegram Stars
"""

import asyncio
import json
import logging
from telegram import Bot, Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, PreCheckoutQueryHandler

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Токен бота
BOT_TOKEN = "7669637818:AAGWAFV_vZ2rm99yBWFGh3CwOCFzh6-8lUY"

# URL вашего Mini App
WEBAPP_URL = "https://at404774202-bot.github.io/XudoBudoGame/"

class XudoBudoBot:
    def __init__(self, token: str):
        self.bot = Bot(token)
        self.app = Application.builder().token(token).build()
        self.setup_handlers()
    
    def setup_handlers(self):
        """Настройка обработчиков команд"""
        self.app.add_handler(CommandHandler("start", self.start_command))
        self.app.add_handler(CommandHandler("game", self.game_command))
        self.app.add_handler(CommandHandler("buy", self.buy_stars_command))
        self.app.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, self.web_app_data))
        self.app.add_handler(PreCheckoutQueryHandler(self.pre_checkout_callback))
    
    async def start_command(self, update: Update, context):
        """Обработка команды /start"""
        user = update.effective_user
        
        # Создаем клавиатуру с Web App
        keyboard = [
            [InlineKeyboardButton("🎮 Играть в XudoBudo", web_app=WebAppInfo(url=WEBAPP_URL))],
            [InlineKeyboardButton("💰 Купить звезды", callback_data="buy_stars")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        welcome_text = f"""
🎮 Добро пожаловать в XudoBudo Game, {user.first_name}!

🎯 Играйте в захватывающую игру "Мины"
⭐ Покупайте звезды через Telegram Stars
🏆 Выигрывайте и увеличивайте свой баланс

Нажмите кнопку ниже, чтобы начать игру!
        """
        
        await update.message.reply_text(
            welcome_text,
            reply_markup=reply_markup
        )
    
    async def game_command(self, update: Update, context):
        """Команда для запуска игры"""
        keyboard = [[InlineKeyboardButton("🎮 Открыть игру", web_app=WebAppInfo(url=WEBAPP_URL))]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            "🎮 Нажмите кнопку для запуска XudoBudo Game:",
            reply_markup=reply_markup
        )
    
    async def buy_stars_command(self, update: Update, context):
        """Команда для покупки звезд"""
        try:
            # Получаем количество звезд из аргументов
            amount = 50  # По умолчанию
            if context.args:
                try:
                    amount = int(context.args[0])
                    if amount < 1 or amount > 10000:
                        raise ValueError("Неверное количество")
                except ValueError:
                    await update.message.reply_text(
                        "❌ Неверное количество звезд. Используйте: /buy <количество> (1-10000)"
                    )
                    return
            
            # Создаем инвойс для Telegram Stars
            invoice_link = await self.bot.create_invoice_link(
                title=f"{amount} Telegram Stars",
                description=f"Пополнение баланса XudoBudo Game на {amount} звезд",
                payload=f"stars_{amount}_{update.effective_user.id}",
                provider_token="",  # Пустая строка для Telegram Stars
                currency="XTR",
                prices=[{"label": f"{amount} звезд", "amount": amount}]
            )
            
            # Отправляем ссылку на оплату
            keyboard = [[InlineKeyboardButton(f"💳 Купить {amount} ⭐ за {amount} XTR", url=invoice_link)]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                f"💰 Покупка {amount} ⭐\n\n"
                f"💳 Стоимость: {amount} Telegram Stars\n"
                f"🔒 Безопасная оплата через Telegram\n\n"
                f"Нажмите кнопку для оплаты:",
                reply_markup=reply_markup
            )
            
        except Exception as e:
            logger.error(f"Ошибка создания инвойса: {e}")
            await update.message.reply_text(
                "❌ Ошибка создания платежа. Попробуйте позже."
            )
    
    async def web_app_data(self, update: Update, context):
        """Обработка данных от Web App"""
        try:
            data = json.loads(update.effective_message.web_app_data.data)
            action = data.get('action')
            
            if action == 'create_invoice':
                amount = data.get('amount', 50)
                user_id = data.get('user_id')
                
                # Создаем инвойс
                invoice_link = await self.bot.create_invoice_link(
                    title=f"{amount} Telegram Stars",
                    description=f"Пополнение баланса на {amount} звезд",
                    payload=f"stars_{amount}_{user_id}",
                    provider_token="",
                    currency="XTR",
                    prices=[{"label": f"{amount} звезд", "amount": amount}]
                )
                
                # Отправляем ссылку обратно в Web App
                keyboard = [[InlineKeyboardButton(f"💳 Оплатить {amount} ⭐", url=invoice_link)]]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                await update.message.reply_text(
                    f"💰 Инвойс создан для покупки {amount} ⭐\n\n"
                    f"Нажмите кнопку для оплаты:",
                    reply_markup=reply_markup
                )
                
            elif action == 'ping':
                # Отвечаем на ping от Web App
                await update.message.reply_text("🤖 Бот онлайн, платежи доступны!")
                
        except Exception as e:
            logger.error(f"Ошибка обработки Web App данных: {e}")
    
    async def pre_checkout_callback(self, update: Update, context):
        """Обработка предварительной проверки платежа"""
        query = update.pre_checkout_query
        
        # Проверяем payload
        if query.invoice_payload.startswith('stars_'):
            # Подтверждаем платеж
            await query.answer(ok=True)
        else:
            # Отклоняем платеж
            await query.answer(ok=False, error_message="Неверный платеж")
    
    def run(self):
        """Запуск бота"""
        logger.info("🤖 Запуск XudoBudo Bot...")
        self.app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    bot = XudoBudoBot(BOT_TOKEN)
    bot.run()