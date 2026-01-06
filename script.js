// XudoBudoGame - Complete Telegram Mini App
// Telegram Web App initialization
let tg = window.Telegram?.WebApp || {
    expand: () => console.log('TG: expand'),
    ready: () => console.log('TG: ready'),
    close: () => console.log('TG: close'),
    HapticFeedback: {
        impactOccurred: (type) => console.log('TG: haptic', type),
        notificationOccurred: (type) => console.log('TG: notification', type)
    },
    BackButton: { show: () => {}, hide: () => {} },
    colorScheme: 'dark',
    themeParams: {
        bg_color: '#17212b', text_color: '#f5f5f5', hint_color: '#708499',
        link_color: '#6ab3f3', button_color: '#5288c1', button_text_color: '#ffffff',
        secondary_bg_color: '#232e3c'
    },
    onEvent: (event, callback) => console.log('TG: event listener', event),
    openTelegramLink: (url) => console.log('TG: open link', url),
    openInvoice: (url, callback) => {
        console.log('TG: open invoice', url);
        if (callback) callback({ status: 'paid' });
    },
    initDataUnsafe: {
        user: { id: 123456789, first_name: 'Player', username: 'player123' }
    }
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
}

function playCrashSound() {
    playSound(200, 0.3, 'sawtooth', 0.1);
    setTimeout(() => playSound(100, 0.2, 'triangle', 0.08), 100);
}

function playCashoutSound() {
    playSound(600, 0.2, 'sine', 0.08);
    setTimeout(() => playSound(800, 0.15, 'sine', 0.06), 150);
}

function playSuccessSound() {
    playSound(523, 0.15, 'sine', 0.06);
    setTimeout(() => playSound(659, 0.15, 'sine', 0.06), 150);
    setTimeout(() => playSound(784, 0.2, 'sine', 0.08), 300);
}

function playErrorSound() {
    playSound(300, 0.2, 'sawtooth', 0.08);
    setTimeout(() => playSound(200, 0.3, 'sawtooth', 0.1), 200);
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('soundToggle');
    const crashBtn = document.getElementById('crashSoundBtn');
    
    [btn, crashBtn].forEach(button => {
        if (button) {
            const icon = button.querySelector('.sound-icon') || button.querySelector('svg');
            if (soundEnabled) {
                button.classList.remove('muted');
                if (icon && icon.textContent !== undefined) icon.textContent = '🔊';
            } else {
                button.classList.add('muted');
                if (icon && icon.textContent !== undefined) icon.textContent = '🔇';
            }
        }
    });
    
    if (soundEnabled) playSuccessSound();
    localStorage.setItem('xudobudo_sound', soundEnabled.toString());
}

function loadSoundSettings() {
    const saved = localStorage.getItem('xudobudo_sound');
    if (saved !== null) {
        soundEnabled = saved === 'true';
        const btn = document.getElementById('soundToggle');
        const crashBtn = document.getElementById('crashSoundBtn');
        
        [btn, crashBtn].forEach(button => {
            if (button) {
                const icon = button.querySelector('.sound-icon') || button.querySelector('svg');
                if (soundEnabled) {
                    button.classList.remove('muted');
                    if (icon && icon.textContent !== undefined) icon.textContent = '🔊';
                } else {
                    button.classList.add('muted');
                    if (icon && icon.textContent !== undefined) icon.textContent = '🔇';
                }
            }
        });
    }
}

function getUserData() {
    if (tg.initDataUnsafe?.user) {
        return {
            id: tg.initDataUnsafe.user.id,
            firstName: tg.initDataUnsafe.user.first_name || 'Player',
            lastName: tg.initDataUnsafe.user.last_name || '',
            username: tg.initDataUnsafe.user.username || 'player123',
            photoUrl: tg.initDataUnsafe.user.photo_url || '',
            languageCode: tg.initDataUnsafe.user.language_code || 'ru'
        };
    }
    return { 
        id: 123456789, 
        firstName: 'Player', 
        lastName: '',
        username: 'player123', 
        photoUrl: '',
        languageCode: 'ru'
    };
}

// Game State
let gameState = {
    balance: 1000, currentBet: 0, autoCashout: 2.00, hasBet: false,
    multiplier: 1.00, crashPoint: 0, gamePhase: 'waiting',
    gameInterval: null, gameStartTime: 0, canvas: null, ctx: null,
    curve: [], gameHistory: [5.67, 2.45, 1.23, 8.91, 1.05],
    stats: { gamesPlayed: 0, gamesWon: 0, totalWinnings: 0, bestMultiplier: 0 },
    realPlayers: [], currentUser: null
};

