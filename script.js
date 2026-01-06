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
    canvas: null,
    ctx: null,
    rocketPosition: { x: 20, y: 180 },
    curve: [],
    gameHistory: [5.67, 2.45, 1.23, 8.91, 1.05],
    players: [
        { name: 'Player1', bet: 500, status: 'waiting', cashout: null },
        { name: 'Player2', bet: 200, status: 'cashed', cashout: 2.15 }
    ]
};

// Crash Game Functions
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
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let i = 0; i <= 10; i++) {
        const x = (width / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 0; i <= 5; i++) {
        const y = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw curve if game is running
    if (gameState.curve.length > 1) {
        ctx.strokeStyle = '#6ab3f3';
        ctx.lineWidth = 3;
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

function startNewRound() {
    gameState.gamePhase = 'betting';
    gameState.multiplier = 1.00;
    gameState.curve = [];
    gameState.rocketPosition = { x: 20, y: 180 };
    
    // Generate crash point (1.01x to 50.00x with weighted probability)
    const rand = Math.random();
    if (rand < 0.5) {
        gameState.crashPoint = 1.01 + Math.random() * 1.99; // 1.01-3.00 (50% chance)
    } else if (rand < 0.8) {
        gameState.crashPoint = 3.00 + Math.random() * 7.00; // 3.00-10.00 (30% chance)
    } else {
        gameState.crashPoint = 10.00 + Math.random() * 40.00; // 10.00-50.00 (20% chance)
    }
    
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
    // Exponential growth with some randomness
    const progress = (gameState.multiplier - 1) / (gameState.crashPoint - 1);
    const baseIncrement = 0.01;
    const accelerationFactor = 1 + progress * 2;
    const randomFactor = 0.8 + Math.random() * 0.4;
    
    gameState.multiplier += baseIncrement * accelerationFactor * randomFactor;
    gameState.multiplier = Math.min(gameState.multiplier, gameState.crashPoint);
}

function updateRocketPosition() {
    const canvas = gameState.canvas;
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    
    // Calculate rocket position based on multiplier
    const progress = Math.min((gameState.multiplier - 1) / 9, 1); // Normalize to 0-1 for 1x-10x
    const x = 20 + progress * (width - 60);
    const y = height - 20 - (gameState.multiplier - 1) * 15;
    
    gameState.rocketPosition = { x, y: Math.max(y, 20) };
    
    // Add point to curve
    gameState.curve.push({ x, y: Math.max(y, 20) });
    
    // Limit curve points
    if (gameState.curve.length > 100) {
        gameState.curve.shift();
    }
    
    // Update rocket visual position
    const rocket = document.getElementById('rocketPlane');
    rocket.style.left = `${x - 20}px`;
    rocket.style.bottom = `${height - y - 20}px`;
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
    
    updateBalance();
    updateGameDisplay();
    
    // Disable cashout button
    document.getElementById('cashoutBtn').disabled = true;
    
    showNotification(`Выиграл ${winAmount} 💎! (${gameState.multiplier.toFixed(2)}x)`);
    
    // Haptic feedback
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
}

function crashGame() {
    gameState.gamePhase = 'crashed';
    
    // Stop game loop
    if (gameState.gameInterval) {
        clearInterval(gameState.gameInterval);
        gameState.gameInterval = null;
    }
    
    // Stop rocket animation
    const rocket = document.getElementById('rocketPlane');
    rocket.classList.remove('flying');
    
    document.getElementById('gameStatus').textContent = `Краш на ${gameState.crashPoint.toFixed(2)}x!`;
    
    // If player had bet and didn't cash out
    if (gameState.hasBet) {
        gameState.hasBet = false;
        showNotification(`Проиграл ${gameState.currentBet} 💎! Краш на ${gameState.crashPoint.toFixed(2)}x`);
        
        // Haptic feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    }
    
    // Add to history
    addToHistory(gameState.crashPoint);
    
    updateGameDisplay();
    
    // Start new round after 3 seconds
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
    document.querySelector('.stat-value').textContent = gameState.balance.toLocaleString();
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
        showNotification('Получена награда за просмотр: +100 💎!');
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    }, 2000);
    
    showNotification('Просмотр рекламы...');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Close modal on outside click
    document.getElementById('crashGameModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeCrashGame();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeCrashGame();
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

// Handle back button
tg.onEvent('backButtonClicked', function() {
    if (document.getElementById('crashGameModal').classList.contains('active')) {
        closeCrashGame();
    } else {
        tg.close();
    }
});

// Show back button when modal is open
function updateBackButton() {
    if (document.getElementById('crashGameModal').classList.contains('active')) {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }
}

// Update back button visibility
document.getElementById('crashGameModal').addEventListener('transitionend', updateBackButton);
