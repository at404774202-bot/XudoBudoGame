// XudoBudo Crash Game - Telegram Mini App
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

// Sound System
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

function playButtonClick() { playSound(800, 0.1, 'square', 0.05); }
function playBetSound() { playSound(600, 0.2, 'sine', 0.08); }
function playCashoutSound() { playSound(800, 0.3, 'triangle', 0.1); }
function playCrashSound() { playSound(200, 0.5, 'sawtooth', 0.15); }
function toggleSound() {
    soundEnabled = !soundEnabled;
    const buttons = ['soundToggle', 'crashSoundBtn'];
    
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.innerHTML = soundEnabled ? '🔊' : '🔇';
            btn.classList.toggle('muted', !soundEnabled);
        }
    });
    
    localStorage.setItem('crash_sound', soundEnabled.toString());
}

// Crash Game State
let crashGame = {
    balance: 1000,
    gamePhase: 'waiting', // waiting, betting, flying, crashed
    multiplier: 1.00,
    currentBet: 0,
    autoCashout: 2.00,
    hasBet: false,
    startTime: 0,
    crashPoint: 0,
    rocketPosition: { x: 50, y: 80 },
    history: [2.45, 1.23, 5.67, 3.21, 1.89],
    animationId: null
};

// Navigation
function showSection(sectionName) {
    playButtonClick();
    
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionName).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    if (sectionName === 'crash') {
        document.querySelector(`[onclick="showSection('games')"]`).classList.add('active');
        initializeCrashGame();
    } else {
        const navBtn = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
        if (navBtn) navBtn.classList.add('active');
    }
    
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

// Crash Game Functions
function initializeCrashGame() {
    updateCrashDisplay();
    updatePlayersList();
    startNewRound();
}

function startNewRound() {
    crashGame.gamePhase = 'betting';
    crashGame.multiplier = 1.00;
    crashGame.hasBet = false;
    crashGame.currentBet = 0;
    crashGame.crashPoint = generateCrashPoint();
    crashGame.rocketPosition = { x: 50, y: 80 };
    
    // Reset UI
    document.getElementById('crashStatus').textContent = 'Делайте ставки!';
    document.getElementById('crashMultiplier').textContent = '1.00x';
    document.getElementById('betBtn').disabled = false;
    document.getElementById('cashoutBtn').disabled = true;
    
    const rocket = document.getElementById('crashRocket');
    if (rocket) {
        rocket.className = 'rocket-container';
        rocket.style.left = '50px';
        rocket.style.bottom = '20%';
    }
    
    // Betting phase timer (5 seconds)
    setTimeout(() => {
        if (crashGame.gamePhase === 'betting') {
            startFlying();
        }
    }, 5000);
    
    updateCrashDisplay();
}

function generateCrashPoint() {
    const random = Math.random();
    if (random < 0.5) return 1.00 + Math.random() * 1.5; // 1.00-2.50x (50%)
    if (random < 0.8) return 2.50 + Math.random() * 2.5; // 2.50-5.00x (30%)
    if (random < 0.95) return 5.00 + Math.random() * 5.0; // 5.00-10.00x (15%)
    return 10.00 + Math.random() * 40.0; // 10.00-50.00x (5%)
}
function startFlying() {
    crashGame.gamePhase = 'flying';
    crashGame.startTime = Date.now();
    document.getElementById('crashStatus').textContent = 'Летим!';
    document.getElementById('betBtn').disabled = true;
    
    if (crashGame.hasBet) {
        document.getElementById('cashoutBtn').disabled = false;
    }
    
    const rocket = document.getElementById('crashRocket');
    if (rocket) {
        rocket.classList.add('flying');
    }
    
    animateMultiplier();
}

function animateMultiplier() {
    if (crashGame.gamePhase !== 'flying') return;
    
    const elapsed = (Date.now() - crashGame.startTime) / 1000;
    crashGame.multiplier = 1.00 + elapsed * 0.5;
    
    // Update rocket position
    const progress = Math.min(elapsed / 10, 1);
    crashGame.rocketPosition.x = 50 + progress * 200;
    crashGame.rocketPosition.y = 80 - progress * 60;
    
    const rocket = document.getElementById('crashRocket');
    if (rocket) {
        rocket.style.left = crashGame.rocketPosition.x + 'px';
        rocket.style.bottom = crashGame.rocketPosition.y + '%';
        
        if (crashGame.multiplier > 5.0) {
            rocket.classList.add('high-multiplier');
        }
    }
    
    const multiplierEl = document.getElementById('crashMultiplier');
    if (multiplierEl) {
        multiplierEl.textContent = crashGame.multiplier.toFixed(2) + 'x';
        if (crashGame.multiplier > 5.0) {
            multiplierEl.classList.add('high');
        }
    }
    
    // Check for crash
    if (crashGame.multiplier >= crashGame.crashPoint) {
        crashRocket();
        return;
    }
    
    crashGame.animationId = requestAnimationFrame(animateMultiplier);
}

