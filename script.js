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
        currentBalanceEl.textContent = `${gameState.balance.toLocaleString()} 💎`;
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
    
    // Simulate payment for testing
    simulatePayment(amount);
    
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
        currentBalanceEl.textContent = `${gameState.balance.toLocaleString()} 💎`;
    }
    
    closeTopUpModal();
    showNotification(`✅ Успешно! Получено ${amount} 💎`);
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
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
    
    const betAmount = parseInt(betAmountEl.value);
    const autoCashout = parseFloat(autoCashoutEl.value);
    
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
    
    showNotification(`✅ Выиграл ${winAmount} 💎! (${gameState.multiplier.toFixed(2)}x)`);
    
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
        showNotification(`💸 Проиграл ${gameState.currentBet} 💎! Краш на ${gameState.crashPoint.toFixed(2)}x`);
        
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
            btnAmount.textContent = `${betAmount} 💎`;
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
                btnMultiplier.textContent = `${winAmount} 💎`;
            }
        } else {
            cashoutBtn.disabled = true;
            const btnMultiplier = cashoutBtn.querySelector('.btn-multiplier');
            if (btnMultiplier) {
                btnMultiplier.textContent = '0 💎';
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
        currentBalanceEl.textContent = `${gameState.balance.toLocaleString()} 💎`;
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
    gameState.balance += 200;
    updateBalance();
    showNotification('Получен ежедневный бонус: +200 💎!');
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
}

function inviteFriend() {
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
    setTimeout(() => {
        gameState.balance += 100;
        updateBalance();
        showNotification('Получена награда за просмотр: +100 💎!');
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    }, 2000);
    
    showNotification('Просмотр рекламы...');
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
            let value = parseInt(e.target.value);
            if (value < 10) e.target.value = 10;
            if (value > gameState.balance) e.target.value = gameState.balance;
            
            const betBtn = document.getElementById('betBtn');
            if (betBtn) {
                const btnAmount = betBtn.querySelector('.btn-amount');
                if (btnAmount) {
                    btnAmount.textContent = `${e.target.value} 💎`;
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
            
            const previewEl = document.getElementById('customCoinsPreview');
            if (previewEl) {
                previewEl.textContent = `Получите: ${value.toLocaleString()} 💎`;
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
