// XudoBudo Crash Game - Адаптированная версия с темной темой
// Интеграция с существующей функциональностью

let tg = window.Telegram?.WebApp || {
    expand: () => {},
    ready: () => {},
    close: () => {},
    HapticFeedback: {
        impactOccurred: () => {},
        notificationOccurred: () => {}
    },
    BackButton: { show: () => {}, hide: () => {} },
    colorScheme: 'dark'
};

// Sound System (из оригинального приложения)
let audioContext = null;
let soundEnabled = true;

function initAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
    }
}

function playSound(frequency, duration, type = 'sine', volume = 0.1) {
    if (!soundEnabled || !audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log('Sound error:', e);
    }
}

function playButtonClick() { 
    playSound(800, 0.1, 'square', 0.05);
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}
function playBetSound() { playSound(600, 0.2, 'sine', 0.08); }
function playCashoutSound() { playSound(800, 0.3, 'triangle', 0.1); }
function playCrashSound() { playSound(200, 0.5, 'sawtooth', 0.15); }

function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('soundToggle');
    if (btn) {
        btn.innerHTML = soundEnabled ? '🔊' : '🔇';
        btn.classList.toggle('muted', !soundEnabled);
    }
    localStorage.setItem('crash_sound', soundEnabled.toString());
    playButtonClick();
}

// Основной класс игры (адаптированный)
class CrashGame {
    constructor() {
        this.gameState = 'waiting'; // waiting, flying, crashed
        this.currentMultiplier = 1.00;
        this.betAmount = 100;
        this.autoCashout = 2.00;
        this.balance = 1000;
        this.hasBet = false;
        this.gameInterval = null;
        this.crashPoint = 0;
        this.history = [2.45, 1.89, 5.67, 1.23, 3.45];
        
        this.initializeElements();
        this.bindEvents();
        this.loadGameData();
        this.updateDisplay();
        this.startNewRound();
    }
    
    initializeElements() {
        this.multiplierElement = document.getElementById('multiplier');
        this.gameStatusElement = document.getElementById('gameStatus');
        this.betButton = document.getElementById('betButton');
        this.cashoutButton = document.getElementById('cashoutButton');
        this.betAmountInput = document.getElementById('betAmount');
        this.autoCashoutInput = document.getElementById('autoCashout');
        this.rocket = document.getElementById('rocket');
        this.trajectory = document.getElementById('trajectory');
        this.historyList = document.getElementById('historyList');
        this.balanceElement = document.getElementById('balanceAmount');
    }
    
    bindEvents() {
        this.betAmountInput.addEventListener('input', (e) => {
            this.betAmount = parseFloat(e.target.value) || 0;
            playButtonClick();
        });
        
        this.autoCashoutInput.addEventListener('input', (e) => {
            this.autoCashout = parseFloat(e.target.value) || 1.01;
            playButtonClick();
        });
    }
    
    startNewRound() {
        this.gameState = 'waiting';
        this.currentMultiplier = 1.00;
        this.hasBet = false;
        this.crashPoint = this.generateCrashPoint();
        
        // Reset UI
        this.multiplierElement.textContent = '1.00x';
        this.multiplierElement.className = 'multiplier-value';
        this.gameStatusElement.textContent = 'Ожидание ставок...';
        this.betButton.disabled = false;
        this.betButton.innerHTML = '<span>Сделать ставку</span>';
        this.cashoutButton.disabled = true;
        this.rocket.className = 'rocket';
        this.trajectory.style.width = '0';
        
        // Start countdown
        this.startCountdown();
    }
    
