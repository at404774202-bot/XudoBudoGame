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
        // Fallback for local testing
        if (navigator.share) {
            navigator.share({
                title: 'XudoBudoGame',
                text: 'Присоединяйся к XudoBudoGame!',
                url: window.location.href
            });
        } else {
            // Copy to clipboard
            navigator.clipboard.writeText('Присоединяйся к XudoBudoGame! ' + window.location.href);
        }
    }
};

// Apply Telegram theme
function applyTelegramTheme() {
    if (tg.themeParams) {
        const root = document.documentElement;
        const theme = tg.themeParams;
        
        // Apply theme colors to CSS variables
        if (theme.bg_color) root.style.setProperty('--tg-theme-bg-color', theme.bg_color);
        if (theme.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);
        if (theme.text_color) root.style.setProperty('--tg-theme-text-color', theme.text_color);
        if (theme.hint_color) root.style.setProperty('--tg-theme-hint-color', theme.hint_color);
        if (theme.link_color) root.style.setProperty('--tg-theme-link-color', theme.link_color);
        if (theme.button_color) root.style.setProperty('--tg-theme-button-color', theme.button_color);
        if (theme.button_text_color) root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color);
        if (theme.accent_text_color) root.style.setProperty('--tg-theme-accent-text-color', theme.accent_text_color);
        if (theme.section_bg_color) root.style.setProperty('--tg-theme-section-bg-color', theme.section_bg_color);
        if (theme.section_header_text_color) root.style.setProperty('--tg-theme-section-header-text-color', theme.section_header_text_color);
        if (theme.subtitle_text_color) root.style.setProperty('--tg-theme-subtitle-text-color', theme.subtitle_text_color);
        if (theme.destructive_text_color) root.style.setProperty('--tg-theme-destructive-text-color', theme.destructive_text_color);
        if (theme.header_bg_color) root.style.setProperty('--tg-theme-header-bg-color', theme.header_bg_color);
    }
    
    // Set header and background colors
    if (tg.setHeaderColor) {
        tg.setHeaderColor('bg_color');
    }
    if (tg.setBackgroundColor) {
        tg.setBackgroundColor('bg_color');
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
    isPlaying: false,
    hasBet: false,
    multiplier: 1.00,
    crashPoint: 0,
    gamePhase: 'waiting', // waiting, betting, flying, crashed
    gameInterval: null,
    gameStartTime: 0, // Время начала полета
    canvas: null,
    ctx: null,
    rocketPosition: { x: 20, y: 180 },
    curve: [],
    gameHistory: [5.67, 2.45, 1.23, 8.91, 1.05],
    players: [],
    realPlayers: [
        'CryptoKing', 'LuckyPlayer', 'StarHunter', 'GameMaster', 'WinnerX',
        'RocketMan', 'CrashPro', 'BetLord', 'FortuneSeeker', 'AceGamer',
        'DiamondHands', 'MoonShot', 'BigWinner', 'RiskTaker', 'Champion'
    ],
    stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalWinnings: 0
    },
    lastDailyBonus: null,
    rocketSpeed: 1,
    gameStartTime: 0
};

// Admin and subscription system
let adminConfig = {
    adminPassword: '123123xudobudo',
    requiredChannels: [
        // Будут загружены из админ-панели
    ],
    promoCodes: {
        // Будут загружены из админ-панели
        'WELCOME': { reward: 500, used: false, description: 'Приветственный бонус' },
        'BONUS100': { reward: 100, used: false, description: 'Бонус 100 монет' },
        'LUCKY': { reward: 1000, used: false, description: 'Удачный промокод' }
    },
    userSubscriptions: {},
    activatedPromos: []
};