// Real Players System
function initializeCurrentUser() {
    gameState.currentUser = getUserData();
    
    const currentPlayer = {
        id: gameState.currentUser.id,
        firstName: gameState.currentUser.firstName,
        lastName: gameState.currentUser.lastName,
        username: gameState.currentUser.username,
        photoUrl: gameState.currentUser.photoUrl,
        languageCode: gameState.currentUser.languageCode,
        bet: 0,
        status: 'waiting',
        cashoutMultiplier: null,
        isCurrentUser: true,
        joinTime: Date.now()
    };
    
    gameState.realPlayers = [currentPlayer];
    updateCrashPlayersDisplay();
}

function updateCrashPlayersDisplay() {
    const container = document.getElementById('crashPlayersList');
    const countEl = document.getElementById('crashOnlineCount');
    
    if (!container) return;
    
    container.innerHTML = '';
    if (countEl) countEl.textContent = gameState.realPlayers.length;
    
    const sortedPlayers = [...gameState.realPlayers].sort((a, b) => {
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;
        return a.joinTime - b.joinTime;
    });
    
    sortedPlayers.forEach(player => {
        const item = document.createElement('div');
        item.className = `real-player-item ${player.isCurrentUser ? 'current-user' : ''}`;
        
        let statusText = 'Ждет', statusClass = 'waiting';
        if (player.status === 'betting' && player.bet > 0) {
            statusText = `${player.bet} ⭐`;
            statusClass = 'betting';
        } else if (player.status === 'cashed') {
            statusText = `${player.cashoutMultiplier}x`;
            statusClass = 'cashed';
        } else if (player.status === 'crashed') {
            statusText = 'Краш';
            statusClass = 'crashed';
        }
        
        const displayName = player.firstName + (player.lastName ? ` ${player.lastName}` : '');
        const initials = (player.firstName.charAt(0) + (player.lastName ? player.lastName.charAt(0) : '')).toUpperCase();
        
        let avatarHtml = '';
        if (player.photoUrl) {
            avatarHtml = `
                <img src="${player.photoUrl}" alt="${displayName}" class="real-player-avatar" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="real-player-avatar-placeholder" style="display:none;">${initials}</div>
            `;
        } else {
            avatarHtml = `<div class="real-player-avatar-placeholder">${initials}</div>`;
        }
        
        const countryFlags = {
            'ru': '🇷🇺', 'uk': '🇺🇦', 'be': '🇧🇾', 'kk': '🇰🇿', 'uz': '🇺🇿', 'ky': '🇰🇬',
            'en': '🇺🇸', 'de': '🇩🇪', 'fr': '🇫🇷', 'es': '🇪🇸', 'it': '🇮🇹'
        };
        const countryFlag = countryFlags[player.languageCode] || countryFlags['ru'];
        
        item.innerHTML = `
            <div class="real-player-avatar-container">
                ${avatarHtml}
                <div class="country-flag">${countryFlag}</div>
            </div>
            <div class="real-player-info">
                <div class="real-player-name">${displayName}</div>
                <div class="real-player-username">@${player.username}</div>
            </div>
            <div class="real-player-status">
                <span class="player-status ${statusClass}">${statusText}</span>
            </div>
        `;
        
        container.appendChild(item);
    });
}

function updateRealPlayersStatus() {
    gameState.realPlayers.forEach(player => {
        if (player.status === 'betting' && !player.isCurrentUser && Math.random() < 0.08 && gameState.multiplier > 1.2) {
            player.status = 'cashed';
            player.cashoutMultiplier = gameState.multiplier.toFixed(2);
        }
    });
    updateCrashPlayersDisplay();
}

function applyTelegramTheme() {
    if (tg.themeParams) {
        const root = document.documentElement;
        Object.entries(tg.themeParams).forEach(([key, value]) => {
            root.style.setProperty(`--tg-theme-${key.replace('_', '-')}`, value);
        });
    }
}

function loadSavedBalance() {
    try {
        const saved = localStorage.getItem('xudobudo_balance');
        if (saved) gameState.balance = Math.max(1, Math.min(parseInt(saved), 1000000));
        const stats = localStorage.getItem('xudobudo_stats');
        if (stats) gameState.stats = { ...gameState.stats, ...JSON.parse(stats) };
    } catch (e) { console.log('Load error:', e); }
}

function saveGameStats() {
    try {
        localStorage.setItem('xudobudo_balance', gameState.balance.toString());
        localStorage.setItem('xudobudo_stats', JSON.stringify(gameState.stats));
    } catch (e) { console.log('Save error:', e); }
}

// Navigation
function showSection(sectionName) {
    playButtonClick();
    
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionName).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    if (sectionName === 'crash') {
        document.querySelector(`[onclick="showSection('games')"]`).classList.add('active');
    } else {
        const navBtn = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
        if (navBtn) navBtn.classList.add('active');
    }
    
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    
    if (sectionName === 'crash') {
        initializeCrashGame();
    }
}

