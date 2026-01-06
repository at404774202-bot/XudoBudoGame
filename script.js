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
    }
};

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

// Initialize subscription system
initializeSubscriptionSystem();

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
    }
};

// Subscription system state
let subscriptionState = {
    isSubscribed: false,
    isChecking: false,
    lastCheck: 0,
    checkInterval: null,
    checkFrequency: 2 * 60 * 1000, // 2 minutes
    requiredChannels: [
        {
            username: '@xudobudo_news',
            name: 'XudoBudo News',
            avatar: '📢',
            id: -1001234567890 // Replace with actual channel ID
        },
        {
            username: '@xudobudo_updates',
            name: 'Game Updates', 
            avatar: '🎮',
            id: -1001234567891 // Replace with actual channel ID
        }
    ],
    botToken: '7669637818:AAGWAFV_vZ2rm99yBWFGh3CwOCFzh6-8lUY',
    apiUrl: 'https://api.telegram.org/bot'
};

// Navigation
function showSection(sectionName) {
    // Check subscription before allowing navigation
    if (!subscriptionState.isSubscribed) {
        showSubscriptionModal();
        return;
    }
    
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

// Subscription System Functions
async function initializeSubscriptionSystem() {
    console.log('Initializing subscription system...');
    
    // Load channels from storage
    loadChannelsFromStorage();
    
    // Get user ID from Telegram
    const userId = getUserId();
    if (!userId) {
        console.log('No user ID available, using demo mode');
        showSubscriptionModal();
        return;
    }
    
    // Check subscription status on startup
    await checkSubscriptionStatus(userId);
    
    // Start periodic checking
    startPeriodicSubscriptionCheck(userId);
}

function getUserId() {
    // Try to get user ID from Telegram WebApp
    if (tg.initDataUnsafe?.user?.id) {
        return tg.initDataUnsafe.user.id;
    }
    
    // Fallback for testing - use a demo user ID
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('github.io')) {
        return 123456789; // Demo user ID for testing
    }
    
    return null;
}

async function checkSubscriptionStatus(userId) {
    if (subscriptionState.isChecking) {
        return subscriptionState.isSubscribed;
    }
    
    subscriptionState.isChecking = true;
    subscriptionState.lastCheck = Date.now();
    
    try {
        console.log('Checking subscription status for user:', userId);
        
        let allSubscribed = true;
        const channelStatuses = [];
        
        for (const channel of subscriptionState.requiredChannels) {
            const isSubscribed = await checkChannelSubscription(userId, channel.id);
            channelStatuses.push({
                channel: channel.username,
                subscribed: isSubscribed
            });
            
            if (!isSubscribed) {
                allSubscribed = false;
            }
        }
        
        console.log('Subscription check results:', channelStatuses);
        
        const wasSubscribed = subscriptionState.isSubscribed;
        subscriptionState.isSubscribed = allSubscribed;
        
        // Handle subscription status changes
        if (wasSubscribed && !allSubscribed) {
            // User unsubscribed - lock immediately
            handleUnsubscription();
        } else if (!wasSubscribed && allSubscribed) {
            // User subscribed - unlock functionality
            handleSuccessfulSubscription();
        } else if (!allSubscribed) {
            // Still not subscribed - show modal
            lockAppFunctionality();
        }
        
        updateSubscriptionUI(channelStatuses);
        updateSubscriptionIndicator();
        
    } catch (error) {
        console.error('Error checking subscription:', error);
        // On error, assume not subscribed for security
        subscriptionState.isSubscribed = false;
        lockAppFunctionality();
    } finally {
        subscriptionState.isChecking = false;
    }
    
    return subscriptionState.isSubscribed;
}

async function checkChannelSubscription(userId, channelId) {
    try {
        // For demo/testing purposes, simulate API call
        if (window.location.hostname === 'localhost' || window.location.hostname.includes('github.io')) {
            // Simulate random subscription status for demo
            return Math.random() > 0.3; // 70% chance of being subscribed for demo
        }
        
        const url = `${subscriptionState.apiUrl}${subscriptionState.botToken}/getChatMember`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: channelId,
                user_id: userId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(`API error: ${data.description}`);
        }
        
        const member = data.result;
        const subscribedStatuses = ['creator', 'administrator', 'member'];
        
        return subscribedStatuses.includes(member.status);
        
    } catch (error) {
        console.error(`Error checking subscription for channel ${channelId}:`, error);
        return false; // Assume not subscribed on error
    }
}