    startCountdown() {
        let countdown = 5;
        this.gameStatusElement.textContent = `Начало через ${countdown}с`;
        
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                this.gameStatusElement.textContent = `Начало через ${countdown}с`;
            } else {
                clearInterval(countdownInterval);
                this.startFlight();
            }
        }, 1000);
    }
    
    startFlight() {
        this.gameState = 'flying';
        this.gameStatusElement.textContent = 'Полет! 🚀';
        this.betButton.disabled = true;
        
        if (this.hasBet) {
            this.cashoutButton.disabled = false;
        }
        
        // Start rocket animation
        this.rocket.classList.add('flying');
        this.multiplierElement.classList.add('active');
        
        // Start multiplier increase
        this.gameInterval = setInterval(() => {
            this.updateMultiplier();
        }, 100);
    }
    
    updateMultiplier() {
        if (this.gameState !== 'flying') return;
        
        // Increase multiplier with realistic curve
        const increment = Math.random() * 0.02 + 0.01;
        this.currentMultiplier += increment;
        
        // Update display
        this.multiplierElement.textContent = this.currentMultiplier.toFixed(2) + 'x';
        
        // Update trajectory
        const progress = Math.min((this.currentMultiplier - 1) / (this.crashPoint - 1), 1);
        this.trajectory.style.width = (progress * 280) + 'px';
        
        // Check for crash
        if (this.currentMultiplier >= this.crashPoint) {
            this.crash();
            return;
        }
        
        // Auto cashout check
        if (this.hasBet && this.currentMultiplier >= this.autoCashout) {
            this.cashOut();
        }
    }
    
    crash() {
        this.gameState = 'crashed';
        clearInterval(this.gameInterval);
        
        // Update UI
        this.multiplierElement.textContent = this.crashPoint.toFixed(2) + 'x';
        this.multiplierElement.classList.remove('active');
        this.multiplierElement.classList.add('crashed');
        this.gameStatusElement.textContent = '💥 Крах!';
        this.cashoutButton.disabled = true;
        
        // Play crash sound
        playCrashSound();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        
        // Add to history
        this.addToHistory(this.crashPoint, false);
        
        // If player had bet and didn't cash out, they lose
        if (this.hasBet) {
            this.balance -= this.betAmount;
            this.updateDisplay();
            this.showResult(`💥 Проигрыш: -${this.betAmount}⭐`);
        }
        
        this.saveGameData();
        
        // Start new round after delay
        setTimeout(() => {
            this.startNewRound();
        }, 3000);
    }
    
    generateCrashPoint() {
        // Generate crash point with house edge (из оригинального приложения)
        const random = Math.random();
        if (random < 0.5) return 1.00 + Math.random() * 1.5; // 1.00-2.50x (50%)
        if (random < 0.8) return 2.50 + Math.random() * 2.5; // 2.50-5.00x (30%)
        if (random < 0.95) return 5.00 + Math.random() * 5.0; // 5.00-10.00x (15%)
        return 10.00 + Math.random() * 40.0; // 10.00-50.00x (5%)
    }
    
    placeBet() {
        if (this.gameState !== 'waiting' || this.betAmount <= 0 || this.betAmount > this.balance) {
            if (this.betAmount > this.balance) {
                this.showResult('❌ Недостаточно средств!');
            }
            return;
        }
        
        this.hasBet = true;
        this.betButton.disabled = true;
        this.betButton.innerHTML = '<span>Ставка сделана ✓</span>';
        
        playBetSound();
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        
        this.showResult(`✅ Ставка: ${this.betAmount}⭐`);
    }
    
    cashOut() {
        if (!this.hasBet || this.gameState !== 'flying') {
            return;
        }
        
        const winAmount = Math.floor(this.betAmount * this.currentMultiplier);
        this.balance = this.balance - this.betAmount + winAmount;
        this.updateDisplay();
        
        this.hasBet = false;
        this.cashoutButton.disabled = true;
        
        playCashoutSound();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        
        this.showResult(`🎉 Выигрыш: +${winAmount - this.betAmount}⭐ (${this.currentMultiplier.toFixed(2)}x)`);
        this.addToHistory(this.currentMultiplier, true);
        this.saveGameData();
    }
    
    updateDisplay() {
        // Update balance display
        if (this.balanceElement) {
            this.balanceElement.textContent = this.balance.toLocaleString() + ' ⭐';
        }
        
        // Update other balance elements
        const otherBalanceElements = ['currentBalance'];
        otherBalanceElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = this.balance.toLocaleString();
        });
    }
    
    addToHistory(multiplier, won) {
        // Add to internal history
        this.history.unshift(multiplier);
        if (this.history.length > 10) this.history.pop();
        
        // Update UI history
        const historyItem = document.createElement('div');
        historyItem.className = `history-item ${won ? 'safe' : 'crashed'}`;
        historyItem.textContent = multiplier.toFixed(2) + 'x';
        
        this.historyList.insertBefore(historyItem, this.historyList.firstChild);
        
        // Keep only last 10 items
        while (this.historyList.children.length > 10) {
            this.historyList.removeChild(this.historyList.lastChild);
        }
    }
    
    showResult(message) {
        // Create notification (из оригинального приложения)
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.4s ease-out forwards';
            setTimeout(() => notification.remove(), 400);
        }, 3000);
    }
    
    saveGameData() {
        try {
            localStorage.setItem('crash_balance', this.balance.toString());
            localStorage.setItem('crash_history', JSON.stringify(this.history));
        } catch (e) {
            console.log('Save error:', e);
        }
    }
    
    loadGameData() {
        try {
            const savedBalance = localStorage.getItem('crash_balance');
            if (savedBalance) this.balance = Math.max(100, parseInt(savedBalance));
            
            const savedHistory = localStorage.getItem('crash_history');
            if (savedHistory) this.history = JSON.parse(savedHistory);
            
            const soundSaved = localStorage.getItem('crash_sound');
            if (soundSaved !== null) {
                soundEnabled = soundSaved === 'true';
                const btn = document.getElementById('soundToggle');
                if (btn) {
                    btn.innerHTML = soundEnabled ? '🔊' : '🔇';
                    btn.classList.toggle('muted', !soundEnabled);
                }
            }
        } catch (e) {
            console.log('Load error:', e);
        }
    }
}

