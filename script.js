// Telegram Web App initialization (with fallback for local testing)
let tg = window.Telegram?.WebApp || {
    expand: () => console.log('TG: expand'),
    ready: () => console.log('TG: ready'),
    close: () => console.log('TG: close'),
    HapticFeedback: {
        impactOccurred: (type) => console.log('TG: haptic', type),
        notificationOccurred: (type) => console.log('TG: notification', type)
    },
    BackButton: {
        show: () => console.log('TG: back button show'),
        hide: () => console.log('TG: back button hide')
    },
    colorScheme: 'dark',
    themeParams: {
        bg_color: '#17212b',
        text_color: '#f5f5f5',
        hint_color: '#708499',
        link_color: '#6ab3f3',
        button_color: '#5288c1',
        button_text_color: '#ffffff',
        secondary_bg_color: '#232e3c'
    },
    onEvent: (event, callback) => console.log('TG: event listener', event),
    openTelegramLink: (url) => {
        console.log('TG: open link', url);
        if (navigator.share) {
            navigator.share({
                title: 'XudoBudoGame',
                text: 'Присоединяйся к XudoBudoGame!',
                url: window.location.href
            });
        }
    },
    // Добавляем данные пользователя
    initDataUnsafe: {
        user: {
            id: 123456789,
            first_name: 'Player',
            last_name: '',
            username: 'player123',
            photo_url: ''
        }
    }
};

// Получение данных пользователя
function getUserData() {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        return {
            id: tg.initDataUnsafe.user.id,
            firstName: tg.initDataUnsafe.user.first_name || 'Player',
            lastName: tg.initDataUnsafe.user.last_name || '',
            username: tg.initDataUnsafe.user.username || '',
            photoUrl: tg.initDataUnsafe.user.photo_url || ''
        };
    }
    return {
        id: 123456789,
        firstName: 'Player',
        lastName: '',
        username: 'player123',
        photoUrl: ''
    };
}

// Сохранение данных в localStorage
function saveGameData() {
    const userData = getUserData();
    const saveData = {
        balance: gameState.balance,
        stats: gameState.stats,
        userId: userData.id
    };
    localStorage.setItem('xudobudo_game_data', JSON.stringify(saveData));
}

// Загрузка данных из localStorage
function loadGameData() {
    const userData = getUserData();
    const savedData = localStorage.getItem('xudobudo_game_data');
    
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            // Проверяем что данные принадлежат текущему пользователю
            if (data.userId === userData.id) {
                gameState.balance = data.balance || 1000;
                gameState.stats = data.stats || {
                    gamesPlayed: 0,
                    gamesWon: 0,
                    totalWinnings: 0,
                    bestMultiplier: 0
                };
            }
        } catch (error) {
            console.log('Error loading game data:', error);
        }
    }
}

// Apply Telegram theme
function applyTelegramTheme() {
    if (tg.themeParams) {
        const root = document.documentElement;
        const theme = tg.themeParams;
        
        if (theme.bg_color) root.style.setProperty('--tg-theme-bg-color', theme.bg_color);
        if (theme.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);
        if (theme.text_color) root.style.setProperty('--tg-theme-text-color', theme.text_color);
        if (theme.hint_color) root.style.setProperty('--tg-theme-hint-color', theme.hint_color);
        if (theme.link_color) root.style.setProperty('--tg-theme-link-color', theme.link_color);
        if (theme.button_color) root.style.setProperty('--tg-theme-button-color', theme.button_color);
        if (theme.button_text_color) root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color);
    }
}

tg.expand();
tg.ready();
applyTelegramTheme();

// Game state
let gameState = {
    balance: 1000,
    currentBet: 0,
    autoCashout: 2.00,
    hasBet: false,
    multiplier: 1.00,
    crashPoint: 0,
    gamePhase: 'waiting',
    gameInterval: null,
    gameStartTime: 0,
    canvas: null,
    ctx: null,
    curve: [],
    gameHistory: [5.67, 2.45, 1.23, 8.91, 1.05],
    stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalWinnings: 0,
        bestMultiplier: 0
    },
    activePlayers: [],
    currentRoundPlayers: []
};

// Загружаем сохраненный баланс при запуске
function loadSavedBalance() {
    try {
        const savedBalance = localStorage.getItem('xudobudo_balance');
        if (savedBalance) {
            const balance = parseInt(savedBalance);
            if (balance > 0 && balance < 1000000) { // Проверка на разумные пределы
                gameState.balance = balance;
                console.log(`Loaded saved balance: ${balance} stars`);
            }
        }
        
        const savedStats = localStorage.getItem('xudobudo_stats');
        if (savedStats) {
            const stats = JSON.parse(savedStats);
            gameState.stats = { ...gameState.stats, ...stats };
        }
    } catch (error) {
        console.log('Could not load saved data:', error);
    }
}

