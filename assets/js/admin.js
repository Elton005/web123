import { supabase } from './supabase.js';

let currentBookId = null;
let uploadedImageUrl = null;
let currentAdminEmail = null;
let currentPostId = null;
let uploadedPostImageUrl = null;
let secciones = [];
let seccionCounter = 0;
let pendingConfirmAction = null;

// 🆕 Variables para Recursos
let currentRecursoId = null;
let uploadedRecursoImageUrl = null;

const BLOG_STORAGE_LIMIT_MB = 20;
const RECURSOS_STORAGE_LIMIT_MB = 15;
const MAX_RECURSO_IMAGE_KB = 300;

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAccess();
});

async function checkAdminAccess() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    currentAdminEmail = session.user.email;
    const { data: admin } = await supabase.from('administradores').select('*').eq('email', currentAdminEmail).eq('activo', true).maybeSingle();

    if (!admin) {
        showToast('Tu cuenta no tiene permisos de administrador.', 'error');
        await supabase.auth.signOut();
        return;
    }

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    document.getElementById('panel-user-email').textContent = session.user.email;
    loadBooksList();
}

// ==========================================
// SISTEMA DE NOTIFICACIONES (TOASTS)
// ==========================================
window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>'
    };
    
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
};

// ==========================================
// MODAL DE CONFIRMACIÓN ELEGANTE
// ==========================================
window.showConfirmModal = function(title, message, actionCallback) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    pendingConfirmAction = actionCallback;
    document.getElementById('confirm-modal').classList.add('is-active');
};

window.closeConfirmModal = function() {
    document.getElementById('confirm-modal').classList.remove('is-active');
    pendingConfirmAction = null;
};

window.executeConfirmAction = function() {
    if (pendingConfirmAction) pendingConfirmAction();
    closeConfirmModal();
};

// ==========================================
// NAVEGACIÓN Y LOGIN
// ==========================================
window.switchView = function(viewId) {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    document.querySelector(`[data-view="${viewId}"]`).classList.add('active');
    
    document.getElementById('preview-toggle').style.display = 'none';
    
    if (viewId === 'view-admins') loadAdminsList();
    if (viewId === 'view-blog') { loadBlogPostsList(); loadStorageUsage('blog'); }
    if (viewId === 'view-recursos') { loadRecursosList(); loadStorageUsage('recursos'); }
};

window.loginWithGoogle = async function() {
    await supabase.auth.signInWithOAuth({ 
        provider: 'google', 
        options: { 
            // ✅ Forzamos la redirección a tu dominio real
            redirectTo: 'https://lahuellaescrita.com/admin-lhe-2026.html' 
        } 
    });
};

window.handleAdminLogin = async function(event) {
    event.preventDefault();
    const email = document.getElementById('admin-email').value;
    const messageEl = document.getElementById('login-message');
    
    const { error } = await supabase.auth.signInWithOtp({ 
        email, 
        options: { 
            // ✅ Forzamos la redirección a tu dominio real
            emailRedirectTo: 'https://lahuellaescrita.com/admin-lhe-2026.html' 
        } 
    });
    
    if (error) {
        messageEl.textContent = '❌ Error: ' + error.message;
        messageEl.style.color = '#DC2626';
    } else {
        showToast('Enlace mágico enviado. Revisa tu correo.', 'success');
    }
};

window.logout = async function() {
    await supabase.auth.signOut();
    window.location.reload();
};

// ==========================================
// LIBROS
// ==========================================
async function loadBooksList() {
    const listContainer = document.getElementById('books-list');
    listContainer.innerHTML = '<div class="loading">Cargando libros...</div>';
    const { data: libros, error } = await supabase.from('libros').select('*').order('orden_mostrar', { ascending: true });

    if (error || !libros || libros.length === 0) {
        listContainer.innerHTML = `<div class="loading">${error ? 'Error al cargar' : 'No hay libros aún'}</div>`;
        return;
    }

    listContainer.innerHTML = '';
    libros.forEach(libro => listContainer.appendChild(createBookItem(libro)));
}

function createBookItem(libro) {
    const div = document.createElement('div');
    div.className = 'book-item';
    const statusClass = libro.estado === 'publicado' ? 'status-publicado' : 'status-proximamente';
    const statusText = libro.estado === 'publicado' ? 'Publicado' : 'Próximamente';
    
    div.innerHTML = `
        <img src="${libro.imagen_url || 'https://via.placeholder.com/100x130?text=Portada'}" alt="${libro.titulo}" class="book-item-image">
        <div class="book-item-info">
            <h3>${libro.titulo}</h3>
            <div class="book-item-meta">
                <span><i class="fas fa-tag"></i> ${libro.categoria}</span>
                <span class="status-badge ${statusClass}">${statusText}</span>
                <span><i class="fas fa-sort-numeric-down"></i> Orden: ${libro.orden_mostrar}</span>
            </div>
        </div>
        <div class="book-item-actions">
            <button onclick="showBookForm('${libro.id}')" class="btn-edit"><i class="fas fa-pen"></i> Editar</button>
            <button onclick="toggleBookStatus('${libro.id}', '${libro.estado}')" class="btn-toggle">${libro.estado === 'publicado' ? 'Ocultar' : 'Publicar'}</button>
        </div>
    `;
    return div;
}

window.showBooksList = function() {
    document.getElementById('books-list-section').style.display = 'block';
    document.getElementById('book-form-section').style.display = 'none';
    document.getElementById('preview-toggle').style.display = 'none';
    loadBooksList();
};