function startPeriodicSubscriptionCheck(userId) {
    // Clear existing interval
    if (subscriptionState.checkInterval) {
        clearInterval(subscriptionState.checkInterval);
    }
    
    // Start new interval
    subscriptionState.checkInterval = setInterval(async () => {
        await checkSubscriptionStatus(userId);
    }, subscriptionState.checkFrequency);
    
    console.log(`Started periodic subscription check every ${subscriptionState.checkFrequency / 1000} seconds`);
}

function handleUnsubscription() {
    console.log('User unsubscribed - locking app immediately');
    
    lockAppFunctionality();
    showNotification('❌ Обнаружена отписка! Подпишитесь для продолжения игры');
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
    }
}

function handleSuccessfulSubscription() {
    console.log('User successfully subscribed');
    
    // Unlock functionality
    unlockAppFunctionality();
    
    // Close subscription modal if open
    closeSubscriptionModal();
    
    showNotification('✅ Подписка подтверждена! Добро пожаловать в игру!');
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
}

function lockAppFunctionality() {
    console.log('Locking app functionality');
    
    // Add locked class to body
    document.body.classList.add('app-locked');
    
    // Show subscription modal
    showSubscriptionModal();
    
    // Disable all interactive elements
    const interactiveElements = document.querySelectorAll('button, .game-card, .nav-item, .freebie-card');
    interactiveElements.forEach(element => {
        if (!element.classList.contains('subscription-allowed')) {
            element.style.pointerEvents = 'none';
            element.style.opacity = '0.5';
        }
    });
}

function unlockAppFunctionality() {
    console.log('Unlocking app functionality');
    
    // Remove locked class
    document.body.classList.remove('app-locked');
    
    // Enable all interactive elements
    const interactiveElements = document.querySelectorAll('button, .game-card, .nav-item, .freebie-card');
    interactiveElements.forEach(element => {
        element.style.pointerEvents = '';
        element.style.opacity = '';
    });
}

// Top Up Functions
function openTopUpModal() {
    // Check subscription before allowing top up
    if (!subscriptionState.isSubscribed) {
        showSubscriptionModal();
        return;
    }
    
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
    if (amount < 1 || amount > 10000) {
        showNotification('Неверная сумма для покупки!');
        return;
    }
    
    // Use real Telegram Stars payment
    if (window.Telegram?.WebApp?.openInvoice) {
        // Create invoice for Telegram Stars payment
        const invoice = {
            title: 'Пополнение звезд',
            description: `Покупка ${amount} звезд`,
            payload: `stars_${amount}`,
            provider_token: '', // Empty for Telegram Stars
            currency: 'XTR',
            prices: [{
                label: `${amount} звезд`,
                amount: amount // 1 XTR = 1 star
            }]
        };
        
        // Open Telegram payment
        tg.openInvoice(invoice.payload, (status) => {
            if (status === 'paid') {
                processSuccessfulPayment(amount);
            } else if (status === 'cancelled') {
                showNotification('Платеж отменен');
            } else if (status === 'failed') {
                showNotification('Ошибка платежа');
            }
        });
    } else {
        // Fallback for testing
        simulatePayment(amount);
    }
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('heavy');
    }
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
    gameState.balance += amount;
    updateBalance();
    
    const currentBalanceEl = document.getElementById('currentBalance');
    if (currentBalanceEl) {
        currentBalanceEl.textContent = `${gameState.balance.toLocaleString()} ⭐`;
    }
    
    closeTopUpModal();
    showNotification(`✅ Успешно! Получено ${amount} ⭐`);
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
}

