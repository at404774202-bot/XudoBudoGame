// Приветственный бот для XudoBudo Mines Game
const TelegramBot = require('node-telegram-bot-api');

// Конфигурация
const BOT_TOKEN = '7669637818:AAGWAFV_vZ2rm99yBWFGh3CwOCFzh6-8lUY';
const GAME_URL = 'https://at404774202-bot.github.io/XudoBudoGame/';
const ADMIN_ID = 6232441965;

// Создание бота с улучшенной обработкой ошибок
const bot = new TelegramBot(BOT_TOKEN, { 
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    }
});

// Улучшенные сообщения
const WELCOME_MESSAGE = `🎲 Добро пожаловать в XudoBudo Mines!

🎮 Играйте в захватывающую игру "Мины"
💎 Открывайте безопасные клетки и получайте множители
💰 Забирайте выигрыш в любой момент
⭐ Зарабатывайте звезды и улучшайте статистику

Удачи в игре! 🍀`;

const SUBSCRIPTION_REQUIRED_MESSAGE = `🔒 Для доступа к игре необходимо подписаться на наши каналы:

📢 Подпишитесь на все каналы ниже
🔄 Нажмите "Проверить подписки"
🎮 Начните играть!`;

// Хранилище данных (в продакшене используйте базу данных)
let requiredSubscriptions = [];
let userStats = new Map(); // Статистика пользователей
let promoCodes = new Map(); // Промокоды

// Инициализация промокодов для игры Мины
promoCodes.set('MINES100', { reward: 100, uses: 0, maxUses: 100, description: 'Бонус 100 звезд для игры Мины' });
promoCodes.set('DIAMOND500', { reward: 500, uses: 0, maxUses: 50, description: 'Алмазный бонус 500 звезд' });
promoCodes.set('LUCKY777', { reward: 777, uses: 0, maxUses: 25, description: 'Счастливый промокод 777 звезд' });

// Улучшенная проверка подписок с детальным логированием
async function checkUserSubscriptions(userId) {
    if (requiredSubscriptions.length === 0) {
        console.log(`No required subscriptions for user ${userId}`);
        return [];
    }

    const unsubscribed = [];
    
    console.log(`🔍 Checking ${requiredSubscriptions.length} subscriptions for user ${userId}...`);
    
    for (const sub of requiredSubscriptions) {
        try {
            let member;
            let chatIdentifier;
            
            if (sub.type === 'channel') {
                chatIdentifier = `@${sub.username}`;
                member = await bot.getChatMember(chatIdentifier, userId);
            } else {
                chatIdentifier = sub.chatId;
                member = await bot.getChatMember(chatIdentifier, userId);
            }
            
            console.log(`✅ User ${userId} status in ${sub.title}: ${member.status}`);
            
            // Проверяем статус участника (более строгая проверка)
            if (['left', 'kicked', 'restricted'].includes(member.status)) {
                console.log(`❌ User ${userId} is NOT properly subscribed to ${sub.title}`);
                unsubscribed.push(sub);
            } else {
                console.log(`✅ User ${userId} IS subscribed to ${sub.title}`);
            }
        } catch (error) {
            console.error(`❌ Error checking subscription for ${sub.title}:`, error.message);
            // При ошибке считаем что не подписан
            unsubscribed.push(sub);
        }
        
        // Небольшая задержка между проверками
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`📊 User ${userId}: ${requiredSubscriptions.length - unsubscribed.length}/${requiredSubscriptions.length} subscriptions valid`);
    return unsubscribed;
}

// Получение статистики пользователя
function getUserStats(userId) {
    if (!userStats.has(userId)) {
        userStats.set(userId, {
            gamesPlayed: 0,
            gamesWon: 0,
            totalEarned: 0,
            bestMultiplier: 0,
            joinDate: new Date(),
            lastActive: new Date()
        });
    }
    return userStats.get(userId);
}

// Обновление статистики пользователя
function updateUserStats(userId, gameData) {
    const stats = getUserStats(userId);
    stats.gamesPlayed += 1;
    if (gameData.won) {
        stats.gamesWon += 1;
        stats.totalEarned += gameData.earned || 0;
        if (gameData.multiplier > stats.bestMultiplier) {
            stats.bestMultiplier = gameData.multiplier;
        }
    }
    stats.lastActive = new Date();
    userStats.set(userId, stats);
}

// Улучшенная генерация клавиатуры с подписками
function getSubscriptionKeyboard(unsubscribed) {
    const keyboard = [];
    
    unsubscribed.forEach(sub => {
        let buttonText, buttonUrl;
        
        if (sub.type === 'channel') {
            buttonText = `📢 Подписаться на ${sub.title}`;
            buttonUrl = `https://t.me/${sub.username}`;
        } else {
            buttonText = `💬 Присоединиться к ${sub.title}`;
            buttonUrl = sub.inviteLink || `https://t.me/joinchat/${sub.username}`;
        }
        
        keyboard.push([{ text: buttonText, url: buttonUrl }]);
    });
    
    // Кнопка проверки подписок
    keyboard.push([{
        text: '🔄 Проверить подписки',
        callback_data: 'check_subs'
    }]);
    
    // Кнопка помощи
    keyboard.push([{
        text: '❓ Помощь',
        callback_data: 'help_subs'
    }]);
    
    return { inline_keyboard: keyboard };
}

