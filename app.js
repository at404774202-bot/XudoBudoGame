let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Загрузка сохраненной темы
const savedTheme = localStorage.getItem('app-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// Игровые переменные
let gameState = {
    balance: 100, // Стартовый баланс в звездах
    currentBet: 10,
    currentMines: 3,
    gameActive: false,
    revealedCells: 0,
    minePositions: [],
    multipliers: {
        3: 1.5,
        5: 2.2,
        7: 3.5,
        9: 5.8,
        12: 12.0
    }
};

// Обновление баланса
function updateBalance() {
    document.getElementById('balance').textContent = gameState.balance + ' ⭐';
}

// Пополнение баланса через Telegram Stars
function buyStars(amount) {
    if (tg.openInvoice) {
        // Создаем инвойс для покупки звезд
        const invoice = {
            title: `Пополнение баланса`,
            description: `Покупка ${amount} звезд для игры`,
            payload: `stars_${amount}`,
            provider_token: '', // Для Telegram Stars не нужен
            currency: 'XTR',
            prices: [{
                label: `${amount} звезд`,
                amount: amount // В Telegram Stars 1 звезда = 1 XTR
            }]
        };
        
        tg.openInvoice(invoice.payload, (status) => {
            if (status === 'paid') {
                gameState.balance += amount;
                updateAllBalances();
                if (tg.showAlert) {
                    tg.showAlert(`Баланс пополнен на ${amount} ⭐`);
                }
            }
        });
    } else {
        // Fallback для тестирования
        gameState.balance += amount;
        updateAllBalances();
        if (tg.showAlert) {
            tg.showAlert(`Баланс пополнен на ${amount} ⭐ (тестовый режим)`);
        }
    }
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

// Пополнение баланса через Telegram Stars
function purchaseStars(stars, price) {
    if (tg.openInvoice) {
        // Создаем инвойс для покупки звезд
        const invoice = {
            title: `${stars} звезд`,
            description: `Пополнение баланса на ${stars} звезд`,
            payload: `stars_${stars}`,
            provider_token: '', // Для Telegram Stars не нужен
            currency: 'XTR',
            prices: [{
                label: `${stars} звезд`,
                amount: price
            }]
        };
        
        tg.openInvoice(invoice.payload, (status) => {
            if (status === 'paid') {
                // Начисляем звезды после успешной оплаты
                gameState.balance += stars;
                updateBalance();
                
                // Сохраняем баланс
                localStorage.setItem('game-balance', gameState.balance);
                
                if (tg.showAlert) {
                    tg.showAlert(`Успешно! Начислено ${stars} ⭐`);
                }
                
                if (tg.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred('medium');
                }
            }
        });
    } else {
        // Fallback для тестирования
        if (tg.showAlert) {
            tg.showAlert(`Тестовый режим: получено ${stars} ⭐`);
        }
        gameState.balance += stars;
        updateBalance();
        localStorage.setItem('game-balance', gameState.balance);
    }
}

// Обновление множителя
function updateMultiplier() {
    const multiplier = gameState.multipliers[gameState.currentMines];
    document.getElementById('multiplier').textContent = multiplier + 'x';
}

// Обновление активной кнопки темы
function updateThemeButtons() {
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === savedTheme) {
            btn.classList.add('active');
        }
    });
}

// Навигация между меню
const navButtons = document.querySelectorAll('.nav-button');
const menuContents = document.querySelectorAll('.menu-content');

navButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetMenu = button.getAttribute('data-menu');
        
        navButtons.forEach(btn => btn.classList.remove('active'));
        menuContents.forEach(menu => {
            menu.classList.remove('active');
            menu.style.display = 'none';
        });
        
        button.classList.add('active');
        const targetElement = document.getElementById(targetMenu);
        targetElement.style.display = 'block';
        setTimeout(() => {
            targetElement.classList.add('active');
            // Обновляем кнопки темы при открытии настроек
            if (targetMenu === 'settings-menu') {
                updateThemeButtons();
            }
        }, 10);
    });
});

