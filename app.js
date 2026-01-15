let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Загрузка сохраненной темы
const savedTheme = localStorage.getItem('app-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// Загрузка сохраненного баланса
const savedBalance = localStorage.getItem('game-balance');
if (savedBalance) {
    gameState.balance = parseInt(savedBalance);
}

// Сохранение данных игры
function saveGameData() {
    localStorage.setItem('game-balance', gameState.balance);
}

// Загрузка данных игры
function loadGameData() {
    const savedBalance = localStorage.getItem('game-balance');
    if (savedBalance) {
        gameState.balance = parseInt(savedBalance);
    }
}

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
    // Проверяем доступность Telegram Web App API
    if (window.Telegram?.WebApp) {
        // Отправляем данные боту для создания инвойса
        sendInvoiceRequest(amount);
    } else {
        // Fallback для тестирования
        showTestPayment(amount);
    }
}

// Отправка запроса на создание инвойса боту
function sendInvoiceRequest(amount) {
    const userId = tg.initDataUnsafe?.user?.id;
    
    if (userId) {
        // Отправляем данные боту через postEvent
        tg.sendData(JSON.stringify({
            action: 'create_invoice',
            amount: amount,
            user_id: userId,
            payload: generateInvoicePayload(amount)
        }));
        
        // Показываем индикатор загрузки
        showLoadingPayment(amount);
    } else {
        // Если нет user ID, показываем тестовый режим
        showTestPayment(amount);
    }
}

// Показать индикатор загрузки платежа
function showLoadingPayment(amount) {
    if (tg.showPopup) {
        tg.showPopup({
            title: 'Подготовка платежа',
            message: `Создаем инвойс для покупки ${amount} ⭐...\n\nПожалуйста, подождите.`,
            buttons: [
                {id: 'cancel', type: 'cancel', text: 'Отмена'}
            ]
        }, (buttonId) => {
            if (buttonId === 'cancel') {
                if (tg.showAlert) {
                    tg.showAlert('❌ Создание инвойса отменено');
                }
            }
        });
        
        // Через 3 секунды показываем тестовый режим если нет ответа
        setTimeout(() => {
            showTestPayment(amount);
        }, 3000);
    } else {
        showTestPayment(amount);
    }
}

// Показать тестовый платеж (для разработки)
function showTestPayment(amount) {
    if (tg.showPopup) {
        // Показываем popup как в примере на скриншоте
        tg.showPopup({
            title: 'Подтверждение покупки',
            message: `Вы точно хотите приобрести ${amount} ⭐ за ${amount} звезду?`,
            buttons: [
                {id: 'cancel', type: 'cancel', text: 'Отмена'},
                {id: 'pay', type: 'default', text: `Подтвердить и заплатить ⭐ ${amount} звезду`}
            ]
        }, (buttonId) => {
            if (buttonId === 'pay') {
                // Имитируем успешную оплату для тестирования
                handlePaymentResult('paid', amount);
            }
        });
    } else {
        // Простой fallback для тестирования
        handlePaymentResult('paid', amount);
    }
}

// Обработка событий от бота
tg.onEvent('invoiceStatus', (eventData) => {
    const { status, amount, invoice_url } = eventData;
    
    if (status === 'created' && invoice_url) {
        // Бот создал инвойс, открываем его
        tg.openInvoice(invoice_url, (paymentStatus) => {
            handlePaymentResult(paymentStatus, amount);
        });
    } else if (status === 'error') {
        if (tg.showAlert) {
            tg.showAlert('❌ Ошибка создания инвойса. Попробуйте позже.');
        }
    }
});

// Обработка успешного платежа от бота
tg.onEvent('paymentSuccess', (eventData) => {
    const { amount, transaction_id } = eventData;
    
    // Начисляем звезды
    gameState.balance += amount;
    updateAllBalances();
    saveGameData();
    
    // Показываем успешное уведомление
    if (tg.showAlert) {
        tg.showAlert(`✅ Успешно! Баланс пополнен на ${amount} ⭐`);
    }
    
    // Добавляем анимацию успеха
    const balanceElements = document.querySelectorAll('[id*="balance"], [id*="Balance"]');
    balanceElements.forEach(el => {
        el.classList.add('success-animation');
        setTimeout(() => el.classList.remove('success-animation'), 600);
    });
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
});