window.showBookForm = function(bookId = null) {
    document.getElementById('books-list-section').style.display = 'none';
    document.getElementById('book-form-section').style.display = 'block';
    document.getElementById('preview-toggle').style.display = 'none';
    currentBookId = bookId;
    uploadedImageUrl = null;
    
    if (bookId) {
        document.getElementById('book-form-title').textContent = 'Editar Libro';
        document.getElementById('btn-delete').style.display = 'inline-flex';
        loadBookData(bookId);
    } else {
        document.getElementById('book-form-title').textContent = 'Nuevo Libro';
        document.getElementById('btn-delete').style.display = 'none';
        resetForm();
    }
};

async function loadBookData(bookId) {
    const { data: libro } = await supabase.from('libros').select('*').eq('id', bookId).single();
    if (!libro) return;

    document.getElementById('book-id').value = libro.id;
    document.getElementById('titulo').value = libro.titulo;
    document.getElementById('subtitulo').value = libro.subtitulo || '';
    document.getElementById('categoria').value = libro.categoria;
    document.getElementById('estado').value = libro.estado;
    document.getElementById('orden').value = libro.orden_mostrar;
    document.getElementById('descripcion').value = libro.descripcion || '';
    document.getElementById('amazon_url').value = libro.amazon_url || '';
    document.getElementById('app_interactiva_url').value = libro.app_interactiva_url || '';
    document.getElementById('imagen_url').value = libro.imagen_url || '';
    
    if (libro.imagen_url) {
        uploadedImageUrl = libro.imagen_url;
        showImagePreview(libro.imagen_url);
    }
    updatePreview();
}

window.saveBook = async function(event) {
    event.preventDefault();
    const bookData = {
        titulo: document.getElementById('titulo').value,
        subtitulo: document.getElementById('subtitulo').value,
        categoria: document.getElementById('categoria').value,
        estado: document.getElementById('estado').value,
        orden_mostrar: parseInt(document.getElementById('orden').value) || 0,
        descripcion: document.getElementById('descripcion').value,
        amazon_url: document.getElementById('amazon_url').value,
        app_interactiva_url: document.getElementById('app_interactiva_url').value,
        imagen_url: uploadedImageUrl || document.getElementById('imagen_url').value,
        esta_publicado: document.getElementById('estado').value === 'publicado'
    };

    const { error } = currentBookId 
        ? await supabase.from('libros').update(bookData).eq('id', currentBookId)
        : await supabase.from('libros').insert([bookData]);

    if (error) {
        showToast('Error al guardar: ' + error.message, 'error');
        return;
    }

    showToast('Libro guardado exitosamente', 'success');
    setTimeout(() => showBooksList(), 1500);
};

window.deleteBook = async function() {
    if (!currentBookId) return;
    showConfirmModal('¿Eliminar este libro?', 'Esta acción no se puede deshacer y el libro desaparecerá de la web.', async () => {
        const { error } = await supabase.from('libros').delete().eq('id', currentBookId);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Libro eliminado correctamente', 'success');
        showBooksList();
    });
};

window.toggleBookStatus = async function(bookId, currentStatus) {
    const newStatus = currentStatus === 'publicado' ? 'proximamente' : 'publicado';
    await supabase.from('libros').update({ estado: newStatus, esta_publicado: newStatus === 'publicado' }).eq('id', bookId);
    loadBooksList();
    showToast('Estado actualizado', 'success');
};