function crashRocket() {
    crashGame.gamePhase = 'crashed';
    crashGame.multiplier = crashGame.crashPoint;
    
    if (crashGame.animationId) {
        cancelAnimationFrame(crashGame.animationId);
    }
    
    document.getElementById('crashStatus').textContent = `Краш на ${crashGame.crashPoint.toFixed(2)}x!`;
    document.getElementById('crashMultiplier').textContent = crashGame.crashPoint.toFixed(2) + 'x';
    document.getElementById('cashoutBtn').disabled = true;
    
    const rocket = document.getElementById('crashRocket');
    if (rocket) {
        rocket.classList.remove('flying', 'high-multiplier');
        rocket.classList.add('crashed');
    }
    
    playCrashSound();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    
    // Add to history
    crashGame.history.unshift(crashGame.crashPoint);
    if (crashGame.history.length > 10) crashGame.history.pop();
    updateHistory();
    
    // If player had bet and didn't cash out - lose money
    if (crashGame.hasBet) {
        showNotification(`💥 Краш! Потеряно ${crashGame.currentBet} ⭐`);
        crashGame.hasBet = false;
    }
    
    // Start new round after delay
    setTimeout(() => {
        startNewRound();
    }, 3000);
}

// Betting Functions
function placeBet() {
    if (crashGame.gamePhase !== 'betting') return;
    
    const betAmount = parseInt(document.getElementById('betAmount').value) || 100;
    if (betAmount > crashGame.balance) {
        showNotification('❌ Недостаточно средств!');
        return;
    }
    
    crashGame.currentBet = betAmount;
    crashGame.hasBet = true;
    crashGame.balance -= betAmount;
    
    document.getElementById('betBtn').disabled = true;
    const cashoutAmount = (betAmount * crashGame.autoCashout).toFixed(0);
    document.getElementById('cashoutBtnAmount').textContent = `${cashoutAmount} ⭐`;
    
    playBetSound();
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    
    showNotification(`✅ Ставка ${betAmount} ⭐ принята!`);
    updateCrashDisplay();
}

function cashOut() {
    if (crashGame.gamePhase !== 'flying' || !crashGame.hasBet) return;
    
    const winAmount = Math.floor(crashGame.currentBet * crashGame.multiplier);
    crashGame.balance += winAmount;
    crashGame.hasBet = false;
    
    document.getElementById('cashoutBtn').disabled = true;
    
    playCashoutSound();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    
    showNotification(`🎉 Выиграно ${winAmount} ⭐ на ${crashGame.multiplier.toFixed(2)}x!`);
    updateCrashDisplay();
}

function adjustBet(amount) {
    const input = document.getElementById('betAmount');
    if (input) {
        const newValue = Math.max(10, Math.min(10000, parseInt(input.value || 100) + amount));
        input.value = newValue;
        const btnAmount = document.getElementById('betBtnAmount');
        if (btnAmount) btnAmount.textContent = `${newValue} ⭐`;
    }
    playButtonClick();
}

function adjustAutoCashout(amount) {
    const input = document.getElementById('autoCashout');
    if (input) {
        const newValue = Math.max(1.01, Math.min(100, parseFloat(input.value || 2.00) + amount));
        input.value = newValue.toFixed(2);
    }
    playButtonClick();
}

function setBetAmount(amount) {
    const input = document.getElementById('betAmount');
    if (input) {
        input.value = amount;
        const btnAmount = document.getElementById('betBtnAmount');
        if (btnAmount) btnAmount.textContent = `${amount} ⭐`;
    }
    playButtonClick();
}
// Display Update Functions
function updateCrashDisplay() {
    const balanceElements = ['headerBalance', 'crashBalance', 'profileBalance', 'currentBalance'];
    balanceElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = crashGame.balance.toLocaleString();
    });
    
    const betInput = document.getElementById('betAmount');
    if (betInput) {
        const btnAmount = document.getElementById('betBtnAmount');
        if (btnAmount) btnAmount.textContent = `${betInput.value || 100} ⭐`;
    }
}

