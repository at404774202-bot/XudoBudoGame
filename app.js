let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const navButtons = document.querySelectorAll('.nav-button');
const menuContents = document.querySelectorAll('.menu-content');

navButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetMenu = button.getAttribute('data-menu');
        
        navButtons.forEach(btn => btn.classList.remove('active'));
        menuContents.forEach(menu => menu.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(targetMenu).classList.add('active');
    });
});