window.handleImageUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = `portadas/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const { error } = await supabase.storage.from('portadas').upload(fileName, file);

    if (error) {
        showToast('Error al subir imagen: ' + error.message, 'error');
        return;
    }

    const { data: { publicUrl } } = supabase.storage.from('portadas').getPublicUrl(fileName);
    uploadedImageUrl = publicUrl;
    document.getElementById('imagen_url').value = publicUrl;
    showImagePreview(publicUrl);
    updatePreview();
    showToast('Imagen de portada subida', 'success');
};

function showImagePreview(url) {
    document.getElementById('image-preview').innerHTML = `<img src="${url}" alt="Preview">`;
}

function resetForm() {
    document.getElementById('book-form').reset();
    document.getElementById('book-id').value = '';
    document.getElementById('image-preview').innerHTML = '';
    uploadedImageUrl = null;
    updatePreview();
}

window.updatePreview = function() {
    const titulo = document.getElementById('titulo').value || 'Título del libro';
    const subtitulo = document.getElementById('subtitulo').value || 'Subtítulo';
    const descripcion = document.getElementById('descripcion').value || 'La descripción aparecerá aquí...';
    const imagenUrl = uploadedImageUrl || document.getElementById('imagen_url').value;
    const estado = document.getElementById('estado').value;
    const amazonUrl = document.getElementById('amazon_url').value;
    const appUrl = document.getElementById('app_interactiva_url').value;

    document.getElementById('preview-title').textContent = titulo;
    document.getElementById('preview-subtitle').textContent = subtitulo;
    document.getElementById('preview-description').textContent = descripcion;

    const previewImg = document.getElementById('preview-image');
    const placeholder = document.querySelector('.preview-cover-placeholder');
    if (imagenUrl) {
        previewImg.src = imagenUrl;
        previewImg.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        previewImg.style.display = 'none';
        placeholder.style.display = 'block';
    }

    const badge = document.getElementById('preview-badge');
    if (estado === 'proximamente') {
        badge.textContent = 'Próximamente';
        badge.className = 'preview-badge proximamente';
        badge.style.display = 'block';
    } else if (amazonUrl || appUrl) {
        badge.textContent = 'Nuevo';
        badge.className = 'preview-badge';
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }

    document.getElementById('preview-btn-amazon').style.display = amazonUrl ? 'flex' : 'none';
    document.getElementById('preview-btn-app').style.display = appUrl ? 'flex' : 'none';
    document.getElementById('preview-btn-soon').style.display = estado === 'proximamente' ? 'flex' : 'none';
};

// ==========================================
// ADMINISTRADORES
// ==========================================
async function loadAdminsList() {
    const listContainer = document.getElementById('admins-list');
    listContainer.innerHTML = '<div class="loading">Cargando...</div>';
    const { data: admins, error } = await supabase.from('administradores').select('*').order('creado_en', { ascending: true });

    if (error || !admins) {
        listContainer.innerHTML = '<div class="loading">Error al cargar</div>';
        return;
    }

    document.getElementById('admin-count').textContent = `${admins.length} / 3`;
    listContainer.innerHTML = '';
    admins.forEach(admin => listContainer.appendChild(createAdminItem(admin)));
}

function createAdminItem(admin) {
    const div = document.createElement('div');
    div.className = 'admin-item';
    const initial = (admin.nombre || admin.email).charAt(0).toUpperCase();
    const isOwner = admin.email === currentAdminEmail;

    div.innerHTML = `
        <div class="admin-item-info">
            <div class="admin-avatar">${initial}</div>
            <div class="admin-item-details">
                <h4>${admin.nombre || 'Sin nombre'}</h4>
                <p>${admin.email}</p>
            </div>
        </div>
        <div class="admin-item-actions">
            <span class="admin-badge ${isOwner ? 'owner' : ''}">${isOwner ? 'Tú (Principal)' : 'Activo'}</span>
            ${!isOwner ? `<button onclick="removeAdmin('${admin.id}', '${admin.email}')" class="btn-remove-admin"><i class="fas fa-trash"></i> Eliminar</button>` : ''}
        </div>
    `;
    return div;
}

window.addAdmin = async function(event) {
    event.preventDefault();
    const email = document.getElementById('new-admin-email').value.trim().toLowerCase();
    const nombre = document.getElementById('new-admin-name').value.trim();

    const { count } = await supabase.from('administradores').select('*', { count: 'exact', head: true });
    if (count >= 3) {
        showToast('Límite alcanzado: máximo 3 administradores', 'warning');
        return;
    }

    const { data: existing } = await supabase.from('administradores').select('id').eq('email', email).maybeSingle();
    if (existing) {
        showToast('Este correo ya está registrado', 'error');
        return;
    }

    const { error } = await supabase.from('administradores').insert([{ email, nombre, activo: true }]);
    if (error) {
        showToast('Error: ' + error.message, 'error');
    } else {
        showToast('Administrador agregado correctamente', 'success');
        document.getElementById('new-admin-email').value = '';
        document.getElementById('new-admin-name').value = '';
        loadAdminsList();
    }
};

window.removeAdmin = async function(id, email) {
    if (email === currentAdminEmail) {
        showToast('No puedes eliminarte a ti mismo', 'warning');
        return;
    }
    showConfirmModal('¿Eliminar administrador?', `${email} perderá el acceso al panel de inmediato.`, async () => {
        const { error } = await supabase.from('administradores').delete().eq('id', id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Administrador eliminado', 'success');
        loadAdminsList();
    });
};

// ==========================================
// BLOG MODULAR
// ==========================================
document.addEventListener('change', function(e) {
    if (e.target && e.target.name === 'post-estado') {
        const fechaContainer = document.getElementById('fecha-programada-container');
        if (fechaContainer) fechaContainer.style.display = e.target.value === 'programado' ? 'block' : 'none';
    }
});

window.toggleSectionMenu = function() {
    const menu = document.getElementById('section-menu');
    if (menu) menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
};

window.addSection = function(tipo) {
    seccionCounter++;
    const seccionId = `seccion-${seccionCounter}`;
    secciones.push({
        id: seccionId, tipo, titulo: '', contenido: '', imagen_url: '', pie_imagen: '',
        datos_json: tipo === 'lista_libros' ? { libros: [] } : null
    });
    renderSeccion(secciones[secciones.length - 1]);
    toggleSectionMenu();
    updateBlogPreview();
};

function renderSeccion(seccion) {
    const container = document.getElementById('secciones-container');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'seccion-item';
    div.id = seccion.id;
    
    let contentHTML = '';
    switch(seccion.tipo) {
        case 'texto':
            contentHTML = `<input type="text" placeholder="Título (opcional)" value="${seccion.titulo}" onchange="updateSeccion('${seccion.id}', 'titulo', this.value); updateBlogPreview()"><div class="quill-editor-container" id="quill-${seccion.id}" style="height: 200px; background: white;"></div>`;
            break;
        case 'imagen':
            contentHTML = `<input type="text" placeholder="Pie de foto" value="${seccion.pie_imagen}" onchange="updateSeccion('${seccion.id}', 'pie_imagen', this.value); updateBlogPreview()"><div class="image-upload-options"><button type="button" onclick="uploadSeccionImage('${seccion.id}')" class="btn-admin-outline"><i class="fas fa-cloud-upload-alt"></i> Subir</button><input type="url" placeholder="O pegar URL" value="${seccion.imagen_url}" onchange="updateSeccion('${seccion.id}', 'imagen_url', this.value); updateBlogPreview()"></div><div id="preview-${seccion.id}" class="image-preview"></div>`;
            break;
        case 'cita':
            contentHTML = `<textarea placeholder="Escribe la cita..." onchange="updateSeccion('${seccion.id}', 'contenido', this.value); updateBlogPreview()">${seccion.contenido}</textarea><input type="text" placeholder="Autor (opcional)" value="${seccion.titulo}" onchange="updateSeccion('${seccion.id}', 'titulo', this.value); updateBlogPreview()">`;
            break;
        case 'lista_libros':
            contentHTML = `<input type="text" placeholder="Título de la sección" value="${seccion.titulo}" onchange="updateSeccion('${seccion.id}', 'titulo', this.value); updateBlogPreview()"><div id="libros-${seccion.id}" class="libros-list"></div><button type="button" onclick="agregarLibro('${seccion.id}')" class="btn-agregar-libro"><i class="fas fa-plus"></i> Agregar libro</button>`;
            break;
        case 'consejo':
            contentHTML = `<input type="text" placeholder="Título del consejo" value="${seccion.titulo}" onchange="updateSeccion('${seccion.id}', 'titulo', this.value); updateBlogPreview()"><textarea placeholder="Escribe el consejo..." onchange="updateSeccion('${seccion.id}', 'contenido', this.value); updateBlogPreview()">${seccion.contenido}</textarea>`;
            break;
        case 'separador':
            contentHTML = `<p style="color: #9CA3AF; text-align: center; margin: 0; font-size: 1.2rem; letter-spacing: 0.5rem;">✦ ✦ ✦</p>`;
            break;
        case 'html_libre':
            contentHTML = `<textarea placeholder="HTML personalizado..." onchange="updateSeccion('${seccion.id}', 'contenido', this.value); updateBlogPreview()" style="min-height: 200px; font-family: monospace;">${seccion.contenido}</textarea>`;
            break;
    }
    
    div.innerHTML = `
        <div class="seccion-header">
            <span class="seccion-tipo"><i class="fas fa-${getIconForType(seccion.tipo)}"></i> ${getLabelForType(seccion.tipo)}</span>
            <div class="seccion-actions">
                <button type="button" onclick="moverSeccion('${seccion.id}', -1)" class="btn-seccion btn-mover" title="Subir"><i class="fas fa-arrow-up"></i></button>
                <button type="button" onclick="moverSeccion('${seccion.id}', 1)" class="btn-seccion btn-mover" title="Bajar"><i class="fas fa-arrow-down"></i></button>
                <button type="button" onclick="eliminarSeccion('${seccion.id}')" class="btn-seccion btn-eliminar-seccion" title="Eliminar"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        <div class="seccion-content">${contentHTML}</div>
    `;
    container.appendChild(div);
    
    if (seccion.tipo === 'texto') {
        setTimeout(() => {
            if (typeof Quill !== 'undefined') {
                const quill = new Quill(`#quill-${seccion.id}`, {
                    theme: 'snow', placeholder: 'Escribe el contenido...',
                    modules: { toolbar: [['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['link', 'image'], ['clean']] }
                });
                quill.on('text-change', () => {
                    seccion.contenido = quill.root.innerHTML;
                    updateBlogPreview();
                });
            }
        }, 100);
    }
    
    if (seccion.tipo === 'lista_libros' && seccion.datos_json?.libros) {
        seccion.datos_json.libros.forEach(libro => renderLibro(seccion.id, libro));
    }
}

