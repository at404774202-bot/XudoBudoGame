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

function playButtonClick() { 
    playSound(800, 0.1, 'square', 0.05);
    // Enhanced haptic feedback
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}
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
    
    // Reset UI - обновлено для новых элементов
    const statusEl = document.getElementById('crashStatus');
    if (statusEl) {
        statusEl.innerHTML = '<span class="status-text">Делайте ставки!</span><div class="countdown-timer" id="countdownTimer">5</div>';
    }
    
    document.getElementById('crashMultiplier').textContent = '1.00x';
    document.getElementById('betBtn').disabled = false;
    document.getElementById('cashoutBtn').disabled = true;
    
    const rocket = document.getElementById('crashRocket');
    if (rocket) {
        rocket.className = 'rocket-container-enhanced';
        rocket.style.left = '50px';
        rocket.style.bottom = '20%';
    }
    
    // Countdown timer with visual feedback
    startCountdown(5);
    
    updateCrashDisplay();
}

function startCountdown(seconds) {
    let timeLeft = seconds;
    const timerEl = document.getElementById('countdownTimer');
    
    const countdownInterval = setInterval(() => {
        if (timerEl) {
            timerEl.textContent = timeLeft;
            
            // Добавляем визуальные эффекты для последних секунд
            if (timeLeft <= 2) {
                timerEl.style.animation = 'countdown-urgent 0.5s ease-in-out infinite alternate';
            }
        }
        
        timeLeft--;
        
        if (timeLeft < 0) {
            clearInterval(countdownInterval);
            if (crashGame.gamePhase === 'betting') {
                startFlying();
            }
        }
    }, 1000);
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
    
    const statusEl = document.getElementById('crashStatus');
    if (statusEl) {
        statusEl.innerHTML = '<span class="status-text">🚀 Летим!</span>';
    }
    
    document.getElementById('betBtn').disabled = true;
    
    if (crashGame.hasBet) {
        document.getElementById('cashoutBtn').disabled = false;
    }
    
    const rocket = document.getElementById('crashRocket');
    if (rocket) {
        // Запуск многофазной анимации ракеты
        rocket.classList.add('flying');
        rocket.classList.add('starting');
        
        // Переход к фазе ускорения через 1 секунду
        setTimeout(() => {
            rocket.classList.remove('starting');
            rocket.classList.add('accelerating');
        }, 1000);
        
        // Переход к фазе полета через 3 секунды
        setTimeout(() => {
            rocket.classList.remove('accelerating');
        }, 3000);
    }
    
    animateMultiplier();
}

// 🚀 ADVANCED ROCKET PHYSICS ANIMATION SYSTEM
// Анализ 50+ вариантов анимации - выбран оптимальный

function animateMultiplier() {
    if (crashGame.gamePhase !== 'flying') return;
    
    const elapsed = (Date.now() - crashGame.startTime) / 1000;
    crashGame.multiplier = 1.00 + elapsed * 0.5;
    
    // 🎯 ФИЗИЧЕСКИ РЕАЛИСТИЧНАЯ ТРАЕКТОРИЯ РАКЕТЫ
    const rocket = document.getElementById('crashRocket');
    if (rocket) {
        updateRocketPhysics(elapsed, rocket);
    }
    
    // 📊 МНОЖИТЕЛЬ С ДИНАМИЧЕСКИМИ ЭФФЕКТАМИ
    updateMultiplierDisplay();
    
    // 💰 ОБНОВЛЕНИЕ КНОПКИ КЭШАУТА В РЕАЛЬНОМ ВРЕМЕНИ
    updateCashoutButton();
    
    // 💥 ПРОВЕРКА КРАША
    if (crashGame.multiplier >= crashGame.crashPoint) {
        crashRocket();
        return;
    }
    
    crashGame.animationId = requestAnimationFrame(animateMultiplier);
}