// Promo Code Functions
function openPromoModal() {
    document.getElementById('promoModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    updatePromoHistory();
    
    // Haptic feedback
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
    const promoCode = promoInput.value.trim().toUpperCase();
    
    if (!promoCode) {
        showNotification('Введите промокод!');
        return;
    }
    
    // Check if promo code exists
    if (!adminConfig.promoCodes[promoCode]) {
        showNotification('Промокод не найден!');
        promoInput.value = '';
        return;
    }
    
    // Check if already used
    if (adminConfig.activatedPromos.includes(promoCode)) {
        showNotification('Промокод уже использован!');
        promoInput.value = '';
        return;
    }
    
    // Activate promo code
    const promo = adminConfig.promoCodes[promoCode];
    gameState.balance += promo.reward;
    adminConfig.activatedPromos.push(promoCode);
    
    // Update displays
    updateBalance();
    updatePromoHistory();
    
    // Clear input
    promoInput.value = '';
    
    // Show success
    showNotification(`✅ Промокод активирован! Получено ${promo.reward} 💎`);
    
    // Save to localStorage
    localStorage.setItem('xudobudo_activated_promos', JSON.stringify(adminConfig.activatedPromos));
    
    // Haptic feedback
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
}

function updatePromoHistory() {
    const container = document.getElementById('activatedPromos');
    
    if (adminConfig.activatedPromos.length === 0) {
        container.innerHTML = '<div class="no-promos">Промокоды еще не активированы</div>';
        return;
    }
    
    container.innerHTML = '';
    adminConfig.activatedPromos.forEach(promoCode => {
        const promo = adminConfig.promoCodes[promoCode];
        if (promo) {
            const promoItem = document.createElement('div');
            promoItem.className = 'promo-item';
            promoItem.innerHTML = `
                <span class="promo-code">${promoCode}</span>
                <span class="promo-reward">+${promo.reward} 💎</span>
            `;
            container.appendChild(promoItem);
        }
    });
}

// Subscription Functions
function checkSubscriptions() {
    // Check if user needs to subscribe
    if (adminConfig.requiredChannels.length === 0) {
        showNotification('Каналы для подписки не настроены');
        return;
    }
    
    openSubscriptionModal();
}

function openSubscriptionModal() {
    document.getElementById('subscriptionModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    loadRequiredChannels();
    
    // Haptic feedback
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

function closeSubscriptionModal() {
    document.getElementById('subscriptionModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function loadRequiredChannels() {
    const channelsList = document.getElementById('channelsList');
    
    if (adminConfig.requiredChannels.length === 0) {
        channelsList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--tg-theme-hint-color);">
                Каналы для подписки не настроены администратором
            </div>
        `;
        return;
    }
    
    channelsList.innerHTML = '';
    adminConfig.requiredChannels.forEach(channel => {
        const channelItem = document.createElement('div');
        channelItem.className = 'channel-item';
        
        const isSubscribed = adminConfig.userSubscriptions[channel.username] || false;
        
        channelItem.innerHTML = `
            <div class="channel-info">
                <div class="channel-avatar">${channel.avatar || '📢'}</div>
                <div class="channel-details">
                    <div class="channel-name">${channel.name}</div>
                    <div class="channel-username">@${channel.username}</div>
                </div>
            </div>
            <div class="channel-action">
                ${isSubscribed ? 
                    '<span class="channel-status subscribed">✅ Подписан</span>' :
                    `<button class="subscribe-channel-btn" onclick="subscribeToChannel('${channel.username}', '${channel.link}')">Подписаться</button>`
                }
            </div>
        `;
        
        channelsList.appendChild(channelItem);
    });
}

function subscribeToChannel(username, link) {
    // Open channel in Telegram
    if (tg.openTelegramLink) {
        tg.openTelegramLink(link);
    } else {
        // Fallback for testing
        window.open(link, '_blank');
    }
    
    showNotification('Перейдите в канал и подпишитесь, затем нажмите "Проверить подписки"');
}

function recheckSubscriptions() {
    document.getElementById('subscriptionStatus').textContent = 'Проверяем подписки...';
    
    // Simulate subscription check (in real app, this would be done via bot API)
    setTimeout(() => {
        // For demo, randomly mark some as subscribed
        let allSubscribed = true;
        adminConfig.requiredChannels.forEach(channel => {
            // Simulate random subscription status for demo
            const isSubscribed = Math.random() > 0.3; // 70% chance of being subscribed
            adminConfig.userSubscriptions[channel.username] = isSubscribed;
            if (!isSubscribed) allSubscribed = false;
        });
        
        if (allSubscribed && adminConfig.requiredChannels.length > 0) {
            // Give reward
            gameState.balance += 1000;
            updateBalance();
            
            document.getElementById('subscriptionStatus').textContent = '✅ Все подписки активны!';
            showNotification('🎉 Получена награда за подписки: 1000 💎!');
            
            // Close modal after delay
            setTimeout(() => {
                closeSubscriptionModal();
            }, 2000);
            
            // Haptic feedback
            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        } else {
            document.getElementById('subscriptionStatus').textContent = '❌ Подпишитесь на все каналы';
            loadRequiredChannels(); // Refresh the list
        }
        
        // Save subscription status
        localStorage.setItem('xudobudo_subscriptions', JSON.stringify(adminConfig.userSubscriptions));
    }, 2000);
}

// Load saved data on startup
function loadUserData() {
    // Load activated promo codes
    const savedPromos = localStorage.getItem('xudobudo_activated_promos');
    if (savedPromos) {
        try {
            adminConfig.activatedPromos = JSON.parse(savedPromos);
        } catch (e) {
            adminConfig.activatedPromos = [];
        }
    }
    
    // Load subscription status
    const savedSubs = localStorage.getItem('xudobudo_subscriptions');
    if (savedSubs) {
        try {
            adminConfig.userSubscriptions = JSON.parse(savedSubs);
        } catch (e) {
            adminConfig.userSubscriptions = {};
        }
    }
    
    // Load admin config from server (in real app)
    loadAdminConfig();
}

function loadAdminConfig() {
    // In a real app, this would load from your backend
    // For demo, we'll use default channels
    adminConfig.requiredChannels = [
        {
            name: 'XudoBudo News',
            username: 'xudobudo_news',
            link: 'https://t.me/xudobudo_news',
            avatar: '📰'
        },
        {
            name: 'XudoBudo Games',
            username: 'xudobudo_games', 
            link: 'https://t.me/xudobudo_games',
            avatar: '🎮'
        }
    ];
}
function openTopUpModal() {
    document.getElementById('topUpModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Update current balance display
    document.getElementById('currentBalance').textContent = `${gameState.balance.toLocaleString()} 💎`;
    
    // Haptic feedback
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

function closeTopUpModal() {
    document.getElementById('topUpModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function purchaseStars(amount) {
    // Validate amount
    if (amount < 1 || amount > 10000) {
        showNotification('Неверная сумма для покупки!');
        return;
    }
    
    // Create invoice for Telegram Stars
    const invoice = {
        title: `${amount} звезд`,
        description: `Пополнение баланса на ${amount} монет`,
        payload: `stars_${amount}_${Date.now()}`,
        provider_token: '', // Empty for Telegram Stars
        currency: 'XTR',
        prices: [{
            label: `${amount} звезд`,
            amount: amount // 1 XTR = 1 Star
        }]
    };
    
    // Use Telegram Web App payment
    if (tg.openInvoice) {
        // Generate invoice link (this would normally be done on your backend)
        const invoiceLink = generateInvoiceLink(invoice);
        tg.openInvoice(invoiceLink, (status) => {
            if (status === 'paid') {
                processSuccessfulPayment(amount);
            } else if (status === 'cancelled') {
                showNotification('Платеж отменен');
            } else if (status === 'failed') {
                showNotification('Ошибка платежа. Попробуйте еще раз.');
            }
        });
    } else {
        // Fallback for testing - simulate successful payment
        simulatePayment(amount);
    }
    
    // Haptic feedback
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

function generateInvoiceLink(invoice) {
    // In a real app, this would be done on your backend
    // For now, we'll simulate the invoice creation
    const botToken = '8553184364:AAFJbKdlGBeQgpYXw51SoqcfGJ-ezDMt6Oc';
    const params = new URLSearchParams({
        title: invoice.title,
        description: invoice.description,
        payload: invoice.payload,
        provider_token: invoice.provider_token,
        currency: invoice.currency,
        prices: JSON.stringify(invoice.prices)
    });
    
    // This is a simplified example - in production you'd call your backend
    return `https://api.telegram.org/bot${botToken}/createInvoiceLink?${params}`;
}

function simulatePayment(amount) {
    // Show loading
    showNotification('Обработка платежа...');
    
    // Simulate payment processing
    setTimeout(() => {
        processSuccessfulPayment(amount);
    }, 2000);
}

function processSuccessfulPayment(amount) {
    // Add coins to balance (1:1 ratio)
    gameState.balance += amount;
    
    // Update displays
    updateBalance();
    document.getElementById('currentBalance').textContent = `${gameState.balance.toLocaleString()} 💎`;
    
    // Сохраняем прогресс
    saveGameProgress();
    
    // Close modal
    closeTopUpModal();
    
    // Show success notification
    showNotification(`✅ Успешно! Получено ${amount} 💎`);
    
    // Success haptic feedback
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
    
    // Optional: Send success event to backend for verification
    // sendPaymentVerification(amount, paymentId);
}

function sendPaymentVerification(amount, paymentId) {
    // In a real app, verify the payment on your backend
    fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId: tg.initDataUnsafe?.user?.id,
            amount: amount,
            paymentId: paymentId,
            timestamp: Date.now()
        })
    }).then(response => response.json())
      .then(data => {
          if (!data.success) {
              // Rollback if verification failed
              gameState.balance -= amount;
              updateBalance();
              showNotification('Ошибка верификации платежа');
          }
      }).catch(error => {
          console.error('Payment verification error:', error);
      });
}
// Generate realistic players for the round
function generateRoundPlayers() {
    gameState.players = [];
    const playerCount = Math.floor(Math.random() * 8) + 3; // 3-10 players
    
    // Get user info from Telegram
    const currentUser = tg.initDataUnsafe?.user;
    const currentUserName = currentUser ? 
        (currentUser.username || currentUser.first_name || 'Player') : 'Player';
    
    // Add current user if they have a bet
    if (gameState.hasBet) {
        gameState.players.push({
            name: currentUserName,
            bet: gameState.currentBet,
            status: 'waiting',
            cashout: null,
            isCurrentUser: true
        });
    }
    
    // Add random players
    const usedNames = [currentUserName];
    for (let i = 0; i < playerCount - (gameState.hasBet ? 1 : 0); i++) {
        let playerName;
        do {
            playerName = gameState.realPlayers[Math.floor(Math.random() * gameState.realPlayers.length)];
        } while (usedNames.includes(playerName));
        
        usedNames.push(playerName);
        
        const bet = Math.floor(Math.random() * 500) + 10; // 10-510 stars
        gameState.players.push({
            name: playerName,
            bet: bet,
            status: 'waiting',
            cashout: null,
            isCurrentUser: false
        });
    }
    
    updatePlayersDisplay();
}