function getIconForType(tipo) {
    const icons = { texto: 'paragraph', imagen: 'image', cita: 'quote-left', lista_libros: 'book', consejo: 'lightbulb', separador: 'minus', html_libre: 'code' };
    return icons[tipo] || 'circle';
}

function getLabelForType(tipo) {
    const labels = { texto: 'Texto', imagen: 'Imagen', cita: 'Cita', lista_libros: 'Lista de libros', consejo: 'Consejo', separador: 'Separador', html_libre: 'HTML libre' };
    return labels[tipo] || tipo;
}

window.updateSeccion = function(seccionId, campo, valor) {
    const seccion = secciones.find(s => s.id === seccionId);
    if (seccion) seccion[campo] = valor;
};

window.moverSeccion = function(seccionId, direccion) {
    const index = secciones.findIndex(s => s.id === seccionId);
    if (index === -1) return;
    const newIndex = index + direccion;
    if (newIndex < 0 || newIndex >= secciones.length) return;
    [secciones[index], secciones[newIndex]] = [secciones[newIndex], secciones[index]];
    document.getElementById('secciones-container').innerHTML = '';
    secciones.forEach(s => renderSeccion(s));
    updateBlogPreview();
};

window.eliminarSeccion = function(seccionId) {
    showConfirmModal('¿Eliminar esta sección?', 'La sección desaparecerá del artículo.', () => {
        secciones = secciones.filter(s => s.id !== seccionId);
        document.getElementById(seccionId).remove();
        updateBlogPreview();
    });
};

window.uploadSeccionImage = async function(seccionId) {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { showToast('La imagen es demasiado grande. Máximo 2MB.', 'warning'); return; }
        
        const compressed = await compressImage(file);
        const url = await uploadBlogImage(compressed);
        if (url) {
            updateSeccion(seccionId, 'imagen_url', url);
            const preview = document.getElementById(`preview-${seccionId}`);
            if (preview) preview.innerHTML = `<img src="${url}" alt="Preview">`;
            updateBlogPreview();
            showToast('Imagen de sección subida', 'success');
        }
    };
    input.click();
};

window.agregarLibro = function(seccionId) {
    const seccion = secciones.find(s => s.id === seccionId);
    if (!seccion || !seccion.datos_json) return;
    const libro = { id: `libro-${Date.now()}`, portada: '', titulo: '', autor: '', link: '' };
    seccion.datos_json.libros.push(libro);
    renderLibro(seccionId, libro);
    updateBlogPreview();
};

function renderLibro(seccionId, libro) {
    const container = document.getElementById(`libros-${seccionId}`);
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'libro-item';
    div.id = libro.id;
    div.innerHTML = `
        <img src="${libro.portada || 'https://via.placeholder.com/60x80?text=Portada'}" alt="Portada">
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <input type="text" placeholder="Título" value="${libro.titulo}" onchange="updateLibro('${seccionId}', '${libro.id}', 'titulo', this.value); updateBlogPreview()">
            <input type="text" placeholder="Autor" value="${libro.autor}" onchange="updateLibro('${seccionId}', '${libro.id}', 'autor', this.value); updateBlogPreview()">
            <input type="url" placeholder="Link" value="${libro.link}" onchange="updateLibro('${seccionId}', '${libro.id}', 'link', this.value); updateBlogPreview()">
        </div>
        <button type="button" onclick="eliminarLibro('${seccionId}', '${libro.id}')" class="btn-seccion btn-eliminar-seccion"><i class="fas fa-trash"></i></button>
    `;
    container.appendChild(div);
}