// MODERN CRASH GAME FUNCTIONS
function initializeCrashGame() {
    initializeCanvas();
    updateModernGameDisplay();
    
    if (!gameState.currentUser) {
        initializeCurrentUser();
    }
    
    const modernGame = document.querySelector('.crash-game-modern');
    if (modernGame) {
        modernGame.classList.add('active');
    }
    
    initializeTabs();
    
    if (gameState.gamePhase === 'waiting') startNewRound();
}

function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            playButtonClick();
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

function updateModernGameDisplay() {
    const multiplierEl = document.getElementById('crashMultiplier');
    if (multiplierEl) {
        multiplierEl.textContent = `${gameState.multiplier.toFixed(2)}x`;
        
        if (gameState.multiplier >= 10) {
            multiplierEl.style.color = '#FFD700';
            multiplierEl.style.textShadow = '0 0 40px rgba(255, 215, 0, 1)';
        } else if (gameState.multiplier >= 5) {
            multiplierEl.style.color = '#4CAF50';
            multiplierEl.style.textShadow = '0 0 35px rgba(76, 175, 80, 0.8)';
        } else if (gameState.multiplier >= 2) {
            multiplierEl.style.color = '#FF9800';
            multiplierEl.style.textShadow = '0 0 30px rgba(255, 152, 0, 0.7)';
        } else {
            multiplierEl.style.color = '#ff6b35';
            multiplierEl.style.textShadow = '0 0 30px rgba(255, 107, 53, 0.8)';
        }
    }
    
    const statusEl = document.getElementById('crashStatusText');
    const timerEl = document.getElementById('crashTimer');
    
    if (statusEl) {
        if (gameState.gamePhase === 'betting') {
            statusEl.textContent = 'Прием ставок';
        } else if (gameState.gamePhase === 'flying') {
            statusEl.textContent = 'Ракета летит!';
        } else if (gameState.gamePhase === 'crashed') {
            statusEl.textContent = `Краш на ${gameState.crashPoint.toFixed(2)}x`;
        } else {
            statusEl.textContent = 'Ожидание игроков';
        }
    }
    
    const balanceEl = document.getElementById('crashBalance');
    if (balanceEl) balanceEl.textContent = gameState.balance.toLocaleString();
    
    updateModernBetButton();
    updateModernCashoutButton();
    updateBalance();
}

function updateModernBetButton() {
    const betBtn = document.getElementById('crashBetBtn');
    const betAmountInput = document.getElementById('betAmountInput');
    
    if (!betBtn || !betAmountInput) return;
    
    const amount = parseInt(betAmountInput.value) || 100;
    const amountSpan = betBtn.querySelector('.btn-amount');
    if (amountSpan) amountSpan.textContent = `${amount} ⭐`;
    
    if (gameState.gamePhase === 'betting' && !gameState.hasBet) {
        betBtn.disabled = false;
        betBtn.style.opacity = '1';
    } else {
        betBtn.disabled = true;
        betBtn.style.opacity = '0.5';
    }
}

function updateModernCashoutButton() {
    const cashoutBtn = document.getElementById('crashCashoutBtn');
    if (!cashoutBtn) return;
    
    const amountSpan = cashoutBtn.querySelector('.btn-amount');
    if (amountSpan && gameState.hasBet) {
        const winAmount = Math.floor(gameState.currentBet * gameState.multiplier);
        amountSpan.textContent = `${winAmount} ⭐`;
    }
    
    if (gameState.gamePhase === 'flying' && gameState.hasBet) {
        cashoutBtn.disabled = false;
        cashoutBtn.style.opacity = '1';
    } else {
        cashoutBtn.disabled = true;
        cashoutBtn.style.opacity = '0.5';
    }
}

function placeCrashBet() {
    playButtonClick();
    
    if (gameState.gamePhase !== 'betting' || gameState.hasBet) return;
    
    const betAmountInput = document.getElementById('betAmountInput');
    if (!betAmountInput) return;
    
    const betAmount = parseInt(betAmountInput.value) || 100;
    
    if (betAmount < 1) {
        playErrorSound();
        return showNotification('⚠️ Минимальная ставка: 1 ⭐');
    }
    
    if (betAmount > gameState.balance) {
        playErrorSound();
        return showNotification('⚠️ Недостаточно средств!');
    }
    
    gameState.balance -= betAmount;
    gameState.currentBet = betAmount;
    gameState.autoCashout = parseFloat(document.getElementById('autoCashoutInput').value) || 2.00;
    gameState.hasBet = true;
    
    const currentPlayer = gameState.realPlayers.find(p => p.isCurrentUser);
    if (currentPlayer) {
        currentPlayer.bet = betAmount;
        currentPlayer.status = 'betting';
    }
    
    updateModernGameDisplay();
    updateCrashPlayersDisplay();
    saveGameStats();
    
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    showNotification(`✅ Ставка ${betAmount} ⭐ принята!`);
}

