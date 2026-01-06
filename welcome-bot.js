// Приветственный бот для XudoBudoGame
const TelegramBot = require('node-telegram-bot-api');

// Конфигурация
const BOT_TOKEN = '7669637818:AAGWAFV_vZ2rm99yBWFGh3CwOCFzh6-8lUY';
const GAME_URL = 'https://at404774202-bot.github.io/XudoBudoGame/';
const ADMIN_ID = 6232441965;

// Создание бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Простое приветственное сообщение
const WELCOME_MESSAGE = `🎮 Добро пожаловать в XudoBudoGame!`;

// Хранилище обязательных подписок (в реальном проекте используйте базу данных)
let requiredSubscriptions = [
    // Список пуст - добавляйте подписки через /admin
];

// Проверка подписок пользователя
async function checkUserSubscriptions(userId) {
    const unsubscribed = [];
    
    console.log(`Checking subscriptions for user ${userId}...`);
    console.log(`Required subscriptions: ${requiredSubscriptions.length}`);
    
    for (const sub of requiredSubscriptions) {
        try {
            let member;
            if (sub.type === 'channel') {
                // Для каналов используем username
                console.log(`Checking channel @${sub.username} for user ${userId}`);
                member = await bot.getChatMember(`@${sub.username}`, userId);
            } else {
                // Для групп используем chatId
                console.log(`Checking group ${sub.chatId} for user ${userId}`);
                member = await bot.getChatMember(sub.chatId, userId);
            }
            
            console.log(`User ${userId} status in ${sub.title}: ${member.status}`);
            
            // Проверяем статус участника
            if (member.status === 'left' || member.status === 'kicked') {
                console.log(`User ${userId} is NOT subscribed to ${sub.title}`);
                unsubscribed.push(sub);
            } else {
                console.log(`User ${userId} IS subscribed to ${sub.title}`);
            }
        } catch (error) {
            console.log(`Error checking subscription for ${sub.title}:`, error.message);
            // Если ошибка - считаем что не подписан
            unsubscribed.push(sub);
        }
    }
    
    console.log(`User ${userId} unsubscribed count: ${unsubscribed.length}`);
    return unsubscribed;
}

// Генерация клавиатуры с каналами для подписки
function getSubscriptionKeyboard(unsubscribed) {
    const keyboard = [];
    
    unsubscribed.forEach(sub => {
        if (sub.type === 'channel') {
            keyboard.push([{
                text: `📢 ${sub.title}`,
                url: `https://t.me/${sub.username}`
            }]);
        } else {
            keyboard.push([{
                text: `💬 ${sub.title}`,
                url: sub.inviteLink || `https://t.me/joinchat/${sub.username}`
            }]);
        }
    });
    
    keyboard.push([{
        text: '🔄 Проверить подписки',
        callback_data: 'check_subs'
    }]);
    
    return { inline_keyboard: keyboard };
}

// Клавиатура с кнопкой "Играть"
function getWelcomeKeyboard() {
    return {
        inline_keyboard: [
            [
                {
                    text: '🎮 Играть',
                    web_app: { url: GAME_URL }
                }
            ]
        ]
    };
}

// Команда /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || 'Игрок';
    
    console.log(`New user: ${firstName} (${userId}) started the bot`);
    
    // Если нет настроенных подписок - сразу показываем приветствие
    if (requiredSubscriptions.length === 0) {
        bot.sendMessage(chatId, WELCOME_MESSAGE, {
            reply_markup: getWelcomeKeyboard()
        });
        return;
    }
    
    // Проверяем подписки
    const unsubscribed = await checkUserSubscriptions(userId);
    
    if (unsubscribed.length > 0) {
        // Не подписан - показываем требование подписки
        let subscriptionMessage = '🔒 Для пользования ботом вы должны быть подписаны на:\n\n';
        
        unsubscribed.forEach(sub => {
            const icon = sub.type === 'channel' ? '📢' : '💬';
            subscriptionMessage += `${icon} ${sub.title}\n`;
        });
        
        subscriptionMessage += '\n👆 Нажмите на кнопки выше для подписки, затем проверьте подписки.';
        
        bot.sendMessage(chatId, subscriptionMessage, {
            reply_markup: getSubscriptionKeyboard(unsubscribed)
        });
    } else {
        // Подписан на все - показываем приветствие
        bot.sendMessage(chatId, WELCOME_MESSAGE, {
            reply_markup: getWelcomeKeyboard()
        });
    }
});