window.updateLibro = function(seccionId, libroId, campo, valor) {
    const seccion = secciones.find(s => s.id === seccionId);
    if (!seccion || !seccion.datos_json) return;
    const libro = seccion.datos_json.libros.find(l => l.id === libroId);
    if (libro) libro[campo] = valor;
};

window.eliminarLibro = function(seccionId, libroId) {
    showConfirmModal('¿Eliminar este libro de la lista?', '', () => {
        const seccion = secciones.find(s => s.id === seccionId);
        if (!seccion || !seccion.datos_json) return;
        seccion.datos_json.libros = seccion.datos_json.libros.filter(l => l.id !== libroId);
        document.getElementById(libroId).remove();
        updateBlogPreview();
    });
};

async function compressImage(file) {
    try { return await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true }); } 
    catch (error) { console.error('Error al comprimir:', error); return file; }
}

async function uploadBlogImage(file) {
    const fileName = `blog/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const { error } = await supabase.storage.from('blog').upload(fileName, file);
    if (error) { showToast('Error al subir: ' + error.message, 'error'); return null; }
    const { data: { publicUrl } } = supabase.storage.from('blog').getPublicUrl(fileName);
    return publicUrl;
}

async function loadBlogPostsList() {
    const listContainer = document.getElementById('blog-list');
    listContainer.innerHTML = '<div class="loading">Cargando artículos...</div>';
    const { data: posts, error } = await supabase.from('blog_posts').select('*').order('orden_prioridad', { ascending: true }).order('fecha_publicacion', { ascending: false });

    if (error || !posts || posts.length === 0) {
        listContainer.innerHTML = `<div class="loading">${error ? 'Error al cargar' : 'No hay artículos aún'}</div>`;
        return;
    }

    listContainer.innerHTML = '';
    posts.forEach(post => listContainer.appendChild(createBlogItem(post)));
}

function createBlogItem(post) {
    const div = document.createElement('div');
    div.className = 'blog-item';
    const statusClass = post.esta_publicado ? 'status-publicado' : (post.estado_programacion === 'programado' ? 'status-programado' : 'status-borrador');
    const statusText = post.esta_publicado ? 'Publicado' : (post.estado_programacion === 'programado' ? 'Programado' : 'Borrador');
    const featuredBadge = post.es_destacado ? '<span class="featured-badge"><i class="fas fa-star"></i> Destacado</span>' : '';
    
    div.innerHTML = `
        <img src="${post.imagen_portada || 'https://via.placeholder.com/100x75?text=Imagen'}" alt="${post.titulo}" class="blog-item-image">
        <div class="blog-item-info">
            <h3>${post.titulo} ${featuredBadge}</h3>
            <div class="blog-item-meta">
                <span><i class="fas fa-tag"></i> ${post.categoria || 'Sin categoría'}</span>
                <span><i class="fas fa-calendar"></i> ${post.fecha_publicacion || 'Sin fecha'}</span>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
        </div>
        <div class="blog-item-actions">
            <button onclick="showBlogForm('${post.id}')" class="btn-edit"><i class="fas fa-pen"></i> Editar</button>
            <button onclick="toggleBlogPostStatus('${post.id}', ${post.esta_publicado})" class="btn-toggle">${post.esta_publicado ? 'Ocultar' : 'Publicar'}</button>
        </div>
    `;
    return div;
}

window.showBlogList = function() {
    document.getElementById('blog-list-section').style.display = 'block';
    document.getElementById('blog-form-section').style.display = 'none';
    document.getElementById('preview-toggle').style.display = 'none';
    loadBlogPostsList();
    loadStorageUsage('blog');
};

window.showBlogForm = function(postId = null) {
    document.getElementById('blog-list-section').style.display = 'none';
    document.getElementById('blog-form-section').style.display = 'block';
    document.getElementById('preview-toggle').style.display = 'flex';
    currentPostId = postId;
    uploadedPostImageUrl = null;
    
    if (postId) {
        document.getElementById('blog-form-title').textContent = 'Editar Artículo';
        document.getElementById('btn-delete-post').style.display = 'inline-flex';
        loadBlogPostData(postId);
    } else {
        document.getElementById('blog-form-title').textContent = 'Nuevo Artículo';
        document.getElementById('btn-delete-post').style.display = 'none';
        resetBlogForm();
    }
};

async function loadBlogPostData(postId) {
    const { data: post } = await supabase.from('blog_posts').select('*').eq('id', postId).single();
    if (!post) return;

    document.getElementById('post-id').value = post.id;
    document.getElementById('post-titulo').value = post.titulo;
    document.getElementById('post-subtitulo').value = post.subtitulo || '';
    document.getElementById('post-categoria').value = post.categoria || 'reflexion';
    document.getElementById('post-fecha').value = post.fecha_publicacion || new Date().toISOString().split('T')[0];
    document.getElementById('post-orden').value = post.orden_prioridad || 0;
    document.getElementById('post-imagen_portada').value = post.imagen_portada || '';
    document.getElementById('post-es_destacado').checked = post.es_destacado;
    
    const estado = post.estado_programacion || (post.esta_publicado ? 'publicado' : 'borrador');
    const radioEl = document.querySelector(`input[name="post-estado"][value="${estado}"]`);
    if (radioEl) radioEl.checked = true;
    
    const fechaProgContainer = document.getElementById('fecha-programada-container');
    if (estado === 'programado' && post.fecha_programada) {
        fechaProgContainer.style.display = 'block';
        document.getElementById('post-fecha-programada').value = post.fecha_programada;
    } else {
        fechaProgContainer.style.display = 'none';
    }
    
    if (post.imagen_portada) {
        uploadedPostImageUrl = post.imagen_portada;
        document.getElementById('post-image-preview').innerHTML = `<img src="${post.imagen_portada}" alt="Preview">`;
    }
    
    const { data: seccionesData } = await supabase.from('blog_secciones').select('*').eq('post_id', postId).order('orden', { ascending: true });
    secciones = seccionesData || [];
    document.getElementById('secciones-container').innerHTML = '';
    secciones.forEach(s => renderSeccion(s));
    updateBlogPreview();
}

window.saveBlogPost = async function() {
    const titulo = document.getElementById('post-titulo').value;
    if (!titulo) { showToast('El título es obligatorio', 'error'); return; }
    
    const estado = document.querySelector('input[name="post-estado"]:checked').value;
    const fechaProgramada = document.getElementById('post-fecha-programada').value;
    
    const postData = {
        titulo, subtitulo: document.getElementById('post-subtitulo').value, categoria: document.getElementById('post-categoria').value,
        fecha_publicacion: document.getElementById('post-fecha').value, orden_prioridad: parseInt(document.getElementById('post-orden').value) || 0,
        imagen_portada: document.getElementById('post-imagen_portada').value, es_destacado: document.getElementById('post-es_destacado').checked,
        estado_programacion: estado, fecha_programada: estado === 'programado' ? fechaProgramada : null, esta_publicado: estado === 'publicado'
    };
    
    let postId = document.getElementById('post-id').value;
    let error;
    
    if (postId) {
        const result = await supabase.from('blog_posts').update(postData).eq('id', postId);
        error = result.error;
    } else {
        const result = await supabase.from('blog_posts').insert([postData]).select();
        error = result.error;
        if (result.data && result.data[0]) postId = result.data[0].id;
    }
    
    if (error) { showToast('Error al guardar: ' + error.message, 'error'); return; }
    
    if (postId) {
        await supabase.from('blog_secciones').delete().eq('post_id', postId);
        const seccionesData = secciones.map((s, index) => {
            let contenido = s.contenido;
            if (s.tipo === 'texto') {
                const editor = document.querySelector(`#quill-${s.id} .ql-editor`);
                if (editor) contenido = editor.innerHTML;
            }
            return { post_id: postId, tipo: s.tipo, titulo: s.titulo, contenido, imagen_url: s.imagen_url, pie_imagen: s.pie_imagen, datos_json: s.datos_json, orden: index };
        });
        
        const { error: seccionesError } = await supabase.from('blog_secciones').insert(seccionesData);
        if (seccionesError) { showToast('Error al guardar secciones: ' + seccionesError.message, 'error'); return; }
    }
    
    showToast('Artículo guardado exitosamente', 'success');
    setTimeout(() => showBlogList(), 1500);
};