function crashCashout() {
    playButtonClick();
    
    if (!gameState.hasBet || gameState.gamePhase !== 'flying') return;
    
    const winAmount = Math.floor(gameState.currentBet * gameState.multiplier);
    gameState.balance += winAmount;
    
    gameState.stats.gamesPlayed++;
    gameState.stats.gamesWon++;
    gameState.stats.totalWinnings += winAmount - gameState.currentBet;
    gameState.stats.bestMultiplier = Math.max(gameState.stats.bestMultiplier, gameState.multiplier);
    
    const currentPlayer = gameState.realPlayers.find(p => p.isCurrentUser);
    if (currentPlayer) {
        currentPlayer.status = 'cashed';
        currentPlayer.cashoutMultiplier = gameState.multiplier.toFixed(2);
    }
    
    gameState.hasBet = false;
    gameState.currentBet = 0;
    
    updateModernGameDisplay();
    updateCrashPlayersDisplay();
    saveGameStats();
    
    playCashoutSound();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    showNotification(`🎉 Выигрыш: ${winAmount} ⭐ (${gameState.multiplier.toFixed(2)}x)`);
}

function adjustBet(amount) {
    playButtonClick();
    const input = document.getElementById('betAmountInput');
    if (!input) return;
    
    let currentValue = parseInt(input.value) || 100;
    let newValue = currentValue + amount;
    
    if (newValue < 1) newValue = 1;
    if (newValue > gameState.balance) newValue = gameState.balance;
    
    input.value = newValue;
    updateModernBetButton();
}

function adjustCashout(amount) {
    playButtonClick();
    const input = document.getElementById('autoCashoutInput');
    if (!input) return;
    
    let currentValue = parseFloat(input.value) || 2.00;
    let newValue = currentValue + amount;
    
    if (newValue < 1.01) newValue = 1.01;
    if (newValue > 1000) newValue = 1000;
    
    input.value = newValue.toFixed(2);
}

function setQuickBet(amount) {
    playButtonClick();
    const input = document.getElementById('betAmountInput');
    if (input) {
        input.value = amount;
        updateModernBetButton();
    }
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

// Game Logic
function generateCrashPoint() {
    const rand = Math.random();
    if (rand < 0.33) return parseFloat((1.00 + Math.random() * 0.50).toFixed(2));
    if (rand < 0.60) return parseFloat((1.50 + Math.random() * 1.00).toFixed(2));
    if (rand < 0.80) return parseFloat((2.50 + Math.random() * 2.50).toFixed(2));
    if (rand < 0.95) return parseFloat((5.00 + Math.random() * 10.00).toFixed(2));
    return parseFloat((15.00 + Math.random() * 35.00).toFixed(2));
}

function startNewRound() {
    gameState.gamePhase = 'betting';
    gameState.multiplier = 1.00;
    gameState.curve = [];
    gameState.crashPoint = generateCrashPoint();
    gameState.hasBet = false;
    
    gameState.realPlayers.forEach(player => {
        player.status = 'waiting';
        player.bet = 0;
        player.cashoutMultiplier = null;
    });
    updateCrashPlayersDisplay();
    
    // Правильная инициализация ракеты
    const rocket = document.getElementById('rocketPlane');
    if (rocket) {
        // Убираем все классы анимации
        rocket.classList.remove('flying', 'crashed', 'high-multiplier');
        
        // Сбрасываем позицию в начальную точку
        rocket.style.left = '40px';
        rocket.style.bottom = '40px';
        rocket.style.transform = 'rotate(0deg) scale(1)';
        rocket.style.filter = 'brightness(1.2) drop-shadow(0 0 8px rgba(255, 107, 53, 0.6))';
        
        // Скрываем эффекты
        const trail = rocket.querySelector('.rocket-trail');
        if (trail) trail.style.opacity = '0';
        
        const glow = rocket.querySelector('.rocket-glow');
        if (glow) glow.style.opacity = '0';
    }
    
    updateModernGameDisplay();
    let countdown = 5;
    const timerEl = document.getElementById('crashTimer');
    if (timerEl) timerEl.textContent = countdown;
    
    const interval = setInterval(() => {
        countdown--;
        if (timerEl) timerEl.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(interval);
            startFlying();
        }
    }, 1000);
}

