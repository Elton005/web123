/* =========================================
   BIBLIOTECA - FILTRADO DE LIBROS Y STICKY MENU
   ========================================= */

document.addEventListener('DOMContentLoaded', function() {
    
    console.log('Biblioteca JS cargado');
    
    // Seleccionar elementos del DOM
    const filterButtons = document.querySelectorAll('.filter-btn');
    const bookCards = document.querySelectorAll('.book-card');
    const filterMenu = document.querySelector('.library-filters');
    const guestAuthorSection = document.querySelector('.guest-author');

    console.log('Botones encontrados:', filterButtons.length);
    console.log('Libros encontrados:', bookCards.length);

    // ============================================
    // 1. LÓGICA DE FILTRADO DE LIBROS
    // ============================================
    function filterBooks(category) {
        bookCards.forEach(card => {
            const cardCategory = card.getAttribute('data-category');
            
            if (category === 'todos' || cardCategory === category) {
                card.classList.remove('hide');
                card.classList.add('show');
            } else {
                card.classList.remove('show');
                card.classList.add('hide');
            }
        });
    }

    // Agregar evento click a cada botón de filtro
    filterButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remover clase active de todos los botones
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Agregar clase active al botón clickeado
            this.classList.add('active');
            
            // Obtener el filtro seleccionado y aplicar
            const filterValue = this.getAttribute('data-filter');
            filterBooks(filterValue);
        });
    });

    // ============================================
    // 2. OCULTAR FILTROS AL LLEGAR AL AUTOR INVITADO
    // ============================================
    function checkAuthorSection() {
        if (!guestAuthorSection || !filterMenu) return;
        
        // Obtenemos la posición de la sección del autor respecto al viewport
        const authorSectionTop = guestAuthorSection.getBoundingClientRect().top;
        
        // Si la parte superior de la sección del autor está a menos de 150px del tope de la ventana
        // (es decir, está empezando a ser visible), ocultamos el menú de filtros
        if (authorSectionTop < 150) {
            filterMenu.classList.add('hide-filters');
        } else {
            filterMenu.classList.remove('hide-filters');
        }
    }
    
    // Escuchar el evento de scroll 
    // (usamos { passive: true } para mejorar el rendimiento del scroll)
    window.addEventListener('scroll', checkAuthorSection, { passive: true });
    
    // Inicializar: mostrar todos los libros y verificar posición inicial al cargar
    filterBooks('todos');
    checkAuthorSection();
});