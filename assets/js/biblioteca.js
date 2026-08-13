import { supabase } from './supabase.js';

console.log('🚀 biblioteca.js cargado correctamente');

async function cargarLibros() {
    const grid = document.getElementById('books-grid');
    
    try {
        const { data: libros, error } = await supabase
            .from('libros')
            .select('*')
            .eq('esta_publicado', true)
            .order('orden_mostrar', { ascending: true });

        if (error) throw error;

        grid.innerHTML = ''; // Limpiar mensaje de carga

        if (!libros || libros.length === 0) {
            grid.innerHTML = '<p class="no-books">Próximamente se agregarán nuevas obras.</p>';
            return;
        }

        libros.forEach(libro => {
            const card = crearTarjetaLibro(libro);
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('💥 Error al cargar libros:', error);
        grid.innerHTML = `<p class="error-message">Error: ${error.message}. Revisa la consola (F12).</p>`;
    }
}

function crearTarjetaLibro(libro) {
    const article = document.createElement('article');
    article.className = `book-card ${libro.es_destacado ? 'book-featured' : ''}`;

    const esProximamente = libro.estado === 'proximamente' || (!libro.amazon_url && !libro.app_interactiva_url);

    let badgeHTML = '';
    if (esProximamente) {
        badgeHTML = '<span class="book-badge badge-proximamente">Próximamente</span>';
    } else if (libro.es_destacado) {
        badgeHTML = '<span class="book-badge">Nuevo</span>';
    }

    // Si no hay imagen, usa una por defecto elegante
    const imagenSrc = libro.imagen_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800';

    let accionesHTML = '';
    if (esProximamente) {
        accionesHTML = `
            <div class="book-actions">
                <button class="btn-book-primary btn-disabled" disabled>
                    <i class="fas fa-clock"></i> Disponible pronto
                </button>
            </div>
        `;
    } else {
        const appBtn = libro.app_interactiva_url 
            ? `<a href="${libro.app_interactiva_url}" class="btn-book-primary" target="_blank"><i class="fas fa-gamepad"></i> Experiencia Interactiva</a>` 
            : '';
            
        const amazonBtn = libro.amazon_url 
            ? `<a href="${libro.amazon_url}" class="btn-book-secondary" target="_blank"><i class="fa-brands fa-amazon"></i> Obtener en Amazon</a>` 
            : '';

        accionesHTML = `<div class="book-actions">${appBtn}${amazonBtn}</div>`;
    }

    article.innerHTML = `
        <div class="book-cover">
            <img src="${imagenSrc}" alt="${libro.titulo}" class="book-cover-img ${esProximamente ? 'proximamente-img' : ''}">
            ${badgeHTML}
        </div>
        <div class="book-content">
            <h3 class="book-title">${libro.titulo}</h3>
            <p class="book-subtitle">${libro.subtitulo || ''}</p>
            <p class="book-description">${libro.descripcion || ''}</p>
            ${accionesHTML}
        </div>
    `;

    return article;
}

document.addEventListener('DOMContentLoaded', cargarLibros);