function startFlying() {
    gameState.gamePhase = 'flying';
    gameState.multiplier = 1.00;
    gameState.gameStartTime = Date.now();
    
    const timerEl = document.getElementById('crashTimer');
    if (timerEl) timerEl.textContent = '🚀';
    
    const betBtn = document.getElementById('crashBetBtn');
    if (betBtn) betBtn.disabled = true;
    
    if (gameState.hasBet) {
        const cashoutBtn = document.getElementById('crashCashoutBtn');
        if (cashoutBtn) cashoutBtn.disabled = false;
    }
    
    // Запускаем анимацию полета ракеты
    const rocket = document.getElementById('rocketPlane');
    if (rocket) {
        rocket.classList.add('flying');
        
        // Показываем эффекты
        const trail = rocket.querySelector('.rocket-trail');
        if (trail) trail.style.opacity = '0.7';
        
        const glow = rocket.querySelector('.rocket-glow');
        if (glow) glow.style.opacity = '0.4';
    }
    
    gameState.gameInterval = setInterval(() => {
        updateMultiplier();
        updateRocketPosition();
        drawChart();
        updateModernGameDisplay();
        updateRealPlayersStatus();
        
        if (gameState.multiplier >= gameState.crashPoint) crashGame();
        if (gameState.hasBet && gameState.autoCashout > 0 && gameState.multiplier >= gameState.autoCashout) crashCashout();
    }, 100);
}

function updateMultiplier() {
    const timeElapsed = (Date.now() - gameState.gameStartTime) / 1000;
    
    let baseSpeed = 0.008;
    
    if (timeElapsed < 2) {
        baseSpeed *= (0.5 + timeElapsed * 0.25);
    } else if (timeElapsed < 5) {
        baseSpeed *= (1 + (timeElapsed - 2) * 0.3);
    } else if (timeElapsed < 10) {
        baseSpeed *= (1.9 + (timeElapsed - 5) * 0.4);
    } else {
        baseSpeed *= (4.9 + (timeElapsed - 10) * 0.2);
    }
    
    const randomFactor = 0.8 + Math.random() * 0.4;
    const increment = baseSpeed * randomFactor;
    
    gameState.multiplier += increment;
    gameState.multiplier = Math.min(gameState.multiplier, gameState.crashPoint);
    
    const jumpChance = gameState.multiplier > 5 ? 0.05 : 0.02;
    if (Math.random() < jumpChance) {
        const jumpSize = gameState.multiplier > 10 ? 0.05 + Math.random() * 0.1 : 0.01 + Math.random() * 0.03;
        gameState.multiplier += jumpSize;
        gameState.multiplier = Math.min(gameState.multiplier, gameState.crashPoint);
    }
}

function updateRocketPosition() {
    const rocket = document.getElementById('rocketPlane');
    if (!rocket) return;
    
    const gameArea = document.querySelector('.chart-container');
    if (!gameArea) return;
    
    // Получаем размеры контейнера
    const containerWidth = gameArea.offsetWidth;
    const containerHeight = gameArea.offsetHeight;
    
    // Плавный прогресс на основе множителя
    const maxMultiplier = Math.max(gameState.crashPoint, 10);
    const progress = Math.min((gameState.multiplier - 1) / (maxMultiplier - 1), 1);
    
    // Горизонтальное движение - плавная кривая
    const startX = 40;
    const endX = containerWidth - 60;
    const x = startX + (endX - startX) * Math.pow(progress, 0.7); // Степенная функция для плавности
    
    // Вертикальное движение - логарифмическая кривая как в настоящих краш играх
    const startY = containerHeight - 40;
    const endY = 40;
    const logProgress = progress > 0 ? Math.log(1 + progress * 9) / Math.log(10) : 0;
    const y = startY - (startY - endY) * logProgress;
    
    // Плавный поворот ракеты
    const maxRotation = 25;
    const rotation = Math.min(progress * maxRotation, maxRotation);
    
    // Плавное масштабирование
    const minScale = 1;
    const maxScale = 1.3;
    const scale = minScale + (maxScale - minScale) * Math.min(progress * 1.5, 1);
    
    // Применяем позицию с плавными переходами
    rocket.style.left = `${x}px`;
    rocket.style.bottom = `${containerHeight - y}px`;
    rocket.style.transform = `rotate(${rotation}deg) scale(${scale})`;
    
    // Эффекты для высоких множителей
    if (gameState.multiplier > 3) {
        rocket.classList.add('high-multiplier');
        
        // Плавное свечение без резких изменений
        const glowIntensity = Math.min((gameState.multiplier - 3) / 7, 1); // От 0 до 1
        const brightness = 1.2 + glowIntensity * 0.6;
        const glowSize = 10 + glowIntensity * 15;
        
        rocket.style.filter = `brightness(${brightness}) drop-shadow(0 0 ${glowSize}px rgba(255, 107, 53, ${0.6 + glowIntensity * 0.4}))`;
        
        // Добавляем след ракеты
        const trail = rocket.querySelector('.rocket-trail');
        if (trail) {
            trail.style.opacity = Math.min(glowIntensity, 0.8);
            trail.style.width = `${60 + glowIntensity * 40}px`;
        }
        
        const glow = rocket.querySelector('.rocket-glow');
        if (glow) {
            glow.style.opacity = Math.min(glowIntensity * 0.6, 0.4);
        }
    } else {
        rocket.classList.remove('high-multiplier');
        rocket.style.filter = 'brightness(1.2) drop-shadow(0 0 8px rgba(255, 107, 53, 0.6))';
        
        // Скрываем эффекты
        const trail = rocket.querySelector('.rocket-trail');
        if (trail) trail.style.opacity = '0';
        
        const glow = rocket.querySelector('.rocket-glow');
        if (glow) glow.style.opacity = '0';
    }
    
    // Добавляем небольшое покачивание для реалистичности (очень деликатное)
    const wobble = Math.sin(Date.now() * 0.01) * 0.5; // Очень маленькое покачивание
    rocket.style.transform += ` translateY(${wobble}px)`;
}