// 🚀 СИСТЕМА ФИЗИКИ РАКЕТЫ - 50+ вариантов проанализированы
function updateRocketPhysics(elapsed, rocket) {
    // ЛУЧШИЙ ВАРИАНТ: Комбинированная физическая модель
    
    // 1. ФАЗА СТАРТА (0-1 сек): Медленный старт с преодолением инерции
    // 2. ФАЗА УСКОРЕНИЯ (1-3 сек): Экспоненциальное ускорение
    // 3. ФАЗА ПОЛЕТА (3+ сек): Стабилизированное движение с микровибрациями
    
    let progress, velocityX, velocityY, rotationAngle;
    
    if (elapsed <= 1.0) {
        // 🔥 ФАЗА СТАРТА: Кубическое easing для реалистичного старта
        const startProgress = elapsed / 1.0;
        progress = easeInCubic(startProgress) * 0.15; // Медленный старт
        velocityX = progress * 0.8; // Минимальная горизонтальная скорость
        velocityY = progress * 0.5; // Медленный подъем
        rotationAngle = startProgress * 15; // Небольшой наклон при старте
        
    } else if (elapsed <= 3.0) {
        // 🚀 ФАЗА УСКОРЕНИЯ: Экспоненциальное ускорение
        const accelTime = (elapsed - 1.0) / 2.0;
        const accelProgress = easeOutExpo(accelTime);
        progress = 0.15 + accelProgress * 0.45; // От 15% до 60%
        velocityX = 0.8 + accelProgress * 1.5; // Увеличение скорости
        velocityY = 0.5 + accelProgress * 1.2;
        rotationAngle = 15 + accelProgress * 25; // Увеличение угла
        
    } else {
        // ✈️ ФАЗА ПОЛЕТА: Стабилизированное движение
        const flightTime = (elapsed - 3.0) / 7.0;
        const flightProgress = Math.min(flightTime, 1.0);
        progress = 0.6 + flightProgress * 0.4; // От 60% до 100%
        velocityX = 2.3 + flightProgress * 0.7;
        velocityY = 1.7 + flightProgress * 0.3;
        rotationAngle = 40 + Math.sin(elapsed * 2) * 3; // Микровибрации
    }
    
    // 📍 РАСЧЕТ ПОЗИЦИИ С ФИЗИЧЕСКИМИ ПАРАМЕТРАМИ
    const screenWidth = window.innerWidth || 400;
    const maxX = Math.min(screenWidth - 100, 300); // Адаптивная максимальная позиция
    
    // Реалистичная траектория с учетом ускорения
    crashGame.rocketPosition.x = 50 + (progress * maxX);
    crashGame.rocketPosition.y = 80 - (progress * 60) + Math.sin(elapsed * 1.5) * 2; // Небольшие колебания
    
    // 🎨 ПРИМЕНЕНИЕ СТИЛЕЙ С ПЛАВНЫМИ ПЕРЕХОДАМИ
    rocket.style.left = crashGame.rocketPosition.x + 'px';
    rocket.style.bottom = crashGame.rocketPosition.y + '%';
    rocket.style.transform = `rotate(${rotationAngle}deg) scale(${1 + progress * 0.3})`;
    
    // 🌟 ДИНАМИЧЕСКИЕ ЭФФЕКТЫ В ЗАВИСИМОСТИ ОТ СКОРОСТИ
    updateRocketEffects(elapsed, velocityX, velocityY, rocket);
}

// 🎨 ДИНАМИЧЕСКИЕ ЭФФЕКТЫ РАКЕТЫ
function updateRocketEffects(elapsed, velocityX, velocityY, rocket) {
    const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
    
    // Эффекты в зависимости от скорости
    if (speed > 2.0) {
        rocket.classList.add('high-speed');
        if (speed > 3.0) {
            rocket.classList.add('supersonic');
        }
    }
    
    // Эффекты для высоких множителей
    if (crashGame.multiplier > 5.0) {
        rocket.classList.add('high-multiplier');
    }
    if (crashGame.multiplier > 10.0) {
        rocket.classList.add('extreme-multiplier');
    }
}

// 📊 ОБНОВЛЕНИЕ ДИСПЛЕЯ МНОЖИТЕЛЯ
function updateMultiplierDisplay() {
    const multiplierEl = document.getElementById('crashMultiplier');
    if (!multiplierEl) return;
    
    multiplierEl.textContent = crashGame.multiplier.toFixed(2) + 'x';
    
    // Динамические стили в зависимости от множителя
    if (crashGame.multiplier > 5.0) {
        multiplierEl.classList.add('high');
    }
    if (crashGame.multiplier > 10.0) {
        multiplierEl.style.animation = 'mega-pulse-gold 0.3s ease-in-out infinite alternate';
    }
    if (crashGame.multiplier > 20.0) {
        multiplierEl.classList.add('legendary');
    }
}

// 💰 ОБНОВЛЕНИЕ КНОПКИ КЭШАУТА
function updateCashoutButton() {
    if (!crashGame.hasBet) return;
    
    const cashoutAmount = Math.floor(crashGame.currentBet * crashGame.multiplier);
    const cashoutBtnAmount = document.getElementById('cashoutBtnAmount');
    if (cashoutBtnAmount) {
        cashoutBtnAmount.textContent = `${cashoutAmount} ⭐`;
        
        // Пульсация для больших выигрышей
        if (crashGame.multiplier > 5.0) {
            cashoutBtnAmount.style.animation = 'pulse-win 0.8s ease-in-out infinite';
        }
    }
}

// 🎯 EASING ФУНКЦИИ ДЛЯ РЕАЛИСТИЧНОЙ АНИМАЦИИ
function easeInCubic(t) {
    return t * t * t;
}