// Обработка callback запросов
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;
    
    // Проверка прав админа для админских команд
    if (data.startsWith('admin_') && userId !== ADMIN_ID) {
        bot.answerCallbackQuery(query.id, { text: '❌ Нет прав доступа' });
        return;
    }
    
    if (data === 'check_subs') {
        // Проверка подписок (для обычных пользователей)
        const unsubscribed = await checkUserSubscriptions(userId);
        
        if (unsubscribed.length > 0) {
            // Все еще не подписан
            let subscriptionMessage = '❌ Вы все еще не подписаны на:\n\n';
            
            unsubscribed.forEach(sub => {
                const icon = sub.type === 'channel' ? '📢' : '💬';
                subscriptionMessage += `${icon} ${sub.title}\n`;
            });
            
            subscriptionMessage += '\n👆 Подпишитесь на все каналы/чаты и попробуйте снова.';
            
            bot.editMessageText(subscriptionMessage, {
                chat_id: chatId,
                message_id: query.message.message_id,
                reply_markup: getSubscriptionKeyboard(unsubscribed)
            });
        } else {
            // Все подписки есть - показываем приветствие
            bot.editMessageText(WELCOME_MESSAGE, {
                chat_id: chatId,
                message_id: query.message.message_id,
                reply_markup: getWelcomeKeyboard()
            });
        }
    } else if (data === 'admin_add_channel') {
        bot.editMessageText('📢 *Добавление канала*\n\nОтправьте username канала в формате:\n`/add_channel @username Название канала`\n\n⚠️ Бот должен быть добавлен в канал как администратор!', {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown'
        });
    } else if (data === 'admin_add_group') {
        bot.editMessageText('💬 *Добавление группы/чата*\n\nОтправьте ID чата в формате:\n`/add_group -1001234567890 Название чата`\n\n⚠️ Бот должен быть добавлен в чат как администратор!\n\n💡 Чтобы узнать ID чата, добавьте бота в чат и напишите /chatid', {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown'
        });
    } else if (data === 'admin_list') {
        let listMessage = '📋 *Список обязательных подписок:*\n\n';
        
        if (requiredSubscriptions.length === 0) {
            listMessage += 'Список пуст';
        } else {
            requiredSubscriptions.forEach((sub, index) => {
                const icon = sub.type === 'channel' ? '📢' : '💬';
                const identifier = sub.type === 'channel' ? `@${sub.username}` : sub.chatId;
                listMessage += `${index + 1}. ${icon} ${sub.title}\n   ${identifier}\n\n`;
            });
        }
        
        bot.editMessageText(listMessage, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown'
        });
    } else if (data === 'admin_delete') {
        if (requiredSubscriptions.length === 0) {
            bot.editMessageText('📋 Список подписок пуст', {
                chat_id: chatId,
                message_id: query.message.message_id
            });
        } else {
            let deleteMessage = '🗑 *Удаление подписки*\n\nОтправьте номер подписки для удаления:\n`/delete_sub номер`\n\n';
            
            requiredSubscriptions.forEach((sub, index) => {
                const icon = sub.type === 'channel' ? '📢' : '💬';
                deleteMessage += `${index + 1}. ${icon} ${sub.title}\n`;
            });
            
            bot.editMessageText(deleteMessage, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: 'Markdown'
            });
        }
    }
    
    bot.answerCallbackQuery(query.id);
});

// Админ-панель для управления подписками
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (userId !== ADMIN_ID) {
        bot.sendMessage(chatId, '❌ У вас нет прав для этой команды');
        return;
    }
    
    const adminKeyboard = {
        inline_keyboard: [
            [
                { text: '📢 Добавить канал', callback_data: 'admin_add_channel' },
                { text: '💬 Добавить чат', callback_data: 'admin_add_group' }
            ],
            [
                { text: '📋 Список подписок', callback_data: 'admin_list' },
                { text: '🗑 Удалить подписку', callback_data: 'admin_delete' }
            ]
        ]
    };
    
    bot.sendMessage(chatId, '🔧 *Админ-панель управления подписками*\n\nВыберите действие:', {
        parse_mode: 'Markdown',
        reply_markup: adminKeyboard
    });
});