// Улучшенная приветственная клавиатура
function getWelcomeKeyboard() {
    return {
        inline_keyboard: [
            [
                {
                    text: '🎲 Играть в Мины',
                    web_app: { url: GAME_URL }
                }
            ],
            [
                {
                    text: '📊 Моя статистика',
                    callback_data: 'my_stats'
                },
                {
                    text: '🎁 Промокод',
                    callback_data: 'promo_code'
                }
            ],
            [
                {
                    text: '❓ Помощь',
                    callback_data: 'help'
                },
                {
                    text: '📋 Правила игры',
                    callback_data: 'game_rules'
                }
            ]
        ]
    };
}

// Админская клавиатура
function getAdminKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '📢 Добавить канал', callback_data: 'admin_add_channel' },
                { text: '💬 Добавить чат', callback_data: 'admin_add_group' }
            ],
            [
                { text: '📋 Список подписок', callback_data: 'admin_list' },
                { text: '🗑 Удалить подписку', callback_data: 'admin_delete' }
            ],
            [
                { text: '🎁 Управление промокодами', callback_data: 'admin_promo' },
                { text: '📊 Статистика бота', callback_data: 'admin_stats' }
            ],
            [
                { text: '📢 Рассылка', callback_data: 'admin_broadcast' }
            ]
        ]
    };
}

// Улучшенная команда /start с персонализацией
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || 'Игрок';
    const username = msg.from.username ? `@${msg.from.username}` : 'без username';
    
    console.log(`🆕 New user: ${firstName} (${username}, ID: ${userId}) started the bot`);
    
    // Обновляем статистику пользователя
    const stats = getUserStats(userId);
    const isNewUser = stats.gamesPlayed === 0;
    
    if (isNewUser) {
        console.log(`🎉 First time user: ${firstName}`);
    }
    
    // Если нет настроенных подписок - сразу показываем приветствие
    if (requiredSubscriptions.length === 0) {
        const personalizedMessage = isNewUser 
            ? `${WELCOME_MESSAGE}\n\n🎉 Добро пожаловать, ${firstName}! Это ваша первая игра.`
            : `${WELCOME_MESSAGE}\n\n👋 С возвращением, ${firstName}!`;
            
        await bot.sendMessage(chatId, personalizedMessage, {
            reply_markup: getWelcomeKeyboard(),
            parse_mode: 'HTML'
        });
        return;
    }
    
    try {
        // Проверяем подписки
        const unsubscribed = await checkUserSubscriptions(userId);
        
        if (unsubscribed.length > 0) {
            // Не подписан - показываем требование подписки
            const subscriptionMessage = `${SUBSCRIPTION_REQUIRED_MESSAGE}\n\n${unsubscribed.map(sub => {
                const icon = sub.type === 'channel' ? '📢' : '💬';
                return `${icon} ${sub.title}`;
            }).join('\n')}\n\n👆 Подпишитесь на все каналы и нажмите "Проверить подписки"`;
            
            await bot.sendMessage(chatId, subscriptionMessage, {
                reply_markup: getSubscriptionKeyboard(unsubscribed)
            });
        } else {
            // Подписан на все - показываем приветствие
            const personalizedMessage = isNewUser 
                ? `${WELCOME_MESSAGE}\n\n🎉 Добро пожаловать, ${firstName}! Спасибо за подписки.`
                : `${WELCOME_MESSAGE}\n\n👋 С возвращением, ${firstName}!`;
                
            await bot.sendMessage(chatId, personalizedMessage, {
                reply_markup: getWelcomeKeyboard()
            });
        }
    } catch (error) {
        console.error('❌ Error in /start command:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже или обратитесь к администратору.');
    }
});

// Расширенная обработка callback запросов
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;
    const firstName = query.from.first_name || 'Игрок';
    
    console.log(`📱 Callback query: ${data} from user ${userId} (${firstName})`);
    
    try {
        // Проверка прав админа для админских команд
        if (data.startsWith('admin_') && userId !== ADMIN_ID) {
            await bot.answerCallbackQuery(query.id, { text: '❌ Нет прав доступа' });
            return;
        }
        
        switch (data) {
            case 'check_subs':
                await handleCheckSubscriptions(query);
                break;
            case 'my_stats':
                await handleUserStats(query);
                break;
            case 'promo_code':
                await handlePromoCode(query);
                break;
            case 'help':
                await handleHelp(query);
                break;
            case 'help_subs':
                await handleSubscriptionHelp(query);
                break;
            case 'game_rules':
                await handleGameRules(query);
                break;
            case 'admin_add_channel':
                await handleAdminAddChannel(query);
                break;
            case 'admin_add_group':
                await handleAdminAddGroup(query);
                break;
            case 'admin_list':
                await handleAdminList(query);
                break;
            case 'admin_delete':
                await handleAdminDelete(query);
                break;
            case 'admin_promo':
                await handleAdminPromo(query);
                break;
            case 'admin_stats':
                await handleAdminStats(query);
                break;
            case 'admin_broadcast':
                await handleAdminBroadcast(query);
                break;
            default:
                await bot.answerCallbackQuery(query.id, { text: '❓ Неизвестная команда' });
        }
    } catch (error) {
        console.error('❌ Error handling callback query:', error);
        await bot.answerCallbackQuery(query.id, { text: '❌ Произошла ошибка' });
    }
});