// Сохраняем статистику игры
function saveGameStats() {
    try {
        localStorage.setItem('xudobudo_balance', gameState.balance.toString());
        localStorage.setItem('xudobudo_stats', JSON.stringify(gameState.stats));
    } catch (error) {
        console.log('Could not save game stats:', error);
    }
}

// Navigation
function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(sectionName).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    document.querySelector(`[onclick="showSection('${sectionName}')"]`).classList.add('active');
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Top Up Functions
function openTopUpModal() {
    document.getElementById('topUpModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    const currentBalanceEl = document.getElementById('currentBalance');
    if (currentBalanceEl) {
        currentBalanceEl.textContent = `${gameState.balance.toLocaleString()} ⭐`;
    }
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

function closeTopUpModal() {
    document.getElementById('topUpModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function purchaseStars(amount) {
    if (amount < 1 || amount > 2500) {
        showNotification('Сумма должна быть от 1 до 2500 звезд!');
        return;
    }
    
    // Проверяем доступность Telegram WebApp API
    if (!window.Telegram?.WebApp) {
        showNotification('Ошибка: Telegram WebApp недоступен');
        return;
    }
    
    // Используем реальные Telegram Stars
    if (window.Telegram.WebApp.openInvoice) {
        try {
            // Создаем инвойс для Telegram Stars
            const invoiceLink = createTelegramStarsInvoice(amount);
            
            // Открываем платеж через Telegram
            window.Telegram.WebApp.openInvoice(invoiceLink, (status) => {
                console.log('Payment status:', status);
                
                if (status === 'paid') {
                    processSuccessfulPayment(amount);
                    showNotification(`✅ Успешно! Получено ${amount} ⭐`);
                } else if (status === 'cancelled') {
                    showNotification('Платеж отменен');
                } else if (status === 'failed') {
                    showNotification('Ошибка платежа. Попробуйте еще раз');
                } else if (status === 'pending') {
                    showNotification('Платеж обрабатывается...');
                }
            });
            
        } catch (error) {
            console.error('Payment error:', error);
            showNotification('Ошибка при создании платежа');
        }
    } else {
        // Fallback для тестирования вне Telegram
        console.log('Telegram payment not available, using fallback');
        simulatePayment(amount);
    }
    
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
    }
}

// Создание ссылки на инвойс для Telegram Stars
function createTelegramStarsInvoice(amount) {
    // Для Telegram Stars используется специальный формат
    // Это должно быть настроено через бота с использованием Bot API
    
    // В реальном приложении эта ссылка должна генерироваться на сервере
    // через Bot API метод createInvoiceLink с currency: 'XTR'
    
    // Пример структуры (в реальности генерируется сервером):
    const invoiceData = {
        title: 'Пополнение звезд XudoBudoGame',
        description: `Покупка ${amount} игровых звезд`,
        payload: `stars_purchase_${amount}_${Date.now()}`,
        currency: 'XTR',
        prices: [{ label: `${amount} звезд`, amount: amount }]
    };
    
    // В продакшене здесь должен быть запрос к вашему серверу:
    // const response = await fetch('/api/create-invoice', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(invoiceData)
    // });
    // return response.json().invoice_link;
    
    // Для демо возвращаем тестовую ссылку
    console.log('Creating invoice for:', invoiceData);
    return `https://t.me/invoice/demo_${amount}_stars`;
}

function purchaseCustomStars() {
    const customAmount = parseInt(document.getElementById('customStarsAmount').value);
    
    if (!customAmount || customAmount < 1) {
        showNotification('Введите корректное количество звезд!');
        return;
    }
    
    if (customAmount > 10000) {
        showNotification('Максимальная сумма: 10,000 звезд');
        return;
    }
    
    purchaseStars(customAmount);
}

function simulatePayment(amount) {
    showNotification('Обработка платежа...');
    
    setTimeout(() => {
        processSuccessfulPayment(amount);
    }, 2000);
}

function processSuccessfulPayment(amount) {
    // Добавляем звезды к балансу
    gameState.balance += amount;
    updateBalance();
    
    // Обновляем отображение текущего баланса в модале
    const currentBalanceEl = document.getElementById('currentBalance');
    if (currentBalanceEl) {
        currentBalanceEl.textContent = `${gameState.balance.toLocaleString()} ⭐`;
    }
    
    // Закрываем модал пополнения
    closeTopUpModal();
    
    // Показываем уведомление об успешном пополнении
    showNotification(`✅ Пополнение успешно! +${amount} ⭐`);
    
    // Сохраняем в localStorage для персистентности
    try {
        localStorage.setItem('xudobudo_balance', gameState.balance.toString());
        localStorage.setItem('xudobudo_last_purchase', JSON.stringify({
            amount: amount,
            timestamp: Date.now(),
            method: 'telegram_stars'
        }));
    } catch (error) {
        console.log('Could not save to localStorage:', error);
    }
    
    // Haptic feedback для успешной покупки
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    
    console.log(`Payment processed: +${amount} stars, new balance: ${gameState.balance}`);
}

// Crash Game Functions
function openCrashGame() {
    document.getElementById('crashGameModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    initializeCanvas();
    updateGameDisplay();
    
    if (gameState.gamePhase === 'waiting') {
        startNewRound();
    }
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

function closeCrashGame() {
    document.getElementById('crashGameModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    
    if (gameState.gameInterval) {
        clearInterval(gameState.gameInterval);
        gameState.gameInterval = null;
    }
}

function initializeCanvas() {
    gameState.canvas = document.getElementById('gameCanvas');
    if (!gameState.canvas) return;
    
    gameState.ctx = gameState.canvas.getContext('2d');
    
    const rect = gameState.canvas.getBoundingClientRect();
    gameState.canvas.width = rect.width * window.devicePixelRatio;
    gameState.canvas.height = rect.height * window.devicePixelRatio;
    gameState.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    drawChart();
}

function drawChart() {
    if (!gameState.ctx) return;
    
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= 10; i++) {
        const x = (width / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    for (let i = 0; i <= 8; i++) {
        const y = (height / 8) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw curve
    if (gameState.curve.length > 1) {
        ctx.strokeStyle = '#6ab3f3';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        for (let i = 0; i < gameState.curve.length; i++) {
            const point = gameState.curve[i];
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        ctx.stroke();
    }
}

function generateCrashPoint() {
    const rand = Math.random();
    
    if (rand < 0.5) {
        return parseFloat((1.01 + Math.random() * 0.99).toFixed(2));
    } else if (rand < 0.8) {
        return parseFloat((2.00 + Math.random() * 3.00).toFixed(2));
    } else if (rand < 0.95) {
        return parseFloat((5.00 + Math.random() * 15.00).toFixed(2));
    } else {
        return parseFloat((20.00 + Math.random() * 80.00).toFixed(2));
    }
}

// Генерация реальных игроков для демонстрации
function generateRealPlayers() {
    const realPlayers = [
        { id: 987654321, firstName: 'Александр', username: 'alex_crypto', photoUrl: '' },
        { id: 876543210, firstName: 'Мария', username: 'maria_trader', photoUrl: '' },
        { id: 765432109, firstName: 'Дмитрий', username: 'dmitry_win', photoUrl: '' },
        { id: 654321098, firstName: 'Анна', username: 'anna_lucky', photoUrl: '' },
        { id: 543210987, firstName: 'Сергей', username: 'sergey_pro', photoUrl: '' },
        { id: 432109876, firstName: 'Елена', username: 'elena_star', photoUrl: '' },
        { id: 321098765, firstName: 'Михаил', username: 'mikhail_bet', photoUrl: '' },
        { id: 210987654, firstName: 'Ольга', username: 'olga_game', photoUrl: '' }
    ];
    
    // Добавляем текущего игрока
    const currentUser = getUserData();
    realPlayers.unshift(currentUser);
    
    return realPlayers;
}

// Создание игрока для раунда
function createRoundPlayer(playerData, betAmount) {
    return {
        id: playerData.id,
        name: playerData.firstName,
        username: playerData.username,
        photoUrl: playerData.photoUrl,
        bet: betAmount,
        status: 'waiting',
        cashoutMultiplier: null,
        isCurrentUser: playerData.id === getUserData().id
    };
}

// Обновление списка игроков в раунде
function updatePlayersDisplay() {
    const playersContainer = document.getElementById('playersList');
    if (!playersContainer) return;
    
    playersContainer.innerHTML = '';
    
    gameState.currentRoundPlayers.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = `player-item ${player.isCurrentUser ? 'current-user' : ''}`;
        
        let statusText = '';
        let statusClass = '';
        
        switch (player.status) {
            case 'waiting':
                statusText = 'Ждет';
                statusClass = 'waiting';
                break;
            case 'cashed':
                statusText = `${player.cashoutMultiplier}x`;
                statusClass = 'cashed';
                break;
            case 'crashed':
                statusText = 'Краш';
                statusClass = 'crashed';
                break;
        }
        
        // Создаем аватар
        const avatar = player.photoUrl 
            ? `<img src="${player.photoUrl}" alt="${player.name}" class="player-avatar">`
            : `<div class="player-avatar-placeholder">${player.name.charAt(0)}</div>`;
        
        playerItem.innerHTML = `
            ${avatar}
            <div class="player-info">
                <span class="player-name">${player.name}</span>
                <span class="player-username">@${player.username}</span>
            </div>
            <span class="player-bet">${player.bet} ⭐</span>
            <span class="player-status ${statusClass}">${statusText}</span>
        `;
        
        playersContainer.appendChild(playerItem);
    });
}

// Генерация игроков для нового раунда
function generateRoundPlayers() {
    const allPlayers = generateRealPlayers();
    const numPlayers = Math.floor(Math.random() * 6) + 3; // 3-8 игроков
    
    gameState.currentRoundPlayers = [];
    
    // Перемешиваем и выбираем случайных игроков
    const shuffled = allPlayers.sort(() => 0.5 - Math.random());
    const selectedPlayers = shuffled.slice(0, numPlayers);
    
    selectedPlayers.forEach(playerData => {
        const betAmount = Math.floor(Math.random() * 500) + 50; // 50-550 звезд
        const roundPlayer = createRoundPlayer(playerData, betAmount);
        gameState.currentRoundPlayers.push(roundPlayer);
    });
    
    updatePlayersDisplay();
}

// Обновление статуса игроков во время игры
function updatePlayersStatus() {
    gameState.currentRoundPlayers.forEach(player => {
        if (player.status === 'waiting' && !player.isCurrentUser) {
            // Случайный кэшаут для ботов
            const shouldCashout = Math.random() < 0.1; // 10% шанс каждую итерацию
            if (shouldCashout && gameState.multiplier > 1.2) {
                player.status = 'cashed';
                player.cashoutMultiplier = gameState.multiplier.toFixed(2);
            }
        }
    });
    
    updatePlayersDisplay();
}
    gameState.gamePhase = 'betting';
    gameState.multiplier = 1.00;
    gameState.curve = [];
    gameState.crashPoint = generateCrashPoint();
    
    updateGameDisplay();
    
    let countdown = 5;
    const statusEl = document.getElementById('gameStatus');
    if (statusEl) {
        statusEl.textContent = `Ставки: ${countdown}с`;
    }
    
    const countdownInterval = setInterval(() => {
        countdown--;
        if (statusEl) {
            statusEl.textContent = `Ставки: ${countdown}с`;
        }
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            startFlying();
        }
    }, 1000);
}

function startFlying() {
    gameState.gamePhase = 'flying';
    gameState.multiplier = 1.00;
    gameState.gameStartTime = Date.now();
    
    const statusEl = document.getElementById('gameStatus');
    if (statusEl) {
        statusEl.textContent = 'Летит...';
    }
    
    const betBtn = document.getElementById('betBtn');
    if (betBtn) {
        betBtn.disabled = true;
    }
    
    if (gameState.hasBet) {
        const cashoutBtn = document.getElementById('cashoutBtn');
        if (cashoutBtn) {
            cashoutBtn.disabled = false;
        }
    }
    
    const rocket = document.getElementById('rocketPlane');
    if (rocket) {
        rocket.classList.add('flying');
    }
    
    gameState.gameInterval = setInterval(() => {
        updateMultiplier();
        updateRocketPosition();
        drawChart();
        updateGameDisplay();
        
        if (gameState.multiplier >= gameState.crashPoint) {
            crashGame();
        }
        
        if (gameState.hasBet && gameState.autoCashout > 0 && gameState.multiplier >= gameState.autoCashout) {
            cashOut();
        }
    }, 100);
}

function updateMultiplier() {
    const timeElapsed = (Date.now() - gameState.gameStartTime) / 1000;
    let baseGrowth = 0.008;
    let accelerationFactor = 1 + (timeElapsed * 0.15);
    let randomFactor = 0.85 + Math.random() * 0.3;
    
    let increment = baseGrowth * accelerationFactor * randomFactor;
    increment = Math.min(increment, 0.05);
    
    gameState.multiplier += increment;
    gameState.multiplier = Math.min(gameState.multiplier, gameState.crashPoint);
}

function updateRocketPosition() {
    if (!gameState.canvas) return;
    
    const width = gameState.canvas.width / window.devicePixelRatio;
    const height = gameState.canvas.height / window.devicePixelRatio;
    
    const timeElapsed = (Date.now() - gameState.gameStartTime) / 1000;
    const progress = Math.min(timeElapsed / 10, 1);
    
    const x = 20 + progress * (width - 60);
    const multiplierHeight = (gameState.multiplier - 1) * 12;
    const y = height - 20 - multiplierHeight;
    
    const smoothY = Math.max(y, 20);
    gameState.curve.push({ x, y: smoothY });
    
    if (gameState.curve.length > 150) {
        gameState.curve.shift();
    }
    
    const rocket = document.getElementById('rocketPlane');
    if (rocket) {
        rocket.style.left = `${x - 20}px`;
        rocket.style.bottom = `${height - smoothY - 20}px`;
        
        const rotationAngle = Math.min((gameState.multiplier - 1) * 2, 15);
        rocket.style.transform = `rotate(${rotationAngle}deg) scale(${1 + (gameState.multiplier - 1) * 0.1})`;
    }
}

function placeBet() {
    if (gameState.gamePhase !== 'betting') {
        showNotification('Ставки закрыты!');
        return;
    }
    
    const betAmountEl = document.getElementById('betAmount');
    const autoCashoutEl = document.getElementById('autoCashout');
    
    if (!betAmountEl || !autoCashoutEl) return;
    
    const betAmount = parseInt(betAmountEl.value) || 0;
    const autoCashout = parseFloat(autoCashoutEl.value);
    
    if (betAmount <= 0) {
        showNotification('Введите сумму ставки!');
        return;
    }
    
    if (betAmount > gameState.balance) {
        showNotification('Недостаточно средств!');
        return;
    }
    
    if (autoCashout < 1.01) {
        showNotification('Минимальный авто-вывод: 1.01x');
        return;
    }
    
    gameState.currentBet = betAmount;
    gameState.autoCashout = autoCashout;
    gameState.balance -= betAmount;
    gameState.hasBet = true;
    
    updateBalance();
    updateGameDisplay();
    
    showNotification(`Ставка ${betAmount} ⭐ принята!`);
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

function cashOut() {
    if (!gameState.hasBet || gameState.gamePhase !== 'flying') {
        return;
    }
    
    const winAmount = Math.floor(gameState.currentBet * gameState.multiplier);
    gameState.balance += winAmount;
    gameState.hasBet = false;
    
    gameState.stats.gamesPlayed++;
    gameState.stats.gamesWon++;
    gameState.stats.totalWinnings += winAmount - gameState.currentBet;
    gameState.stats.bestMultiplier = Math.max(gameState.stats.bestMultiplier || 0, gameState.multiplier);
    
    // Сохраняем обновленную статистику
    saveGameStats();
    
    updateBalance();
    updateGameDisplay();
    
    const cashoutBtn = document.getElementById('cashoutBtn');
    if (cashoutBtn) {
        cashoutBtn.disabled = true;
    }
    
    showNotification(`✅ Выиграл ${winAmount} ⭐! (${gameState.multiplier.toFixed(2)}x)`);
    
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
}

function crashGame() {
    gameState.gamePhase = 'crashed';
    
    if (gameState.gameInterval) {
        clearInterval(gameState.gameInterval);
        gameState.gameInterval = null;
    }
    
    const rocket = document.getElementById('rocketPlane');
    if (rocket) {
        rocket.classList.remove('flying');
        rocket.style.filter = 'brightness(2) saturate(0) blur(2px)';
        setTimeout(() => {
            rocket.style.filter = 'brightness(1.2) drop-shadow(0 0 8px rgba(106, 179, 243, 0.5))';
        }, 500);
    }
    
    const statusEl = document.getElementById('gameStatus');
    if (statusEl) {
        statusEl.textContent = `💥 Краш на ${gameState.crashPoint.toFixed(2)}x!`;
    }
    
    gameState.stats.gamesPlayed++;
    
    if (gameState.hasBet) {
        gameState.hasBet = false;
        showNotification(`💸 Проиграл ${gameState.currentBet} ⭐! Краш на ${gameState.crashPoint.toFixed(2)}x`);
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    }
    
    addToHistory(gameState.crashPoint);
    updateGameDisplay();
    
    setTimeout(() => {
        if (document.getElementById('crashGameModal').classList.contains('active')) {
            startNewRound();
        }
    }, 3000);
}

function addToHistory(result) {
    gameState.gameHistory.unshift(result);
    if (gameState.gameHistory.length > 10) {
        gameState.gameHistory.pop();
    }
    
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyContainer = document.getElementById('historyItems');
    if (!historyContainer) return;
    
    historyContainer.innerHTML = '';
    
    gameState.gameHistory.slice(0, 8).forEach(result => {
        const item = document.createElement('span');
        item.className = 'history-item';
        item.textContent = result.toFixed(2) + 'x';
        
        if (result < 2) {
            item.classList.add('low');
        } else if (result < 5) {
            item.classList.add('medium');
        } else {
            item.classList.add('high');
        }
        
        historyContainer.appendChild(item);
    });
}

function updateGameDisplay() {
    const multiplierEl = document.getElementById('multiplierDisplay');
    if (multiplierEl) {
        multiplierEl.textContent = gameState.multiplier.toFixed(2) + 'x';
    }
    
    const betBtn = document.getElementById('betBtn');
    const betAmountEl = document.getElementById('betAmount');
    if (betBtn && betAmountEl) {
        const betAmount = betAmountEl.value;
        const btnAmount = betBtn.querySelector('.btn-amount');
        if (btnAmount) {
            btnAmount.textContent = `${betAmount} ⭐`;
        }
        betBtn.disabled = gameState.gamePhase !== 'betting' || gameState.hasBet;
    }
    
    const cashoutBtn = document.getElementById('cashoutBtn');
    if (cashoutBtn) {
        if (gameState.hasBet && gameState.gamePhase === 'flying') {
            cashoutBtn.disabled = false;
            const winAmount = Math.floor(gameState.currentBet * gameState.multiplier);
            const btnMultiplier = cashoutBtn.querySelector('.btn-multiplier');
            if (btnMultiplier) {
                btnMultiplier.textContent = `${winAmount} ⭐`;
            }
        } else {
            cashoutBtn.disabled = true;
            const btnMultiplier = cashoutBtn.querySelector('.btn-multiplier');
            if (btnMultiplier) {
                btnMultiplier.textContent = '0 ⭐';
            }
        }
    }
}

function updateBalance() {
    const balanceAmountEl = document.querySelector('.balance-amount');
    if (balanceAmountEl) {
        balanceAmountEl.textContent = gameState.balance.toLocaleString();
    }
    
    const statItems = document.querySelectorAll('.stat-item .stat-value');
    if (statItems.length >= 3) {
        statItems[0].textContent = gameState.balance.toLocaleString();
        statItems[1].textContent = gameState.stats.gamesPlayed || 0;
        statItems[2].textContent = gameState.stats.gamesWon || 0;
    }
    
    const currentBalanceEl = document.getElementById('currentBalance');
    if (currentBalanceEl) {
        currentBalanceEl.textContent = `${gameState.balance.toLocaleString()} ⭐`;
    }
}

// Notification system
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        z-index: 10000;
        font-size: 14px;
        font-weight: bold;
        backdrop-filter: blur(10px);
        animation: slideDown 0.3s ease-out;
        border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    if (!document.querySelector('#notificationStyles')) {
        const style = document.createElement('style');
        style.id = 'notificationStyles';
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateX(-50%) translateY(0); opacity: 1; }
                to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Promo Code Functions
function openPromoModal() {
    document.getElementById('promoModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

function closePromoModal() {
    document.getElementById('promoModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function activatePromoCode() {
    const promoInput = document.getElementById('promoCodeInput');
    if (!promoInput) return;
    
    const promoCode = promoInput.value.trim().toUpperCase();
    
    if (!promoCode) {
        showNotification('Введите промокод!');
        return;
    }
    
    // Simple promo codes for demo
    const promoCodes = {
        'START': 500,
        'BONUS': 1000,
        'WELCOME': 250,
        'GAME': 750
    };
    
    if (promoCodes[promoCode]) {
        const reward = promoCodes[promoCode];
        gameState.balance += reward;
        updateBalance();
        
        promoInput.value = '';
        showNotification(`✅ Промокод активирован! Получено ${reward} ⭐`);
        
        // Add to activated promos list
        const activatedEl = document.getElementById('activatedPromos');
        if (activatedEl) {
            if (activatedEl.querySelector('.no-promos')) {
                activatedEl.innerHTML = '';
            }
            
            const promoItem = document.createElement('div');
            promoItem.className = 'promo-item';
            promoItem.innerHTML = `
                <span class="promo-code">${promoCode}</span>
                <span class="promo-reward">+${reward} ⭐</span>
            `;
            activatedEl.appendChild(promoItem);
        }
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    } else {
        showNotification('Неверный промокод!');
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    }
}



// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем сохраненные данные
    loadSavedBalance();
    
    // Обновляем интерфейс
    updateBalance();
    updateHistoryDisplay();
    
    // Initialize sound system
    addSoundToButtons();
    loadSoundPreference();
    
    const betAmountEl = document.getElementById('betAmount');
    if (betAmountEl) {
        betAmountEl.addEventListener('input', function(e) {
            let value = parseInt(e.target.value) || 0;
            
            // Allow any positive value, just warn if insufficient balance
            if (value < 0) {
                e.target.value = 0;
                value = 0;
            }
            
            const betBtn = document.getElementById('betBtn');
            if (betBtn) {
                const btnAmount = betBtn.querySelector('.btn-amount');
                if (btnAmount) {
                    btnAmount.textContent = `${value} ⭐`;
                }
            }
        });
    }
    
    const autoCashoutEl = document.getElementById('autoCashout');
    if (autoCashoutEl) {
        autoCashoutEl.addEventListener('input', function(e) {
            let value = parseFloat(e.target.value);
            if (value < 1.01) e.target.value = 1.01;
            if (value > 1000) e.target.value = 1000;
        });
    }
    
    const customStarsEl = document.getElementById('customStarsAmount');
    if (customStarsEl) {
        customStarsEl.addEventListener('input', function(e) {
            let value = parseInt(e.target.value) || 0;
            if (value > 10000) e.target.value = 10000;
            if (value < 0) e.target.value = 0;
            
            const previewEl = document.getElementById('customCoinsPreview');
            if (previewEl) {
                previewEl.textContent = `Получите: ${value.toLocaleString()} ⭐`;
            }
            
            const priceEl = document.getElementById('starsPrice');
            if (priceEl) {
                priceEl.textContent = value;
            }
        });
    }
    
    const crashModalEl = document.getElementById('crashGameModal');
    if (crashModalEl) {
        crashModalEl.addEventListener('click', function(e) {
            if (e.target === this) {
                closeCrashGame();
            }
        });
    }
    
    const topUpModalEl = document.getElementById('topUpModal');
    if (topUpModalEl) {
        topUpModalEl.addEventListener('click', function(e) {
            if (e.target === this) {
                closeTopUpModal();
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeCrashGame();
            closeTopUpModal();
        }
        if (e.key === ' ' && gameState.hasBet && gameState.gamePhase === 'flying') {
            e.preventDefault();
            cashOut();
        }
    });
});

// Sound System
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.3;
        this.init();
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createSounds();
        } catch (error) {
            console.log('Audio not supported:', error);
            this.enabled = false;
        }
    }

    createSounds() {
        // Button click sound
        this.sounds.click = () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        };

        // Success sound
        this.sounds.success = () => {
            const oscillator1 = this.audioContext.createOscillator();
            const oscillator2 = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator1.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
            oscillator1.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1); // E5
            oscillator1.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2); // G5
            
            oscillator2.frequency.setValueAtTime(262, this.audioContext.currentTime); // C4
            oscillator2.frequency.setValueAtTime(330, this.audioContext.currentTime + 0.1); // E4
            oscillator2.frequency.setValueAtTime(392, this.audioContext.currentTime + 0.2); // G4
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
            
            oscillator1.start(this.audioContext.currentTime);
            oscillator2.start(this.audioContext.currentTime);
            oscillator1.stop(this.audioContext.currentTime + 0.3);
            oscillator2.stop(this.audioContext.currentTime + 0.3);
        };

        // Error sound
        this.sounds.error = () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(150, this.audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.5, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        };

        // Rocket engine sound (for crash game)
        this.sounds.rocket = () => {
            const oscillator = this.audioContext.createOscillator();
            const noiseBuffer = this.createNoiseBuffer();
            const noiseSource = this.audioContext.createBufferSource();
            const filter = this.audioContext.createBiquadFilter();
            const gainNode = this.audioContext.createGain();
            
            noiseSource.buffer = noiseBuffer;
            
            oscillator.connect(gainNode);
            noiseSource.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(80, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 2);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
            filter.frequency.exponentialRampToValueAtTime(3000, this.audioContext.currentTime + 2);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            noiseSource.start(this.audioContext.currentTime);
            
            return {
                stop: () => {
                    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
                    oscillator.stop(this.audioContext.currentTime + 0.3);
                    noiseSource.stop(this.audioContext.currentTime + 0.3);
                }
            };
        };

        // Crash explosion sound
        this.sounds.crash = () => {
            const noiseBuffer = this.createNoiseBuffer();
            const noiseSource = this.audioContext.createBufferSource();
            const filter = this.audioContext.createBiquadFilter();
            const gainNode = this.audioContext.createGain();
            
            noiseSource.buffer = noiseBuffer;
            noiseSource.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.5);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.8, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
            
            noiseSource.start(this.audioContext.currentTime);
            noiseSource.stop(this.audioContext.currentTime + 0.5);
        };

        // Cashout sound
        this.sounds.cashout = () => {
            const oscillator1 = this.audioContext.createOscillator();
            const oscillator2 = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator1.frequency.setValueAtTime(880, this.audioContext.currentTime); // A5
            oscillator1.frequency.setValueAtTime(1047, this.audioContext.currentTime + 0.1); // C6
            
            oscillator2.frequency.setValueAtTime(440, this.audioContext.currentTime); // A4
            oscillator2.frequency.setValueAtTime(523, this.audioContext.currentTime + 0.1); // C5
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.6, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);
            
            oscillator1.start(this.audioContext.currentTime);
            oscillator2.start(this.audioContext.currentTime);
            oscillator1.stop(this.audioContext.currentTime + 0.4);
            oscillator2.stop(this.audioContext.currentTime + 0.4);
        };

        // Bet placed sound
        this.sounds.bet = () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.15);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.15);
        };
    }

    createNoiseBuffer() {
        const bufferSize = this.audioContext.sampleRate * 0.5;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    }

    play(soundName) {
        if (!this.enabled || !this.audioContext || !this.sounds[soundName]) return null;
        
        try {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            return this.sounds[soundName]();
        } catch (error) {
            console.log('Sound play error:', error);
            return null;
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// Initialize sound manager
const soundManager = new SoundManager();
let currentRocketSound = null;

// Add sound to existing functions
const originalShowNotification = showNotification;
showNotification = function(message) {
    if (message.includes('✅') || message.includes('Успешно') || message.includes('Получен')) {
        soundManager.play('success');
    } else if (message.includes('❌') || message.includes('Ошибка') || message.includes('Неверн')) {
        soundManager.play('error');
    } else {
        soundManager.play('click');
    }
    return originalShowNotification(message);
};

// Add sound to button clicks
function addSoundToButtons() {
    // Add click sound to all buttons
    document.addEventListener('click', function(e) {
        if (e.target.matches('button, .nav-item, .game-card, .freebie-card, .stat-item')) {
            soundManager.play('click');
        }
    });
}

// Add sound to game functions
const originalPlaceBet = placeBet;
placeBet = function() {
    const result = originalPlaceBet();
    if (gameState.hasBet) {
        soundManager.play('bet');
    }
    return result;
};

const originalCashOut = cashOut;
cashOut = function() {
    const result = originalCashOut();
    if (result !== false) {
        soundManager.play('cashout');
    }
    return result;
};

const originalStartFlying = startFlying;
startFlying = function() {
    const result = originalStartFlying();
    // Start rocket sound
    currentRocketSound = soundManager.play('rocket');
    return result;
};

const originalCrashGame = crashGame;
crashGame = function() {
    // Stop rocket sound and play crash sound
    if (currentRocketSound && currentRocketSound.stop) {
        currentRocketSound.stop();
    }
    soundManager.play('crash');
    return originalCrashGame();
};

// Sound toggle function
function toggleSound() {
    const isEnabled = soundManager.toggle();
    const soundToggle = document.getElementById('soundToggle');
    const soundIcon = soundToggle.querySelector('.sound-icon');
    
    if (isEnabled) {
        soundIcon.textContent = '🔊';
        soundToggle.classList.remove('muted');
        soundManager.play('click');
    } else {
        soundIcon.textContent = '🔇';
        soundToggle.classList.add('muted');
    }
    
    // Save sound preference
    localStorage.setItem('soundEnabled', isEnabled);
}

// Load sound preference
function loadSoundPreference() {
    const savedSoundEnabled = localStorage.getItem('soundEnabled');
    if (savedSoundEnabled !== null) {
        const isEnabled = savedSoundEnabled === 'true';
        if (!isEnabled) {
            soundManager.enabled = false;
            const soundToggle = document.getElementById('soundToggle');
            const soundIcon = soundToggle.querySelector('.sound-icon');
            soundIcon.textContent = '🔇';
            soundToggle.classList.add('muted');
        }
    }
}