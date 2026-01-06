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

function playRocketEngine() {
    if (!soundEnabled || !audioContext) return;
    playSound(150 + Math.random() * 50, 0.1, 'sawtooth', 0.03);
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
    const icon = btn?.querySelector('.sound-icon');
    
    if (btn && icon) {
        if (soundEnabled) {
            btn.classList.remove('muted');
            icon.textContent = '🔊';
            playSuccessSound();
        } else {
            btn.classList.add('muted');
            icon.textContent = '🔇';
        }
    }
    
    localStorage.setItem('xudobudo_sound', soundEnabled.toString());
}

function loadSoundSettings() {
    const saved = localStorage.getItem('xudobudo_sound');
    if (saved !== null) {
        soundEnabled = saved === 'true';
        const btn = document.getElementById('soundToggle');
        const icon = btn?.querySelector('.sound-icon');
        
        if (btn && icon) {
            if (soundEnabled) {
                btn.classList.remove('muted');
                icon.textContent = '🔊';
            } else {
                btn.classList.add('muted');
                icon.textContent = '🔇';
            }
        }
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
    realPlayers: [], // Реальные игроки в текущем раунде
    currentUser: null // Данные текущего пользователя
};
// Real Players System
function initializeCurrentUser() {
    gameState.currentUser = getUserData();
    
    // Получаем аватар пользователя через Telegram API
    if (tg.initDataUnsafe?.user?.photo_url) {
        gameState.currentUser.photoUrl = tg.initDataUnsafe.user.photo_url;
    }
    
    // Добавляем текущего пользователя в список игроков
    const currentPlayer = {
        id: gameState.currentUser.id,
        firstName: gameState.currentUser.firstName,
        lastName: gameState.currentUser.lastName,
        username: gameState.currentUser.username,
        photoUrl: gameState.currentUser.photoUrl,
        languageCode: gameState.currentUser.languageCode,
        bet: 0,
        status: 'waiting', // waiting, betting, cashed, crashed
        cashoutMultiplier: null,
        isCurrentUser: true,
        joinTime: Date.now()
    };
    
    gameState.realPlayers = [currentPlayer];
    updateRealPlayersDisplay();
}

function createRealPlayer(userData, betAmount = 0) {
    return {
        id: userData.id,
        firstName: userData.firstName || 'Player',
        lastName: userData.lastName || '',
        username: userData.username || `user${userData.id}`,
        photoUrl: userData.photoUrl || '',
        languageCode: userData.languageCode || 'ru',
        bet: betAmount,
        status: 'waiting',
        cashoutMultiplier: null,
        isCurrentUser: userData.id === gameState.currentUser?.id,
        joinTime: Date.now()
    };
}

function updateRealPlayersDisplay() {
    const container = document.getElementById('realPlayersList');
    const countEl = document.getElementById('realPlayersCount');
    
    if (!container) return;
    
    container.innerHTML = '';
    if (countEl) countEl.textContent = gameState.realPlayers.length;
    
    // Сортируем игроков: текущий пользователь первым, затем по времени присоединения
    const sortedPlayers = [...gameState.realPlayers].sort((a, b) => {
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;
        return a.joinTime - b.joinTime;
    });
    
    sortedPlayers.forEach(player => {
        const item = document.createElement('div');
        item.className = `real-player-item ${player.isCurrentUser ? 'current-user' : ''}`;
        
        // Определяем статус игрока
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
        
        // Создаем аватар
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
        
        // Определяем флаг страны по языку
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

// Симуляция подключения других реальных игроков
function simulateRealPlayersJoining() {
    // ФЕЙКОВЫЕ ИГРОКИ ПОЛНОСТЬЮ УБРАНЫ
    // Теперь показываются только реальные пользователи бота
    console.log('Фейковые игроки отключены - только реальные пользователи');
}

function updateRealPlayersStatus() {
    gameState.realPlayers.forEach(player => {
        if (player.status === 'betting' && !player.isCurrentUser && Math.random() < 0.08 && gameState.multiplier > 1.2) {
            player.status = 'cashed';
            player.cashoutMultiplier = gameState.multiplier.toFixed(2);
        }
    });
    updateRealPlayersDisplay();
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
    
    // Найти правильную навигационную кнопку
    if (sectionName === 'crash') {
        document.querySelector(`[onclick="showSection('games')"]`).classList.add('active');
    } else {
        const navBtn = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
        if (navBtn) navBtn.classList.add('active');
    }
    
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    
    // Инициализация краш игры при переходе
    if (sectionName === 'crash') {
        initializeCrashGame();
    }
}

// Crash Game Functions
function initializeCrashGame() {
    initializeCanvas();
    updateGameDisplay();
    
    // Инициализируем текущего пользователя если еще не сделали
    if (!gameState.currentUser) {
        initializeCurrentUser();
        simulateRealPlayersJoining();
    }
    
    if (gameState.gamePhase === 'waiting') startNewRound();
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
    
    // Реальная интеграция с Telegram Stars
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
        // Fallback для тестирования
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

// Crash Game Functions
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
    
    // Сбрасываем статус всех игроков
    gameState.realPlayers.forEach(player => {
        if (player.isCurrentUser) {
            player.status = 'waiting';
            player.bet = 0;
            player.cashoutMultiplier = null;
        } else {
            player.status = 'waiting';
            player.bet = 0;
            player.cashoutMultiplier = null;
        }
    });
    updateRealPlayersDisplay();
    
    const rocket = document.getElementById('rocketPlane');
    if (rocket) {
        rocket.classList.remove('flying', 'crashed', 'high-multiplier');
        rocket.style.left = '40px';
        rocket.style.top = '80%';
        rocket.style.transform = 'rotate(0deg) scale(1)';
        rocket.style.filter = 'brightness(1.1) drop-shadow(0 0 6px rgba(106, 179, 243, 0.6))';
    }
    
    updateGameDisplay();
    let countdown = 5;
    const statusEl = document.getElementById('gameStatus');
    if (statusEl) statusEl.textContent = `Ставки: ${countdown}с`;
    
    const interval = setInterval(() => {
        countdown--;
        if (statusEl) statusEl.textContent = `Ставки: ${countdown}с`;
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
    
    const statusEl = document.getElementById('gameStatus');
    if (statusEl) statusEl.textContent = 'УЛЕТЕЛ!';
    
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
        updateRealPlayersStatus();
        
        // УБРАЛИ ЗВУК РАКЕТЫ - больше не играет во время полета
        
        if (gameState.multiplier >= gameState.crashPoint) crashGame();
        if (gameState.hasBet && gameState.autoCashout > 0 && gameState.multiplier >= gameState.autoCashout) cashOut();
    }, 100);
}

function updateMultiplier() {
    const timeElapsed = (Date.now() - gameState.gameStartTime) / 1000;
    
    // УЛУЧШЕННОЕ УСКОРЕНИЕ РАКЕТЫ КАК В PILOTKA
    let baseSpeed = 0.008; // Начальная скорость
    
    // Постепенное ускорение со временем (как в pilotka)
    if (timeElapsed < 2) {
        // Медленный старт первые 2 секунды
        baseSpeed *= (0.5 + timeElapsed * 0.25);
    } else if (timeElapsed < 5) {
        // Ускорение с 2 до 5 секунд
        baseSpeed *= (1 + (timeElapsed - 2) * 0.3);
    } else if (timeElapsed < 10) {
        // Сильное ускорение с 5 до 10 секунд
        baseSpeed *= (1.9 + (timeElapsed - 5) * 0.4);
    } else {
        // Максимальное ускорение после 10 секунд
        baseSpeed *= (4.9 + (timeElapsed - 10) * 0.2);
    }
    
    // Случайные колебания как в pilotka
    const randomFactor = 0.8 + Math.random() * 0.4; // от 0.8 до 1.2
    
    // Финальная скорость роста с ускорением
    const increment = baseSpeed * randomFactor;
    
    // Обновляем множитель
    gameState.multiplier += increment;
    
    // Ограничиваем максимальным значением краша
    gameState.multiplier = Math.min(gameState.multiplier, gameState.crashPoint);
    
    // Добавляем "скачки" как в pilotka (чаще на высоких множителях)
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
    
    // PILOTKA STYLE ROCKET MOVEMENT
    const gameArea = document.querySelector('.pilotka-game-area');
    if (!gameArea) return;
    
    const containerRect = gameArea.getBoundingClientRect();
    
    // Позиция как в pilotka - диагональное движение вверх и вправо
    const progress = Math.min((gameState.multiplier - 1) / (Math.max(gameState.crashPoint, 5) - 1), 1);
    
    // Горизонтальное движение (слева направо)
    const maxX = containerRect.width - 80;
    const x = 50 + (maxX - 50) * progress * 0.8;
    
    // Вертикальное движение (снизу вверх) - логарифмическая шкала
    const maxY = containerRect.height - 60;
    const minY = 60;
    const logProgress = Math.log(1 + progress * 9) / Math.log(10);
    const y = maxY - (maxY - minY) * logProgress;
    
    // Поворот ракеты в зависимости от скорости роста множителя
    const rotationAngle = Math.min(progress * 20 + (gameState.multiplier > 3 ? 10 : 0), 35);
    
    // Масштаб в зависимости от множителя
    const scale = 1 + Math.min(progress * 0.4, 0.6);
    
    rocket.style.left = `${x}px`;
    rocket.style.bottom = `${y}px`;
    rocket.style.transform = `rotate(${rotationAngle}deg) scale(${scale})`;
    
    // Эффекты для высоких множителей как в pilotka
    if (gameState.multiplier > 5) {
        rocket.classList.add('high-multiplier');
        rocket.style.filter = `brightness(${1.8 + Math.sin(Date.now() * 0.015) * 0.4}) drop-shadow(0 0 ${20 + Math.sin(Date.now() * 0.025) * 8}px rgba(255, 107, 53, 1))`;
    } else {
        rocket.classList.remove('high-multiplier');
        rocket.style.filter = 'brightness(1.2) drop-shadow(0 0 10px rgba(255, 107, 53, 0.6))';
    }
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
    
    // Очищаем canvas
    ctx.clearRect(0, 0, width, height);
    
    // Темный градиентный фон как в pilotka
    const bgGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height));
    bgGradient.addColorStop(0, 'rgba(10, 10, 10, 0.3)');
    bgGradient.addColorStop(0.5, 'rgba(26, 26, 46, 0.5)');
    bgGradient.addColorStop(1, 'rgba(22, 33, 62, 0.7)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    if (gameState.gamePhase === 'flying' && gameState.curve.length > 1) {
        // КРАСНАЯ КРИВАЯ КАК В PILOTKA
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, 'rgba(255, 107, 53, 0.1)');
        gradient.addColorStop(0.3, 'rgba(255, 107, 53, 0.3)');
        gradient.addColorStop(0.7, 'rgba(255, 107, 53, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 107, 53, 0.8)');
        
        ctx.beginPath();
        ctx.moveTo(0, height);
        
        // Рисуем плавную кривую
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
        
        // Яркая красная линия как в pilotka
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
        
        // Градиент для линии
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
        
        // Убираем тень для следующих элементов
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
    
    // Добавляем текущую точку в кривую
    if (gameState.gamePhase === 'flying') {
        gameState.curve.push(gameState.multiplier);
        if (gameState.curve.length > 150) { // Увеличили для плавности
            gameState.curve.shift();
        }
    }
}

function updateGameDisplay() {
    // Обновляем pilotka интерфейс
    updatePilotkaDisplay();
    
    // Обновляем обычный интерфейс (для совместимости)
    const multiplierEl = document.getElementById('multiplierDisplay');
    if (multiplierEl) {
        multiplierEl.textContent = `${gameState.multiplier.toFixed(2)}x`;
        
        // Цветовые эффекты в зависимости от множителя
        if (gameState.multiplier >= 10) {
            multiplierEl.style.color = '#FFD700';
            multiplierEl.style.textShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
        } else if (gameState.multiplier >= 5) {
            multiplierEl.style.color = '#4CAF50';
            multiplierEl.style.textShadow = '0 0 15px rgba(76, 175, 80, 0.6)';
        } else if (gameState.multiplier >= 2) {
            multiplierEl.style.color = '#FF9800';
            multiplierEl.style.textShadow = '0 0 10px rgba(255, 152, 0, 0.5)';
        } else {
            multiplierEl.style.color = '#ff6b35';
            multiplierEl.style.textShadow = '0 0 20px rgba(255, 107, 53, 0.8)';
        }
    }
    
    updateBetButton();
    updateCashoutButton();
    updateBalance();
}

function updateBetButton() {
    const betBtn = document.getElementById('betBtn');
    const betAmountInput = document.getElementById('betAmount');
    
    if (!betBtn || !betAmountInput) return;
    
    const amount = parseInt(betAmountInput.value) || 100;
    const amountSpan = betBtn.querySelector('.btn-amount');
    if (amountSpan) amountSpan.textContent = `⭐ ${amount}`;
    
    if (gameState.gamePhase === 'betting' && !gameState.hasBet) {
        betBtn.disabled = false;
        betBtn.style.opacity = '1';
    } else {
        betBtn.disabled = true;
        betBtn.style.opacity = '0.5';
    }
}

function updateCashoutButton() {
    const cashoutBtn = document.getElementById('cashoutBtn');
    if (!cashoutBtn) return;
    
    const multiplierSpan = cashoutBtn.querySelector('.btn-multiplier');
    if (multiplierSpan && gameState.hasBet) {
        const winAmount = Math.floor(gameState.currentBet * gameState.multiplier);
        multiplierSpan.textContent = `${winAmount} ⭐`;
    }
    
    if (gameState.gamePhase === 'flying' && gameState.hasBet) {
        cashoutBtn.disabled = false;
        cashoutBtn.style.opacity = '1';
    } else {
        cashoutBtn.disabled = true;
        cashoutBtn.style.opacity = '0.5';
    }
}

function updateBalance() {
    const balanceEl = document.querySelector('.balance-amount');
    if (balanceEl) balanceEl.textContent = gameState.balance.toLocaleString();
    
    const profileBalanceEl = document.getElementById('profileBalance');
    if (profileBalanceEl) profileBalanceEl.textContent = gameState.balance.toLocaleString();
}

function placeBet() {
    playButtonClick();
    
    if (gameState.gamePhase !== 'betting' || gameState.hasBet) return;
    
    const betAmountInput = document.getElementById('betAmount');
    
    if (!betAmountInput) return;
    
    const betAmount = parseInt(betAmountInput.value) || 100;
    const autoCashout = 2.00; // Фиксированное значение как в pilotka
    
    if (betAmount < 1) {
        playErrorSound();
        return showNotification('⚠️ Минимальная ставка: 1 ⭐');
    }
    
    if (betAmount > gameState.balance) {
        playErrorSound();
        return showNotification('⚠️ Недостаточно средств!');
    }
    
    // Делаем ставку
    gameState.balance -= betAmount;
    gameState.currentBet = betAmount;
    gameState.autoCashout = autoCashout;
    gameState.hasBet = true;
    
    // Обновляем статус текущего игрока
    const currentPlayer = gameState.realPlayers.find(p => p.isCurrentUser);
    if (currentPlayer) {
        currentPlayer.bet = betAmount;
        currentPlayer.status = 'betting';
    }
    
    updateGameDisplay();
    updateRealPlayersDisplay();
    saveGameStats();
    
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    showNotification(`✅ Ставка ${betAmount} ⭐ принята!`);
}

function cashOut() {
    playButtonClick();
    
    if (!gameState.hasBet || gameState.gamePhase !== 'flying') return;
    
    const winAmount = Math.floor(gameState.currentBet * gameState.multiplier);
    gameState.balance += winAmount;
    
    // Обновляем статистику
    gameState.stats.gamesPlayed++;
    gameState.stats.gamesWon++;
    gameState.stats.totalWinnings += winAmount - gameState.currentBet;
    gameState.stats.bestMultiplier = Math.max(gameState.stats.bestMultiplier, gameState.multiplier);
    
    // Обновляем статус текущего игрока
    const currentPlayer = gameState.realPlayers.find(p => p.isCurrentUser);
    if (currentPlayer) {
        currentPlayer.status = 'cashed';
        currentPlayer.cashoutMultiplier = gameState.multiplier.toFixed(2);
    }
    
    gameState.hasBet = false;
    gameState.currentBet = 0;
    
    updateGameDisplay();
    updateRealPlayersDisplay();
    saveGameStats();
    
    playCashoutSound();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    showNotification(`🎉 Выигрыш: ${winAmount} ⭐ (${gameState.multiplier.toFixed(2)}x)`);
}

function crashGame() {
    clearInterval(gameState.gameInterval);
    gameState.gamePhase = 'crashed';
    
    const statusEl = document.getElementById('gameStatus');
    if (statusEl) statusEl.textContent = `Краш на ${gameState.crashPoint.toFixed(2)}x`;
    
    const rocket = document.getElementById('rocketPlane');
    if (rocket) {
        rocket.classList.remove('flying', 'high-multiplier');
        rocket.classList.add('crashed');
    }
    
    // Если у игрока была ставка и он не успел забрать
    if (gameState.hasBet) {
        gameState.stats.gamesPlayed++;
        
        // Обновляем статус текущего игрока
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
    
    // Обновляем статус всех игроков которые не успели забрать
    gameState.realPlayers.forEach(player => {
        if (player.status === 'betting') {
            player.status = 'crashed';
        }
    });
    
    // Добавляем в историю
    gameState.gameHistory.unshift(gameState.crashPoint);
    if (gameState.gameHistory.length > 10) gameState.gameHistory.pop();
    updateGameHistory();
    
    updateGameDisplay();
    updateRealPlayersDisplay();
    saveGameStats();
    
    // Начинаем новый раунд через 3 секунды
    setTimeout(() => {
        startNewRound();
    }, 3000);
}

function updateGameHistory() {
    const historyEl = document.getElementById('historyItems');
    if (!historyEl) return;
    
    historyEl.innerHTML = '';
    gameState.gameHistory.forEach(multiplier => {
        const item = document.createElement('span');
        item.className = 'history-item';
        item.textContent = `${multiplier.toFixed(2)}x`;
        
        // Определяем класс по значению множителя
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
    
    // Проверяем, не использовался ли уже этот промокод
    const usedPromos = JSON.parse(localStorage.getItem('xudobudo_promos') || '[]');
    if (usedPromos.includes(code)) {
        playErrorSound();
        return showNotification('⚠️ Промокод уже использован!');
    }
    
    // Список валидных промокодов
    const validPromos = {
        'WELCOME': 100,
        'START': 50,
        'BONUS': 200,
        'LUCKY': 150,
        'WIN': 75,
        'GAME': 125,
        'STAR': 300,
        'ROCKET': 250
    };
    
    if (validPromos[code]) {
        const reward = validPromos[code];
        gameState.balance += reward;
        
        // Сохраняем использованный промокод
        usedPromos.push(code);
        localStorage.setItem('xudobudo_promos', JSON.stringify(usedPromos));
        
        // Добавляем в отображение
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
    
    // Удаляем сообщение "нет промокодов"
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
    // Удаляем предыдущие уведомления
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Автоматически удаляем через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.4s ease-out forwards';
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

// Input Handlers
function setupInputHandlers() {
    const betAmountInput = document.getElementById('betAmount');
    const autoCashoutInput = document.getElementById('autoCashout');
    
    if (betAmountInput) {
        betAmountInput.addEventListener('input', () => {
            let value = parseInt(betAmountInput.value) || 0;
            if (value < 1) value = 1;
            if (value > gameState.balance) value = gameState.balance;
            betAmountInput.value = value;
            updateBetButton();
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

// Profile Functions
function updateProfileStats() {
    const gamesEl = document.getElementById('profileGames');
    const winsEl = document.getElementById('profileWins');
    
    if (gamesEl) gamesEl.textContent = gameState.stats.gamesPlayed;
    if (winsEl) winsEl.textContent = gameState.stats.gamesWon;
}

// Initialization
function initializeApp() {
    tg.expand();
    tg.ready();
    applyTelegramTheme();
    
    // Инициализируем аудио контекст при первом взаимодействии
    document.addEventListener('click', initAudioContext, { once: true });
    document.addEventListener('touchstart', initAudioContext, { once: true });
    
    loadSavedBalance();
    loadSoundSettings();
    loadActivatedPromos();
    setupInputHandlers();
    updateBalance();
    updateProfileStats();
    updateGameHistory();
    
    // Показываем секцию игр по умолчанию
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
        // Страница скрыта - можно приостановить некритичные операции
        console.log('App hidden');
    } else {
        // Страница видима - возобновляем операции
        console.log('App visible');
        if (gameState.canvas) {
            initializeCanvas();
        }
    }
});

console.log('XudoBudoGame script loaded successfully!');
// PILOTKA INTERFACE FUNCTIONS
function setPilotkaAmount(amount) {
    playButtonClick();
    const input = document.getElementById('pilotkaAmount');
    if (input) {
        input.value = amount;
        updatePilotkaBetButton();
    }
}

function updatePilotkaBetButton() {
    const btn = document.getElementById('pilotkaBetBtn');
    const input = document.getElementById('pilotkaAmount');
    
    if (btn && input) {
        const amount = parseInt(input.value) || 100;
        btn.textContent = `Ставка ⭐ ${amount}`;
    }
}

function placePilotkaBet() {
    playButtonClick();
    
    if (gameState.gamePhase !== 'betting' || gameState.hasBet) return;
    
    const input = document.getElementById('pilotkaAmount');
    if (!input) return;
    
    const betAmount = parseInt(input.value) || 100;
    
    if (betAmount < 1) {
        playErrorSound();
        return showNotification('⚠️ Минимальная ставка: 1 ⭐');
    }
    
    if (betAmount > gameState.balance) {
        playErrorSound();
        return showNotification('⚠️ Недостаточно средств!');
    }
    
    // Делаем ставку
    gameState.balance -= betAmount;
    gameState.currentBet = betAmount;
    gameState.autoCashout = 2.00;
    gameState.hasBet = true;
    
    // Обновляем статус текущего игрока
    const currentPlayer = gameState.realPlayers.find(p => p.isCurrentUser);
    if (currentPlayer) {
        currentPlayer.bet = betAmount;
        currentPlayer.status = 'betting';
    }
    
    updatePilotkaDisplay();
    updateRealPlayersDisplay();
    saveGameStats();
    
    // Меняем кнопку на "Забрать"
    const btn = document.getElementById('pilotkaBetBtn');
    if (btn) {
        btn.textContent = 'Забрать';
        btn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        btn.onclick = cashOutPilotka;
    }
    
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    showNotification(`✅ Ставка ${betAmount} ⭐ принята!`);
}

function cashOutPilotka() {
    playButtonClick();
    
    if (!gameState.hasBet || gameState.gamePhase !== 'flying') return;
    
    const winAmount = Math.floor(gameState.currentBet * gameState.multiplier);
    gameState.balance += winAmount;
    
    // Обновляем статистику
    gameState.stats.gamesPlayed++;
    gameState.stats.gamesWon++;
    gameState.stats.totalWinnings += winAmount - gameState.currentBet;
    gameState.stats.bestMultiplier = Math.max(gameState.stats.bestMultiplier, gameState.multiplier);
    
    // Обновляем статус текущего игрока
    const currentPlayer = gameState.realPlayers.find(p => p.isCurrentUser);
    if (currentPlayer) {
        currentPlayer.status = 'cashed';
        currentPlayer.cashoutMultiplier = gameState.multiplier.toFixed(2);
    }
    
    gameState.hasBet = false;
    gameState.currentBet = 0;
    
    updatePilotkaDisplay();
    updateRealPlayersDisplay();
    saveGameStats();
    
    // Возвращаем кнопку в исходное состояние
    const btn = document.getElementById('pilotkaBetBtn');
    if (btn) {
        const amount = parseInt(document.getElementById('pilotkaAmount').value) || 100;
        btn.textContent = `Ставка ⭐ ${amount}`;
        btn.style.background = 'linear-gradient(135deg, #ff6b35, #f7931e)';
        btn.onclick = placePilotkaBet;
    }
    
    playCashoutSound();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    showNotification(`🎉 Выигрыш: ${winAmount} ⭐ (${gameState.multiplier.toFixed(2)}x)`);
}

function updatePilotkaDisplay() {
    // Обновляем множитель
    const multiplierEl = document.getElementById('pilotkaMultiplier');
    if (multiplierEl) {
        multiplierEl.textContent = `${gameState.multiplier.toFixed(2)}x`;
    }
    
    // Обновляем статус
    const statusEl = document.getElementById('pilotkaStatus');
    if (statusEl) {
        if (gameState.gamePhase === 'betting') {
            statusEl.textContent = 'СТАВКИ';
        } else if (gameState.gamePhase === 'flying') {
            statusEl.textContent = 'УЛЕТЕЛ!';
        } else if (gameState.gamePhase === 'crashed') {
            statusEl.textContent = 'КРАШ!';
        }
    }
    
    // Обновляем баланс
    const balanceEl = document.querySelector('.pilotka-balance-amount');
    if (balanceEl) balanceEl.textContent = gameState.balance.toLocaleString();
    
    // Обновляем кнопку ставки
    updatePilotkaBetButton();
}

function updatePilotkaHistory() {
    const historyEl = document.getElementById('pilotkaHistory');
    if (!historyEl) return;
    
    historyEl.innerHTML = '';
    gameState.gameHistory.forEach(multiplier => {
        const item = document.createElement('span');
        item.className = 'pilotka-history-item';
        item.textContent = `${multiplier.toFixed(2)}x`;
        
        // Цвет в зависимости от множителя
        if (multiplier < 2) {
            item.style.background = 'rgba(244, 67, 54, 0.8)';
        } else if (multiplier < 5) {
            item.style.background = 'rgba(255, 152, 0, 0.8)';
        } else {
            item.style.background = 'rgba(76, 175, 80, 0.8)';
        }
        
        historyEl.appendChild(item);
    });
}

// Переопределяем функции для pilotka интерфейса
function initializeCrashGame() {
    initializeCanvas();
    updatePilotkaDisplay();
    updatePilotkaHistory();
    
    if (!gameState.currentUser) {
        initializeCurrentUser();
        simulateRealPlayersJoining();
    }
    
    if (gameState.gamePhase === 'waiting') startNewRound();
}

// Обновляем функцию startNewRound для pilotka
function startNewRound() {
    gameState.gamePhase = 'betting';
    gameState.multiplier = 1.00;
    gameState.curve = [];
    gameState.crashPoint = generateCrashPoint();
    gameState.hasBet = false;
    
    // Сбрасываем статус всех игроков
    gameState.realPlayers.forEach(player => {
        if (player.isCurrentUser) {
            player.status = 'waiting';
            player.bet = 0;
            player.cashoutMultiplier = null;
        } else {
            player.status = 'waiting';
            player.bet = 0;
            player.cashoutMultiplier = null;
        }
    });
    updateRealPlayersDisplay();
    
    const rocket = document.getElementById('rocketPlane');
    if (rocket) {
        rocket.classList.remove('flying', 'crashed', 'high-multiplier');
        rocket.style.left = '50px';
        rocket.style.bottom = '100px';
        rocket.style.transform = 'rotate(0deg) scale(1)';
        rocket.style.filter = 'brightness(1.2) drop-shadow(0 0 10px rgba(255, 107, 53, 0.6))';
    }
    
    updatePilotkaDisplay();
    let countdown = 5;
    
    const interval = setInterval(() => {
        countdown--;
        const statusEl = document.getElementById('pilotkaStatus');
        if (statusEl) statusEl.textContent = `СТАВКИ ${countdown}с`;
        
        if (countdown <= 0) {
            clearInterval(interval);
            startFlying();
        }
    }, 1000);
}

// Обновляем функцию crashGame для pilotka
function crashGame() {
    clearInterval(gameState.gameInterval);
    gameState.gamePhase = 'crashed';
    
    const statusEl = document.getElementById('pilotkaStatus');
    if (statusEl) statusEl.textContent = `КРАШ ${gameState.crashPoint.toFixed(2)}x`;
    
    const rocket = document.getElementById('rocketPlane');
    if (rocket) {
        rocket.classList.remove('flying', 'high-multiplier');
        rocket.classList.add('crashed');
    }
    
    // Если у игрока была ставка и он не успел забрать
    if (gameState.hasBet) {
        gameState.stats.gamesPlayed++;
        
        const currentPlayer = gameState.realPlayers.find(p => p.isCurrentUser);
        if (currentPlayer) {
            currentPlayer.status = 'crashed';
        }
        
        gameState.hasBet = false;
        gameState.currentBet = 0;
        
        // Возвращаем кнопку в исходное состояние
        const btn = document.getElementById('pilotkaBetBtn');
        if (btn) {
            const amount = parseInt(document.getElementById('pilotkaAmount').value) || 100;
            btn.textContent = `Ставка ⭐ ${amount}`;
            btn.style.background = 'linear-gradient(135deg, #ff6b35, #f7931e)';
            btn.onclick = placePilotkaBet;
        }
        
        playCrashSound();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        showNotification(`💥 Краш на ${gameState.crashPoint.toFixed(2)}x! Ставка проиграна.`);
    } else {
        playCrashSound();
    }
    
    // Обновляем статус всех игроков которые не успели забрать
    gameState.realPlayers.forEach(player => {
        if (player.status === 'betting') {
            player.status = 'crashed';
        }
    });
    
    // Добавляем в историю
    gameState.gameHistory.unshift(gameState.crashPoint);
    if (gameState.gameHistory.length > 10) gameState.gameHistory.pop();
    updatePilotkaHistory();
    
    updatePilotkaDisplay();
    updateRealPlayersDisplay();
    saveGameStats();
    
    // Начинаем новый раунд через 3 секунды
    setTimeout(() => {
        startNewRound();
    }, 3000);
}

console.log('Pilotka interface functions loaded!');
