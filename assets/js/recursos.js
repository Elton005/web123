import { supabase } from './supabase.js';

// ==========================================
// CARGAR RECURSOS (MASONRY GRID)
// ==========================================
async function loadRecursos() {
    const container = document.getElementById('recursos-masonry');
    container.innerHTML = '<div class="loading">Cargando recursos...</div>';

    try {
        const { data: recursos, error } = await supabase
            .from('recursos')
            .select('*')
            .eq('esta_activo', true)
            .order('orden', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!recursos || recursos.length === 0) {
            container.innerHTML = '<div class="loading">No hay recursos disponibles aún.</div>';
            return;
        }

        container.innerHTML = '';
        recursos.forEach(recurso => {
            const card = createRecursoCard(recurso);
            container.appendChild(card);
        });

        setupLazyLoading();

    } catch (error) {
        console.error('Error al cargar recursos:', error);
        container.innerHTML = '<div class="loading">Error al cargar recursos</div>';
    }
}

function createRecursoCard(recurso) {
    const div = document.createElement('div');
    div.className = 'masonry-item';
    
    const categoriaLabels = {
        consejos: 'Consejos',
        herramientas: 'Herramientas',
        inspiracion: 'Inspiración',
        tecnicas: 'Técnicas'
    };

    // Al hacer clic en la imagen, abrimos el modal
    div.innerHTML = `
        <div class="recurso-card">
            <div class="recurso-imagen-container" onclick="openImageModal('${recurso.imagen_url}', '${recurso.titulo.replace(/'/g, "\\'")}')">
                <img src="${recurso.imagen_url}" 
                     alt="${recurso.titulo}" 
                     class="recurso-imagen"
                     loading="lazy">
                <div class="recurso-overlay">
                    <h3 class="recurso-titulo">${recurso.titulo}</h3>
                </div>
                <span class="recurso-categoria">${categoriaLabels[recurso.categoria] || recurso.categoria}</span>
            </div>
            <div class="recurso-content">
                <h3 class="recurso-titulo-static">${recurso.titulo}</h3>
                ${recurso.descripcion ? `<p class="recurso-descripcion">${recurso.descripcion.substring(0, 100)}${recurso.descripcion.length > 100 ? '...' : ''}</p>` : ''}
            </div>
        </div>
    `;
    
    return div;
}

// ==========================================
// MODAL DE IMAGEN (LIGHTBOX)
// ==========================================
window.openImageModal = function(imageUrl, title) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image');
    const modalTitle = document.getElementById('modal-title');
    
    modalImg.src = imageUrl;
    modalTitle.textContent = title;
    modal.classList.add('is-active');
    document.body.style.overflow = 'hidden'; // Evitar scroll de fondo
};

window.closeImageModal = function(event) {
    if (event) event.stopPropagation();
    const modal = document.getElementById('image-modal');
    modal.classList.remove('is-active');
    document.body.style.overflow = ''; // Restaurar scroll
};

// Cerrar con tecla Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeImageModal();
    }
});

// ==========================================
// LAZY LOADING
// ==========================================
function setupLazyLoading() {
    const images = document.querySelectorAll('.recurso-imagen');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.addEventListener('load', () => {
                    img.classList.add('loaded');
                });
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadRecursos();
});