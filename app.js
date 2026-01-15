let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Загрузка сохраненной темы
const savedTheme = localStorage.getItem('app-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

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
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    updateThemeButtons();
});