window.deleteBlogPost = async function() {
    if (!currentPostId) return;
    showConfirmModal('¿Eliminar este artículo?', 'Esta acción no se puede deshacer y el artículo desaparecerá del blog.', async () => {
        const { error } = await supabase.from('blog_posts').delete().eq('id', currentPostId);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Artículo eliminado', 'success');
        showBlogList();
    });
};

window.toggleBlogPostStatus = async function(postId, currentStatus) {
    await supabase.from('blog_posts').update({ esta_publicado: !currentStatus }).eq('id', postId);
    loadBlogPostsList();
    showToast('Estado actualizado', 'success');
};

window.handleBlogImageUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('La imagen es demasiado grande. Máximo 2MB.', 'warning'); return; }

    try {
        const compressed = await compressImage(file);
        const url = await uploadBlogImage(compressed);
        if (url) {
            uploadedPostImageUrl = url;
            document.getElementById('post-imagen_portada').value = url;
            document.getElementById('post-image-preview').innerHTML = `<img src="${url}" alt="Preview">`;
            showToast('Imagen de portada subida', 'success');
            
            // ✅ AGREGA ESTA LÍNEA:
            loadStorageUsage('blog');
            
            updateBlogPreview();
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
};

function resetBlogForm() {
    document.getElementById('blog-form').reset();
    document.getElementById('post-id').value = '';
    document.getElementById('post-image-preview').innerHTML = '';
    document.getElementById('post-fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('fecha-programada-container').style.display = 'none';
    document.querySelector('input[name="post-estado"][value="publicado"]').checked = true;
    secciones = [];
    document.getElementById('secciones-container').innerHTML = '';
    updateBlogPreview();
}

// ==========================================
// 🆕 RECURSOS (NUEVO)
// ==========================================
async function loadRecursosList() {
    const listContainer = document.getElementById('recursos-list');
    listContainer.innerHTML = '<div class="loading">Cargando recursos...</div>';
    const { data: recursos, error } = await supabase.from('recursos').select('*').order('orden', { ascending: true });

    if (error || !recursos || recursos.length === 0) {
        listContainer.innerHTML = `<div class="loading">${error ? 'Error al cargar' : 'No hay recursos aún'}</div>`;
        return;
    }

    listContainer.innerHTML = '';
    recursos.forEach(recurso => listContainer.appendChild(createRecursoItem(recurso)));
}

function createRecursoItem(recurso) {
    const div = document.createElement('div');
    div.className = 'recurso-admin-card';
    const categoriaLabels = { consejos: 'Consejos', herramientas: 'Herramientas', inspiracion: 'Inspiración', tecnicas: 'Técnicas' };
    
    div.innerHTML = `
        <div class="recurso-admin-img"><img src="${recurso.imagen_url}" alt="${recurso.titulo}"></div>
        <div class="recurso-admin-info">
            <h4>${recurso.titulo}</h4>
            <span class="status-badge ${recurso.esta_activo ? 'status-publicado' : 'status-borrador'}">${recurso.esta_activo ? 'Activo' : 'Oculto'}</span>
            <span class="recurso-categoria-tag">${categoriaLabels[recurso.categoria] || recurso.categoria}</span>
        </div>
        <div class="recurso-admin-actions">
            <button onclick="showRecursoForm('${recurso.id}')" class="btn-edit" title="Editar"><i class="fas fa-pen"></i></button>
            <button onclick="deleteRecursoById('${recurso.id}', '${recurso.imagen_url}')" class="btn-remove-admin" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
    `;
    return div;
}

window.showRecursosList = function() {
    document.getElementById('recursos-list-section').style.display = 'block';
    document.getElementById('recurso-form-section').style.display = 'none';
    loadRecursosList();
    loadStorageUsage('recursos');
};

window.showRecursoForm = function(id = null) {
    document.getElementById('recursos-list-section').style.display = 'none';
    document.getElementById('recurso-form-section').style.display = 'block';
    currentRecursoId = id;
    uploadedRecursoImageUrl = null;
    
    if (id) {
        document.getElementById('recurso-form-title').textContent = 'Editar Recurso';
        document.getElementById('btn-delete-recurso').style.display = 'inline-flex';
        loadRecursoData(id);
    } else {
        document.getElementById('recurso-form-title').textContent = 'Nuevo Recurso';
        document.getElementById('btn-delete-recurso').style.display = 'none';
        resetRecursoForm();
    }
};

async function loadRecursoData(id) {
    const { data: recurso } = await supabase.from('recursos').select('*').eq('id', id).single();
    if (!recurso) return;

    document.getElementById('recurso-id').value = recurso.id;
    document.getElementById('recurso-titulo').value = recurso.titulo;
    document.getElementById('recurso-categoria').value = recurso.categoria;
    document.getElementById('recurso-orden').value = recurso.orden;
    document.getElementById('recurso-descripcion').value = recurso.descripcion || '';
    document.getElementById('recurso-activo').checked = recurso.esta_activo;
    
    if (recurso.imagen_url) {
        uploadedRecursoImageUrl = recurso.imagen_url;
        document.getElementById('recurso-image-preview').innerHTML = `<img src="${recurso.imagen_url}">`;
    }
}

window.saveRecurso = async function(event) {
    event.preventDefault();
    const titulo = document.getElementById('recurso-titulo').value;
    if (!titulo || !uploadedRecursoImageUrl) { 
        showToast('El título y la imagen son obligatorios', 'error'); 
        return; 
    }
    
    const recursoData = { 
        titulo, 
        categoria: document.getElementById('recurso-categoria').value, 
        orden: parseInt(document.getElementById('recurso-orden').value) || 0, 
        descripcion: document.getElementById('recurso-descripcion').value, 
        imagen_url: uploadedRecursoImageUrl, 
        esta_activo: document.getElementById('recurso-activo').checked 
    };
    
    let error;
    if (currentRecursoId) { 
        const res = await supabase.from('recursos').update(recursoData).eq('id', currentRecursoId); 
        error = res.error; 
    } else { 
        const res = await supabase.from('recursos').insert([recursoData]); 
        error = res.error; 
    }
    
    if (error) { 
        showToast('Error al guardar: ' + error.message, 'error'); 
        return; 
    }
    
    showToast('Recurso guardado exitosamente', 'success');
    setTimeout(() => showRecursosList(), 1500);
};

window.deleteRecurso = function() { 
    if (currentRecursoId) deleteRecursoById(currentRecursoId, uploadedRecursoImageUrl); 
};

window.deleteRecursoById = function(id, imageUrl) {
    showConfirmModal('¿Eliminar este recurso?', 'Se borrará la imagen y el consejo de la web.', async () => {
        const { error: dbError } = await supabase.from('recursos').delete().eq('id', id);
        if (dbError) { showToast('Error DB: ' + dbError.message, 'error'); return; }
        
        if (imageUrl) { 
            const fileName = imageUrl.split('/').pop(); 
            await supabase.storage.from('recursos').remove([`recursos/${fileName}`]); 
        }
        
        showToast('Recurso eliminado', 'success');
        showRecursosList();
    });
};

window.handleRecursoImageUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileSizeKB = file.size / 1024;
    const hintEl = document.getElementById('recurso-size-hint');
    
    if (fileSizeKB > MAX_RECURSO_IMAGE_KB) {
        showToast(`Imagen muy grande (${fileSizeKB.toFixed(0)}KB). Máximo 300KB.`, 'error');
        if (hintEl) { hintEl.textContent = `⚠️ Tamaño excedido: ${fileSizeKB.toFixed(0)}KB`; hintEl.style.color = '#DC2626'; }
        event.target.value = '';
        return;
    }

    // Verificar espacio en bucket antes de subir
    const { data: files } = await supabase.storage.from('recursos').list();
    let totalBytes = 0;
    if (files) {
        for (const f of files) { if (f.metadata && f.metadata.size) totalBytes += f.metadata.size; }
    }
    const currentMB = totalBytes / (1024 * 1024);
    if ((currentMB + (fileSizeKB / 1024)) > RECURSOS_STORAGE_LIMIT_MB) {
        showToast(`Sin espacio suficiente en el bucket de recursos.`, 'error');
        return;
    }

    if (hintEl) { hintEl.textContent = `✅ Tamaño válido: ${fileSizeKB.toFixed(0)}KB. Optimizando...`; hintEl.style.color = '#059669'; }
    
    try {
        const compressed = await imageCompression(file, { 
            maxSizeMB: MAX_RECURSO_IMAGE_KB / 1024, 
            maxWidthOrHeight: 1200, 
            useWebWorker: true, 
            fileType: 'image/jpeg' 
        });
        
        const titulo = document.getElementById('recurso-titulo').value || 'recurso';
        const fileName = `recursos/${Date.now()}-${titulo.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.jpg`;
        
        const { error } = await supabase.storage.from('recursos').upload(fileName, compressed);
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage.from('recursos').getPublicUrl(fileName);
        uploadedRecursoImageUrl = publicUrl;
        
        const previewEl = document.getElementById('recurso-image-preview');
        if (previewEl) previewEl.innerHTML = `<img src="${publicUrl}">`;
        if (hintEl) hintEl.textContent = '✅ Imagen optimizada y lista para guardar';
        
        showToast('Imagen optimizada y lista', 'success');
    } catch (err) { 
        showToast('Error al procesar imagen: ' + err.message, 'error'); 
    }
};

function resetRecursoForm() {
    document.getElementById('recurso-form').reset();
    document.getElementById('recurso-id').value = '';
    document.getElementById('recurso-image-preview').innerHTML = '';
    const hintEl = document.getElementById('recurso-size-hint');
    if (hintEl) hintEl.textContent = '';
    uploadedRecursoImageUrl = null;
}

// ==========================================
// GESTIÓN DE ALMACENAMIENTO (STORAGE)
// ==========================================
async function loadStorageUsage(bucketName = 'blog') {
    try {
        const { data: files, error } = await supabase.storage.from(bucketName).list();
        if (error) return;

        let totalBytes = 0;
        if (files) {
            for (const file of files) {
                if (file.metadata && file.metadata.size) totalBytes += file.metadata.size;
            }
        }

        const limit = bucketName === 'blog' ? BLOG_STORAGE_LIMIT_MB : RECURSOS_STORAGE_LIMIT_MB;
        const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
        const percentage = Math.min((totalMB / limit) * 100, 100);
        
        const textId = bucketName === 'blog' ? 'storage-text' : 'recursos-storage-text';
        const fillId = bucketName === 'blog' ? 'storage-fill' : 'recursos-storage-fill';
        
        const textEl = document.getElementById(textId);
        const fillEl = document.getElementById(fillId);
        
        if (textEl) textEl.textContent = `${totalMB} / ${limit} MB`;
        if (fillEl) {
            fillEl.style.width = `${percentage}%`;
            fillEl.classList.remove('warning', 'danger');
            if (percentage >= 90) fillEl.classList.add('danger');
            else if (percentage >= 80) fillEl.classList.add('warning');
        }
    } catch (error) { 
        console.error('Error al cargar uso de storage:', error); 
    }
}

// ==========================================
// VISTA PREVIA EN VIVO DEL BLOG
// ==========================================
window.updateBlogPreview = function() {
    const titulo = document.getElementById('post-titulo')?.value || 'Título del artículo';
    const subtitulo = document.getElementById('post-subtitulo')?.value || 'Subtítulo';
    const categoria = document.getElementById('post-categoria')?.value || 'Categoría';
    const img = document.getElementById('post-imagen_portada')?.value || uploadedPostImageUrl;

    let html = `
        <div class="preview-post-header">
            <span class="preview-categoria">${categoria}</span>
            <h2 class="preview-titulo">${titulo}</h2>
            <p class="preview-subtitulo">${subtitulo}</p>
        </div>
    `;
    
    if (img) {
        html += `<div class="preview-imagen-container"><img src="${img}" alt="Portada"></div>`;
    }

    if (secciones.length > 0) {
        html += '<div class="preview-secciones">';
        secciones.forEach(s => {
            if (s.tipo === 'texto') html += `<div class="preview-seccion preview-seccion-texto"><strong>${s.titulo || 'Texto'}</strong><p>Contenido con formato...</p></div>`;
            else if (s.tipo === 'imagen') html += `<div class="preview-seccion preview-seccion-imagen">🖼️ Imagen: ${s.pie_imagen || 'Sin pie de foto'}</div>`;
            else if (s.tipo === 'cita') html += `<div class="preview-seccion preview-seccion-cita">❝ ${s.contenido ? s.contenido.substring(0, 60) + '...' : 'Cita'} ❞ ${s.titulo ? '<br><small>— ' + s.titulo + '</small>' : ''}</div>`;
            else if (s.tipo === 'consejo') html += `<div class="preview-seccion preview-seccion-consejo">💡 <strong>${s.titulo || 'Consejo'}</strong><p>${s.contenido ? s.contenido.substring(0, 60) + '...' : 'Texto del consejo'}</p></div>`;
            else if (s.tipo === 'lista_libros') html += `<div class="preview-seccion preview-seccion-lista-libros">📚 <strong>${s.titulo || 'Lista de libros'}</strong><p>${s.datos_json?.libros?.length || 0} libro(s) agregado(s)</p></div>`;
            else if (s.tipo === 'separador') html += `<div class="preview-seccion preview-seccion-separador">✦ ✦ ✦</div>`;
            else if (s.tipo === 'html_libre') html += `<div class="preview-seccion preview-seccion-texto"><strong>HTML Personalizado</strong></div>`;
        });
        html += '</div>';
    } else {
        html += `<div class="preview-empty"><i class="fas fa-pen-fancy"></i><p>Agrega secciones para ver la vista previa</p></div>`;
    }

    const panelBody = document.getElementById('preview-panel-body');
    if (panelBody) panelBody.innerHTML = html;
};

window.togglePreviewPanel = function() {
    const panel = document.getElementById('preview-panel');
    panel.classList.toggle('is-active');
};