// ========== MENÚ MOBILE ==========
function initMenu() {
  const navToggle = document.getElementById('navToggle');
  const nav = document.getElementById('nav');

  if (!navToggle || !nav) return;

  navToggle.addEventListener('click', () => {
    nav.classList.toggle('active');
    
    // Cambiar icono
    const icon = navToggle.querySelector('i');
    if (nav.classList.contains('active')) {
      icon.classList.remove('fa-bars');
      icon.classList.add('fa-times');
    } else {
      icon.classList.remove('fa-times');
      icon.classList.add('fa-bars');
    }
  });

  // Cerrar menú al hacer click en un link
  const navLinks = nav.querySelectorAll('.nav__link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('active');
      navToggle.querySelector('i').classList.remove('fa-times');
      navToggle.querySelector('i').classList.add('fa-bars');
    });
  });
}

// ========== CARGAR LIBROS ==========
async function cargarLibros() {
  const carruselTrack = document.getElementById('carruselTrack');
  const librosGrid = document.getElementById('librosGrid');

  if (!carruselTrack && !librosGrid) return;

  try {
    const response = await fetch('data/libros.json');
    const libros = await response.json();

    const libroHTML = libros.map(libro => `
      <div class="libro-card">
        <img src="${libro.imagen}" alt="${libro.titulo}" class="libro-card__img" loading="lazy" />
        <h3 class="libro-card__title">${libro.titulo}</h3>
        <p class="libro-card__subtitle">${libro.descripcion}</p>
        <a href="#" class="btn btn--outline">VER MÁS</a>
      </div>
    `).join('');

    if (carruselTrack) carruselTrack.innerHTML = libroHTML;
    if (librosGrid) librosGrid.innerHTML = libroHTML;

  } catch (error) {
    console.error('Error cargando libros:', error);
  }
}

// ========== CARRUSEL BOTONES ==========
function initCarrusel() {
  const track = document.getElementById('carruselTrack');
  const btnPrev = document.querySelector('.carrusel__btn--prev');
  const btnNext = document.querySelector('.carrusel__btn--next');

  if (!track || !btnPrev || !btnNext) return;

  const scrollAmount = 280;

  btnPrev.addEventListener('click', () => {
    track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  });

  btnNext.addEventListener('click', () => {
    track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  });
}

// ========== INICIALIZAR ==========
document.addEventListener('DOMContentLoaded', () => {
  initMenu();
  cargarLibros();
  initCarrusel();
});