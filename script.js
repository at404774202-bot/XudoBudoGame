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
    isPlaying: false,
    multiplier: 1.00,
    betAmount: 100,
    crashPoint: 0,
    gameInterval: null,
    crashHistory: ['2.45x', '1.23x', '5.67x', '8.91x', '1.05x']
};

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

// Crash Game Functions
function openCrashGame() {
    document.getElementById('crashGameModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Haptic feedback
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

function closeCrashGame() {
    document.getElementById('crashGameModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Stop game if playing
    if (gameState.isPlaying) {
        stopGame();
    }
}

function startCrash() {
    const betInput = document.getElementById('betAmount');
    const betAmount = parseInt(betInput.value);
    
    if (betAmount < 10 || betAmount > gameState.balance) {
        showNotification('Неверная сумма ставки!');
        return;
    }
    
    gameState.betAmount = betAmount;
    gameState.balance -= betAmount;
    gameState.isPlaying = true;
    gameState.multiplier = 1.00;
    
    // Generate random crash point (1.01x to 10.00x)
    gameState.crashPoint = Math.random() * 9 + 1.01;
    
    // Update UI
    updateBalance();
    document.getElementById('crashBtn').disabled = true;
    document.getElementById('cashoutBtn').disabled = false;
    document.getElementById('crashBtn').textContent = 'Играет...';
    
    // Start game animation
    startGameAnimation();
    
    // Haptic feedback
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('heavy');
    }
}

function startGameAnimation() {
    const rocket = document.getElementById('rocket');
    const multiplierEl = document.getElementById('multiplier');
    
    rocket.classList.add('flying');
    
    gameState.gameInterval = setInterval(() => {
        gameState.multiplier += 0.01;
        multiplierEl.textContent = gameState.multiplier.toFixed(2) + 'x';
        
        // Check if crashed
        if (gameState.multiplier >= gameState.crashPoint) {
            crashGame();
        }
        
        // Update rocket animation
        const scale = 1 + (gameState.multiplier - 1) * 0.1;
        rocket.style.transform = `scale(${scale})`;
        
    }, 100);
}

function cashOut() {
    if (!gameState.isPlaying) return;
    
    const winAmount = Math.floor(gameState.betAmount * gameState.multiplier);
    gameState.balance += winAmount;
    
    stopGame();
    
    showNotification(`Выиграл ${winAmount} монет! (${gameState.multiplier.toFixed(2)}x)`);
    
    // Add to history
    addToHistory(gameState.multiplier.toFixed(2) + 'x');
    
    // Haptic feedback
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
}

function crashGame() {
    stopGame();
    
    showNotification(`Краш на ${gameState.crashPoint.toFixed(2)}x! Проиграл ${gameState.betAmount} монет.`);
    
    // Add to history
    addToHistory(gameState.crashPoint.toFixed(2) + 'x');
    
    // Haptic feedback
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
    }
}

function stopGame() {
    gameState.isPlaying = false;
    
    if (gameState.gameInterval) {
        clearInterval(gameState.gameInterval);
        gameState.gameInterval = null;
    }
    
    // Reset UI
    document.getElementById('crashBtn').disabled = false;
    document.getElementById('cashoutBtn').disabled = true;
    document.getElementById('crashBtn').textContent = 'Играть';
    document.getElementById('multiplier').textContent = '1.00x';
    
    const rocket = document.getElementById('rocket');
    rocket.classList.remove('flying');
    rocket.style.transform = 'scale(1)';
    
    updateBalance();
}

function addToHistory(result) {
    gameState.crashHistory.unshift(result);
    if (gameState.crashHistory.length > 5) {
        gameState.crashHistory.pop();
    }
    
    document.getElementById('crashHistory').textContent = gameState.crashHistory.join(', ');
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
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        z-index: 10000;
        font-size: 14px;
        font-weight: bold;
        backdrop-filter: blur(10px);
        animation: slideDown 0.3s ease-out;
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
    showNotification('Получен ежедневный бонус: +200 монет!');
    
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
        showNotification('Получена награда за просмотр: +100 монет!');
        
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
    
    // Add event listeners for freebie buttons
    document.querySelector('.claim-btn').addEventListener('click', claimDailyBonus);
    document.querySelector('.invite-btn').addEventListener('click', inviteFriend);
    document.querySelector('.watch-btn').addEventListener('click', watchAd);
    
    // Bet amount input validation
    document.getElementById('betAmount').addEventListener('input', function(e) {
        let value = parseInt(e.target.value);
        if (value < 10) e.target.value = 10;
        if (value > gameState.balance) e.target.value = gameState.balance;
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
        if (e.key === ' ' && gameState.isPlaying) {
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