// Improved crash point generation with house edge
function generateCrashPoint() {
    // House edge: ~3% (97% RTP)
    const houseEdge = 0.03;
    const random = Math.random();
    
    // Adjust probability for house edge
    const adjustedRandom = random * (1 - houseEdge);
    
    if (adjustedRandom < 0.4) {
        // 40% chance: 1.01x - 2.00x (low multipliers)
        return 1.01 + Math.random() * 0.99;
    } else if (adjustedRandom < 0.7) {
        // 30% chance: 2.00x - 5.00x (medium multipliers)
        return 2.00 + Math.random() * 3.00;
    } else if (adjustedRandom < 0.9) {
        // 20% chance: 5.00x - 20.00x (high multipliers)
        return 5.00 + Math.random() * 15.00;
    } else {
        // 7% chance: 20.00x - 100.00x (very high multipliers)
        return 20.00 + Math.random() * 80.00;
    }
}

// Simulate other players cashing out
function simulatePlayerCashouts() {
    gameState.players.forEach(player => {
        if (player.status === 'waiting' && !player.isCurrentUser) {
            // Each player has a chance to cash out based on current multiplier
            const cashoutChance = Math.min(0.15 + (gameState.multiplier - 1) * 0.1, 0.8);
            
            if (Math.random() < cashoutChance) {
                player.status = 'cashed';
                player.cashout = gameState.multiplier;
            }
        }
    });
    
    updatePlayersDisplay();
}