// Команды для добавления подписок
bot.onText(/\/add_channel @(\w+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (userId !== ADMIN_ID) {
        bot.sendMessage(chatId, '❌ У вас нет прав для этой команды');
        return;
    }
    
    const username = match[1];
    const title = match[2];
    
    // Проверяем, не добавлен ли уже
    const exists = requiredSubscriptions.find(sub => 
        sub.type === 'channel' && sub.username === username
    );
    
    if (exists) {
        bot.sendMessage(chatId, '❌ Этот канал уже добавлен в список');
        return;
    }
    
    requiredSubscriptions.push({
        type: 'channel',
        username: username,
        title: title
    });
    
    bot.sendMessage(chatId, `✅ Канал добавлен:\n📢 ${title} (@${username})`);
});

bot.onText(/\/add_group (-?\d+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (userId !== ADMIN_ID) {
        bot.sendMessage(chatId, '❌ У вас нет прав для этой команды');
        return;
    }
    
    const groupChatId = parseInt(match[1]);
    const title = match[2];
    
    // Проверяем, не добавлен ли уже
    const exists = requiredSubscriptions.find(sub => 
        sub.type === 'group' && sub.chatId === groupChatId
    );
    
    if (exists) {
        bot.sendMessage(chatId, '❌ Этот чат уже добавлен в список');
        return;
    }
    
    requiredSubscriptions.push({
        type: 'group',
        chatId: groupChatId,
        title: title
    });
    
    bot.sendMessage(chatId, `✅ Чат добавлен:\n💬 ${title} (${groupChatId})`);
});

bot.onText(/\/delete_sub (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (userId !== ADMIN_ID) {
        bot.sendMessage(chatId, '❌ У вас нет прав для этой команды');
        return;
    }
    
    const index = parseInt(match[1]) - 1;
    
    if (index < 0 || index >= requiredSubscriptions.length) {
        bot.sendMessage(chatId, '❌ Неверный номер подписки');
        return;
    }
    
    const removed = requiredSubscriptions.splice(index, 1)[0];
    const icon = removed.type === 'channel' ? '📢' : '💬';
    
    bot.sendMessage(chatId, `✅ Подписка удалена:\n${icon} ${removed.title}`);
});

// Команда для получения ID чата
bot.onText(/\/chatid/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `💬 ID этого чата: \`${chatId}\``, { parse_mode: 'Markdown' });
});

// Обработка всех остальных сообщений
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    // Игнорируем команды
    if (text && text.startsWith('/')) {
        return;
    }
    
    // Если нет настроенных подписок - сразу показываем приветствие
    if (requiredSubscriptions.length === 0) {
        bot.sendMessage(chatId, WELCOME_MESSAGE, {
            reply_markup: getWelcomeKeyboard()
        });
        return;
    }
    
    // Проверяем подписки
    const unsubscribed = await checkUserSubscriptions(userId);
    
    if (unsubscribed.length > 0) {
        // Не подписан - показываем требование подписки
        let subscriptionMessage = '🔒 Для пользования ботом вы должны быть подписаны на:\n\n';
        
        unsubscribed.forEach(sub => {
            const icon = sub.type === 'channel' ? '📢' : '💬';
            subscriptionMessage += `${icon} ${sub.title}\n`;
        });
        
        subscriptionMessage += '\n👆 Нажмите на кнопки выше для подписки, затем проверьте подписки.';
        
        bot.sendMessage(chatId, subscriptionMessage, {
            reply_markup: getSubscriptionKeyboard(unsubscribed)
        });
    } else {
        // Подписан на все - показываем приветствие
        bot.sendMessage(chatId, WELCOME_MESSAGE, {
            reply_markup: getWelcomeKeyboard()
        });
    }
});

console.log('🤖 Welcome bot with subscription system started!');
console.log(`🎮 Game URL: ${GAME_URL}`);
console.log(`👤 Admin ID: ${ADMIN_ID}`);
console.log('📋 Available commands: /start, /admin, /chatid');
console.log(`📢 Required subscriptions: ${requiredSubscriptions.length}`);