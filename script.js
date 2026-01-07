// Rocket Flight Game - Telegram Mini App
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
    }
};

// Sound System
let audioContext = null;
let soundEnabled = true;

function initAudioContext() {
    if (!audioContext) {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
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
}

function playCollectSound() {
    playSound(600, 0.2, 'sine', 0.08);
    setTimeout(() => playSound(800, 0.15, 'sine', 0.06), 150);
}

function playGameOverSound() {
    playSound(200, 0.3, 'sawtooth', 0.1);
    setTimeout(() => playSound(100, 0.2, 'triangle', 0.08), 100);
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('soundToggle');
    const gameBtn = document.getElementById('gameSoundBtn');
    
    [btn, gameBtn].forEach(button => {
        if (button) {
            if (soundEnabled) {
                button.textContent = '🔊';
                button.classList.remove('muted');
            } else {
                button.textContent = '🔇';
                button.classList.add('muted');
            }
        }
    });
    
    localStorage.setItem('rocket_sound', soundEnabled.toString());
}

// Game State
let gameState = {
    balance: 1000,
    isPlaying: false,
    isPaused: false,
    score: 0,
    multiplier: 1.0,
    gameSpeed: 1,
    canvas: null,
    ctx: null,
    rocket: {
        x: 0,
        y: 0,
        width: 40,
        height: 40,
        velocityY: 0,
        thrust: 0.5,
        gravity: 0.3,
        maxVelocity: 8
    },
    multipliers: [],
    particles: [],
    gameTime: 0,
    lastTime: 0,
    animationId: null
};

// Navigation
function showSection(sectionName) {
    playButtonClick();
    
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionName).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    if (sectionName === 'rocket') {
        document.querySelector(`[onclick="showSection('games')"]`).classList.add('active');
        initializeGame();
    } else {
        const navBtn = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
        if (navBtn) navBtn.classList.add('active');
    }
    
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

// Game Initialization
function initializeGame() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    gameState.canvas = canvas;
    gameState.ctx = canvas.getContext('2d');
    
    // Set canvas size
    const gameArea = document.getElementById('gameArea');
    const rect = gameArea.getBoundingClientRect();
    
    canvas.width = rect.width;
    canvas.height = 400;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '400px';
    
    // Initialize rocket position
    gameState.rocket.x = canvas.width / 2 - gameState.rocket.width / 2;
    gameState.rocket.y = canvas.height - gameState.rocket.height - 20;
    
    // Add touch/click controls
    canvas.addEventListener('touchstart', handleInput);
    canvas.addEventListener('mousedown', handleInput);
    canvas.addEventListener('touchend', handleInputEnd);
    canvas.addEventListener('mouseup', handleInputEnd);
    
    // Prevent default touch behavior
    canvas.addEventListener('touchmove', (e) => e.preventDefault());
    
    updateDisplay();
    drawGame();
}

function handleInput(e) {
    e.preventDefault();
    if (gameState.isPlaying && !gameState.isPaused) {
        gameState.rocket.velocityY = -gameState.rocket.thrust * gameState.gameSpeed;
        playSound(400, 0.1, 'square', 0.03);
    }
}

function handleInputEnd(e) {
    e.preventDefault();
}

// Game Logic
function startGame() {
    if (gameState.isPlaying) return;
    
    playButtonClick();
    initAudioContext();
    
    // Reset game state
    gameState.isPlaying = true;
    gameState.isPaused = false;
    gameState.score = 0;
    gameState.multiplier = 1.0;
    gameState.gameSpeed = 1;
    gameState.gameTime = 0;
    gameState.multipliers = [];
    gameState.particles = [];
    
    // Reset rocket
    gameState.rocket.x = gameState.canvas.width / 2 - gameState.rocket.width / 2;
    gameState.rocket.y = gameState.canvas.height - gameState.rocket.height - 20;
    gameState.rocket.velocityY = 0;
    
    // Hide start button
    document.getElementById('startButton').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    
    // Start game loop
    gameState.lastTime = performance.now();
    gameLoop();
    
    // Generate multipliers
    generateMultipliers();
    
    updateDisplay();
    
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
}

