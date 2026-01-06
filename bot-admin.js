// Telegram Bot для админ панели управления каналами
// Используйте этот код для создания бота-администратора

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Конфигурация
const BOT_TOKEN = '7669637818:AAGWAFV_vZ2rm99yBWFGh3CwOCFzh6-8lUY';
const ADMIN_ID = 6232441965; // ID администратора
const CHANNELS_FILE = './channels.json';

// Создание бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Загрузка каналов из файла
function loadChannels() {
    try {
        if (fs.existsSync(CHANNELS_FILE)) {
            const data = fs.readFileSync(CHANNELS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading channels:', error);
    }
    
    // Каналы по умолчанию
    return [
        {
            username: '@xudobudo_news',
            name: 'XudoBudo News',
            avatar: '📢',
            id: -1001234567890
        },
        {
            username: '@xudobudo_updates',
            name: 'Game Updates',
            avatar: '🎮',
            id: -1001234567891
        }
    ];
}

// Сохранение каналов в файл
function saveChannels(channels) {
    try {
        fs.writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving channels:', error);
        return false;
    }
}

// Проверка прав администратора
function isAdmin(userId) {
    return userId === ADMIN_ID;
}

// Получение ID канала по username
async function getChannelId(username) {
    try {
        const cleanUsername = username.replace('@', '');
        const chat = await bot.getChat(`@${cleanUsername}`);
        return chat.id;
    } catch (error) {
        console.error('Error getting channel ID:', error);
        return null;
    }
}

// Главная админ панель
function getAdminPanelKeyboard() {
    return {
        inline_keyboard: [
            [{ text: '👤 Поиск пользователя', callback_data: 'search_user' }],
            [{ text: '📊 Список всех пользователей', callback_data: 'list_users' }],
            [{ text: '💰 Управление балансом', callback_data: 'manage_balance' }],
            [{ text: '🎫 Управление промокодами', callback_data: 'manage_promos' }],
            [{ text: '📢 Управление каналами', callback_data: 'manage_channels' }],
            [{ text: '📨 Отправить сообщение', callback_data: 'send_message' }],
            [{ text: '📈 Статистика бота', callback_data: 'bot_stats' }],
            [{ text: '❌ Выйти из панели', callback_data: 'exit_panel' }]
        ]
    };
}

// Клавиатура управления каналами
function getChannelsKeyboard() {
    return {
        inline_keyboard: [
            [{ text: '📋 Список каналов', callback_data: 'channels_list' }],
            [{ text: '➕ Добавить канал', callback_data: 'channels_add' }],
            [{ text: '🗑️ Удалить канал', callback_data: 'channels_remove' }],
            [{ text: '🧪 Проверить каналы', callback_data: 'channels_test' }],
            [{ text: '🔄 Сбросить к умолчанию', callback_data: 'channels_reset' }],
            [{ text: '⬅️ Назад в панель', callback_data: 'back_to_panel' }]
        ]
    };
}

// Команда /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!isAdmin(userId)) {
        bot.sendMessage(chatId, '❌ У вас нет прав администратора');
        return;
    }
    
    const welcomeMessage = `
🤖 *Бот XudoBudoGame*

Добро пожаловать, администратор!

Используйте команду /adminpanel для доступа к панели управления.
    `;
    
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// Команда /adminpanel - главная админ панель
bot.onText(/\/adminpanel/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!isAdmin(userId)) {
        bot.sendMessage(chatId, '❌ У вас нет прав администратора');
        return;
    }
    
    bot.sendMessage(chatId, '✅ *Добро пожаловать в админ-панель!*\n\nВыберите действие:', {
        parse_mode: 'Markdown',
        reply_markup: getAdminPanelKeyboard()
    });
});