// Crash Game Functions
function openCrashGame() {
    // Check subscription before allowing game access
    if (!subscriptionState.isSubscribed) {
        showSubscriptionModal();
        return;
    }
    
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

function startNewRound() {
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
    
    updateBalance();
    updateGameDisplay();
    
    const cashoutBtn = document.getElementById('cashoutBtn');
    if (cashoutBtn) {
        cashoutBtn.disabled = true;
    }
    
    showNotification(`✅ Выиграл ${winAmount} ⭐! (${gameState.multiplier.toFixed(2)}x)`);
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
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

// Freebie functions
function claimDailyBonus() {
    // Check subscription before allowing bonus claim
    if (!subscriptionState.isSubscribed) {
        showSubscriptionModal();
        return;
    }
    
    gameState.balance += 200;
    updateBalance();
    showNotification('Получен ежедневный бонус: +200 ⭐!');
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
}

function inviteFriend() {
    // Check subscription before allowing invite
    if (!subscriptionState.isSubscribed) {
        showSubscriptionModal();
        return;
    }
    
    if (tg.openTelegramLink) {
        tg.openTelegramLink('https://t.me/share/url?url=Присоединяйся к XudoBudoGame!');
    } else {
        if (navigator.share) {
            navigator.share({
                title: 'XudoBudoGame',
                text: 'Присоединяйся к XudoBudoGame!',
                url: window.location.href
            });
        }
    }
    showNotification('Ссылка для приглашения готова!');
}

function watchAd() {
    // Check subscription before allowing ad watch
    if (!subscriptionState.isSubscribed) {
        showSubscriptionModal();
        return;
    }
    
    setTimeout(() => {
        gameState.balance += 100;
        updateBalance();
        showNotification('Получена награда за просмотр: +100 ⭐!');
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    }, 2000);
    
    showNotification('Просмотр рекламы...');
}

// Promo Code Functions
function openPromoModal() {
    // Check subscription before allowing promo codes
    if (!subscriptionState.isSubscribed) {
        showSubscriptionModal();
        return;
    }
    
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

// Subscription Functions
function checkSubscriptions() {
    showSubscriptionModal();
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

function showSubscriptionModal() {
    document.getElementById('subscriptionModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Load channels list with current status
    loadChannelsList();
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

function closeSubscriptionModal() {
    // Only allow closing if subscribed
    if (subscriptionState.isSubscribed) {
        document.getElementById('subscriptionModal').classList.remove('active');
        document.body.style.overflow = 'auto';
    } else {
        showNotification('Подпишитесь на каналы для продолжения!');
    }
}

function loadChannelsList() {
    const channelsList = document.getElementById('channelsList');
    if (!channelsList) return;
    
    channelsList.innerHTML = '';
    
    subscriptionState.requiredChannels.forEach(channel => {
        const channelItem = document.createElement('div');
        channelItem.className = 'channel-item';
        channelItem.innerHTML = `
            <div class="channel-info">
                <div class="channel-avatar">${channel.avatar}</div>
                <div class="channel-details">
                    <div class="channel-name">${channel.name}</div>
                    <div class="channel-username">${channel.username}</div>
                </div>
            </div>
            <div class="channel-action">
                <button class="subscribe-channel-btn subscription-allowed" onclick="subscribeToChannel('${channel.username}')">
                    Подписаться
                </button>
                <div class="channel-status checking" id="status-${channel.username}">Проверка...</div>
            </div>
        `;
        channelsList.appendChild(channelItem);
    });
}

function subscribeToChannel(username) {
    const cleanUsername = username.replace('@', '');
    
    if (tg.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/${cleanUsername}`);
    } else {
        window.open(`https://t.me/${cleanUsername}`, '_blank');
    }
    
    showNotification(`Переход к каналу ${username}`);
    
    // Auto-recheck after a short delay
    setTimeout(() => {
        const userId = getUserId();
        if (userId) {
            checkSubscriptionStatus(userId);
        }
    }, 3000);
}

function recheckSubscriptions() {
    const userId = getUserId();
    if (!userId) {
        showNotification('Ошибка: не удается получить ID пользователя');
        return;
    }
    
    showNotification('Проверка подписок...');
    
    // Update UI to show checking status
    const statusElements = document.querySelectorAll('.channel-status');
    statusElements.forEach(status => {
        status.textContent = 'Проверка...';
        status.className = 'channel-status checking';
    });
    
    checkSubscriptionStatus(userId);
}

function updateSubscriptionUI(channelStatuses) {
    channelStatuses.forEach(status => {
        const statusEl = document.getElementById(`status-${status.channel}`);
        if (statusEl) {
            if (status.subscribed) {
                statusEl.textContent = 'Подписан';
                statusEl.className = 'channel-status subscribed';
            } else {
                statusEl.textContent = 'Не подписан';
                statusEl.className = 'channel-status not-subscribed';
            }
        }
    });
    
    // Update subscription status text
    const statusEl = document.getElementById('subscriptionStatus');
    if (statusEl) {
        if (subscriptionState.isSubscribed) {
            statusEl.textContent = 'Все подписки активны!';
            statusEl.style.color = 'var(--game-success)';
        } else {
            statusEl.textContent = 'Требуется подписка на все каналы';
            statusEl.style.color = 'var(--game-danger)';
        }
    }
}

// Update subscription status indicator
function updateSubscriptionIndicator() {
    const indicator = document.getElementById('subscriptionIndicator');
    if (!indicator) return;
    
    if (subscriptionState.isSubscribed) {
        indicator.textContent = '✅ Подписан';
        indicator.className = 'subscription-status-indicator subscribed';
    } else {
        indicator.textContent = '❌ Не подписан';
        indicator.className = 'subscription-status-indicator not-subscribed';
    }
}

// Admin System Functions (for bot commands)
function loadChannelsFromStorage() {
    try {
        const saved = localStorage.getItem('adminChannels');
        if (saved) {
            const channels = JSON.parse(saved);
            if (Array.isArray(channels) && channels.length > 0) {
                subscriptionState.requiredChannels = channels;
                console.log('Channels loaded from localStorage:', channels);
            }
        }
    } catch (error) {
        console.error('Error loading channels:', error);
    }
}

function saveChannelsToStorage() {
    try {
        localStorage.setItem('adminChannels', JSON.stringify(subscriptionState.requiredChannels));
        console.log('Channels saved to localStorage');
    } catch (error) {
        console.error('Error saving channels:', error);
    }
}

// Function to add channel via bot command
async function addChannelViaBot(username, name, avatar = '📢') {
    try {
        // Validate username format
        if (!username.startsWith('@')) {
            return { success: false, message: 'Username должен начинаться с @' };
        }
        
        // Check if channel already exists
        const exists = subscriptionState.requiredChannels.find(ch => ch.username === username);
        if (exists) {
            return { success: false, message: 'Канал уже добавлен в список' };
        }
        
        // Get channel ID from Telegram API
        const channelId = await getChannelIdByUsername(username);
        if (!channelId) {
            return { success: false, message: 'Не удалось получить ID канала. Проверьте username и права бота.' };
        }
        
        // Add channel to list
        const newChannel = {
            username: username,
            name: name,
            avatar: avatar,
            id: channelId
        };
        
        subscriptionState.requiredChannels.push(newChannel);
        saveChannelsToStorage();
        
        return { success: true, message: `Канал ${username} успешно добавлен!` };
        
    } catch (error) {
        console.error('Error adding channel:', error);
        return { success: false, message: 'Ошибка при добавлении канала' };
    }
}

// Function to remove channel via bot command
function removeChannelViaBot(username) {
    try {
        const index = subscriptionState.requiredChannels.findIndex(ch => ch.username === username);
        
        if (index === -1) {
            return { success: false, message: 'Канал не найден в списке' };
        }
        
        const removedChannel = subscriptionState.requiredChannels[index];
        subscriptionState.requiredChannels.splice(index, 1);
        saveChannelsToStorage();
        
        return { success: true, message: `Канал ${removedChannel.username} удален из списка` };
        
    } catch (error) {
        console.error('Error removing channel:', error);
        return { success: false, message: 'Ошибка при удалении канала' };
    }
}

// Function to list all channels via bot command
function listChannelsViaBot() {
    try {
        if (subscriptionState.requiredChannels.length === 0) {
            return { success: true, message: 'Список обязательных каналов пуст' };
        }
        
        let message = '📋 Обязательные каналы:\n\n';
        subscriptionState.requiredChannels.forEach((channel, index) => {
            message += `${index + 1}. ${channel.avatar} ${channel.name}\n`;
            message += `   Username: ${channel.username}\n`;
            message += `   ID: ${channel.id}\n\n`;
        });
        
        return { success: true, message: message };
        
    } catch (error) {
        console.error('Error listing channels:', error);
        return { success: false, message: 'Ошибка при получении списка каналов' };
    }
}

async function getChannelIdByUsername(username) {
    try {
        // Remove @ from username
        const cleanUsername = username.replace('@', '');
        
        // For demo purposes, generate a fake ID
        if (window.location.hostname === 'localhost' || window.location.hostname.includes('github.io')) {
            return -1001000000000 - Math.floor(Math.random() * 1000000);
        }
        
        // In production, use getChat API method
        const url = `${subscriptionState.apiUrl}${subscriptionState.botToken}/getChat`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: `@${cleanUsername}`
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.ok) {
            return data.result.id;
        } else {
            console.error('API error:', data.description);
            return null;
        }
        
    } catch (error) {
        console.error('Error getting channel ID:', error);
        return null;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    updateBalance();
    updateHistoryDisplay();
    
    const claimBtn = document.querySelector('.claim-btn');
    if (claimBtn) {
        claimBtn.addEventListener('click', claimDailyBonus);
    }
    
    const inviteBtn = document.querySelector('.invite-btn');
    if (inviteBtn) {
        inviteBtn.addEventListener('click', inviteFriend);
    }
    
    const watchBtn = document.querySelector('.watch-btn');
    if (watchBtn) {
        watchBtn.addEventListener('click', watchAd);
    }
    
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