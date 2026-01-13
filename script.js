// XudoBudo Mines Game - Игра в Мины с красивым дизайном

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
            const AudioContextClass = window.AudioContext || window['webkitAudioContext'];
            audioContext = new AudioContextClass();
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

function playWinSound() { 
    playSound(600, 0.3, 'sine', 0.1);
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}

function playLoseSound() { 
    playSound(200, 0.5, 'sawtooth', 0.15);
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
}

function playRevealSound() { 
    playSound(1000, 0.1, 'triangle', 0.08);
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('soundToggle');
    if (btn) {
        btn.classList.toggle('muted', !soundEnabled);
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
        
        if (soundEnabled) {
            setTimeout(() => playSound(800, 0.2, 'sine', 0.08), 100);
        }
    }
    localStorage.setItem('mines_sound', soundEnabled.toString());
}

// Mines Game Class
class MinesGame {
    constructor() {
        this.balance = 1000;
        this.betAmount = 100;
        this.minesCount = 3;
        this.gameActive = false;
        this.gameStarted = false;
        this.field = [];
        this.revealedCells = [];
        this.minePositions = [];
        this.currentMultiplier = 1.00;
        this.totalCells = 16; // 4x4 grid
        
        // Statistics
        this.stats = {
            totalGames: 0,
            totalWins: 0,
            totalProfit: 0
        };
        
        this.initializeElements();
        this.loadGameData();
        this.createField();
        this.updateDisplay();
        this.bindEvents();
    }
    
    initializeElements() {
        this.balanceElement = document.getElementById('balanceAmount');
        this.minesCountElement = document.getElementById('minesCount');
        this.multiplierElement = document.getElementById('currentMultiplier');
        this.openedCellsElement = document.getElementById('openedCells');
        this.betAmountInput = document.getElementById('betAmount');
        this.startButton = document.getElementById('startButton');
        this.cashoutButton = document.getElementById('cashoutButton');
        this.gameStatusElement = document.getElementById('gameStatus');
        this.minesField = document.getElementById('minesField');
        
        // Stats elements
        this.totalGamesElement = document.getElementById('totalGames');
        this.totalWinsElement = document.getElementById('totalWins');
        this.totalProfitElement = document.getElementById('totalProfit');
        this.winRateElement = document.getElementById('winRate');
    }
    