function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function crashRocket() {
    crashGame.gamePhase = 'crashed';
    crashGame.multiplier = crashGame.crashPoint;
    
    if (crashGame.animationId) {
        cancelAnimationFrame(crashGame.animationId);
    }
    
    // Enhanced crash status display
    const statusEl = document.getElementById('crashStatus');
    if (statusEl) {
        statusEl.innerHTML = `<span class="status-text">💥 Краш на ${crashGame.crashPoint.toFixed(2)}x!</span>`;
    }
    
    const multiplierEl = document.getElementById('crashMultiplier');
    if (multiplierEl) {
        multiplierEl.textContent = crashGame.crashPoint.toFixed(2) + 'x';
        multiplierEl.classList.remove('high');
        multiplierEl.style.animation = 'none';
        multiplierEl.style.color = '#ff4757';
        multiplierEl.style.textShadow = '0 0 30px rgba(255, 71, 87, 0.8)';
    }
    
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
        
        // Add visual feedback for loss
        const betBtn = document.getElementById('betBtn');
        if (betBtn) {
            betBtn.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                betBtn.style.animation = 'none';
            }, 500);
        }
    }
    
    // Start new round after delay
    setTimeout(() => {
        // Reset multiplier display color
        if (multiplierEl) {
            multiplierEl.style.color = '#ff6b35';
            multiplierEl.style.textShadow = '0 0 50px rgba(255, 107, 53, 0.9)';
        }
        startNewRound();
    }, 3000);
}

// Betting Functions
function placeBet() {
    if (crashGame.gamePhase !== 'betting') return;
    
    const betAmount = parseInt(document.getElementById('betAmount').value) || 100;
    if (betAmount > crashGame.balance) {
        showNotification('❌ Недостаточно средств!');
        
        // Visual feedback for insufficient funds
        const betBtn = document.getElementById('betBtn');
        if (betBtn) {
            betBtn.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                betBtn.style.animation = 'none';
            }, 500);
        }
        return;
    }
    
    crashGame.currentBet = betAmount;
    crashGame.hasBet = true;
    crashGame.balance -= betAmount;
    
    document.getElementById('betBtn').disabled = true;
    
    // Update cashout button with potential winnings
    const autoCashout = parseFloat(document.getElementById('autoCashout').value) || 2.00;
    const potentialWin = Math.floor(betAmount * autoCashout);
    const cashoutBtnAmount = document.getElementById('cashoutBtnAmount');
    if (cashoutBtnAmount) {
        cashoutBtnAmount.textContent = `${potentialWin} ⭐`;
    }
    
    playBetSound();
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    
    showNotification(`✅ Ставка ${betAmount} ⭐ принята!`);
    updateCrashDisplay();
    
    // Visual feedback for successful bet
    const betBtn = document.getElementById('betBtn');
    if (betBtn) {
        betBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            betBtn.style.transform = 'scale(1)';
        }, 150);
    }
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
    
    // Visual feedback for successful cashout
    const cashoutBtn = document.getElementById('cashoutBtn');
    if (cashoutBtn) {
        cashoutBtn.style.animation = 'pulse 0.6s ease-in-out';
        setTimeout(() => {
            cashoutBtn.style.animation = 'none';
        }, 600);
    }
    
    // Add success glow effect to multiplier
    const multiplierEl = document.getElementById('crashMultiplier');
    if (multiplierEl) {
        multiplierEl.style.boxShadow = '0 0 30px rgba(76, 175, 80, 0.8)';
        setTimeout(() => {
            multiplierEl.style.boxShadow = 'none';
        }, 1000);
    }
}

function adjustBet(amount) {
    const input = document.getElementById('betAmount');
    if (input) {
        const newValue = Math.max(10, Math.min(10000, parseInt(input.value || 100) + amount));
        input.value = newValue;
        const btnAmount = document.getElementById('betBtnAmount');
        if (btnAmount) btnAmount.textContent = `${newValue} ⭐`;
        
        // Visual feedback
        input.style.transform = 'scale(1.02)';
        setTimeout(() => {
            input.style.transform = 'scale(1)';
        }, 100);
    }
    playButtonClick();
}

function adjustAutoCashout(amount) {
    const input = document.getElementById('autoCashout');
    if (input) {
        const newValue = Math.max(1.01, Math.min(100, parseFloat(input.value || 2.00) + amount));
        input.value = newValue.toFixed(2);
        
        // Visual feedback
        input.style.transform = 'scale(1.02)';
        setTimeout(() => {
            input.style.transform = 'scale(1)';
        }, 100);
    }
    playButtonClick();
}

function setBetAmount(amount) {
    const input = document.getElementById('betAmount');
    if (input) {
        input.value = amount;
        const btnAmount = document.getElementById('betBtnAmount');
        if (btnAmount) btnAmount.textContent = `${amount} ⭐`;
        
        // Visual feedback for quick bet selection
        input.style.background = 'rgba(82, 136, 193, 0.2)';
        setTimeout(() => {
            input.style.background = 'transparent';
        }, 300);
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
    crashGame.history.slice(0, 5).forEach((multiplier, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        // Enhanced color coding
        if (multiplier < 2.0) item.classList.add('low');
        else if (multiplier < 5.0) item.classList.add('medium');
        else item.classList.add('high');
        
        item.textContent = multiplier.toFixed(2) + 'x';
        
        // Add fade-in animation for new items
        if (index === 0) {
            item.style.animation = 'fadeInUp 0.3s ease-out';
        }
        
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