// Обработчики для callback запросов
async function handleCheckSubscriptions(query) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    
    const unsubscribed = await checkUserSubscriptions(userId);
    
    if (unsubscribed.length > 0) {
        const subscriptionMessage = `❌ Вы все еще не подписаны на:\n\n${unsubscribed.map(sub => {
            const icon = sub.type === 'channel' ? '📢' : '💬';
            return `${icon} ${sub.title}`;
        }).join('\n')}\n\n👆 Подпишитесь на все каналы и попробуйте снова.`;
        
        await bot.editMessageText(subscriptionMessage, {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: getSubscriptionKeyboard(unsubscribed)
        });
        
        await bot.answerCallbackQuery(query.id, { text: '❌ Подписки не найдены' });
    } else {
        await bot.editMessageText(WELCOME_MESSAGE, {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: getWelcomeKeyboard()
        });
        
        await bot.answerCallbackQuery(query.id, { text: '✅ Все подписки проверены!' });
    }
}

async function handleUserStats(query) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const firstName = query.from.first_name || 'Игрок';
    
    const stats = getUserStats(userId);
    const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
    const joinDays = Math.floor((new Date() - stats.joinDate) / (1000 * 60 * 60 * 24));
    
    const statsMessage = `📊 <b>Статистика игрока ${firstName}</b>\n\n` +
        `🎮 Игр сыграно: <b>${stats.gamesPlayed}</b>\n` +
        `🏆 Побед: <b>${stats.gamesWon}</b>\n` +
        `📈 Процент побед: <b>${winRate}%</b>\n` +
        `💰 Всего заработано: <b>${stats.totalEarned} ⭐</b>\n` +
        `🚀 Лучший множитель: <b>${stats.bestMultiplier.toFixed(2)}x</b>\n` +
        `📅 В игре: <b>${joinDays} дней</b>\n` +
        `⏰ Последняя активность: <b>${stats.lastActive.toLocaleDateString('ru-RU')}</b>`;
    
    await bot.editMessageText(statsMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
            ]
        }
    });
    
    await bot.answerCallbackQuery(query.id, { text: '📊 Статистика загружена' });
}

async function handlePromoCode(query) {
    const chatId = query.message.chat.id;
    
    const promoMessage = `🎁 <b>Активация промокода</b>\n\n` +
        `Отправьте промокод в формате:\n` +
        `<code>/promo ВАШ_ПРОМОКОД</code>\n\n` +
        `💡 <b>Доступные промокоды:</b>\n` +
        `• MINES100 - 100 ⭐\n` +
        `• DIAMOND500 - 500 ⭐\n` +
        `• LUCKY777 - 777 ⭐\n\n` +
        `⚠️ Каждый промокод можно использовать только один раз!`;
    
    await bot.editMessageText(promoMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
            ]
        }
    });
    
    await bot.answerCallbackQuery(query.id, { text: '🎁 Информация о промокодах' });
}

// Улучшенная админ-панель
bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (userId !== ADMIN_ID) {
        await bot.sendMessage(chatId, '❌ У вас нет прав для этой команды');
        return;
    }
    
    try {
        await bot.sendMessage(chatId, '🔧 <b>Админ-панель управления ботом</b>\n\nВыберите действие:', {
            parse_mode: 'HTML',
            reply_markup: getAdminKeyboard()
        });
    } catch (error) {
        console.error('❌ Error in /admin command:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка при загрузке админ-панели');
    }
});

// Команда для статистики пользователя
bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || 'Игрок';
    
    try {
        const stats = getUserStats(userId);
        const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
        const joinDays = Math.floor((new Date() - stats.joinDate) / (1000 * 60 * 60 * 24));
        
        const statsMessage = `📊 <b>Статистика игрока ${firstName}</b>\n\n` +
            `🎮 Игр сыграно: <b>${stats.gamesPlayed}</b>\n` +
            `🏆 Побед: <b>${stats.gamesWon}</b>\n` +
            `📈 Процент побед: <b>${winRate}%</b>\n` +
            `💰 Всего заработано: <b>${stats.totalEarned} ⭐</b>\n` +
            `🚀 Лучший множитель: <b>${stats.bestMultiplier.toFixed(2)}x</b>\n` +
            `📅 В игре: <b>${joinDays} дней</b>\n` +
            `⏰ Последняя активность: <b>${stats.lastActive.toLocaleDateString('ru-RU')}</b>`;
        
        await bot.sendMessage(chatId, statsMessage, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🎲 Играть в Мины', web_app: { url: GAME_URL } }]
                ]
            }
        });
    } catch (error) {
        console.error('❌ Error in /stats command:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка при загрузке статистики');
    }
});