function crashGame() {
    clearInterval(gameState.gameInterval);
    gameState.gamePhase = 'crashed';
    
    const timerEl = document.getElementById('crashTimer');
    if (timerEl) timerEl.textContent = '💥';
    
    // Красивая анимация краша ракеты
    const rocket = document.getElementById('rocketPlane');
    if (rocket) {
        rocket.classList.remove('flying', 'high-multiplier');
        rocket.classList.add('crashed');
        
        // Запускаем анимацию взрыва для эффектов
        const trail = rocket.querySelector('.rocket-trail');
        if (trail) {
            trail.style.background = 'linear-gradient(90deg, rgba(255, 0, 0, 1) 0%, rgba(255, 107, 53, 0.5) 50%, transparent 100%)';
        }
        
        const glow = rocket.querySelector('.rocket-glow');
        if (glow) {
            glow.style.background = 'radial-gradient(circle, rgba(255, 0, 0, 0.8) 0%, rgba(255, 107, 53, 0.4) 50%, transparent 70%)';
        }
    }
    
    if (gameState.hasBet) {
        gameState.stats.gamesPlayed++;
        
        const currentPlayer = gameState.realPlayers.find(p => p.isCurrentUser);
        if (currentPlayer) {
            currentPlayer.status = 'crashed';
        }
        
        gameState.hasBet = false;
        gameState.currentBet = 0;
        
        playCrashSound();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        showNotification(`💥 Краш на ${gameState.crashPoint.toFixed(2)}x! Ставка проиграна.`);
    } else {
        playCrashSound();
    }
    
    gameState.realPlayers.forEach(player => {
        if (player.status === 'betting') {
            player.status = 'crashed';
        }
    });
    
    gameState.gameHistory.unshift(gameState.crashPoint);
    if (gameState.gameHistory.length > 10) gameState.gameHistory.pop();
    updateCrashHistory();
    
    updateModernGameDisplay();
    updateCrashPlayersDisplay();
    saveGameStats();
    
    setTimeout(() => {
        startNewRound();
    }, 3000);
}

function updateCrashHistory() {
    const historyEl = document.getElementById('crashHistory');
    if (!historyEl) return;
    
    historyEl.innerHTML = '';
    gameState.gameHistory.forEach(multiplier => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.textContent = `${multiplier.toFixed(2)}x`;
        
        if (multiplier < 2) {
            item.classList.add('low');
        } else if (multiplier < 5) {
            item.classList.add('medium');
        } else {
            item.classList.add('high');
        }
        
        historyEl.appendChild(item);
    });
}

function initializeCanvas() {
    gameState.canvas = document.getElementById('gameCanvas');
    if (!gameState.canvas) return;
    
    gameState.ctx = gameState.canvas.getContext('2d');
    const container = gameState.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    gameState.canvas.width = rect.width * window.devicePixelRatio;
    gameState.canvas.height = 200 * window.devicePixelRatio;
    gameState.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    gameState.canvas.style.width = rect.width + 'px';
    gameState.canvas.style.height = '200px';
    drawChart();
}