function updateHistory() {
    const historyEl = document.getElementById('crashHistory');
    if (!historyEl) return;
    
    historyEl.innerHTML = '';
    crashGame.history.slice(0, 10).forEach(multiplier => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        if (multiplier < 2.0) item.classList.add('low');
        else if (multiplier < 5.0) item.classList.add('medium');
        else item.classList.add('high');
        
        item.textContent = multiplier.toFixed(2) + 'x';
        historyEl.appendChild(item);
    });
}

function updatePlayersList() {
    const playersEl = document.getElementById('playersList');
    if (!playersEl) return;
    
    const players = [
        { name: 'Игрок1', bet: 150, status: 'waiting', avatar: 'И1', country: '🇷🇺' },
        { name: 'Игрок2', bet: 200, status: 'betting', avatar: 'И2', country: '🇺🇸' },
        { name: 'Игрок3', bet: 75, status: 'cashed', avatar: 'И3', country: '🇩🇪' },
        { name: 'Вы', bet: crashGame.currentBet, status: crashGame.hasBet ? 'betting' : 'waiting', avatar: 'ВЫ', country: '🇷🇺', isCurrentUser: true }
    ];
    
    playersEl.innerHTML = '';
    players.forEach(player => {
        const item = document.createElement('div');
        item.className = 'player-item';
        if (player.isCurrentUser) item.classList.add('current-user');
        
        item.innerHTML = `
            <div class="player-avatar-container">
                <div class="player-avatar-placeholder">${player.avatar}</div>
                <div class="country-flag">${player.country}</div>
            </div>
            <div class="player-info">
                <div class="player-name">${player.name}</div>
                <div class="player-username">@${player.name.toLowerCase()}</div>
            </div>
            <div class="player-status">
                <div class="status-badge ${player.status}">${getStatusText(player.status)}</div>
            </div>
        `;
        
        playersEl.appendChild(item);
    });
}

function getStatusText(status) {
    switch (status) {
        case 'waiting': return 'Ожидание';
        case 'betting': return 'Ставка';
        case 'cashed': return 'Забрал';
        case 'crashed': return 'Краш';
        default: return 'Ожидание';
    }
}

// Modal Functions
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
    if (!input) return;
    
    const code = input.value.toUpperCase().trim();
    const promoCodes = {
        'START': 500,
        'BONUS': 1000,
        'WELCOME': 250,
        'GAME': 750,
        'CRASH': 300
    };
    
    if (promoCodes[code]) {
        crashGame.balance += promoCodes[code];
        showNotification(`🎉 Промокод активирован! +${promoCodes[code]} ⭐`);
        input.value = '';
        closePromoModal();
        updateCrashDisplay();
        playBetSound();
        saveGameData();
    } else {
        showNotification('❌ Неверный промокод');
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
    showNotification(`Выбрано ${amount} ⭐`);
}

function purchaseFromInput() {
    playButtonClick();
    const input = document.getElementById('topUpAmount');
    const amount = input ? parseInt(input.value) || 100 : 100;
    showNotification(`💰 Покупка ${amount} ⭐ недоступна в демо версии`);
}

// Utility Functions
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.4s ease-out forwards';
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

function saveGameData() {
    try {
        localStorage.setItem('crash_balance', crashGame.balance.toString());
        localStorage.setItem('crash_history', JSON.stringify(crashGame.history));
    } catch (e) {
        console.log('Save error:', e);
    }
}

function loadGameData() {
    try {
        const savedBalance = localStorage.getItem('crash_balance');
        if (savedBalance) crashGame.balance = Math.max(100, parseInt(savedBalance));
        
        const savedHistory = localStorage.getItem('crash_history');
        if (savedHistory) crashGame.history = JSON.parse(savedHistory);
        
        const soundSaved = localStorage.getItem('crash_sound');
        if (soundSaved !== null) {
            soundEnabled = soundSaved === 'true';
            toggleSound();
            toggleSound(); // Call twice to set correct state
        }
    } catch (e) {
        console.log('Load error:', e);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    loadGameData();
    updateCrashDisplay();
    
    // Initialize Telegram WebApp
    if (tg.ready) tg.ready();
    if (tg.expand) tg.expand();
    
    // Set up input event listeners
    const betInput = document.getElementById('betAmount');
    if (betInput) {
        betInput.addEventListener('input', () => {
            const btnAmount = document.getElementById('betBtnAmount');
            if (btnAmount) btnAmount.textContent = `${betInput.value || 100} ⭐`;
        });
    }
});

// Auto-save game data periodically
setInterval(saveGameData, 10000);