// Команда для активации промокода
bot.onText(/\/promo (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || 'Игрок';
    const promoCode = match[1].toUpperCase().trim();
    
    try {
        if (!promoCodes.has(promoCode)) {
            await bot.sendMessage(chatId, '❌ Промокод не найден или недействителен');
            return;
        }
        
        const promo = promoCodes.get(promoCode);
        
        // Проверяем лимит использований
        if (promo.uses >= promo.maxUses) {
            await bot.sendMessage(chatId, '❌ Промокод исчерпан. Попробуйте другой промокод.');
            return;
        }
        
        // Проверяем, использовал ли пользователь этот промокод ранее
        const stats = getUserStats(userId);
        if (!stats.usedPromoCodes) {
            stats.usedPromoCodes = new Set();
        }
        
        if (stats.usedPromoCodes.has(promoCode)) {
            await bot.sendMessage(chatId, '❌ Вы уже использовали этот промокод');
            return;
        }
        
        // Активируем промокод
        promo.uses += 1;
        stats.usedPromoCodes.add(promoCode);
        stats.totalEarned += promo.reward;
        userStats.set(userId, stats);
        
        const successMessage = `🎉 <b>Промокод активирован!</b>\n\n` +
            `🎁 Промокод: <code>${promoCode}</code>\n` +
            `💰 Получено: <b>${promo.reward} ⭐</b>\n` +
            `📝 ${promo.description}\n\n` +
            `Удачи в игре, ${firstName}! 🍀`;
        
        await bot.sendMessage(chatId, successMessage, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🎲 Играть в Мины', web_app: { url: GAME_URL } }]
                ]
            }
        });
        
        console.log(`✅ User ${userId} (${firstName}) activated promo code: ${promoCode} (+${promo.reward} stars)`);
        
    } catch (error) {
        console.error('❌ Error in /promo command:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка при активации промокода');
    }
});

// Команда помощи
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const helpMessage = `❓ <b>Помощь по боту XudoBudo Mines</b>\n\n` +
            `🎲 <b>Игра "Мины":</b>\n` +
            `• Выберите ставку и количество мин\n` +
            `• Кликайте по клеткам, избегая мин\n` +
            `• Забирайте выигрыш в любой момент\n` +
            `• Чем больше клеток откроете, тем выше множитель\n\n` +
            `🔧 <b>Команды бота:</b>\n` +
            `• /start - главное меню\n` +
            `• /promo КОД - активировать промокод\n` +
            `• /stats - показать статистику\n` +
            `• /help - эта справка\n\n` +
            `🎁 <b>Промокоды:</b>\n` +
            `• MINES100 - 100 ⭐\n` +
            `• DIAMOND500 - 500 ⭐\n` +
            `• LUCKY777 - 777 ⭐\n\n` +
            `📞 <b>Поддержка:</b>\n` +
            `Если у вас есть вопросы, обратитесь к администратору.`;
        
        await bot.sendMessage(chatId, helpMessage, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🎲 Играть в Мины', web_app: { url: GAME_URL } }]
                ]
            }
        });
    } catch (error) {
        console.error('❌ Error in /help command:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка при загрузке справки');
    }
});


// Улучшенные команды для управления подписками
bot.onText(/\/add_channel @(\w+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (userId !== ADMIN_ID) {
        await bot.sendMessage(chatId, '❌ У вас нет прав для этой команды');
        return;
    }
    
    try {
        const username = match[1];
        const title = match[2];
        
        // Проверяем, не добавлен ли уже
        const exists = requiredSubscriptions.find(sub => 
            sub.type === 'channel' && sub.username === username
        );
        
        if (exists) {
            await bot.sendMessage(chatId, '❌ Этот канал уже добавлен в список');
            return;
        }
        
        // Проверяем доступность канала
        try {
            await bot.getChatMembersCount(`@${username}`);
        } catch (error) {
            await bot.sendMessage(chatId, `❌ Не удается получить доступ к каналу @${username}. Убедитесь, что:\n• Канал существует\n• Бот добавлен как администратор\n• Username указан правильно`);
            return;
        }
        
        requiredSubscriptions.push({
            type: 'channel',
            username: username,
            title: title,
            addedBy: userId,
            addedAt: new Date()
        });
        
        await bot.sendMessage(chatId, `✅ <b>Канал добавлен:</b>\n📢 ${title} (@${username})\n\n👥 Участников: ${await bot.getChatMembersCount(`@${username}`)}`, {
            parse_mode: 'HTML'
        });
        
        console.log(`✅ Admin ${userId} added channel: @${username} (${title})`);
        
    } catch (error) {
        console.error('❌ Error in /add_channel command:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка при добавлении канала');
    }
});

bot.onText(/\/add_group (-?\d+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (userId !== ADMIN_ID) {
        await bot.sendMessage(chatId, '❌ У вас нет прав для этой команды');
        return;
    }
    
    try {
        const groupChatId = parseInt(match[1]);
        const title = match[2];
        
        // Проверяем, не добавлен ли уже
        const exists = requiredSubscriptions.find(sub => 
            sub.type === 'group' && sub.chatId === groupChatId
        );
        
        if (exists) {
            await bot.sendMessage(chatId, '❌ Этот чат уже добавлен в список');
            return;
        }
        
        // Проверяем доступность чата
        try {
            const chatInfo = await bot.getChat(groupChatId);
            const membersCount = await bot.getChatMembersCount(groupChatId);
            
            requiredSubscriptions.push({
                type: 'group',
                chatId: groupChatId,
                title: title,
                addedBy: userId,
                addedAt: new Date()
            });
            
            await bot.sendMessage(chatId, `✅ <b>Чат добавлен:</b>\n💬 ${title} (${groupChatId})\n📝 Реальное название: ${chatInfo.title}\n👥 Участников: ${membersCount}`, {
                parse_mode: 'HTML'
            });
            
            console.log(`✅ Admin ${userId} added group: ${groupChatId} (${title})`);
            
        } catch (error) {
            await bot.sendMessage(chatId, `❌ Не удается получить доступ к чату ${groupChatId}. Убедитесь, что:\n• Чат существует\n• Бот добавлен как администратор\n• ID чата указан правильно`);
            return;
        }
        
    } catch (error) {
        console.error('❌ Error in /add_group command:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка при добавлении чата');
    }
});