    bindEvents() {
        // Bet amount input
        this.betAmountInput.addEventListener('input', (e) => {
            this.betAmount = parseFloat(e.target.value) || 0;
            playButtonClick();
        });
        
        // Mine count buttons
        document.querySelectorAll('.mine-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.gameActive) return;
                
                document.querySelectorAll('.mine-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.minesCount = parseInt(btn.dataset.mines);
                this.updateDisplay();
                playButtonClick();
            });
        });
    }
    
    createField() {
        this.minesField.innerHTML = '';
        this.field = [];
        
        for (let i = 0; i < this.totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'mine-cell';
            cell.dataset.index = i;
            cell.addEventListener('click', () => this.revealCell(i));
            
            this.minesField.appendChild(cell);
            this.field.push({
                element: cell,
                isMine: false,
                isRevealed: false
            });
        }
    }
    
    startGame() {
        if (this.gameActive) return;
        
        if (this.betAmount <= 0 || this.betAmount > this.balance) {
            this.showNotification('❌ Неверная сумма ставки!');
            return;
        }
        
        // Deduct bet amount
        this.balance -= this.betAmount;
        this.gameActive = true;
        this.gameStarted = true;
        this.revealedCells = [];
        this.currentMultiplier = 1.00;
        
        // Generate mine positions
        this.generateMines();
        
        // Update UI
        this.startButton.disabled = true;
        this.startButton.innerHTML = '<span>🎮 Игра идет...</span>';
        this.cashoutButton.disabled = false;
        this.gameStatusElement.querySelector('.status-text').textContent = 'Кликайте по клеткам, чтобы открыть их. Избегайте мин!';
        
        // Reset field
        this.field.forEach(cell => {
            cell.element.className = 'mine-cell';
            cell.isRevealed = false;
        });
        
        this.updateDisplay();
        playButtonClick();
        
        this.showNotification(`🎮 Игра началась! Ставка: ${this.betAmount}⭐`);
    }
    
    generateMines() {
        this.minePositions = [];
        const positions = [];
        
        // Generate unique random positions for mines
        while (positions.length < this.minesCount) {
            const pos = Math.floor(Math.random() * this.totalCells);
            if (!positions.includes(pos)) {
                positions.push(pos);
            }
        }
        
        this.minePositions = positions;
        
        // Reset field
        this.field.forEach((cell, index) => {
            cell.isMine = positions.includes(index);
        });
    }
    
    revealCell(index) {
        if (!this.gameActive || this.field[index].isRevealed) return;
        
        const cell = this.field[index];
        cell.isRevealed = true;
        this.revealedCells.push(index);
        
        if (cell.isMine) {
            // Hit a mine - game over
            this.hitMine(index);
        } else {
            // Safe cell - continue game
            this.revealSafeCell(index);
        }
    }
    
    hitMine(index) {
        const cell = this.field[index];
        cell.element.classList.add('mine', 'exploded');
        cell.element.innerHTML = '💥';
        
        // Reveal all mines
        this.minePositions.forEach(pos => {
            if (pos !== index) {
                this.field[pos].element.classList.add('mine');
                this.field[pos].element.innerHTML = '💣';
            }
        });
        
        // Game over
        this.gameActive = false;
        this.gameStarted = false;
        
        this.startButton.disabled = false;
        this.startButton.innerHTML = '<span>🎮 Начать игру</span>';
        this.cashoutButton.disabled = true;
        
        this.gameStatusElement.querySelector('.status-text').textContent = '💥 Вы попали на мину! Игра окончена.';
        
        // Update stats
        this.stats.totalGames++;
        this.stats.totalProfit -= this.betAmount;
        this.updateStats();
        this.saveGameData();
        
        playLoseSound();
        this.showNotification(`💥 Проигрыш: -${this.betAmount}⭐`);
        
        // Auto restart after delay
        setTimeout(() => {
            this.resetGame();
        }, 3000);
    }
    
    revealSafeCell(index) {
        const cell = this.field[index];
        cell.element.classList.add('safe');
        cell.element.innerHTML = '💎';
        
        // Calculate new multiplier
        const safeCells = this.totalCells - this.minesCount;
        const revealedSafeCells = this.revealedCells.length;
        this.currentMultiplier = this.calculateMultiplier(revealedSafeCells, safeCells, this.minesCount);
        
        this.updateDisplay();
        playRevealSound();
        
        // Check if all safe cells are revealed
        if (revealedSafeCells === safeCells) {
            this.winGame();
        } else {
            this.showNotification(`💎 Безопасно! Множитель: ${this.currentMultiplier.toFixed(2)}x`);
        }
    }
    
    calculateMultiplier(revealed, totalSafe, mines) {
        // Formula based on probability
        const base = 1.0;
        let multiplier = base;
        
        for (let i = 0; i < revealed; i++) {
            const remaining = totalSafe - i;
            const totalRemaining = this.totalCells - i;
            const probability = remaining / totalRemaining;
            multiplier /= probability;
        }
        
        return Math.max(multiplier, 1.01);
    }
    
    winGame() {
        this.gameActive = false;
        this.gameStarted = false;
        
        const winAmount = Math.floor(this.betAmount * this.currentMultiplier);
        this.balance += winAmount;
        
        this.startButton.disabled = false;
        this.startButton.innerHTML = '<span>🎮 Начать игру</span>';
        this.cashoutButton.disabled = true;
        
        this.gameStatusElement.querySelector('.status-text').textContent = `🎉 Поздравляем! Вы открыли все безопасные клетки!`;
        
        // Update stats
        this.stats.totalGames++;
        this.stats.totalWins++;
        this.stats.totalProfit += (winAmount - this.betAmount);
        this.updateStats();
        this.updateDisplay();
        this.saveGameData();
        
        playWinSound();
        this.showNotification(`🎉 Победа! +${winAmount - this.betAmount}⭐ (${this.currentMultiplier.toFixed(2)}x)`);
        
        // Auto restart after delay
        setTimeout(() => {
            this.resetGame();
        }, 4000);
    }
    
    cashOut() {
        if (!this.gameActive || this.revealedCells.length === 0) return;
        
        const winAmount = Math.floor(this.betAmount * this.currentMultiplier);
        this.balance += winAmount;
        
        this.gameActive = false;
        this.gameStarted = false;
        
        this.startButton.disabled = false;
        this.startButton.innerHTML = '<span>🎮 Начать игру</span>';
        this.cashoutButton.disabled = true;
        
        this.gameStatusElement.querySelector('.status-text').textContent = `💰 Выигрыш забран! Множитель: ${this.currentMultiplier.toFixed(2)}x`;
        
        // Update stats
        this.stats.totalGames++;
        this.stats.totalWins++;
        this.stats.totalProfit += (winAmount - this.betAmount);
        this.updateStats();
        this.updateDisplay();
        this.saveGameData();
        
        playWinSound();
        this.showNotification(`💰 Выигрыш: +${winAmount - this.betAmount}⭐ (${this.currentMultiplier.toFixed(2)}x)`);
        
        // Auto restart after delay
        setTimeout(() => {
            this.resetGame();
        }, 3000);
    }
    
    resetGame() {
        this.createField();
        this.gameStatusElement.querySelector('.status-text').textContent = 'Выберите ставку и количество мин, затем нажмите "Начать игру"';
        this.currentMultiplier = 1.00;
        this.updateDisplay();
    }
    
    updateDisplay() {
        // Update balance
        if (this.balanceElement) {
            this.balanceElement.textContent = this.balance.toLocaleString() + ' ⭐';
        }
        
        // Update game info
        if (this.minesCountElement) {
            this.minesCountElement.textContent = this.minesCount;
        }
        
        if (this.multiplierElement) {
            this.multiplierElement.textContent = this.currentMultiplier.toFixed(2) + 'x';
        }
        
        if (this.openedCellsElement) {
            this.openedCellsElement.textContent = this.revealedCells.length;
        }
    }
    
    updateStats() {
        if (this.totalGamesElement) {
            this.totalGamesElement.textContent = this.stats.totalGames;
        }
        
        if (this.totalWinsElement) {
            this.totalWinsElement.textContent = this.stats.totalWins;
        }
        
        if (this.totalProfitElement) {
            this.totalProfitElement.textContent = this.stats.totalProfit > 0 ? '+' + this.stats.totalProfit : this.stats.totalProfit;
        }
        
        if (this.winRateElement) {
            const winRate = this.stats.totalGames > 0 ? Math.round((this.stats.totalWins / this.stats.totalGames) * 100) : 0;
            this.winRateElement.textContent = winRate + '%';
        }
    }
    
    showNotification(message) {
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
            const gameData = {
                balance: this.balance,
                stats: this.stats,
                timestamp: Date.now()
            };
            localStorage.setItem('mines_game_data', JSON.stringify(gameData));
        } catch (e) {
            console.warn('Failed to save game data:', e);
        }
    }
    
    loadGameData() {
        try {
            const savedData = localStorage.getItem('mines_game_data');
            if (savedData) {
                const gameData = JSON.parse(savedData);
                this.balance = Math.max(100, parseInt(gameData.balance) || 1000);
                this.stats = gameData.stats || { totalGames: 0, totalWins: 0, totalProfit: 0 };
            }
            
            // Load sound settings
            const soundSaved = localStorage.getItem('mines_sound');
            if (soundSaved !== null) {
                soundEnabled = soundSaved === 'true';
                const btn = document.getElementById('soundToggle');
                if (btn) {
                    btn.classList.toggle('muted', !soundEnabled);
                }
            }
        } catch (e) {
            console.warn('Failed to load game data, using defaults:', e);
            this.balance = 1000;
            this.stats = { totalGames: 0, totalWins: 0, totalProfit: 0 };
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

function startGame() {
    if (window.game) {
        game.startGame();
    }
}

function cashOut() {
    if (window.game) {
        game.cashOut();
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
    game = new MinesGame();
    
    // Auto-save game data periodically
    setInterval(() => {
        if (game) game.saveGameData();
    }, 10000);
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