// Quick bet functions
function setBetAmount(amount) {
    document.getElementById('betAmount').value = amount;
    if (window.game) {
        game.betAmount = amount;
    }
    playButtonClick();
}

function placeBet() {
    if (window.game) {
        game.placeBet();
    }
}

function cashOut() {
    if (window.game) {
        game.cashOut();
    }
}

// Modal Functions (из оригинального приложения)
function openPromoModal() {
    playButtonClick();
    const modal = document.getElementById('promoModal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function closePromoModal() {
    playButtonClick();
    const modal = document.getElementById('promoModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function activatePromoCode() {
    const input = document.getElementById('promoInput');
    if (!input || !window.game) return;
    
    const code = input.value.toUpperCase().trim();
    const promoCodes = {
        'START': 500,
        'BONUS': 1000,
        'WELCOME': 250,
        'GAME': 750,
        'CRASH': 300
    };
    
    if (promoCodes[code]) {
        game.balance += promoCodes[code];
        game.updateDisplay();
        game.showResult(`🎉 Промокод активирован! +${promoCodes[code]} ⭐`);
        input.value = '';
        closePromoModal();
        playBetSound();
        game.saveGameData();
    } else {
        game.showResult('❌ Неверный промокод');
    }
}

function openTopUpModal() {
    playButtonClick();
    const modal = document.getElementById('topUpModal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function closeTopUpModal() {
    playButtonClick();
    const modal = document.getElementById('topUpModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function setQuickAmount(amount) {
    playButtonClick();
    const input = document.getElementById('topUpAmount');
    if (input) {
        input.value = amount;
    }
    if (window.game) {
        game.showResult(`Выбрано ${amount} ⭐`);
    }
}

function purchaseFromInput() {
    playButtonClick();
    const input = document.getElementById('topUpAmount');
    const amount = input ? parseInt(input.value) || 100 : 100;
    if (window.game) {
        game.showResult(`💰 Покупка ${amount} ⭐ недоступна в демо версии`);
    }
}

// Initialize game when page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    // Initialize audio context on first user interaction
    document.addEventListener('click', initAudioContext, { once: true });
    document.addEventListener('touchstart', initAudioContext, { once: true });
    
    // Initialize Telegram WebApp
    if (tg.ready) tg.ready();
    if (tg.expand) tg.expand();
    
    // Initialize game
    game = new CrashGame();
    
    // Update demo players
    updateDemoPlayers();
    
    // Auto-save game data periodically
    setInterval(() => {
        if (game) game.saveGameData();
    }, 10000);
});

// Demo players function (адаптированная)
function updateDemoPlayers() {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;
    
    const players = [
        { name: 'Игрок1', bet: Math.floor(Math.random() * 500) + 50, multiplier: (Math.random() * 2 + 1).toFixed(1) },
        { name: 'Игрок2', bet: Math.floor(Math.random() * 1000) + 100, multiplier: (Math.random() * 3 + 1).toFixed(1) },
        { name: 'Игрок3', bet: Math.floor(Math.random() * 300) + 25, multiplier: (Math.random() * 1.5 + 1).toFixed(1) }
    ];
    
    playersList.innerHTML = players.map(player => `
        <div class="player-item">
            <span class="player-name">${player.name}</span>
            <span class="player-bet">${player.bet}⭐</span>
            <span class="player-multiplier">${player.multiplier}x</span>
        </div>
    `).join('');
}

// Update demo players periodically
setInterval(updateDemoPlayers, 8000);

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closePromoModal();
        closeTopUpModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && game && game.gameState === 'waiting') {
        e.preventDefault();
        placeBet();
    }
    if (e.code === 'Enter' && game && game.gameState === 'flying' && game.hasBet) {
        e.preventDefault();
        cashOut();
    }
});

// Prevent zoom on double tap (mobile optimization)
let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);