bot.onText(/\/delete_sub (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (userId !== ADMIN_ID) {
        await bot.sendMessage(chatId, '❌ У вас нет прав для этой команды');
        return;
    }
    
    try {
        const index = parseInt(match[1]) - 1;
        
        if (index < 0 || index >= requiredSubscriptions.length) {
            await bot.sendMessage(chatId, '❌ Неверный номер подписки');
            return;
        }
        
        const removed = requiredSubscriptions.splice(index, 1)[0];
        const icon = removed.type === 'channel' ? '📢' : '💬';
        
        await bot.sendMessage(chatId, `✅ <b>Подписка удалена:</b>\n${icon} ${removed.title}`, {
            parse_mode: 'HTML'
        });
        
        console.log(`✅ Admin ${userId} deleted subscription: ${removed.title}`);
        
    } catch (error) {
        console.error('❌ Error in /delete_sub command:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка при удалении подписки');
    }
});

// Команды для управления промокодами
bot.onText(/\/add_promo (\w+) (\d+) (\d+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (userId !== ADMIN_ID) {
        await bot.sendMessage(chatId, '❌ У вас нет прав для этой команды');
        return;
    }
    
    try {
        const code = match[1].toUpperCase();
        const reward = parseInt(match[2]);
        const maxUses = parseInt(match[3]);
        const description = match[4];
        
        if (promoCodes.has(code)) {
            await bot.sendMessage(chatId, '❌ Промокод с таким названием уже существует');
            return;
        }
        
        promoCodes.set(code, {
            reward: reward,
            uses: 0,
            maxUses: maxUses,
            description: description,
            createdBy: userId,
            createdAt: new Date()
        });
        
        await bot.sendMessage(chatId, `✅ <b>Промокод создан:</b>\n🎫 <code>${code}</code>\n💰 Награда: ${reward} ⭐\n📊 Лимит: ${maxUses} использований\n📝 ${description}`, {
            parse_mode: 'HTML'
        });
        
        console.log(`✅ Admin ${userId} created promo code: ${code} (${reward} stars, ${maxUses} uses)`);
        
    } catch (error) {
        console.error('❌ Error in /add_promo command:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка при создании промокода');
    }
});

bot.onText(/\/delete_promo (\w+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (userId !== ADMIN_ID) {
        await bot.sendMessage(chatId, '❌ У вас нет прав для этой команды');
        return;
    }
    
    try {
        const code = match[1].toUpperCase();
        
        if (!promoCodes.has(code)) {
            await bot.sendMessage(chatId, '❌ Промокод не найден');
            return;
        }
        
        const promo = promoCodes.get(code);
        promoCodes.delete(code);
        
        await bot.sendMessage(chatId, `✅ <b>Промокод удален:</b>\n🎫 <code>${code}</code>\n📊 Было использовано: ${promo.uses}/${promo.maxUses}`, {
            parse_mode: 'HTML'
        });
        
        console.log(`✅ Admin ${userId} deleted promo code: ${code}`);
        
    } catch (error) {
        console.error('❌ Error in /delete_promo command:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка при удалении промокода');
    }
});

// Команда для рассылки
bot.onText(/\/broadcast (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (userId !== ADMIN_ID) {
        await bot.sendMessage(chatId, '❌ У вас нет прав для этой команды');
        return;
    }
    
    try {
        const message = match[1];
        const users = Array.from(userStats.keys());
        
        if (users.length === 0) {
            await bot.sendMessage(chatId, '❌ Нет пользователей для рассылки');
            return;
        }
        
        await bot.sendMessage(chatId, `📢 Начинаю рассылку для ${users.length} пользователей...`);
        
        let sent = 0;
        let failed = 0;
        
        for (const targetUserId of users) {
            try {
                await bot.sendMessage(targetUserId, `📢 <b>Сообщение от администрации:</b>\n\n${message}`, {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🎲 Играть в Мины', web_app: { url: GAME_URL } }]
                        ]
                    }
                });
                sent++;
                
                // Задержка между отправками
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                failed++;
                console.log(`Failed to send broadcast to user ${targetUserId}:`, error.message);
            }
        }
        
        await bot.sendMessage(chatId, `✅ <b>Рассылка завершена:</b>\n📤 Отправлено: ${sent}\n❌ Ошибок: ${failed}`, {
            parse_mode: 'HTML'
        });
        
        console.log(`✅ Admin ${userId} completed broadcast: ${sent} sent, ${failed} failed`);
        
    } catch (error) {
        console.error('❌ Error in /broadcast command:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка при рассылке');
    }
});

// Команда для получения ID чата
bot.onText(/\/chatid/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    const chatTitle = msg.chat.title || 'Личные сообщения';
    
    try {
        let chatInfo = `💬 <b>Информация о чате:</b>\n\n` +
            `🆔 ID: <code>${chatId}</code>\n` +
            `📝 Название: ${chatTitle}\n` +
            `🔧 Тип: ${chatType}`;
        
        if (chatType !== 'private') {
            try {
                const membersCount = await bot.getChatMembersCount(chatId);
                chatInfo += `\n👥 Участников: ${membersCount}`;
            } catch (error) {
                console.log('Could not get members count:', error.message);
            }
        }
        
        await bot.sendMessage(chatId, chatInfo, { parse_mode: 'HTML' });
        
    } catch (error) {
        console.error('❌ Error in /chatid command:', error);
        await bot.sendMessage(chatId, `💬 ID этого чата: \`${chatId}\``, { parse_mode: 'Markdown' });
    }
});

