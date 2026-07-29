// =========================================
// NAVEGACIÓN Y MENÚ HAMBURGUESA
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.nav-link');

    // 1. Toggle del menú al hacer clic en la hamburguesa
    menuToggle.addEventListener('click', () => {
        const isActive = menuToggle.classList.toggle('is-active');
        mainNav.classList.toggle('is-active');
        
        // Accesibilidad: informamos si el menú está abierto o cerrado
        menuToggle.setAttribute('aria-expanded', isActive);
    });

    // 2. Cerrar el menú automáticamente al hacer clic en un enlace (Mejor UX en móvil)
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mainNav.classList.contains('is-active')) {
                menuToggle.classList.remove('is-active');
                mainNav.classList.remove('is-active');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    });
});