// Обработка callback запросов
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;
    
    if (!isAdmin(userId)) {
        bot.answerCallbackQuery(query.id, { text: 'У вас нет прав администратора' });
        return;
    }
    
    try {
        switch (data) {
            case 'search_user':
                bot.editMessageText('👤 *Поиск пользователя*\n\nОтправьте ID пользователя для поиска:', {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [[{ text: '⬅️ Назад', callback_data: 'back_to_panel' }]] }
                });
                break;
                
            case 'list_users':
                bot.editMessageText('📊 *Список всех пользователей*\n\n👥 Всего пользователей: 1,234\n🎮 Активных сегодня: 156\n💰 Средний баланс: 2,450 ⭐', {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [[{ text: '⬅️ Назад', callback_data: 'back_to_panel' }]] }
                });
                break;
                
            case 'manage_balance':
                bot.editMessageText('💰 *Управление балансом*\n\nВыберите действие:', {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '➕ Добавить баланс', callback_data: 'balance_add' }],
                            [{ text: '➖ Списать баланс', callback_data: 'balance_remove' }],
                            [{ text: '🔍 Проверить баланс', callback_data: 'balance_check' }],
                            [{ text: '⬅️ Назад', callback_data: 'back_to_panel' }]
                        ]
                    }
                });
                break;
                
            case 'manage_promos':
                bot.editMessageText('🎫 *Управление промокодами*\n\nВыберите действие:', {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '➕ Создать промокод', callback_data: 'promo_create' }],
                            [{ text: '📋 Список промокодов', callback_data: 'promo_list' }],
                            [{ text: '🗑️ Удалить промокод', callback_data: 'promo_delete' }],
                            [{ text: '⬅️ Назад', callback_data: 'back_to_panel' }]
                        ]
                    }
                });
                break;
                
            case 'manage_channels':
                bot.editMessageText('📢 *Управление каналами*\n\nВыберите действие:', {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: getChannelsKeyboard()
                });
                break;
                
            case 'send_message':
                bot.editMessageText('📨 *Отправить сообщение*\n\nВыберите тип рассылки:', {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📢 Всем пользователям', callback_data: 'broadcast_all' }],
                            [{ text: '🎯 Конкретному пользователю', callback_data: 'message_user' }],
                            [{ text: '⬅️ Назад', callback_data: 'back_to_panel' }]
                        ]
                    }
                });
                break;
                
            case 'bot_stats':
                const stats = `📈 *Статистика бота*

👥 Всего пользователей: 1,234
🎮 Активных сегодня: 156
💰 Общий баланс: 3,045,670 ⭐
🎫 Активных промокодов: 5
📢 Обязательных каналов: ${loadChannels().length}
🎯 Игр сыграно сегодня: 2,341
💸 Выплачено сегодня: 45,230 ⭐`;

                bot.editMessageText(stats, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [[{ text: '⬅️ Назад', callback_data: 'back_to_panel' }]] }
                });
                break;
                
            case 'channels_list':
                const channels = loadChannels();
                let channelsList = '📋 *Обязательные каналы:*\n\n';
                
                if (channels.length === 0) {
                    channelsList += 'Список каналов пуст';
                } else {
                    channels.forEach((channel, index) => {
                        channelsList += `${index + 1}. ${channel.avatar} *${channel.name}*\n`;
                        channelsList += `   ${channel.username}\n`;
                        channelsList += `   ID: \`${channel.id}\`\n\n`;
                    });
                }
                
                bot.editMessageText(channelsList, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [[{ text: '⬅️ Назад', callback_data: 'manage_channels' }]] }
                });
                break;
                
            case 'channels_add':
                bot.editMessageText('➕ *Добавить канал*\n\nОтправьте сообщение в формате:\n`@username Название канала`\n\nПример: `@mychannel Мой канал`', {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [[{ text: '⬅️ Назад', callback_data: 'manage_channels' }]] }
                });
                break;
                
            case 'channels_remove':
                bot.editMessageText('🗑️ *Удалить канал*\n\nОтправьте username канала для удаления:\n\nПример: `@mychannel`', {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [[{ text: '⬅️ Назад', callback_data: 'manage_channels' }]] }
                });
                break;
                
            case 'channels_test':
                bot.editMessageText('🧪 Проверяю доступность каналов...', {
                    chat_id: chatId,
                    message_id: query.message.message_id
                });
                
                const testChannels = loadChannels();
                let results = '🧪 *Результаты проверки:*\n\n';
                
                for (const channel of testChannels) {
                    try {
                        await bot.getChat(channel.id);
                        results += `✅ ${channel.avatar} *${channel.name}*\n`;
                        results += `   ${channel.username} - Доступен\n\n`;
                    } catch (error) {
                        results += `❌ ${channel.avatar} *${channel.name}*\n`;
                        results += `   ${channel.username} - Недоступен\n\n`;
                    }
                }
                
                bot.editMessageText(results, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [[{ text: '⬅️ Назад', callback_data: 'manage_channels' }]] }
                });
                break;
                
            case 'channels_reset':
                bot.editMessageText('🔄 *Сброс каналов*\n\n⚠️ Вы уверены, что хотите сбросить все каналы к настройкам по умолчанию?\n\nВсе добавленные каналы будут удалены!', {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '✅ Да, сбросить', callback_data: 'channels_reset_confirm' }],
                            [{ text: '❌ Отмена', callback_data: 'manage_channels' }]
                        ]
                    }
                });
                break;
                
            case 'channels_reset_confirm':
                const defaultChannels = [
                    {
                        username: '@xudobudo_news',
                        name: 'XudoBudo News',
                        avatar: '📢',
                        id: -1001234567890
                    },
                    {
                        username: '@xudobudo_updates',
                        name: 'Game Updates',
                        avatar: '🎮',
                        id: -1001234567891
                    }
                ];
                
                if (saveChannels(defaultChannels)) {
                    bot.editMessageText('✅ *Каналы сброшены к умолчанию!*\n\n📢 XudoBudo News\n🎮 Game Updates', {
                        chat_id: chatId,
                        message_id: query.message.message_id,
                        parse_mode: 'Markdown',
                        reply_markup: { inline_keyboard: [[{ text: '⬅️ Назад', callback_data: 'manage_channels' }]] }
                    });
                } else {
                    bot.editMessageText('❌ Ошибка при сбросе каналов', {
                        chat_id: chatId,
                        message_id: query.message.message_id,
                        reply_markup: { inline_keyboard: [[{ text: '⬅️ Назад', callback_data: 'manage_channels' }]] }
                    });
                }
                break;
                
            case 'back_to_panel':
                bot.editMessageText('✅ *Добро пожаловать в админ-панель!*\n\nВыберите действие:', {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: getAdminPanelKeyboard()
                });
                break;
                
            case 'exit_panel':
                bot.editMessageText('❌ *Вы вышли из админ-панели*\n\nИспользуйте /adminpanel для повторного входа.', {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown'
                });
                break;
                
            default:
                bot.editMessageText('🚧 *Функция в разработке*\n\nЭта функция будет добавлена в ближайшее время.', {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [[{ text: '⬅️ Назад', callback_data: 'back_to_panel' }]] }
                });
                break;
        }
    } catch (error) {
        console.error('Callback error:', error);
        bot.answerCallbackQuery(query.id, { text: 'Произошла ошибка' });
    }
    
    bot.answerCallbackQuery(query.id);
});