// Улучшенная обработка всех остальных сообщений
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const firstName = msg.from.first_name || 'Игрок';
    
    // Игнорируем команды и callback данные
    if (text && text.startsWith('/')) {
        return;
    }
    
    // Игнорируем сообщения в группах (только личные сообщения)
    if (msg.chat.type !== 'private') {
        return;
    }
    
    try {
        console.log(`📝 Message from user ${userId} (${firstName}): ${text || 'non-text message'}`);
        
        // Обновляем активность пользователя
        const stats = getUserStats(userId);
        stats.lastActive = new Date();
        userStats.set(userId, stats);
        
        // Если нет настроенных подписок - сразу показываем приветствие
        if (requiredSubscriptions.length === 0) {
            await bot.sendMessage(chatId, WELCOME_MESSAGE, {
                reply_markup: getWelcomeKeyboard()
            });
            return;
        }
        
        // Проверяем подписки
        const unsubscribed = await checkUserSubscriptions(userId);
        
        if (unsubscribed.length > 0) {
            // Не подписан - показываем требование подписки
            const subscriptionMessage = `${SUBSCRIPTION_REQUIRED_MESSAGE}\n\n${unsubscribed.map(sub => {
                const icon = sub.type === 'channel' ? '📢' : '💬';
                return `${icon} ${sub.title}`;
            }).join('\n')}\n\n👆 Подпишитесь на все каналы и нажмите "Проверить подписки"`;
            
            await bot.sendMessage(chatId, subscriptionMessage, {
                reply_markup: getSubscriptionKeyboard(unsubscribed)
            });
        } else {
            // Подписан на все - показываем приветствие
            await bot.sendMessage(chatId, WELCOME_MESSAGE, {
                reply_markup: getWelcomeKeyboard()
            });
        }
        
    } catch (error) {
        console.error('❌ Error handling message:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте команду /start');
    }
});

// Обработка ошибок бота
bot.on('error', (error) => {
    console.error('❌ Bot error:', error);
});

bot.on('polling_error', (error) => {
    console.error('❌ Polling error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Shutting down bot...');
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Shutting down bot...');
    bot.stopPolling();
    process.exit(0);
});

// Запуск бота
console.log('🤖 XudoBudo Mines Bot starting...');
console.log(`🎮 Game URL: ${GAME_URL}`);
console.log(`👤 Admin ID: ${ADMIN_ID}`);
console.log('📋 Available commands: /start, /admin, /stats, /promo, /help, /chatid');
console.log(`📢 Required subscriptions: ${requiredSubscriptions.length}`);
console.log(`🎁 Active promo codes: ${promoCodes.size}`);
console.log('✅ Bot is ready and listening for messages!');
async function handleHelp(query) {
    const chatId = query.message.chat.id;
    
    const helpMessage = `❓ <b>Помощь по боту XudoBudo Mines</b>\n\n` +
        `🎲 <b>Игра "Мины":</b>\n` +
        `• Выберите ставку и количество мин\n` +
        `• Кликайте по клеткам, избегая мин\n` +
        `• Забирайте выигрыш в любой момент\n` +
        `• Чем больше клеток откроете, тем выше множитель\n\n` +
        `💰 <b>Система наград:</b>\n` +
        `• Зарабатывайте звезды за победы\n` +
        `• Используйте промокоды для бонусов\n` +
        `• Отслеживайте статистику игр\n\n` +
        `🔧 <b>Команды бота:</b>\n` +
        `• /start - главное меню\n` +
        `• /promo КОД - активировать промокод\n` +
        `• /stats - показать статистику\n` +
        `• /help - эта справка\n\n` +
        `📞 <b>Поддержка:</b>\n` +
        `Если у вас есть вопросы, обратитесь к администратору.`;
    
    await bot.editMessageText(helpMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
            ]
        }
    });
    
    await bot.answerCallbackQuery(query.id, { text: '❓ Справка загружена' });
}

async function handleSubscriptionHelp(query) {
    const chatId = query.message.chat.id;
    
    const helpMessage = `❓ <b>Помощь по подпискам</b>\n\n` +
        `🔒 <b>Почему нужны подписки?</b>\n` +
        `Подписки на наши каналы дают вам доступ к:\n` +
        `• Эксклюзивным промокодам\n` +
        `• Новостям об обновлениях\n` +
        `• Турнирам и конкурсам\n` +
        `• Советам по игре\n\n` +
        `📱 <b>Как подписаться?</b>\n` +
        `1. Нажмите на кнопки каналов выше\n` +
        `2. Подпишитесь на все каналы\n` +
        `3. Вернитесь в бот\n` +
        `4. Нажмите "Проверить подписки"\n\n` +
        `⚠️ <b>Проблемы с подпиской?</b>\n` +
        `• Убедитесь, что подписались на ВСЕ каналы\n` +
        `• Подождите 1-2 минуты после подписки\n` +
        `• Попробуйте еще раз нажать "Проверить подписки"\n\n` +
        `📞 Если проблема не решается, обратитесь к администратору.`;
    
    await bot.editMessageText(helpMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Назад к подпискам', callback_data: 'back_to_subs' }]
            ]
        }
    });
    
    await bot.answerCallbackQuery(query.id, { text: '❓ Помощь по подпискам' });
}