function drawChart() {
    if (!gameState.ctx || !gameState.canvas) return;
    
    const ctx = gameState.ctx;
    const width = gameState.canvas.style.width ? parseInt(gameState.canvas.style.width) : gameState.canvas.width;
    const height = gameState.canvas.style.height ? parseInt(gameState.canvas.style.height) : gameState.canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const bgGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height));
    bgGradient.addColorStop(0, 'rgba(10, 10, 10, 0.3)');
    bgGradient.addColorStop(0.5, 'rgba(26, 26, 46, 0.5)');
    bgGradient.addColorStop(1, 'rgba(22, 33, 62, 0.7)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    if (gameState.gamePhase === 'flying' && gameState.curve.length > 1) {
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, 'rgba(255, 107, 53, 0.1)');
        gradient.addColorStop(0.3, 'rgba(255, 107, 53, 0.3)');
        gradient.addColorStop(0.7, 'rgba(255, 107, 53, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 107, 53, 0.8)');
        
        ctx.beginPath();
        ctx.moveTo(0, height);
        
        gameState.curve.forEach((point, index) => {
            const x = (index / (gameState.curve.length - 1)) * width;
            const normalizedMultiplier = Math.log(point) / Math.log(Math.max(gameState.crashPoint, 10));
            const y = height - (normalizedMultiplier * height * 0.8);
            
            if (index === 0) {
                ctx.moveTo(x, Math.min(height, Math.max(0, y)));
            } else {
                ctx.lineTo(x, Math.min(height, Math.max(0, y)));
            }
        });
        
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.beginPath();
        gameState.curve.forEach((point, index) => {
            const x = (index / (gameState.curve.length - 1)) * width;
            const normalizedMultiplier = Math.log(point) / Math.log(Math.max(gameState.crashPoint, 10));
            const y = height - (normalizedMultiplier * height * 0.8);
            
            if (index === 0) {
                ctx.moveTo(x, Math.min(height, Math.max(0, y)));
            } else {
                ctx.lineTo(x, Math.min(height, Math.max(0, y)));
            }
        });
        
        const lineGradient = ctx.createLinearGradient(0, 0, width, 0);
        lineGradient.addColorStop(0, '#ff6b35');
        lineGradient.addColorStop(0.5, '#ff4757');
        lineGradient.addColorStop(1, '#ff3742');
        
        ctx.strokeStyle = lineGradient;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#ff6b35';
        ctx.shadowBlur = 10;
        ctx.stroke();
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
    
    if (gameState.gamePhase === 'flying') {
        gameState.curve.push(gameState.multiplier);
        if (gameState.curve.length > 150) {
            gameState.curve.shift();
        }
    }
}