function gameLoop(currentTime) {
    if (!gameState.isPlaying) return;
    
    const deltaTime = (currentTime - gameState.lastTime) / 16.67; // Normalize to 60fps
    gameState.lastTime = currentTime;
    gameState.gameTime += deltaTime;
    
    // Increase game speed over time
    gameState.gameSpeed = 1 + (gameState.gameTime * 0.001);
    
    // Update rocket physics
    updateRocket(deltaTime);
    
    // Update multipliers
    updateMultipliers(deltaTime);
    
    // Update particles
    updateParticles(deltaTime);
    
    // Check collisions
    checkCollisions();
    
    // Check game over conditions
    if (gameState.rocket.y > gameState.canvas.height) {
        gameOver();
        return;
    }
    
    // Update score
    gameState.score += Math.floor(gameState.gameSpeed * gameState.multiplier);
    
    // Draw everything
    drawGame();
    updateDisplay();
    
    gameState.animationId = requestAnimationFrame(gameLoop);
}

function updateRocket(deltaTime) {
    // Apply gravity
    gameState.rocket.velocityY += gameState.rocket.gravity * deltaTime;
    
    // Limit velocity
    if (gameState.rocket.velocityY > gameState.rocket.maxVelocity) {
        gameState.rocket.velocityY = gameState.rocket.maxVelocity;
    }
    if (gameState.rocket.velocityY < -gameState.rocket.maxVelocity) {
        gameState.rocket.velocityY = -gameState.rocket.maxVelocity;
    }
    
    // Update position
    gameState.rocket.y += gameState.rocket.velocityY * deltaTime;
    
    // Keep rocket in bounds horizontally
    if (gameState.rocket.x < 0) gameState.rocket.x = 0;
    if (gameState.rocket.x > gameState.canvas.width - gameState.rocket.width) {
        gameState.rocket.x = gameState.canvas.width - gameState.rocket.width;
    }
}

function generateMultipliers() {
    if (!gameState.isPlaying) return;
    
    // Generate new multiplier
    const multiplier = {
        x: Math.random() * (gameState.canvas.width - 30),
        y: -30,
        width: 30,
        height: 30,
        value: 1.1 + Math.random() * 0.4, // 1.1x to 1.5x
        collected: false,
        speed: 2 + Math.random() * 2
    };
    
    gameState.multipliers.push(multiplier);
    
    // Schedule next multiplier
    const delay = Math.max(1000, 3000 - (gameState.gameTime * 2));
    setTimeout(generateMultipliers, delay);
}

function updateMultipliers(deltaTime) {
    gameState.multipliers.forEach((mult, index) => {
        if (mult.collected) return;
        
        mult.y += mult.speed * gameState.gameSpeed * deltaTime;
        
        // Remove if off screen
        if (mult.y > gameState.canvas.height + 50) {
            gameState.multipliers.splice(index, 1);
        }
    });
}

function checkCollisions() {
    gameState.multipliers.forEach((mult, index) => {
        if (mult.collected) return;
        
        // Check collision with rocket
        if (gameState.rocket.x < mult.x + mult.width &&
            gameState.rocket.x + gameState.rocket.width > mult.x &&
            gameState.rocket.y < mult.y + mult.height &&
            gameState.rocket.y + gameState.rocket.height > mult.y) {
            
            // Collect multiplier
            mult.collected = true;
            gameState.multiplier += (mult.value - 1);
            
            // Create particles
            createParticles(mult.x + mult.width/2, mult.y + mult.height/2);
            
            playCollectSound();
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
            
            // Remove multiplier
            gameState.multipliers.splice(index, 1);
        }
    });
}

function createParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        gameState.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.02
        });
    }
}

function updateParticles(deltaTime) {
    gameState.particles.forEach((particle, index) => {
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        particle.life -= particle.decay * deltaTime;
        
        if (particle.life <= 0) {
            gameState.particles.splice(index, 1);
        }
    });
}

function drawGame() {
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#1a1a3a');
    gradient.addColorStop(1, '#2a2a4a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars
    drawStars(ctx, canvas);
    
    // Draw multipliers
    gameState.multipliers.forEach(mult => {
        if (!mult.collected) {
            drawMultiplier(ctx, mult);
        }
    });
    
    // Draw particles
    gameState.particles.forEach(particle => {
        drawParticle(ctx, particle);
    });
    
    // Draw rocket
    drawRocket(ctx);
}

function drawStars(ctx, canvas) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 50; i++) {
        const x = (i * 37) % canvas.width;
        const y = ((i * 23) + gameState.gameTime * 0.5) % canvas.height;
        const size = 1 + (i % 3);
        ctx.fillRect(x, y, size, size);
    }
}

