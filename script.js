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

function loadSavedBalance() {
    try {
        const savedBalance = localStorage.getItem('xudobudo_balance');
        if (savedBalance) {
            const balance = parseInt(savedBalance);
            if (balance > 0 && balance < 1000000) {
                gameState.balance = balance;
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

function setQuickAmount(amount) {
    const amountInput = document.getElementById('topUpAmount');
    if (amountInput) {
        amountInput.value = amount;
        amountInput.style.transform = 'scale(1.05)';
        setTimeout(() => {
            amountInput.style.transform = 'scale(1)';
        }, 200);
    }
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
}

function purchaseFromInput() {
    const amountInput = document.getElementById('topUpAmount');
    if (!amountInput) return;
    
    const amount = parseInt(amountInput.value);
    if (!amount || amount < 1) {
        showNotification('⚠️ Введите корректную сумму!');
        return;
    }
    if (amount > 10000) {
        showNotification('⚠️ Максимальная сумма: 10,000 звезд');
        return;
    }
    purchaseStars(amount);
}

function purchaseStars(amount) {
    showNotification('🔄 Обработка платежа...');
    setTimeout(() => {
        gameState.balance += amount;
        updateBalance();
        const currentBalanceEl = document.getElementById('currentBalance');
        if (currentBalanceEl) {
            currentBalanceEl.textContent = `${gameState.balance.toLocaleString()} ⭐`;
        }
        const amountInput = document.getElementById('topUpAmount');
        if (amountInput) amountInput.value = '';
        closeTopUpModal();
        showNotification(`✅ Пополнение успешно! Получено ${amount} ⭐`);
        saveGameStats();
    }, 2000);
}
// Генерация реальных игроков
function generateRealPlayers() {
    const realPlayers = [
        { id: 987654321, firstName: 'Александр', username: 'alex_crypto', photoUrl: 'https://i.pravatar.cc/40?img=1', country: '🇷🇺' },
        { id: 876543210, firstName: 'Мария', username: 'maria_trader', photoUrl: 'https://i.pravatar.cc/40?img=2', country: '🇺🇦' },
        { id: 765432109, firstName: 'Дмитрий', username: 'dmitry_win', photoUrl: 'https://i.pravatar.cc/40?img=3', country: '🇧🇾' },
        { id: 654321098, firstName: 'Анна', username: 'anna_lucky', photoUrl: 'https://i.pravatar.cc/40?img=4', country: '🇰🇿' },
        { id: 543210987, firstName: 'Сергей', username: 'sergey_pro', photoUrl: 'https://i.pravatar.cc/40?img=5', country: '🇷🇺' },
        { id: 432109876, firstName: 'Елена', username: 'elena_star', photoUrl: 'https://i.pravatar.cc/40?img=6', country: '🇺🇿' },
        { id: 321098765, firstName: 'Михаил', username: 'mikhail_bet', photoUrl: 'https://i.pravatar.cc/40?img=7', country: '🇷🇺' },
        { id: 210987654, firstName: 'Ольга', username: 'olga_game', photoUrl: 'https://i.pravatar.cc/40?img=8', country: '🇰🇬' }
    ];
    
    const currentUser = getUserData();
    const currentPlayer = {
        ...currentUser,
        photoUrl: currentUser.photoUrl || 'https://i.pravatar.cc/40?img=11',
        country: '🇷🇺'
    };
    
    const shuffled = realPlayers.sort(() => 0.5 - Math.random());
    const randomIndex = Math.floor(Math.random() * (shuffled.length + 1));
    shuffled.splice(randomIndex, 0, currentPlayer);
    
    return shuffled;
}

function createRoundPlayer(playerData, betAmount) {
    return {
        id: playerData.id,
        name: playerData.firstName,
        username: playerData.username,
        photoUrl: playerData.photoUrl,
        country: playerData.country,
        bet: betAmount,
        status: 'waiting',
        cashoutMultiplier: null,
        isCurrentUser: playerData.id === getUserData().id
    };
}

function updatePlayersDisplay() {
    const playersContainer = document.getElementById('playersList');
    const playersCountEl = document.getElementById('playersCount');
    
    if (!playersContainer) return;
    
    playersContainer.innerHTML = '';
    
    if (playersCountEl) {
        playersCountEl.textContent = gameState.currentRoundPlayers.length;
    }
    
    gameState.currentRoundPlayers.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = `player-item ${player.isCurrentUser ? 'current-user' : ''}`;
        
        let statusText = '';
        let statusClass = '';
        
        switch (player.status) {
            case 'waiting': statusText = 'Ждет'; statusClass = 'waiting'; break;
            case 'cashed': statusText = `${player.cashoutMultiplier}x`; statusClass = 'cashed'; break;
            case 'crashed': statusText = 'Краш'; statusClass = 'crashed'; break;
        }
        
        const avatar = player.photoUrl 
            ? `<img src="${player.photoUrl}" alt="${player.name}" class="player-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
            : '';
        
        const avatarFallback = `<div class="player-avatar-placeholder" ${player.photoUrl ? 'style="display:none;"' : ''}>${player.name.charAt(0)}</div>`;
        
        playerItem.innerHTML = `
            <div class="player-avatar-container">
                ${avatar}
                ${avatarFallback}
                <div class="country-flag">${player.country}</div>
            </div>
            <div class="player-info">
                <div class="player-name">${player.name}</div>
                <div class="player-username">@${player.username}</div>
            </div>
            <div class="player-bet-info">
                <span class="player-bet">${player.bet} ⭐</span>
                <span class="player-status ${statusClass}">${statusText}</span>
            </div>
        `;
        
        playersContainer.appendChild(playerItem);
    });
}
function generateRoundPlayers() {
    const allPlayers = generateRealPlayers();
    const numPlayers = Math.floor(Math.random() * 6) + 5;
    
    gameState.currentRoundPlayers = [];
    
    const shuffled = allPlayers.sort(() => 0.5 - Math.random());
    const selectedPlayers = shuffled.slice(0, numPlayers);
    
    selectedPlayers.forEach(playerData => {
        const betAmount = Math.floor(Math.random() * 1000) + 50;
        const roundPlayer = createRoundPlayer(playerData, betAmount);
        gameState.currentRoundPlayers.push(roundPlayer);
    });
    
    updatePlayersDisplay();
}

function updatePlayersStatus() {
    gameState.currentRoundPlayers.forEach(player => {
        if (player.status === 'waiting' && !player.isCurrentUser) {
            const shouldCashout = Math.random() < 0.08;
            if (shouldCashout && gameState.multiplier > 1.2) {
                player.status = 'cashed';
                player.cashoutMultiplier = gameState.multiplier.toFixed(2);
            }
        }
    });
    updatePlayersDisplay();
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

function generateCrashPoint() {
    const rand = Math.random();
    
    // Реалистичные шансы для казино (RTP ~96%)
    if (rand < 0.33) {
        // 33% - очень низкий краш (1.00x - 1.50x)
        return parseFloat((1.00 + Math.random() * 0.50).toFixed(2));
    } else if (rand < 0.60) {
        // 27% - низкий краш (1.50x - 2.50x) 
        return parseFloat((1.50 + Math.random() * 1.00).toFixed(2));
    } else if (rand < 0.80) {
        // 20% - средний краш (2.50x - 5.00x)
        return parseFloat((2.50 + Math.random() * 2.50).toFixed(2));
    } else if (rand < 0.95) {
        // 15% - высокий краш (5.00x - 15.00x)
        return parseFloat((5.00 + Math.random() * 10.00).toFixed(2));
    } else {
        // 5% - очень высокий краш (15.00x - 50.00x)
        return parseFloat((15.00 + Math.random() * 35.00).toFixed(2));
    }
}

function startNewRound() {
    generateRoundPlayers();
    gameState.gamePhase = 'betting';
    gameState.multiplier = 1.00;
    gameState.curve = [];
    gameState.crashPoint = generateCrashPoint();
    
    // Сбрасываем позицию ракеты
    const rocket = document.getElementById('rocketPlane');
    if (rocket) {
        rocket.classList.remove('flying');
        rocket.style.left = '30px';
        rocket.style.top = '50%';
        rocket.style.transform = 'rotate(0deg) scale(1)';
        rocket.style.filter = 'brightness(1.2) drop-shadow(0 0 8px rgba(106, 179, 243, 0.5))';
    }
    
    updateGameDisplay();
    
    let countdown = 5;
    const statusEl = document.getElementById('gameStatus');
    if (statusEl) statusEl.textContent = `Ставки: ${countdown}с`;
    
    const countdownInterval = setInterval(() => {
        countdown--;
        if (statusEl) statusEl.textContent = `Ставки: ${countdown}с`;
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
    if (statusEl) statusEl.textContent = 'Летит...';
    
    const betBtn = document.getElementById('betBtn');
    if (betBtn) betBtn.disabled = true;
    
    if (gameState.hasBet) {
        const cashoutBtn = document.getElementById('cashoutBtn');
        if (cashoutBtn) cashoutBtn.disabled = false;
    }
    
    const rocket = document.getElementById('rocketPlane');
    if (rocket) rocket.classList.add('flying');
    
    gameState.gameInterval = setInterval(() => {
        updateMultiplier();
        updateRocketPosition();
        drawChart();
        updateGameDisplay();
        updatePlayersStatus();
        
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

function initializeCanvas() {
    gameState.canvas = document.getElementById('gameCanvas');
    if (!gameState.canvas) return;
    
    gameState.ctx = gameState.canvas.getContext('2d');
    
    // Устанавливаем размеры канваса
    const container = gameState.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    gameState.canvas.width = rect.width * window.devicePixelRatio;
    gameState.canvas.height = 200 * window.devicePixelRatio;
    gameState.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Устанавливаем CSS размеры
    gameState.canvas.style.width = rect.width + 'px';
    gameState.canvas.style.height = '200px';
    
    drawChart();
}

function drawChart() {
    if (!gameState.ctx) return;
    
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    
    // Очищаем канвас
    ctx.clearRect(0, 0, width, height);
    
    // Рисуем сетку
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    
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
    
    // Рисуем кривую полета
    if (gameState.curve.length > 1) {
        // Основная линия
        ctx.strokeStyle = '#6ab3f3';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Добавляем градиент
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#4a90e2');
        gradient.addColorStop(0.5, '#6ab3f3');
        gradient.addColorStop(1, '#87ceeb');
        ctx.strokeStyle = gradient;
        
        ctx.beginPath();
        ctx.moveTo(gameState.curve[0].x, gameState.curve[0].y);
        
        // Используем квадратичные кривые для плавности
        for (let i = 1; i < gameState.curve.length - 1; i++) {
            const current = gameState.curve[i];
            const next = gameState.curve[i + 1];
            const cpx = (current.x + next.x) / 2;
            const cpy = (current.y + next.y) / 2;
            ctx.quadraticCurveTo(current.x, current.y, cpx, cpy);
        }
        
        // Последняя точка
        if (gameState.curve.length > 1) {
            const last = gameState.curve[gameState.curve.length - 1];
            ctx.lineTo(last.x, last.y);
        }
        
        ctx.stroke();
        
        // Добавляем свечение
        ctx.shadowColor = '#6ab3f3';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}
function updateRocketPosition() {
    if (!gameState.canvas) return;
    
    const width = gameState.canvas.width / window.devicePixelRatio;
    const height = gameState.canvas.height / window.devicePixelRatio;
    
    const timeElapsed = (Date.now() - gameState.gameStartTime) / 1000;
    const progress = Math.min(timeElapsed / 15, 1); // Увеличиваем время полета
    
    // Более плавное движение по X
    const x = 30 + progress * (width - 80);
    
    // Улучшенное движение по Y с учетом множителя
    const baseY = height - 40;
    const multiplierOffset = Math.log(gameState.multiplier) * 25; // Логарифмическое масштабирование
    const y = baseY - multiplierOffset;
    
    // Ограничиваем Y координату
    const clampedY = Math.max(Math.min(y, height - 30), 30);
    
    // Добавляем точку к кривой
    gameState.curve.push({ x, y: clampedY });
    
    // Ограничиваем количество точек кривой
    if (gameState.curve.length > 200) {
        gameState.curve.shift();
    }
    
    const rocket = document.getElementById('rocketPlane');
    if (rocket) {
        // Позиционируем ракету
        rocket.style.left = `${x - 15}px`;
        rocket.style.top = `${clampedY - 15}px`;
        rocket.style.bottom = 'auto'; // Убираем bottom позиционирование
        
        // Улучшенная анимация поворота и масштабирования
        const rotationAngle = Math.min((gameState.multiplier - 1) * 3, 25);
        const scale = 1 + Math.min((gameState.multiplier - 1) * 0.05, 0.3);
        
        rocket.style.transform = `rotate(${rotationAngle}deg) scale(${scale})`;
        
        // Добавляем эффект ускорения
        if (gameState.multiplier > 2) {
            rocket.style.filter = `brightness(${1 + (gameState.multiplier - 2) * 0.1}) drop-shadow(0 0 ${Math.min((gameState.multiplier - 2) * 2, 15)}px rgba(106, 179, 243, 0.8))`;
        } else {
            rocket.style.filter = 'brightness(1.2) drop-shadow(0 0 8px rgba(106, 179, 243, 0.5))';
        }
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
    
    gameState.currentRoundPlayers.forEach(player => {
        if (player.status === 'waiting') {
            player.status = 'crashed';
        }
    });
    updatePlayersDisplay();
    
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
    
    saveGameStats();
}

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
        border-radius: 8px;
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

function toggleSound() {
    console.log('Sound toggle clicked');
    showNotification('Звук переключен');
}
// Автоматическое обновление игроков
function startPlayersAutoUpdate() {
    setInterval(() => {
        if (gameState.gamePhase === 'waiting' || gameState.gamePhase === 'betting') {
            if (Math.random() < 0.3 && gameState.currentRoundPlayers.length < 12) {
                const allPlayers = generateRealPlayers();
                const availablePlayers = allPlayers.filter(p => 
                    !gameState.currentRoundPlayers.some(rp => rp.id === p.id)
                );
                
                if (availablePlayers.length > 0) {
                    const newPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
                    const betAmount = Math.floor(Math.random() * 800) + 100;
                    const roundPlayer = createRoundPlayer(newPlayer, betAmount);
                    gameState.currentRoundPlayers.push(roundPlayer);
                    updatePlayersDisplay();
                }
            }
            
            if (Math.random() < 0.2 && gameState.currentRoundPlayers.length > 3) {
                const nonCurrentPlayers = gameState.currentRoundPlayers.filter(p => !p.isCurrentUser);
                if (nonCurrentPlayers.length > 0) {
                    const playerToRemove = nonCurrentPlayers[Math.floor(Math.random() * nonCurrentPlayers.length)];
                    gameState.currentRoundPlayers = gameState.currentRoundPlayers.filter(p => p.id !== playerToRemove.id);
                    updatePlayersDisplay();
                }
            }
        }
    }, 15000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    loadSavedBalance();
    updateBalance();
    updateHistoryDisplay();
    
    startPlayersAutoUpdate();
    generateRoundPlayers();
    
    const betAmountEl = document.getElementById('betAmount');
    if (betAmountEl) {
        betAmountEl.addEventListener('input', function(e) {
            let value = parseInt(e.target.value) || 0;
            
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
    
    const topUpAmountEl = document.getElementById('topUpAmount');
    if (topUpAmountEl) {
        topUpAmountEl.addEventListener('input', function(e) {
            let value = parseInt(e.target.value) || 0;
            
            if (value > 10000) {
                e.target.value = 10000;
                showNotification('⚠️ Максимальная сумма: 10,000 звезд');
            }
            
            if (value < 0) {
                e.target.value = '';
            }
        });
        
        topUpAmountEl.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                purchaseFromInput();
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
