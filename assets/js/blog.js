import { supabase } from './supabase.js';

async function loadFeaturedPosts() {
    const container = document.getElementById('featured-posts');
    const { data: posts, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('esta_publicado', true)
        .eq('es_destacado', true)
        .order('orden_prioridad', { ascending: true })
        .order('fecha_publicacion', { ascending: false })
        .limit(3);

    if (error || !posts || posts.length === 0) {
        container.innerHTML = '<div class="loading">No hay artículos destacados aún.</div>';
        return;
    }

    container.innerHTML = '';
    posts.forEach(post => {
        const div = document.createElement('div');
        div.className = 'featured-post-card';
        div.onclick = () => window.open(`blog-post.html?id=${post.id}`, '_blank');
        
        // Usamos la primera sección de texto como extracto si no hay subtitulo
        const extracto = post.subtitulo || (post.blog_secciones?.find(s => s.tipo === 'texto')?.contenido?.replace(/<[^>]*>/g, '').substring(0, 150) + '...') || '';
        
        div.innerHTML = `
            ${post.imagen_portada ? `<img src="${post.imagen_portada}" alt="${post.titulo}" class="featured-post-image">` : ''}
            <div class="featured-post-content">
                <div class="featured-post-categoria">${post.categoria || 'Reflexión'}</div>
                <h3 class="featured-post-title">${post.titulo}</h3>
                <p class="featured-post-extracto">${extracto}</p>
                <div class="featured-post-meta"><i class="far fa-calendar"></i> ${post.fecha_publicacion || 'Sin fecha'}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

async function loadAllPosts() {
    const container = document.getElementById('all-posts');
    const { data: posts, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('esta_publicado', true)
        .order('orden_prioridad', { ascending: true })
        .order('fecha_publicacion', { ascending: false });

    if (error || !posts || posts.length === 0) {
        container.innerHTML = '<div class="loading">No hay artículos publicados aún.</div>';
        return;
    }

    container.innerHTML = '';
    posts.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post-card';
        div.onclick = () => window.open(`blog-post.html?id=${post.id}`, '_blank');
        
        const extracto = post.subtitulo || (post.blog_secciones?.find(s => s.tipo === 'texto')?.contenido?.replace(/<[^>]*>/g, '').substring(0, 200) + '...') || '';
        
        div.innerHTML = `
            ${post.imagen_portada ? `<img src="${post.imagen_portada}" alt="${post.titulo}" class="post-card-image">` : ''}
            <div class="post-card-content">
                <div class="post-card-categoria" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-dorado); font-weight: 600; margin-bottom: 0.5rem;">${post.categoria || 'Reflexión'}</div>
                <h3 class="post-card-title">${post.titulo}</h3>
                <p class="post-card-extracto">${extracto}</p>
                <div class="post-card-meta" style="font-size: 0.85rem; color: var(--color-gris);"><i class="far fa-calendar"></i> ${post.fecha_publicacion || 'Sin fecha'}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedPosts();
    loadAllPosts();
});