function drawRocket(ctx) {
    const rocket = gameState.rocket;
    
    // Draw rocket body
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(rocket.x + 10, rocket.y + 5, 20, 30);
    
    // Draw rocket nose
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.moveTo(rocket.x + 20, rocket.y);
    ctx.lineTo(rocket.x + 10, rocket.y + 10);
    ctx.lineTo(rocket.x + 30, rocket.y + 10);
    ctx.closePath();
    ctx.fill();
    
    // Draw rocket fins
    ctx.fillStyle = '#ff3742';
    ctx.fillRect(rocket.x + 5, rocket.y + 25, 10, 15);
    ctx.fillRect(rocket.x + 25, rocket.y + 25, 10, 15);
    
    // Draw thrust effect if moving up
    if (rocket.velocityY < 0) {
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(rocket.x + 15, rocket.y + 40);
        ctx.lineTo(rocket.x + 20, rocket.y + 50 + Math.random() * 10);
        ctx.lineTo(rocket.x + 25, rocket.y + 40);
        ctx.closePath();
        ctx.fill();
    }
}

function drawMultiplier(ctx, mult) {
    // Draw multiplier background
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(mult.x, mult.y, mult.width, mult.height);
    
    // Draw multiplier border
    ctx.strokeStyle = '#66bb6a';
    ctx.lineWidth = 2;
    ctx.strokeRect(mult.x, mult.y, mult.width, mult.height);
    
    // Draw multiplier text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`x${mult.value.toFixed(1)}`, mult.x + mult.width/2, mult.y + mult.height/2 + 4);
}

function drawParticle(ctx, particle) {
    ctx.fillStyle = `rgba(76, 175, 80, ${particle.life})`;
    ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
}

function gameOver() {
    gameState.isPlaying = false;
    
    if (gameState.animationId) {
        cancelAnimationFrame(gameState.animationId);
    }
    
    playGameOverSound();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    
    // Update balance
    const earnedStars = Math.floor(gameState.score / 100);
    gameState.balance += earnedStars;
    
    // Show game over screen
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalMultiplier').textContent = `x${gameState.multiplier.toFixed(1)}`;
    document.getElementById('gameOver').style.display = 'block';
    
    updateBalance();
    saveGameData();
}

function restartGame() {
    document.getElementById('startButton').style.display = 'block';
    document.getElementById('gameOver').style.display = 'none';
    
    // Reset display
    gameState.score = 0;
    gameState.multiplier = 1.0;
    updateDisplay();
    
    // Clear canvas
    if (gameState.ctx) {
        gameState.ctx.clearRect(0, 0, gameState.canvas.width, gameState.canvas.height);
    }
}

function updateDisplay() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('multiplier').textContent = `x${gameState.multiplier.toFixed(1)}`;
    
    if (gameState.isPlaying) {
        document.getElementById('gameStatus').textContent = `Скорость: ${gameState.gameSpeed.toFixed(1)}x`;
    } else {
        document.getElementById('gameStatus').textContent = 'Нажми для старта';
    }
}

function updateBalance() {
    const balanceElements = ['headerBalance', 'gameBalance'];
    balanceElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = gameState.balance.toLocaleString();
    });
}

function saveGameData() {
    try {
        localStorage.setItem('rocket_balance', gameState.balance.toString());
    } catch (e) {
        console.log('Save error:', e);
    }
}

function loadGameData() {
    try {
        const saved = localStorage.getItem('rocket_balance');
        if (saved) gameState.balance = Math.max(1, parseInt(saved));
        
        const soundSaved = localStorage.getItem('rocket_sound');
        if (soundSaved !== null) {
            soundEnabled = soundSaved === 'true';
            toggleSound();
            toggleSound(); // Call twice to set correct state
        }
    } catch (e) {
        console.log('Load error:', e);
    }
}

// Modal functions (simplified)
function openTopUpModal() {
    playButtonClick();
    showNotification('💰 Пополнение баланса недоступно в демо версии');
}

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

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    loadGameData();
    updateBalance();
    
    // Initialize Telegram WebApp
    if (tg.ready) tg.ready();
    if (tg.expand) tg.expand();
});

// Handle page visibility
document.addEventListener('visibilitychange', function() {
    if (document.hidden && gameState.isPlaying) {
        gameState.isPaused = true;
    } else if (!document.hidden && gameState.isPaused) {
        gameState.isPaused = false;
        gameState.lastTime = performance.now();
        if (gameState.isPlaying) {
            gameLoop();
        }
    }
});