// Переключение темы
document.addEventListener('click', (e) => {
    if (e.target.closest('.theme-btn')) {
        const themeBtn = e.target.closest('.theme-btn');
        const selectedTheme = themeBtn.getAttribute('data-theme');
        
        // Обновляем тему
        document.documentElement.setAttribute('data-theme', selectedTheme);
        localStorage.setItem('app-theme', selectedTheme);
        
        // Обновляем активную кнопку
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        themeBtn.classList.add('active');
        
        // Вибрация при переключении
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }

    // Открытие игры Мины
    if (e.target.closest('.game-card[data-game="mines"]') || e.target.closest('.play-button')) {
        if (e.target.closest('.game-card[data-game="mines"]')) {
            showMinesGame();
        }
    }

    // Кнопка "Назад" в игре
    if (e.target.closest('.back-btn')) {
        showGamesMenu();
    }

    // Выбор количества мин
    if (e.target.closest('.mine-btn')) {
        const mineBtn = e.target.closest('.mine-btn');
        const minesCount = parseInt(mineBtn.getAttribute('data-mines'));
        
        document.querySelectorAll('.mine-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        mineBtn.classList.add('active');
        
        gameState.currentMines = minesCount;
        updateMultiplier();
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }

    // Начать игру
    if (e.target.closest('#startGame')) {
        startMinesGame();
    }

    // Новая игра
    if (e.target.closest('#newGame')) {
        resetGame();
    }

    // Забрать выигрыш
    if (e.target.closest('#cashOut')) {
        cashOut();
    }
});

// Показать игру Мины
function showMinesGame() {
    document.getElementById('games-menu').style.display = 'none';
    document.getElementById('games-menu').classList.remove('active');
    
    const minesGame = document.getElementById('mines-game');
    minesGame.style.display = 'block';
    setTimeout(() => {
        minesGame.classList.add('active');
    }, 10);
    
    updateBalance();
    updateMultiplier();
}

// Показать меню игр
function showGamesMenu() {
    document.getElementById('mines-game').style.display = 'none';
    document.getElementById('mines-game').classList.remove('active');
    
    const gamesMenu = document.getElementById('games-menu');
    gamesMenu.style.display = 'block';
    setTimeout(() => {
        gamesMenu.classList.add('active');
    }, 10);
}

// Начать игру в мины
function startMinesGame() {
    const betAmount = parseInt(document.getElementById('betAmount').value);
    
    if (betAmount > gameState.balance) {
        if (tg.showAlert) {
            tg.showAlert('Недостаточно средств!');
        }
        return;
    }

    gameState.currentBet = betAmount;
    gameState.balance -= betAmount;
    gameState.gameActive = true;
    gameState.revealedCells = 0;
    
    // Генерируем позиции мин
    generateMines();
    
    // Создаем игровое поле
    createGameField();
    
    // Обновляем интерфейс
    updateBalance();
    document.getElementById('currentBet').textContent = betAmount + ' ⭐';
    document.getElementById('currentMines').textContent = gameState.currentMines;
    document.getElementById('currentMultiplier').textContent = gameState.multipliers[gameState.currentMines] + 'x';
    
    // Показываем игровое поле
    document.getElementById('gameSetup').style.display = 'none';
    document.getElementById('gamePlay').style.display = 'block';
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

// Генерация позиций мин
function generateMines() {
    gameState.minePositions = [];
    const totalCells = 16;
    
    while (gameState.minePositions.length < gameState.currentMines) {
        const position = Math.floor(Math.random() * totalCells);
        if (!gameState.minePositions.includes(position)) {
            gameState.minePositions.push(position);
        }
    }
}

// Создание игрового поля
function createGameField() {
    const field = document.getElementById('minesField');
    field.innerHTML = '';
    
    for (let i = 0; i < 16; i++) {
        const cell = document.createElement('button');
        cell.className = 'mine-cell';
        cell.setAttribute('data-index', i);
        cell.addEventListener('click', () => revealCell(i));
        field.appendChild(cell);
    }
}

// Открытие клетки
function revealCell(index) {
    if (!gameState.gameActive) return;
    
    const cell = document.querySelector(`[data-index="${index}"]`);
    if (cell.classList.contains('revealed') || cell.classList.contains('mine')) return;
    
    if (gameState.minePositions.includes(index)) {
        // Попали на мину
        cell.classList.add('mine');
        cell.textContent = '💣';
        gameOver();
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('heavy');
        }
    } else {
        // Безопасная клетка
        cell.classList.add('revealed');
        cell.textContent = '💎';
        gameState.revealedCells++;
        
        // Включаем кнопку "Забрать выигрыш"
        document.getElementById('cashOut').disabled = false;
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
        
        // Проверяем победу
        if (gameState.revealedCells === 16 - gameState.currentMines) {
            gameWin();
        }
    }
}

// Проигрыш
function gameOver() {
    gameState.gameActive = false;
    
    // Показываем все мины
    gameState.minePositions.forEach(pos => {
        const cell = document.querySelector(`[data-index="${pos}"]`);
        if (!cell.classList.contains('mine')) {
            cell.classList.add('mine');
            cell.textContent = '💣';
        }
    });
    
    setTimeout(() => {
        if (tg.showAlert) {
            tg.showAlert('Игра окончена! Вы попали на мину.');
        }
    }, 1000);
}

// Победа
function gameWin() {
    gameState.gameActive = false;
    const winAmount = Math.floor(gameState.currentBet * gameState.multipliers[gameState.currentMines]);
    gameState.balance += winAmount;
    updateBalance();
    
    setTimeout(() => {
        if (tg.showAlert) {
            tg.showAlert(`Поздравляем! Вы выиграли ${winAmount}₽!`);
        }
    }, 500);
}

// Забрать выигрыш
function cashOut() {
    if (!gameState.gameActive || gameState.revealedCells === 0) return;
    
    const winAmount = Math.floor(gameState.currentBet * Math.pow(gameState.multipliers[gameState.currentMines], gameState.revealedCells / (16 - gameState.currentMines)));
    gameState.balance += winAmount;
    gameState.gameActive = false;
    
    updateBalance();
    document.getElementById('cashOut').disabled = true;
    
    if (tg.showAlert) {
        tg.showAlert(`Вы забрали ${winAmount}₽!`);
    }
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

// Сброс игры
function resetGame() {
    gameState.gameActive = false;
    gameState.revealedCells = 0;
    gameState.minePositions = [];
    
    document.getElementById('gameSetup').style.display = 'block';
    document.getElementById('gamePlay').style.display = 'none';
    document.getElementById('cashOut').disabled = true;
}

// Обработка изменения ставки
document.addEventListener('input', (e) => {
    if (e.target.id === 'betAmount') {
        const value = parseInt(e.target.value);
        if (value > gameState.balance) {
            e.target.value = gameState.balance;
        }
        if (value < 1) {
            e.target.value = 1;
        }
    }
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    updateThemeButtons();
    updateBalance();
    updateMultiplier();
});

// Функции навигации для главного меню
function showTopUpMenu() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('main-menu').classList.remove('active');
    
    const topupMenu = document.getElementById('topup-menu');
    topupMenu.style.display = 'block';
    setTimeout(() => {
        topupMenu.classList.add('active');
        updateTopUpBalance();
    }, 10);
}

function backToMain() {
    document.getElementById('topup-menu').style.display = 'none';
    document.getElementById('topup-menu').classList.remove('active');
    
    const mainMenu = document.getElementById('main-menu');
    mainMenu.style.display = 'block';
    setTimeout(() => {
        mainMenu.classList.add('active');
        updateMainBalance();
    }, 10);
}

function switchToGames() {
    // Переключаем активную кнопку навигации
    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-menu="games-menu"]').classList.add('active');
    
    // Переключаем меню
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('main-menu').classList.remove('active');
    
    const gamesMenu = document.getElementById('games-menu');
    gamesMenu.style.display = 'block';
    setTimeout(() => {
        gamesMenu.classList.add('active');
    }, 10);
}

function switchToSettings() {
    // Переключаем активную кнопку навигации
    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-menu="settings-menu"]').classList.add('active');
    
    // Переключаем меню
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('main-menu').classList.remove('active');
    
    const settingsMenu = document.getElementById('settings-menu');
    settingsMenu.style.display = 'block';
    setTimeout(() => {
        settingsMenu.classList.add('active');
        updateThemeButtons();
    }, 10);
}

// Обновление баланса в разных местах
function updateMainBalance() {
    document.getElementById('mainBalance').textContent = gameState.balance + ' ⭐';
}

function updateTopUpBalance() {
    document.getElementById('topupBalance').textContent = gameState.balance + ' ⭐';
}

// Обновляем все балансы при изменении
function updateAllBalances() {
    updateBalance();
    if (document.getElementById('mainBalance')) {
        updateMainBalance();
    }
    if (document.getElementById('topupBalance')) {
        updateTopUpBalance();
    }
}