function updatePlayersDisplay() {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;
    
    playersList.innerHTML = '';
    
    gameState.players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        if (player.isCurrentUser) {
            playerItem.classList.add('current-user');
        }
        
        let statusClass = 'waiting';
        let statusText = 'Ждет';
        
        if (player.status === 'cashed') {
            statusClass = 'cashed';
            statusText = `${player.cashout.toFixed(2)}x`;
        } else if (player.status === 'crashed') {
            statusClass = 'crashed';
            statusText = 'Краш';
        }
        
        playerItem.innerHTML = `
            <span class="player-name">${player.name}</span>
            <span class="player-bet">${player.bet} ⭐</span>
            <span class="player-status ${statusClass}">${statusText}</span>
        `;
        
        playersList.appendChild(playerItem);
    });
}

function openCrashGame() {
    document.getElementById('crashGameModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Initialize canvas
    initializeCanvas();
    updateGameDisplay();
    
    // Start game cycle
    if (gameState.gamePhase === 'waiting') {
        startNewRound();
    }
    
    // Haptic feedback
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

function closeCrashGame() {
    document.getElementById('crashGameModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Stop game if playing
    if (gameState.gameInterval) {
        clearInterval(gameState.gameInterval);
        gameState.gameInterval = null;
    }
}

function initializeCanvas() {
    gameState.canvas = document.getElementById('gameCanvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    
    // Set canvas size
    const rect = gameState.canvas.getBoundingClientRect();
    gameState.canvas.width = rect.width * window.devicePixelRatio;
    gameState.canvas.height = rect.height * window.devicePixelRatio;
    gameState.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    drawChart();
}

function drawChart() {
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    
    // Очищаем canvas
    ctx.clearRect(0, 0, width, height);
    
    // Рисуем сетку с более тонкими линиями
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.5;
    
    // Вертикальные линии
    for (let i = 0; i <= 10; i++) {
        const x = (width / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // Горизонтальные линии
    for (let i = 0; i <= 8; i++) {
        const y = (height / 8) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Рисуем кривую полета с градиентом
    if (gameState.curve.length > 1) {
        // Создаем градиент для линии
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#6ab3f3');
        gradient.addColorStop(0.5, '#5288c1');
        gradient.addColorStop(1, '#ffd700');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Рисуем основную линию
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
        
        // Добавляем свечение для эффекта
        ctx.shadowColor = '#6ab3f3';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Заливка под кривой с прозрачным градиентом
        if (gameState.curve.length > 2) {
            const fillGradient = ctx.createLinearGradient(0, height, 0, 0);
            fillGradient.addColorStop(0, 'rgba(106, 179, 243, 0.1)');
            fillGradient.addColorStop(1, 'rgba(255, 215, 0, 0.05)');
            
            ctx.fillStyle = fillGradient;
            ctx.beginPath();
            ctx.moveTo(gameState.curve[0].x, height);
            
            for (let i = 0; i < gameState.curve.length; i++) {
                const point = gameState.curve[i];
                ctx.lineTo(point.x, point.y);
            }
            
            ctx.lineTo(gameState.curve[gameState.curve.length - 1].x, height);
            ctx.closePath();
            ctx.fill();
        }
    }
}

function generateCrashPoint() {
    // Более реалистичная генерация краш-поинтов как в настоящих crash играх
    // Используем алгоритм с house edge ~4%
    const rand = Math.random();
    
    // 50% шанс на низкие множители (1.01x - 2.00x)
    if (rand < 0.5) {
        return parseFloat((1.01 + Math.random() * 0.99).toFixed(2));
    }
    // 30% шанс на средние множители (2.00x - 5.00x)  
    else if (rand < 0.8) {
        return parseFloat((2.00 + Math.random() * 3.00).toFixed(2));
    }
    // 15% шанс на высокие множители (5.00x - 20.00x)
    else if (rand < 0.95) {
        return parseFloat((5.00 + Math.random() * 15.00).toFixed(2));
    }
    // 5% шанс на очень высокие множители (20.00x - 100.00x)
    else {
        return parseFloat((20.00 + Math.random() * 80.00).toFixed(2));
    }
}

function startNewRound() {
    gameState.gamePhase = 'betting';
    gameState.multiplier = 1.00;
    gameState.curve = [];
    gameState.rocketPosition = { x: 20, y: 180 };
    gameState.rocketSpeed = 1;
    gameState.gameStartTime = Date.now();
    
    // Generate crash point with house edge
    gameState.crashPoint = generateCrashPoint();
    
    // Generate realistic players
    generateRoundPlayers();
    
    updateGameDisplay();
    
    // Betting phase (5 seconds)
    let countdown = 5;
    document.getElementById('gameStatus').textContent = `Ставки: ${countdown}с`;
    
    const countdownInterval = setInterval(() => {
        countdown--;
        document.getElementById('gameStatus').textContent = `Ставки: ${countdown}с`;
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            startFlying();
        }
    }, 1000);
}

function startFlying() {
    gameState.gamePhase = 'flying';
    gameState.multiplier = 1.00;
    gameState.gameStartTime = Date.now(); // Добавляем время начала
    document.getElementById('gameStatus').textContent = 'Летит...';
    
    // Disable betting
    document.getElementById('betBtn').disabled = true;
    
    // Enable cashout if player has bet
    if (gameState.hasBet) {
        document.getElementById('cashoutBtn').disabled = false;
    }
    
    // Start rocket animation
    const rocket = document.getElementById('rocketPlane');
    rocket.classList.add('flying');
    
    // Start game loop
    gameState.gameInterval = setInterval(() => {
        updateMultiplier();
        updateRocketPosition();
        drawChart();
        updateGameDisplay();
        
        // Симулируем действия других игроков
        simulatePlayerCashouts();
        
        // Check for crash
        if (gameState.multiplier >= gameState.crashPoint) {
            crashGame();
        }
        
        // Check for auto cashout
        if (gameState.hasBet && gameState.autoCashout > 0 && gameState.multiplier >= gameState.autoCashout) {
            cashOut();
        }
    }, 100);
}

function updateMultiplier() {
    // Более реалистичная механика роста множителя как в настоящих crash играх
    const timeElapsed = Date.now() - gameState.gameStartTime;
    const secondsElapsed = timeElapsed / 1000;
    
    // Базовая скорость роста с ускорением
    let baseGrowth = 0.008; // Начальная скорость
    let accelerationFactor = 1 + (secondsElapsed * 0.15); // Ускорение со временем
    
    // Добавляем случайность для реалистичности
    let randomFactor = 0.85 + Math.random() * 0.3; // ±15% случайности
    
    // Рассчитываем прирост
    let increment = baseGrowth * accelerationFactor * randomFactor;
    
    // Ограничиваем максимальный прирост за тик
    increment = Math.min(increment, 0.05);
    
    // Обновляем множитель
    gameState.multiplier += increment;
    
    // Ограничиваем точкой краша
    gameState.multiplier = Math.min(gameState.multiplier, gameState.crashPoint);
    
    // Добавляем эффект "турбулентности" на высоких множителях
    if (gameState.multiplier > 5) {
        const turbulence = (Math.random() - 0.5) * 0.02;
        gameState.multiplier += turbulence;
    }
}

function updateRocketPosition() {
    const canvas = gameState.canvas;
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    
    // Более плавное движение ракеты по кривой
    const timeElapsed = (Date.now() - gameState.gameStartTime) / 1000;
    const progress = Math.min(timeElapsed / 10, 1); // 10 секунд на полный экран
    
    // Экспоненциальная кривая для реалистичного движения
    const x = 20 + progress * (width - 60);
    const multiplierHeight = (gameState.multiplier - 1) * 12; // Высота зависит от множителя
    const y = height - 20 - multiplierHeight;
    
    gameState.rocketPosition = { x, y: Math.max(y, 20) };
    
    // Добавляем точку к кривой с сглаживанием
    const smoothY = Math.max(y, 20);
    gameState.curve.push({ x, y: smoothY });
    
    // Ограничиваем количество точек для производительности
    if (gameState.curve.length > 150) {
        gameState.curve.shift();
    }
    
    // Обновляем визуальную позицию ракеты с плавной анимацией
    const rocket = document.getElementById('rocketPlane');
    if (rocket) {
        rocket.style.left = `${x - 20}px`;
        rocket.style.bottom = `${height - smoothY - 20}px`;
        
        // Добавляем поворот ракеты в зависимости от скорости роста
        const rotationAngle = Math.min((gameState.multiplier - 1) * 2, 15);
        rocket.style.transform = `rotate(${rotationAngle}deg) scale(${1 + (gameState.multiplier - 1) * 0.1})`;
    }
}

function placeBet() {
    if (gameState.gamePhase !== 'betting') {
        showNotification('Ставки закрыты!');
        return;
    }
    
    const betAmount = parseInt(document.getElementById('betAmount').value);
    const autoCashout = parseFloat(document.getElementById('autoCashout').value);
    
    if (betAmount < 10 || betAmount > gameState.balance) {
        showNotification('Неверная сумма ставки!');
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
    
    showNotification(`Ставка ${betAmount} 💎 принята!`);
    
    // Haptic feedback
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
    
    // Обновляем статистику
    gameState.stats.gamesPlayed++;
    gameState.stats.gamesWon++;
    gameState.stats.totalWinnings += winAmount - gameState.currentBet;
    gameState.stats.bestMultiplier = Math.max(gameState.stats.bestMultiplier || 0, gameState.multiplier);
    
    // Обновляем статус игрока в списке
    const playerIndex = gameState.players.findIndex(p => p.name === 'Вы');
    if (playerIndex !== -1) {
        gameState.players[playerIndex].status = 'cashed';
        gameState.players[playerIndex].cashout = gameState.multiplier.toFixed(2);
    }
    
    updateBalance();
    updateGameDisplay();
    updatePlayersDisplay();
    
    // Отключаем кнопку кэшаута
    document.getElementById('cashoutBtn').disabled = true;
    
    showNotification(`✅ Выиграл ${winAmount} 💎! (${gameState.multiplier.toFixed(2)}x)`);
    
    // Haptic feedback
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
}

function crashGame() {
    gameState.gamePhase = 'crashed';
    
    // Останавливаем игровой цикл
    if (gameState.gameInterval) {
        clearInterval(gameState.gameInterval);
        gameState.gameInterval = null;
    }
    
    // Останавливаем анимацию ракеты
    const rocket = document.getElementById('rocketPlane');
    rocket.classList.remove('flying');
    
    // Добавляем эффект взрыва
    rocket.style.filter = 'brightness(2) saturate(0) blur(2px)';
    setTimeout(() => {
        rocket.style.filter = 'brightness(1.2) drop-shadow(0 0 8px rgba(106, 179, 243, 0.5))';
    }, 500);
    
    document.getElementById('gameStatus').textContent = `💥 Краш на ${gameState.crashPoint.toFixed(2)}x!`;
    
    // Обновляем статистику
    gameState.stats.gamesPlayed++;
    
    // Если игрок не успел забрать
    if (gameState.hasBet) {
        gameState.hasBet = false;
        showNotification(`💸 Проиграл ${gameState.currentBet} 💎! Краш на ${gameState.crashPoint.toFixed(2)}x`);
        
        // Haptic feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    }
    
    // Добавляем в историю
    addToHistory(gameState.crashPoint);
    
    // Обновляем отображение игроков (показываем кто проиграл)
    updatePlayersAfterCrash();
    
    updateGameDisplay();
    
    // Запускаем новый раунд через 3 секунды
    setTimeout(() => {
        if (document.getElementById('crashGameModal').classList.contains('active')) {
            startNewRound();
        }
    }, 3000);
}

function updatePlayersAfterCrash() {
    // Обновляем статус игроков после краша
    gameState.players.forEach(player => {
        if (player.status === 'waiting') {
            player.status = 'crashed';
            player.cashout = null;
        }
    });
    
    updatePlayersDisplay();
}

function generateRoundPlayers() {
    // Генерируем от 3 до 8 игроков в раунде
    const playerCount = 3 + Math.floor(Math.random() * 6);
    gameState.players = [];
    
    // Перемешиваем список имен
    const shuffledNames = [...gameState.realPlayers].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < playerCount; i++) {
        const player = {
            name: shuffledNames[i] || `Player${i + 1}`,
            bet: generateRealisticBet(),
            status: 'waiting',
            cashout: null,
            autoCashout: 1.5 + Math.random() * 8.5 // 1.5x - 10x
        };
        
        gameState.players.push(player);
    }
    
    // Добавляем текущего игрока если он поставил
    if (gameState.hasBet) {
        gameState.players.unshift({
            name: 'Вы',
            bet: gameState.currentBet,
            status: 'waiting',
            cashout: null,
            autoCashout: gameState.autoCashout
        });
    }
    
    updatePlayersDisplay();
}

function generateRealisticBet() {
    // Генерируем реалистичные ставки
    const rand = Math.random();
    
    if (rand < 0.4) {
        // 40% - малые ставки (10-100)
        return Math.floor(10 + Math.random() * 90);
    } else if (rand < 0.7) {
        // 30% - средние ставки (100-500)
        return Math.floor(100 + Math.random() * 400);
    } else if (rand < 0.9) {
        // 20% - большие ставки (500-2000)
        return Math.floor(500 + Math.random() * 1500);
    } else {
        // 10% - очень большие ставки (2000-10000)
        return Math.floor(2000 + Math.random() * 8000);
    }
}

function updatePlayersDisplay() {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;
    
    playersList.innerHTML = '';
    
    // Показываем максимум 6 игроков для лучшего UX
    const displayPlayers = gameState.players.slice(0, 6);
    
    displayPlayers.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        
        let statusText = '';
        let statusClass = '';
        
        switch (player.status) {
            case 'waiting':
                statusText = 'Ждет';
                statusClass = 'waiting';
                break;
            case 'cashed':
                statusText = `${player.cashout}x`;
                statusClass = 'cashed';
                break;
            case 'crashed':
                statusText = 'Краш';
                statusClass = 'crashed';
                break;
        }
        
        playerItem.innerHTML = `
            <span class="player-name">${player.name}</span>
            <span class="player-bet">${player.bet} 💎</span>
            <span class="player-status ${statusClass}">${statusText}</span>
        `;
        
        playersList.appendChild(playerItem);
    });
}

function simulatePlayerCashouts() {
    // Симулируем кэшауты других игроков во время полета
    gameState.players.forEach(player => {
        if (player.status === 'waiting' && player.name !== 'Вы') {
            // Случайный кэшаут с вероятностью
            const shouldCashout = Math.random() < 0.15; // 15% шанс каждый тик
            const multiplierReached = gameState.multiplier >= player.autoCashout;
            
            if (shouldCashout || multiplierReached) {
                player.status = 'cashed';
                player.cashout = gameState.multiplier.toFixed(2);
            }
        }
    });
    
    updatePlayersDisplay();
}
    gameState.gameHistory.unshift(result);
    if (gameState.gameHistory.length > 10) {
        gameState.gameHistory.pop();
    }
    
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyContainer = document.getElementById('historyItems');
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
    // Update multiplier display
    document.getElementById('multiplierDisplay').textContent = gameState.multiplier.toFixed(2) + 'x';
    
    // Update bet button
    const betBtn = document.getElementById('betBtn');
    const betAmount = document.getElementById('betAmount').value;
    betBtn.querySelector('.btn-amount').textContent = `${betAmount} 💎`;
    betBtn.disabled = gameState.gamePhase !== 'betting' || gameState.hasBet;
    
    // Update cashout button
    const cashoutBtn = document.getElementById('cashoutBtn');
    if (gameState.hasBet && gameState.gamePhase === 'flying') {
        cashoutBtn.disabled = false;
        const winAmount = Math.floor(gameState.currentBet * gameState.multiplier);
        cashoutBtn.querySelector('.btn-multiplier').textContent = `${winAmount} 💎`;
    } else {
        cashoutBtn.disabled = true;
        cashoutBtn.querySelector('.btn-multiplier').textContent = '0 💎';
    }
}

// Navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName).classList.add('active');
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    event.target.closest('.nav-item').classList.add('active');
    
    // Haptic feedback
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

function updateBalance() {
    document.querySelector('.balance-amount').textContent = gameState.balance.toLocaleString();
    
    // Обновляем статистику в профиле
    const statItems = document.querySelectorAll('.stat-item .stat-value');
    if (statItems.length >= 3) {
        statItems[0].textContent = gameState.balance.toLocaleString(); // Монеты
        statItems[1].textContent = gameState.stats.gamesPlayed || 0; // Игр сыграно
        statItems[2].textContent = gameState.stats.gamesWon || 0; // Побед
    }
    
    // Обновляем баланс в модальном окне пополнения если оно открыто
    const currentBalanceEl = document.getElementById('currentBalance');
    if (currentBalanceEl) {
        currentBalanceEl.textContent = `${gameState.balance.toLocaleString()} 💎`;
    }
}

// Notification system
function showNotification(message) {
    // Create notification element
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
    
    // Add animation keyframes
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
    
    // Remove after 3 seconds
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
    gameState.balance += 200;
    updateBalance();
    saveGameProgress();
    showNotification('Получен ежедневный бонус: +200 💎!');
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
}

function inviteFriend() {
    if (tg.openTelegramLink) {
        tg.openTelegramLink('https://t.me/share/url?url=Присоединяйся к XudoBudoGame!');
    } else {
        // Fallback for local testing
        if (navigator.share) {
            navigator.share({
                title: 'XudoBudoGame',
                text: 'Присоединяйся к XudoBudoGame!',
                url: window.location.href
            }).catch(() => {
                // If share fails, copy to clipboard
                copyToClipboard('Присоединяйся к XudoBudoGame! ' + window.location.href);
            });
        } else {
            copyToClipboard('Присоединяйся к XudoBudoGame! ' + window.location.href);
        }
    }
    showNotification('Ссылка для приглашения готова!');
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Ссылка скопирована в буфер обмена!');
        }).catch(() => {
            // Fallback method
            fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showNotification('Ссылка скопирована!');
    } catch (err) {
        showNotification('Не удалось скопировать ссылку');
    }
    
    document.body.removeChild(textArea);
}

function watchAd() {
    // Simulate watching ad
    setTimeout(() => {
        gameState.balance += 100;
        updateBalance();
        saveGameProgress();
        showNotification('Получена награда за просмотр: +100 💎!');
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    }, 2000);
    
    showNotification('Просмотр рекламы...');
}

// Функции сохранения и загрузки прогресса
function saveGameProgress() {
    const saveData = {
        balance: gameState.balance,
        stats: gameState.stats,
        gameHistory: gameState.gameHistory,
        lastSaved: Date.now()
    };
    
    try {
        localStorage.setItem('xudobudogame_progress', JSON.stringify(saveData));
    } catch (error) {
        console.log('Не удалось сохранить прогресс:', error);
    }
}

function loadGameProgress() {
    try {
        const savedData = localStorage.getItem('xudobudogame_progress');
        if (savedData) {
            const data = JSON.parse(savedData);
            
            // Проверяем что данные не старше 30 дней
            const daysSinceLastSave = (Date.now() - data.lastSaved) / (1000 * 60 * 60 * 24);
            if (daysSinceLastSave < 30) {
                gameState.balance = data.balance || 1000;
                gameState.stats = { ...gameState.stats, ...data.stats };
                gameState.gameHistory = data.gameHistory || [5.67, 2.45, 1.23, 8.91, 1.05];
                
                console.log('Прогресс загружен');
                return true;
            }
        }
    } catch (error) {
        console.log('Не удалось загрузить прогресс:', error);
    }
    
    return false;
}

// Автосохранение каждые 30 секунд
setInterval(saveGameProgress, 30000);

// Сохранение при закрытии страницы
window.addEventListener('beforeunload', saveGameProgress);

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем сохраненный прогресс
    loadGameProgress();
    
    // Set initial balance
    updateBalance();
    updateHistoryDisplay();
    
    // Add event listeners for freebie buttons
    document.querySelector('.claim-btn').addEventListener('click', claimDailyBonus);
    document.querySelector('.invite-btn').addEventListener('click', inviteFriend);
    document.querySelector('.watch-btn').addEventListener('click', watchAd);
    
    // Bet amount input validation and update
    document.getElementById('betAmount').addEventListener('input', function(e) {
        let value = parseInt(e.target.value);
        if (value < 10) e.target.value = 10;
        if (value > gameState.balance) e.target.value = gameState.balance;
        
        // Update bet button display
        const betBtn = document.getElementById('betBtn');
        if (betBtn) {
            betBtn.querySelector('.btn-amount').textContent = `${e.target.value} 💎`;
        }
    });
    
    // Auto cashout input validation
    document.getElementById('autoCashout').addEventListener('input', function(e) {
        let value = parseFloat(e.target.value);
        if (value < 1.01) e.target.value = 1.01;
        if (value > 1000) e.target.value = 1000;
    });
    
    // Custom stars amount input
    document.getElementById('customStarsAmount').addEventListener('input', function(e) {
        let value = parseInt(e.target.value) || 0;
        if (value > 10000) e.target.value = 10000;
        
        // Update preview
        document.getElementById('customCoinsPreview').textContent = `Получите: ${value.toLocaleString()} 💎`;
    });
    
    // Close modals on outside click
    document.getElementById('crashGameModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeCrashGame();
        }
    });
    
    document.getElementById('topUpModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeTopUpModal();
        }
    });
    
    // Keyboard shortcuts
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