async function handleGameRules(query) {
    const chatId = query.message.chat.id;
    
    const rulesMessage = `📋 <b>Правила игры "Мины"</b>\n\n` +
        `🎯 <b>Цель игры:</b>\n` +
        `Открыть как можно больше безопасных клеток, не попав на мину.\n\n` +
        `🎮 <b>Как играть:</b>\n` +
        `1. Выберите размер ставки (от 1 до 10,000 ⭐)\n` +
        `2. Выберите количество мин (3, 5, 7, 9 или 12)\n` +
        `3. Нажмите "Начать игру"\n` +
        `4. Кликайте по клеткам на поле 4×4\n` +
        `5. Каждая открытая безопасная клетка увеличивает множитель\n` +
        `6. Нажмите "Забрать" чтобы получить выигрыш\n\n` +
        `💎 <b>Безопасная клетка:</b> +множитель\n` +
        `💣 <b>Мина:</b> потеря ставки\n\n` +
        `📊 <b>Множители:</b>\n` +
        `• 3 мины: легче играть, меньше множители\n` +
        `• 12 мин: сложнее играть, больше множители\n\n` +
        `💡 <b>Стратегия:</b>\n` +
        `Баланс между риском и наградой - чем больше клеток откроете, тем выше выигрыш, но и риск попасть на мину!`;
    
    await bot.editMessageText(rulesMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
            ]
        }
    });
    
    await bot.answerCallbackQuery(query.id, { text: '📋 Правила игры' });
}

// Админские обработчики
async function handleAdminAddChannel(query) {
    const chatId = query.message.chat.id;
    
    const message = `📢 <b>Добавление канала</b>\n\n` +
        `Отправьте username канала в формате:\n` +
        `<code>/add_channel @username Название канала</code>\n\n` +
        `⚠️ <b>Важно:</b>\n` +
        `• Бот должен быть добавлен в канал как администратор\n` +
        `• Username канала должен быть публичным\n` +
        `• Не используйте пробелы в username\n\n` +
        `💡 <b>Пример:</b>\n` +
        `<code>/add_channel @mychannel Мой канал</code>`;
    
    await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Назад к админ-панели', callback_data: 'back_to_admin' }]
            ]
        }
    });
    
    await bot.answerCallbackQuery(query.id, { text: '📢 Инструкция по добавлению канала' });
}

async function handleAdminAddGroup(query) {
    const chatId = query.message.chat.id;
    
    const message = `💬 <b>Добавление группы/чата</b>\n\n` +
        `Отправьте ID чата в формате:\n` +
        `<code>/add_group -1001234567890 Название чата</code>\n\n` +
        `⚠️ <b>Важно:</b>\n` +
        `• Бот должен быть добавлен в чат как администратор\n` +
        `• ID чата должен быть отрицательным числом\n` +
        `• Для супергрупп ID начинается с -100\n\n` +
        `💡 <b>Как узнать ID чата:</b>\n` +
        `1. Добавьте бота в чат\n` +
        `2. Напишите в чате <code>/chatid</code>\n` +
        `3. Бот покажет ID чата\n\n` +
        `📝 <b>Пример:</b>\n` +
        `<code>/add_group -1001234567890 Моя группа</code>`;
    
    await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Назад к админ-панели', callback_data: 'back_to_admin' }]
            ]
        }
    });
    
    await bot.answerCallbackQuery(query.id, { text: '💬 Инструкция по добавлению группы' });
}

async function handleAdminList(query) {
    const chatId = query.message.chat.id;
    
    let listMessage = `📋 <b>Список обязательных подписок</b>\n\n`;
    
    if (requiredSubscriptions.length === 0) {
        listMessage += `Список пуст\n\n💡 Используйте кнопки ниже для добавления подписок.`;
    } else {
        requiredSubscriptions.forEach((sub, index) => {
            const icon = sub.type === 'channel' ? '📢' : '💬';
            const identifier = sub.type === 'channel' ? `@${sub.username}` : sub.chatId;
            listMessage += `${index + 1}. ${icon} <b>${sub.title}</b>\n   <code>${identifier}</code>\n\n`;
        });
    }
    
    await bot.editMessageText(listMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Назад к админ-панели', callback_data: 'back_to_admin' }]
            ]
        }
    });
    
    await bot.answerCallbackQuery(query.id, { text: '📋 Список подписок' });
}

async function handleAdminDelete(query) {
    const chatId = query.message.chat.id;
    
    if (requiredSubscriptions.length === 0) {
        await bot.editMessageText('📋 Список подписок пуст', {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Назад к админ-панели', callback_data: 'back_to_admin' }]
                ]
            }
        });
    } else {
        let deleteMessage = `🗑 <b>Удаление подписки</b>\n\n` +
            `Отправьте номер подписки для удаления:\n` +
            `<code>/delete_sub номер</code>\n\n`;
        
        requiredSubscriptions.forEach((sub, index) => {
            const icon = sub.type === 'channel' ? '📢' : '💬';
            deleteMessage += `${index + 1}. ${icon} ${sub.title}\n`;
        });
        
        await bot.editMessageText(deleteMessage, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Назад к админ-панели', callback_data: 'back_to_admin' }]
                ]
            }
        });
    }
    
    await bot.answerCallbackQuery(query.id, { text: '🗑 Удаление подписки' });
}