// Top Up Functions
function openTopUpModal() {
    playButtonClick();
    document.getElementById('topUpModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    const el = document.getElementById('currentBalance');
    if (el) el.textContent = `${gameState.balance.toLocaleString()} ⭐`;
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
}

function closeTopUpModal() {
    playButtonClick();
    document.getElementById('topUpModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function setQuickAmount(amount) {
    playButtonClick();
    const input = document.getElementById('topUpAmount');
    if (input) {
        input.value = amount;
        input.style.transform = 'scale(1.05)';
        setTimeout(() => input.style.transform = 'scale(1)', 200);
    }
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function purchaseFromInput() {
    playButtonClick();
    const input = document.getElementById('topUpAmount');
    if (!input) return;
    const amount = parseInt(input.value);
    if (!amount || amount < 1) {
        playErrorSound();
        return showNotification('⚠️ Введите корректную сумму!');
    }
    if (amount > 10000) {
        playErrorSound();
        return showNotification('⚠️ Максимальная сумма: 10,000 звезд');
    }
    purchaseStars(amount);
}

function purchaseStars(amount) {
    showNotification('🔄 Обработка платежа...');
    
    if (tg.openInvoice) {
        const invoiceUrl = `https://t.me/$invoice?start=XTR_${amount}_${Date.now()}`;
        tg.openInvoice(invoiceUrl, (result) => {
            if (result.status === 'paid') {
                gameState.balance += amount;
                updateBalance();
                const el = document.getElementById('currentBalance');
                if (el) el.textContent = `${gameState.balance.toLocaleString()} ⭐`;
                const input = document.getElementById('topUpAmount');
                if (input) input.value = '';
                closeTopUpModal();
                playSuccessSound();
                showNotification(`✅ Пополнение успешно! Получено ${amount} ⭐`);
                saveGameStats();
            } else {
                playErrorSound();
                showNotification('❌ Платеж отменен');
            }
        });
    } else {
        setTimeout(() => {
            gameState.balance += amount;
            updateBalance();
            const el = document.getElementById('currentBalance');
            if (el) el.textContent = `${gameState.balance.toLocaleString()} ⭐`;
            const input = document.getElementById('topUpAmount');
            if (input) input.value = '';
            closeTopUpModal();
            playSuccessSound();
            showNotification(`✅ Пополнение успешно! Получено ${amount} ⭐`);
            saveGameStats();
        }, 2000);
    }
}

// Promo Code Functions
function openPromoModal() {
    playButtonClick();
    document.getElementById('promoModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
}

function closePromoModal() {
    playButtonClick();
    document.getElementById('promoModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function activatePromoCode() {
    playButtonClick();
    
    const input = document.getElementById('promoCodeInput');
    if (!input) return;
    
    const code = input.value.trim().toUpperCase();
    if (!code) {
        playErrorSound();
        return showNotification('⚠️ Введите промокод!');
    }
    
    const usedPromos = JSON.parse(localStorage.getItem('xudobudo_promos') || '[]');
    if (usedPromos.includes(code)) {
        playErrorSound();
        return showNotification('⚠️ Промокод уже использован!');
    }
    
    const validPromos = {
        'WELCOME': 100, 'START': 50, 'BONUS': 200, 'LUCKY': 150,
        'WIN': 75, 'GAME': 125, 'STAR': 300, 'ROCKET': 250
    };
    
    if (validPromos[code]) {
        const reward = validPromos[code];
        gameState.balance += reward;
        
        usedPromos.push(code);
        localStorage.setItem('xudobudo_promos', JSON.stringify(usedPromos));
        
        addActivatedPromo(code, reward);
        
        input.value = '';
        updateBalance();
        saveGameStats();
        
        playSuccessSound();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showNotification(`🎉 Промокод активирован! Получено ${reward} ⭐`);
    } else {
        playErrorSound();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        showNotification('❌ Неверный промокод!');
    }
}

function addActivatedPromo(code, reward) {
    const container = document.getElementById('activatedPromos');
    if (!container) return;
    
    const noPromos = container.querySelector('.no-promos');
    if (noPromos) noPromos.remove();
    
    const item = document.createElement('div');
    item.className = 'promo-item';
    item.innerHTML = `
        <span class="promo-code">${code}</span>
        <span class="promo-reward">+${reward} ⭐</span>
    `;
    
    container.insertBefore(item, container.firstChild);
}

function loadActivatedPromos() {
    const usedPromos = JSON.parse(localStorage.getItem('xudobudo_promos') || '[]');
    const validPromos = {
        'WELCOME': 100, 'START': 50, 'BONUS': 200, 'LUCKY': 150,
        'WIN': 75, 'GAME': 125, 'STAR': 300, 'ROCKET': 250
    };
    
    usedPromos.forEach(code => {
        if (validPromos[code]) {
            addActivatedPromo(code, validPromos[code]);
        }
    });
}

// Notification System
function showNotification(message) {
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.4s ease-out forwards';
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

function updateBalance() {
    const balanceEl = document.querySelector('.balance-amount');
    if (balanceEl) balanceEl.textContent = gameState.balance.toLocaleString();
    
    const crashBalanceEl = document.getElementById('crashBalance');
    if (crashBalanceEl) crashBalanceEl.textContent = gameState.balance.toLocaleString();
    
    const profileBalanceEl = document.getElementById('profileBalance');
    if (profileBalanceEl) profileBalanceEl.textContent = gameState.balance.toLocaleString();
}

function updateProfileStats() {
    const gamesEl = document.getElementById('profileGames');
    const winsEl = document.getElementById('profileWins');
    
    if (gamesEl) gamesEl.textContent = gameState.stats.gamesPlayed;
    if (winsEl) winsEl.textContent = gameState.stats.gamesWon;
}

function setupInputHandlers() {
    const betAmountInput = document.getElementById('betAmountInput');
    const autoCashoutInput = document.getElementById('autoCashoutInput');
    
    if (betAmountInput) {
        betAmountInput.addEventListener('input', () => {
            let value = parseInt(betAmountInput.value) || 0;
            if (value < 1) value = 1;
            if (value > gameState.balance) value = gameState.balance;
            betAmountInput.value = value;
            updateModernBetButton();
        });
    }
    
    if (autoCashoutInput) {
        autoCashoutInput.addEventListener('input', () => {
            let value = parseFloat(autoCashoutInput.value) || 1.01;
            if (value < 1.01) value = 1.01;
            if (value > 1000) value = 1000;
            autoCashoutInput.value = value.toFixed(2);
        });
    }
}

// Initialization
function initializeApp() {
    tg.expand();
    tg.ready();
    applyTelegramTheme();
    
    document.addEventListener('click', initAudioContext, { once: true });
    document.addEventListener('touchstart', initAudioContext, { once: true });
    
    loadSavedBalance();
    loadSoundSettings();
    loadActivatedPromos();
    setupInputHandlers();
    updateBalance();
    updateProfileStats();
    updateCrashHistory();
    
    showSection('games');
    
    console.log('XudoBudoGame initialized successfully!');
}

// Запускаем приложение когда DOM готов
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Обработка изменения размера окна
window.addEventListener('resize', () => {
    if (gameState.canvas) {
        setTimeout(initializeCanvas, 100);
    }
});

// Предотвращение случайного закрытия
window.addEventListener('beforeunload', (e) => {
    if (gameState.hasBet && gameState.gamePhase === 'flying') {
        e.preventDefault();
        e.returnValue = 'У вас есть активная ставка! Вы уверены, что хотите покинуть игру?';
    }
});

// Обработка видимости страницы
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('App hidden');
    } else {
        console.log('App visible');
        if (gameState.canvas) {
            initializeCanvas();
        }
    }
});

console.log('XudoBudoGame script loaded successfully!');