// Telegram Web App theme
applyTelegramTheme();

// Listen for theme changes
tg.onEvent('themeChanged', function() {
    applyTelegramTheme();
});

// Listen for payment events
tg.onEvent('invoiceClosed', function(eventData) {
    if (eventData.status === 'paid') {
        // Extract amount from payload
        const payload = eventData.payload;
        if (payload && payload.startsWith('stars_')) {
            const amount = parseInt(payload.split('_')[1]);
            if (amount && amount > 0) {
                processSuccessfulPayment(amount);
            }
        }
    } else if (eventData.status === 'cancelled') {
        showNotification('Платеж отменен');
    } else if (eventData.status === 'failed') {
        showNotification('Ошибка платежа. Попробуйте еще раз.');
    }
});

// Handle back button
tg.onEvent('backButtonClicked', function() {
    if (document.getElementById('topUpModal').classList.contains('active')) {
        closeTopUpModal();
    } else if (document.getElementById('crashGameModal').classList.contains('active')) {
        closeCrashGame();
    } else {
        tg.close();
    }
});

// Show back button when modal is open
function updateBackButton() {
    if (document.getElementById('crashGameModal').classList.contains('active') || 
        document.getElementById('topUpModal').classList.contains('active')) {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }
}

// Update back button visibility
document.getElementById('crashGameModal').addEventListener('transitionend', updateBackButton);
document.getElementById('topUpModal').addEventListener('transitionend', updateBackButton);