async function handleAdminPromo(query) {
    const chatId = query.message.chat.id;
    
    let promoMessage = `🎁 <b>Управление промокодами</b>\n\n`;
    
    if (promoCodes.size === 0) {
        promoMessage += `Промокоды не настроены`;
    } else {
        promoMessage += `<b>Активные промокоды:</b>\n\n`;
        for (const [code, data] of promoCodes) {
            const usagePercent = data.maxUses > 0 ? Math.round((data.uses / data.maxUses) * 100) : 0;
            promoMessage += `🎫 <code>${code}</code>\n` +
                `   💰 Награда: ${data.reward} ⭐\n` +
                `   📊 Использовано: ${data.uses}/${data.maxUses} (${usagePercent}%)\n` +
                `   📝 ${data.description}\n\n`;
        }
    }
    
    promoMessage += `💡 <b>Команды управления:</b>\n` +
        `<code>/add_promo КОД НАГРАДА ЛИМИТ ОПИСАНИЕ</code>\n` +
        `<code>/delete_promo КОД</code>\n` +
        `<code>/reset_promo КОД</code>`;
    
    await bot.editMessageText(promoMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Назад к админ-панели', callback_data: 'back_to_admin' }]
            ]
        }
    });
    
    await bot.answerCallbackQuery(query.id, { text: '🎁 Управление промокодами' });
}

async function handleAdminStats(query) {
    const chatId = query.message.chat.id;
    
    const totalUsers = userStats.size;
    const activeUsers = Array.from(userStats.values()).filter(stats => {
        const daysSinceActive = (new Date() - stats.lastActive) / (1000 * 60 * 60 * 24);
        return daysSinceActive <= 7;
    }).length;
    
    const totalGames = Array.from(userStats.values()).reduce((sum, stats) => sum + stats.gamesPlayed, 0);
    const totalWins = Array.from(userStats.values()).reduce((sum, stats) => sum + stats.gamesWon, 0);
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    
    const statsMessage = `📊 <b>Статистика бота</b>\n\n` +
        `👥 <b>Пользователи:</b>\n` +
        `• Всего: ${totalUsers}\n` +
        `• Активных (7 дней): ${activeUsers}\n\n` +
        `🎮 <b>Игры:</b>\n` +
        `• Всего игр: ${totalGames}\n` +
        `• Побед: ${totalWins}\n` +
        `• Общий винрейт: ${winRate}%\n\n` +
        `🎁 <b>Промокоды:</b>\n` +
        `• Активных: ${promoCodes.size}\n` +
        `• Всего использований: ${Array.from(promoCodes.values()).reduce((sum, promo) => sum + promo.uses, 0)}\n\n` +
        `📢 <b>Подписки:</b>\n` +
        `• Обязательных: ${requiredSubscriptions.length}`;
    
    await bot.editMessageText(statsMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Назад к админ-панели', callback_data: 'back_to_admin' }]
            ]
        }
    });
    
    await bot.answerCallbackQuery(query.id, { text: '📊 Статистика бота' });
}

async function handleAdminBroadcast(query) {
    const chatId = query.message.chat.id;
    
    const broadcastMessage = `📢 <b>Рассылка сообщений</b>\n\n` +
        `Отправьте сообщение для рассылки в формате:\n` +
        `<code>/broadcast Текст сообщения</code>\n\n` +
        `⚠️ <b>Внимание:</b>\n` +
        `• Сообщение будет отправлено ВСЕМ пользователям\n` +
        `• Используйте эту функцию осторожно\n` +
        `• Рассылка может занять время\n\n` +
        `👥 <b>Всего пользователей:</b> ${userStats.size}`;
    
    await bot.editMessageText(broadcastMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Назад к админ-панели', callback_data: 'back_to_admin' }]
            ]
        }
    });
    
    await bot.answerCallbackQuery(query.id, { text: '📢 Рассылка сообщений' });
}

// Обработчики кнопок "Назад"
bot.on('callback_query', async (query) => {
    if (query.data === 'back_to_main') {
        await bot.editMessageText(WELCOME_MESSAGE, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            reply_markup: getWelcomeKeyboard()
        });
        await bot.answerCallbackQuery(query.id, { text: '🏠 Главное меню' });
    } else if (query.data === 'back_to_admin') {
        await bot.editMessageText('🔧 <b>Админ-панель управления подписками</b>\n\nВыберите действие:', {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: 'HTML',
            reply_markup: getAdminKeyboard()
        });
        await bot.answerCallbackQuery(query.id, { text: '🔧 Админ-панель' });
    } else if (query.data === 'back_to_subs') {
        const userId = query.from.id;
        const unsubscribed = await checkUserSubscriptions(userId);
        
        if (unsubscribed.length > 0) {
            const subscriptionMessage = `${SUBSCRIPTION_REQUIRED_MESSAGE}\n\n${unsubscribed.map(sub => {
                const icon = sub.type === 'channel' ? '📢' : '💬';
                return `${icon} ${sub.title}`;
            }).join('\n')}\n\n👆 Подпишитесь на все каналы и нажмите "Проверить подписки"`;
            
            await bot.editMessageText(subscriptionMessage, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                reply_markup: getSubscriptionKeyboard(unsubscribed)
            });
        }
        await bot.answerCallbackQuery(query.id, { text: '🔒 Подписки' });
    }
});