// Покупка пользовательского количества звезд
function buyCustomStars() {
    const amount = parseInt(document.getElementById('starsAmount').value);
    
    if (!amount || amount < 1) {
        if (tg.showAlert) {
            tg.showAlert('❌ Введите корректное количество звезд (от 1)');
        }
        return;
    }
    
    if (amount > 10000) {
        if (tg.showAlert) {
            tg.showAlert('❌ Максимальное количество: 10,000 звезд');
        }
        return;
    }
    
    // Вызываем основную функцию покупки
    buyStars(amount);
}

// Генерация payload для инвойса (для реальной интеграции)
function generateInvoicePayload(amount) {
    const timestamp = Date.now();
    const userId = tg.initDataUnsafe?.user?.id || 'anonymous';
    return `stars_${amount}_${userId}_${timestamp}`;
}

// Обновление цены при вводе количества звезд
function updateStarsPrice() {
    const amount = parseInt(document.getElementById('starsAmount').value) || 1;
    document.getElementById('starsPrice').textContent = amount;
}

// Обновление множителя
function updateMultiplier() {
    const multiplier = gameState.multipliers[gameState.currentMines];
    document.getElementById('multiplier').textContent = multiplier + 'x';
}

// Обновление активной кнопки темы
function updateThemeButtons() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === currentTheme) {
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
    saveGameData();
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
    saveGameData();
    updateBalance();
    
    setTimeout(() => {
        if (tg.showAlert) {
            tg.showAlert(`Поздравляем! Вы выиграли ${winAmount} ⭐!`);
        }
    }, 500);
}

// Забрать выигрыш
function cashOut() {
    if (!gameState.gameActive || gameState.revealedCells === 0) return;
    
    const winAmount = Math.floor(gameState.currentBet * Math.pow(gameState.multipliers[gameState.currentMines], gameState.revealedCells / (16 - gameState.currentMines)));
    gameState.balance += winAmount;
    saveGameData();
    gameState.gameActive = false;
    
    updateBalance();
    document.getElementById('cashOut').disabled = true;
    
    if (tg.showAlert) {
        tg.showAlert(`Вы забрали ${winAmount} ⭐!`);
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

// Обработка изменения ставки и количества звезд
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
    
    if (e.target.id === 'starsAmount') {
        updateStarsPrice();
        const value = parseInt(e.target.value);
        if (value > 10000) {
            e.target.value = 10000;
        }
        if (value < 1 && e.target.value !== '') {
            e.target.value = 1;
        }
    }
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    loadGameData();
    updateThemeButtons();
    updateAllBalances();
    updateMultiplier();
    checkBotStatus(); // Проверяем статус бота
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
// Обработка результата платежа (для fallback режима)
function handlePaymentResult(status, amount) {
    if (status === 'paid') {
        // Успешная оплата
        gameState.balance += amount;
        updateAllBalances();
        saveGameData();
        
        // Добавляем анимацию успеха
        const balanceElements = document.querySelectorAll('[id*="balance"], [id*="Balance"]');
        balanceElements.forEach(el => {
            el.classList.add('success-animation');
            setTimeout(() => el.classList.remove('success-animation'), 600);
        });
        
        if (tg.showAlert) {
            tg.showAlert(`✅ Успешно! Баланс пополнен на ${amount} ⭐`);
        }
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    } else if (status === 'cancelled') {
        if (tg.showAlert) {
            tg.showAlert('❌ Оплата отменена');
        }
    } else if (status === 'failed') {
        if (tg.showAlert) {
            tg.showAlert('❌ Ошибка оплаты. Попробуйте еще раз');
        }
    }
}

// Проверка статуса бота при загрузке
function checkBotStatus() {
    // Отправляем ping боту для проверки связи
    if (tg.initDataUnsafe?.user?.id) {
        tg.sendData(JSON.stringify({
            action: 'ping',
            user_id: tg.initDataUnsafe.user.id
        }));
    }
}

// Обработка ответа от бота на ping
tg.onEvent('botStatus', (eventData) => {
    const { status, features } = eventData;
    
    if (status === 'online' && features?.includes('payments')) {
        console.log('✅ Бот онлайн, платежи доступны');
        // Можно показать индикатор что реальные платежи работают
    } else {
        console.log('⚠️ Бот недоступен, используется тестовый режим');
    }
});