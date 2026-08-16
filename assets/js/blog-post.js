import { supabase } from './supabase.js';

async function loadPost() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    
    if (!postId) {
        document.getElementById('post-article').innerHTML = '<div class="loading">Artículo no encontrado</div>';
        return;
    }
    
    try {
        const { data: post, error } = await supabase
            .from('blog_posts')
            .select(`
                *,
                blog_secciones (
                    id, tipo, titulo, contenido, imagen_url, pie_imagen, datos_json, orden
                )
            `)
            .eq('id', postId)
            .single();
        
        if (error || !post) {
            document.getElementById('post-article').innerHTML = '<div class="loading">Artículo no encontrado</div>';
            return;
        }
        
        document.title = `${post.titulo} | La Huella Escrita`;
        
        const article = document.getElementById('post-article');
        
        let html = `
            <header class="post-header">
                <div class="post-categoria">${post.categoria || 'Reflexión'}</div>
                <h1 class="post-titulo">${post.titulo}</h1>
                ${post.subtitulo ? `<p class="post-subtitulo">${post.subtitulo}</p>` : ''}
                <div class="post-meta"><i class="far fa-calendar"></i> ${post.fecha_publicacion || 'Sin fecha'}</div>
            </header>
        `;
        
        if (post.imagen_portada) {
            html += `<img src="${post.imagen_portada}" alt="${post.titulo}" class="post-imagen-principal">`;
        }
        
        const secciones = post.blog_secciones || [];
        secciones.sort((a, b) => a.orden - b.orden);
        
        secciones.forEach(seccion => {
            switch(seccion.tipo) {
                case 'texto':
                    html += `
                        <div class="modulo-seccion modulo-texto">
                            ${seccion.titulo ? `<h2>${seccion.titulo}</h2>` : ''}
                            ${seccion.contenido || ''}
                        </div>
                    `;
                    break;
                case 'imagen':
                    html += `
                        <div class="modulo-seccion modulo-imagen">
                            <img src="${seccion.imagen_url}" alt="${seccion.titulo || 'Imagen'}">
                            ${seccion.pie_imagen ? `<figcaption>${seccion.pie_imagen}</figcaption>` : ''}
                        </div>
                    `;
                    break;
                case 'cita':
                    html += `
                        <div class="modulo-seccion modulo-cita">
                            <blockquote>"${seccion.contenido}"</blockquote>
                            ${seccion.titulo ? `<cite>— ${seccion.titulo}</cite>` : ''}
                        </div>
                    `;
                    break;
                case 'consejo':
                    html += `
                        <div class="modulo-seccion modulo-consejo">
                            <h3><i class="fas fa-lightbulb"></i> ${seccion.titulo || 'Consejo'}</h3>
                            <p>${seccion.contenido}</p>
                        </div>
                    `;
                    break;
                case 'separador':
                    html += `<div class="modulo-seccion modulo-separador">✦ ✦ ✦</div>`;
                    break;
                case 'lista_libros':
                    const libros = seccion.datos_json?.libros || [];
                    if (libros.length > 0) {
                        let librosHtml = libros.map(libro => `
                            <div class="libro-card">
                                ${libro.portada ? `<img src="${libro.portada}" alt="${libro.titulo}">` : ''}
                                <div class="libro-card-info">
                                    <h4>${libro.titulo}</h4>
                                    <p>${libro.autor}</p>
                                    ${libro.link ? `<a href="${libro.link}" target="_blank">Ver libro <i class="fas fa-external-link-alt"></i></a>` : ''}
                                </div>
                            </div>
                        `).join('');
                        html += `
                            <div class="modulo-seccion modulo-lista-libros">
                                ${seccion.titulo ? `<h3>${seccion.titulo}</h3>` : ''}
                                <div class="grid-libros">${librosHtml}</div>
                            </div>
                        `;
                    }
                    break;
                case 'html_libre':
                    html += `<div class="modulo-seccion">${seccion.contenido || ''}</div>`;
                    break;
            }
        });
        
        article.innerHTML = html;
        
        // Cargar navegación anterior/siguiente
        loadNavigation(post.id, post.orden_prioridad);
        
    } catch (error) {
        console.error('Error al cargar artículo:', error);
        document.getElementById('post-article').innerHTML = '<div class="loading">Error al cargar el artículo</div>';
    }
}

async function loadNavigation(currentId, currentOrden) {
    const navContainer = document.getElementById('post-navigation');
    
    try {
        // Artículo anterior (orden mayor = más antiguo en nuestra lógica)
        const { data: prev } = await supabase
            .from('blog_posts')
            .select('id, titulo')
            .eq('esta_publicado', true)
            .gt('orden_prioridad', currentOrden)
            .order('orden_prioridad', { ascending: true })
            .limit(1)
            .maybeSingle();
        
        // Artículo siguiente
        const { data: next } = await supabase
            .from('blog_posts')
            .select('id, titulo')
            .eq('esta_publicado', true)
            .lt('orden_prioridad', currentOrden)
            .order('orden_prioridad', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        let html = '';
        
        if (prev) {
            html += `
                <a href="blog-post.html?id=${prev.id}" class="nav-post-link prev">
                    <span class="nav-label"><i class="fas fa-arrow-left"></i> Anterior</span>
                    <span class="nav-title">${prev.titulo}</span>
                </a>
            `;
        } else {
            html += '<div></div>';
        }
        
        if (next) {
            html += `
                <a href="blog-post.html?id=${next.id}" class="nav-post-link next">
                    <span class="nav-label">Siguiente <i class="fas fa-arrow-right"></i></span>
                    <span class="nav-title">${next.titulo}</span>
                </a>
            `;
        } else {
            html += '<div></div>';
        }
        
        navContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Error al cargar navegación:', error);
    }
}

document.addEventListener('DOMContentLoaded', loadPost);