// Обработка текстовых сообщений для добавления/удаления каналов
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    // Игнорируем команды
    if (!text || text.startsWith('/')) {
        return;
    }
    
    if (!isAdmin(userId)) {
        return;
    }
    
    // Добавление канала: @username Название
    const addChannelMatch = text.match(/^(@\w+)\s+(.+)$/);
    if (addChannelMatch) {
        const username = addChannelMatch[1];
        const name = addChannelMatch[2];
        
        bot.sendMessage(chatId, '⏳ Получаю информацию о канале...');
        
        try {
            const channelId = await getChannelId(username);
            
            if (!channelId) {
                bot.sendMessage(chatId, `❌ Не удалось найти канал ${username}. Проверьте username и убедитесь, что бот добавлен в канал как администратор.`);
                return;
            }
            
            const channels = loadChannels();
            const exists = channels.find(ch => ch.username === username);
            
            if (exists) {
                bot.sendMessage(chatId, `❌ Канал ${username} уже добавлен в список`);
                return;
            }
            
            const newChannel = {
                username: username,
                name: name,
                avatar: '📢',
                id: channelId
            };
            
            channels.push(newChannel);
            
            if (saveChannels(channels)) {
                bot.sendMessage(chatId, `✅ *Канал добавлен!*\n\n📢 *${name}*\n${username}\nID: \`${channelId}\``, { parse_mode: 'Markdown' });
            } else {
                bot.sendMessage(chatId, '❌ Ошибка при сохранении канала');
            }
            
        } catch (error) {
            console.error('Error adding channel:', error);
            bot.sendMessage(chatId, '❌ Произошла ошибка при добавлении канала');
        }
        return;
    }
    
    // Удаление канала: @username
    const removeChannelMatch = text.match(/^(@\w+)$/);
    if (removeChannelMatch) {
        const username = removeChannelMatch[1];
        
        try {
            const channels = loadChannels();
            const index = channels.findIndex(ch => ch.username === username);
            
            if (index === -1) {
                bot.sendMessage(chatId, `❌ Канал ${username} не найден в списке`);
                return;
            }
            
            const removedChannel = channels[index];
            channels.splice(index, 1);
            
            if (saveChannels(channels)) {
                bot.sendMessage(chatId, `✅ *Канал удален!*\n\n📢 *${removedChannel.name}*\n${username}`, { parse_mode: 'Markdown' });
            } else {
                bot.sendMessage(chatId, '❌ Ошибка при сохранении изменений');
            }
            
        } catch (error) {
            console.error('Error removing channel:', error);
            bot.sendMessage(chatId, '❌ Произошла ошибка при удалении канала');
        }
        return;
    }
});

console.log('🤖 Админ бот запущен!');
console.log(`👤 Администратор: ${ADMIN_ID}`);
console.log('📋 Используйте /adminpanel для доступа к панели управления');