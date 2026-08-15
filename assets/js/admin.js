import { supabase } from './supabase.js';

let currentBookId = null;
let uploadedImageUrl = null;
let currentAdminEmail = null;
let currentPostId = null;
let uploadedPostImageUrl = null;

// Variables para el blog modular
let secciones = [];
let seccionCounter = 0;

const STORAGE_LIMIT_MB = 20;

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔐 Panel de admin cargado');
    await checkAdminAccess();
});

async function checkAdminAccess() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const userEmail = session.user.email;
    currentAdminEmail = userEmail;

    const { data: admin } = await supabase
        .from('administradores')
        .select('*')
        .eq('email', userEmail)
        .eq('activo', true)
        .maybeSingle();

    if (!admin) {
        alert('Tu cuenta no tiene permisos de administrador.');
        await supabase.auth.signOut();
        return;
    }

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    document.getElementById('panel-user-email').textContent = session.user.email;
    
    loadBooksList();
}

// ==========================================
// NAVEGACIÓN
// ==========================================
window.switchView = function(viewId) {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    document.getElementById(viewId).classList.add('active');
    document.querySelector(`[data-view="${viewId}"]`).classList.add('active');
    
    if (viewId === 'view-admins') loadAdminsList();
    if (viewId === 'view-blog') {
        loadBlogPostsList();
        loadStorageUsage();
    }
};

// ==========================================
// LOGIN
// ==========================================
window.loginWithGoogle = async function() {
    await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname }
    });
};

window.handleAdminLogin = async function(event) {
    event.preventDefault();
    const email = document.getElementById('admin-email').value;
    const messageEl = document.getElementById('login-message');
    
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });
    
    if (error) {
        messageEl.textContent = '❌ Error: ' + error.message;
        messageEl.style.color = 'red';
    } else {
        messageEl.textContent = '✅ Revisa tu correo';
        messageEl.style.color = 'green';
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
    
    const { data: libros, error } = await supabase
        .from('libros')
        .select('*')
        .order('orden_mostrar', { ascending: true });

    if (error) {
        listContainer.innerHTML = '<div class="loading">Error al cargar</div>';
        return;
    }

    if (!libros || libros.length === 0) {
        listContainer.innerHTML = '<div class="loading">No hay libros aún</div>';
        return;
    }

    listContainer.innerHTML = '';
    libros.forEach(libro => {
        const item = createBookItem(libro);
        listContainer.appendChild(item);
    });
}

function createBookItem(libro) {
    const div = document.createElement('div');
    div.className = 'book-item';
    const statusClass = libro.estado === 'publicado' ? 'status-publicado' : 'status-proximamente';
    const statusText = libro.estado === 'publicado' ? 'Publicado' : 'Próximamente';
    const toggleText = libro.estado === 'publicado' ? 'Ocultar' : 'Publicar';
    
    div.innerHTML = `
        <img src="${libro.imagen_url || 'https://via.placeholder.com/80x100'}" alt="${libro.titulo}" class="book-item-image">
        <div class="book-item-info">
            <h3>${libro.titulo}</h3>
            <div class="book-item-meta">
                <span><i class="fas fa-tag"></i> ${libro.categoria}</span>
                <span class="status-badge ${statusClass}">${statusText}</span>
                <span><i class="fas fa-sort-numeric-down"></i> Orden: ${libro.orden_mostrar}</span>
            </div>
        </div>
        <div class="book-item-actions">
            <button onclick="showBookForm('${libro.id}')" class="btn-edit">
                <i class="fas fa-edit"></i> Editar
            </button>
            <button onclick="toggleBookStatus('${libro.id}', '${libro.estado}')" class="btn-toggle">
                ${toggleText}
            </button>
        </div>
    `;
    return div;
}

window.showBooksList = function() {
    document.getElementById('books-list-section').style.display = 'block';
    document.getElementById('book-form-section').style.display = 'none';
    loadBooksList();
};

window.showBookForm = function(bookId = null) {
    document.getElementById('books-list-section').style.display = 'none';
    document.getElementById('book-form-section').style.display = 'block';
    
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
    const messageEl = document.getElementById('form-message');
    messageEl.style.display = 'none';
    
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

    let error;
    if (currentBookId) {
        const result = await supabase.from('libros').update(bookData).eq('id', currentBookId);
        error = result.error;
    } else {
        const result = await supabase.from('libros').insert([bookData]);
        error = result.error;
    }

    if (error) {
        messageEl.textContent = '❌ Error: ' + error.message;
        messageEl.className = 'form-message error';
        messageEl.style.display = 'block';
        return;
    }

    messageEl.textContent = '✅ Libro guardado';
    messageEl.className = 'form-message success';
    messageEl.style.display = 'block';
    setTimeout(() => showBooksList(), 1500);
};

window.deleteBook = async function() {
    if (!currentBookId) return;
    if (!confirm('¿Eliminar este libro?')) return;

    const { error } = await supabase.from('libros').delete().eq('id', currentBookId);
    if (error) {
        alert('Error: ' + error.message);
        return;
    }
    showBooksList();
};

window.toggleBookStatus = async function(bookId, currentStatus) {
    const newStatus = currentStatus === 'publicado' ? 'proximamente' : 'publicado';
    await supabase.from('libros').update({ 
        estado: newStatus, 
        esta_publicado: newStatus === 'publicado' 
    }).eq('id', bookId);
    loadBooksList();
};

window.handleImageUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const messageEl = document.getElementById('form-message');
    messageEl.textContent = '📤 Subiendo imagen...';
    messageEl.className = 'form-message';
    messageEl.style.display = 'block';

    const fileName = `portadas/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const { error } = await supabase.storage.from('portadas').upload(fileName, file);

    if (error) {
        messageEl.textContent = '❌ Error: ' + error.message;
        messageEl.className = 'form-message error';
        messageEl.style.display = 'block';
        return;
    }

    const { data: { publicUrl } } = supabase.storage.from('portadas').getPublicUrl(fileName);
    uploadedImageUrl = publicUrl;
    document.getElementById('imagen_url').value = publicUrl;
    showImagePreview(publicUrl);
    updatePreview();

    messageEl.textContent = '✅ Imagen subida';
    messageEl.className = 'form-message success';
    messageEl.style.display = 'block';
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

    const { data: admins, error } = await supabase
        .from('administradores')
        .select('*')
        .order('creado_en', { ascending: true });

    if (error) {
        listContainer.innerHTML = '<div class="loading">Error al cargar</div>';
        return;
    }

    const count = admins ? admins.length : 0;
    document.getElementById('admin-count').textContent = `${count} / 3`;

    if (!admins || admins.length === 0) {
        listContainer.innerHTML = '<div class="loading">No hay administradores</div>';
        return;
    }

    listContainer.innerHTML = '';
    admins.forEach(admin => {
        const item = createAdminItem(admin);
        listContainer.appendChild(item);
    });
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
    const messageEl = document.getElementById('admin-message');
    messageEl.style.display = 'none';

    const { count } = await supabase.from('administradores').select('*', { count: 'exact', head: true });
    if (count >= 3) {
        messageEl.textContent = '❌ Límite alcanzado: máximo 3 administradores';
        messageEl.className = 'form-message error';
        messageEl.style.display = 'block';
        return;
    }

    const { data: existing } = await supabase.from('administradores').select('id').eq('email', email).maybeSingle();
    if (existing) {
        messageEl.textContent = '❌ Este correo ya está registrado';
        messageEl.className = 'form-message error';
        messageEl.style.display = 'block';
        return;
    }

    const { error } = await supabase.from('administradores').insert([{ email, nombre, activo: true }]);

    if (error) {
        messageEl.textContent = '❌ Error: ' + error.message;
        messageEl.className = 'form-message error';
    } else {
        messageEl.textContent = '✅ Administrador agregado';
        messageEl.className = 'form-message success';
        document.getElementById('new-admin-email').value = '';
        document.getElementById('new-admin-name').value = '';
    }
    messageEl.style.display = 'block';
    
    loadAdminsList();
};

window.removeAdmin = async function(id, email) {
    if (email === currentAdminEmail) {
        alert('No puedes eliminarte a ti mismo');
        return;
    }
    if (!confirm(`¿Eliminar a ${email} como administrador?`)) return;

    const { error } = await supabase.from('administradores').delete().eq('id', id);
    if (error) {
        alert('Error: ' + error.message);
        return;
    }
    loadAdminsList();
};

// ==========================================
// 🆕 BLOG MODULAR
// ==========================================

document.addEventListener('change', function(e) {
    if (e.target && e.target.name === 'post-estado') {
        const fechaContainer = document.getElementById('fecha-programada-container');
        if (fechaContainer) {
            fechaContainer.style.display = e.target.value === 'programado' ? 'block' : 'none';
        }
    }
});

window.toggleSectionMenu = function() {
    const menu = document.getElementById('section-menu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
    }
};

window.addSection = function(tipo) {
    seccionCounter++;
    const seccionId = `seccion-${seccionCounter}`;
    
    const seccion = {
        id: seccionId,
        tipo: tipo,
        titulo: '',
        contenido: '',
        imagen_url: '',
        pie_imagen: '',
        datos_json: tipo === 'lista_libros' ? { libros: [] } : null
    };
    
    secciones.push(seccion);
    renderSeccion(seccion);
    toggleSectionMenu();
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
            contentHTML = `
                <input type="text" placeholder="Título (opcional)" value="${seccion.titulo}" onchange="updateSeccion('${seccion.id}', 'titulo', this.value)">
                <div class="quill-editor-container" id="quill-${seccion.id}" style="height: 200px; background: white;"></div>
            `;
            break;
        case 'imagen':
            contentHTML = `
                <input type="text" placeholder="Pie de foto" value="${seccion.pie_imagen}" onchange="updateSeccion('${seccion.id}', 'pie_imagen', this.value)">
                <div class="image-upload-options">
                    <button type="button" onclick="uploadSeccionImage('${seccion.id}')" class="btn-admin-outline">
                        <i class="fas fa-upload"></i> Subir imagen
                    </button>
                    <input type="url" placeholder="O pegar URL" value="${seccion.imagen_url}" onchange="updateSeccion('${seccion.id}', 'imagen_url', this.value)">
                </div>
                <div id="preview-${seccion.id}" class="image-preview"></div>
            `;
            break;
        case 'cita':
            contentHTML = `
                <textarea placeholder="Escribe la cita..." onchange="updateSeccion('${seccion.id}', 'contenido', this.value)">${seccion.contenido}</textarea>
                <input type="text" placeholder="Autor de la cita (opcional)" value="${seccion.titulo}" onchange="updateSeccion('${seccion.id}', 'titulo', this.value)">
            `;
            break;
        case 'lista_libros':
            contentHTML = `
                <input type="text" placeholder="Título de la sección" value="${seccion.titulo}" onchange="updateSeccion('${seccion.id}', 'titulo', this.value)">
                <div id="libros-${seccion.id}" class="libros-list"></div>
                <button type="button" onclick="agregarLibro('${seccion.id}')" class="btn-agregar-libro">
                    <i class="fas fa-plus"></i> Agregar libro
                </button>
            `;
            break;
        case 'consejo':
            contentHTML = `
                <input type="text" placeholder="Título del consejo" value="${seccion.titulo}" onchange="updateSeccion('${seccion.id}', 'titulo', this.value)">
                <textarea placeholder="Escribe el consejo..." onchange="updateSeccion('${seccion.id}', 'contenido', this.value)">${seccion.contenido}</textarea>
            `;
            break;
        case 'separador':
            contentHTML = `<p style="color: #999; text-align: center; margin: 0;">Separador decorativo</p>`;
            break;
        case 'html_libre':
            contentHTML = `
                <textarea placeholder="Escribe HTML personalizado..." onchange="updateSeccion('${seccion.id}', 'contenido', this.value)" style="min-height: 200px; font-family: monospace;">${seccion.contenido}</textarea>
            `;
            break;
    }
    
    div.innerHTML = `
        <div class="seccion-header">
            <span class="seccion-tipo"><i class="fas fa-${getIconForType(seccion.tipo)}"></i> ${getLabelForType(seccion.tipo)}</span>
            <div class="seccion-actions">
                <button type="button" onclick="moverSeccion('${seccion.id}', -1)" class="btn-seccion btn-mover">↑</button>
                <button type="button" onclick="moverSeccion('${seccion.id}', 1)" class="btn-seccion btn-mover">↓</button>
                <button type="button" onclick="eliminarSeccion('${seccion.id}')" class="btn-seccion btn-eliminar-seccion"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        <div class="seccion-content">
            ${contentHTML}
        </div>
    `;
    
    container.appendChild(div);
    
    if (seccion.tipo === 'texto') {
        setTimeout(() => {
            if (typeof Quill !== 'undefined') {
                new Quill(`#quill-${seccion.id}`, {
                    theme: 'snow',
                    placeholder: 'Escribe el contenido...',
                    modules: {
                        toolbar: [
                            ['bold', 'italic', 'underline'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            ['link', 'image'],
                            ['clean']
                        ]
                    }
                });
            }
        }, 100);
    }
    
    if (seccion.tipo === 'lista_libros' && seccion.datos_json && seccion.datos_json.libros) {
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
};

window.eliminarSeccion = function(seccionId) {
    if (!confirm('¿Eliminar esta sección?')) return;
    secciones = secciones.filter(s => s.id !== seccionId);
    document.getElementById(seccionId).remove();
};

window.uploadSeccionImage = async function(seccionId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            alert('La imagen es demasiado grande. Máximo 2MB.');
            return;
        }
        const compressed = await compressImage(file);
        const url = await uploadBlogImage(compressed);
        if (url) {
            updateSeccion(seccionId, 'imagen_url', url);
            const preview = document.getElementById(`preview-${seccionId}`);
            if (preview) preview.innerHTML = `<img src="${url}" alt="Preview">`;
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
};

function renderLibro(seccionId, libro) {
    const container = document.getElementById(`libros-${seccionId}`);
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'libro-item';
    div.id = libro.id;
    div.innerHTML = `
        <img src="${libro.portada || 'https://via.placeholder.com/80x100'}" alt="Portada">
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <input type="text" placeholder="Título del libro" value="${libro.titulo}" onchange="updateLibro('${seccionId}', '${libro.id}', 'titulo', this.value)">
            <input type="text" placeholder="Autor" value="${libro.autor}" onchange="updateLibro('${seccionId}', '${libro.id}', 'autor', this.value)">
            <input type="url" placeholder="Link (Amazon, etc.)" value="${libro.link}" onchange="updateLibro('${seccionId}', '${libro.id}', 'link', this.value)">
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
    const seccion = secciones.find(s => s.id === seccionId);
    if (!seccion || !seccion.datos_json) return;
    seccion.datos_json.libros = seccion.datos_json.libros.filter(l => l.id !== libroId);
    document.getElementById(libroId).remove();
};

async function compressImage(file) {
    const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
    try {
        return await imageCompression(file, options);
    } catch (error) {
        console.error('Error al comprimir:', error);
        return file;
    }
}

async function uploadBlogImage(file) {
    const fileName = `blog/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const { error } = await supabase.storage.from('blog').upload(fileName, file);
    if (error) {
        alert('Error al subir imagen: ' + error.message);
        return null;
    }
    const { data: { publicUrl } } = supabase.storage.from('blog').getPublicUrl(fileName);
    return publicUrl;
}

async function loadBlogPostsList() {
    const listContainer = document.getElementById('blog-list');
    if (!listContainer) return;
    listContainer.innerHTML = '<div class="loading">Cargando artículos...</div>';

    const { data: posts, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('orden_prioridad', { ascending: true })
        .order('fecha_publicacion', { ascending: false });

    if (error) {
        listContainer.innerHTML = '<div class="loading">Error al cargar</div>';
        return;
    }

    if (!posts || posts.length === 0) {
        listContainer.innerHTML = '<div class="loading">No hay artículos aún. ¡Crea el primero!</div>';
        return;
    }

    listContainer.innerHTML = '';
    posts.forEach(post => {
        const item = createBlogItem(post);
        listContainer.appendChild(item);
    });
}

function createBlogItem(post) {
    const div = document.createElement('div');
    div.className = 'blog-item';
    
    const statusClass = post.esta_publicado ? 'status-publicado' : (post.estado_programacion === 'programado' ? 'status-programado' : 'status-borrador');
    let statusText = post.esta_publicado ? 'Publicado' : (post.estado_programacion === 'programado' ? 'Programado' : 'Borrador');
    const toggleText = post.esta_publicado ? 'Ocultar' : 'Publicar';
    
    const featuredBadge = post.es_destacado ? '<span class="featured-badge"><i class="fas fa-star"></i> Destacado</span>' : '';
    
    div.innerHTML = `
        <img src="${post.imagen_portada || 'https://via.placeholder.com/100x75'}" alt="${post.titulo}" class="blog-item-image">
        <div class="blog-item-info">
            <h3>${post.titulo} ${featuredBadge}</h3>
            <div class="blog-item-meta">
                <span><i class="fas fa-tag"></i> ${post.categoria || 'Sin categoría'}</span>
                <span><i class="fas fa-calendar"></i> ${post.fecha_publicacion || 'Sin fecha'}</span>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
        </div>
        <div class="blog-item-actions">
            <button onclick="showBlogForm('${post.id}')" class="btn-edit">
                <i class="fas fa-edit"></i> Editar
            </button>
            <button onclick="toggleBlogPostStatus('${post.id}', ${post.esta_publicado})" class="btn-toggle">
                ${toggleText}
            </button>
        </div>
    `;
    return div;
}

window.showBlogList = function() {
    const listSection = document.getElementById('blog-list-section');
    const formSection = document.getElementById('blog-form-section');
    if (listSection) listSection.style.display = 'block';
    if (formSection) formSection.style.display = 'none';
    loadBlogPostsList();
    loadStorageUsage();
};

window.showBlogForm = function(postId = null) {
    const listSection = document.getElementById('blog-list-section');
    const formSection = document.getElementById('blog-form-section');
    if (listSection) listSection.style.display = 'none';
    if (formSection) formSection.style.display = 'block';
    
    currentPostId = postId;
    uploadedPostImageUrl = null;
    
    if (postId) {
        const titleEl = document.getElementById('blog-form-title');
        if (titleEl) titleEl.textContent = 'Editar Artículo';
        const btnDelete = document.getElementById('btn-delete-post');
        if (btnDelete) btnDelete.style.display = 'inline-flex';
        loadBlogPostData(postId);
    } else {
        const titleEl = document.getElementById('blog-form-title');
        if (titleEl) titleEl.textContent = 'Nuevo Artículo';
        const btnDelete = document.getElementById('btn-delete-post');
        if (btnDelete) btnDelete.style.display = 'none';
        resetBlogForm();
    }
};

async function loadBlogPostData(postId) {
    const { data: post } = await supabase.from('blog_posts').select('*').eq('id', postId).single();
    if (!post) return;

    const idEl = document.getElementById('post-id');
    if (idEl) idEl.value = post.id;
    
    const tituloEl = document.getElementById('post-titulo');
    if (tituloEl) tituloEl.value = post.titulo;
    
    const subtituloEl = document.getElementById('post-subtitulo');
    if (subtituloEl) subtituloEl.value = post.subtitulo || '';
    
    const categoriaEl = document.getElementById('post-categoria');
    if (categoriaEl) categoriaEl.value = post.categoria || 'reflexion';
    
    const fechaEl = document.getElementById('post-fecha');
    if (fechaEl) fechaEl.value = post.fecha_publicacion || new Date().toISOString().split('T')[0];
    
    const ordenEl = document.getElementById('post-orden');
    if (ordenEl) ordenEl.value = post.orden_prioridad || 0;
    
    const imgPortadaEl = document.getElementById('post-imagen_portada');
    if (imgPortadaEl) imgPortadaEl.value = post.imagen_portada || '';
    
    const destacadoEl = document.getElementById('post-es_destacado');
    if (destacadoEl) destacadoEl.checked = post.es_destacado;
    
    const estado = post.estado_programacion || (post.esta_publicado ? 'publicado' : 'borrador');
    const radioEl = document.querySelector(`input[name="post-estado"][value="${estado}"]`);
    if (radioEl) radioEl.checked = true;
    
    const fechaProgContainer = document.getElementById('fecha-programada-container');
    const fechaProgEl = document.getElementById('post-fecha-programada');
    if (estado === 'programado' && post.fecha_programada) {
        if (fechaProgContainer) fechaProgContainer.style.display = 'block';
        if (fechaProgEl) fechaProgEl.value = post.fecha_programada;
    } else {
        if (fechaProgContainer) fechaProgContainer.style.display = 'none';
    }
    
    if (post.imagen_portada) {
        uploadedPostImageUrl = post.imagen_portada;
        const previewEl = document.getElementById('post-image-preview');
        if (previewEl) previewEl.innerHTML = `<img src="${post.imagen_portada}" alt="Preview">`;
    }
    
    const { data: seccionesData } = await supabase
        .from('blog_secciones')
        .select('*')
        .eq('post_id', postId)
        .order('orden', { ascending: true });
    
    secciones = seccionesData || [];
    const container = document.getElementById('secciones-container');
    if (container) container.innerHTML = '';
    secciones.forEach(s => renderSeccion(s));
}

window.saveBlogPost = async function() {
    const messageEl = document.getElementById('blog-form-message');
    if (messageEl) messageEl.style.display = 'none';
    
    const titulo = document.getElementById('post-titulo').value;
    if (!titulo) {
        if (messageEl) {
            messageEl.textContent = '❌ El título es obligatorio';
            messageEl.className = 'form-message error';
            messageEl.style.display = 'block';
        }
        return;
    }
    
    const estado = document.querySelector('input[name="post-estado"]:checked').value;
    const fechaProgramada = document.getElementById('post-fecha-programada').value;
    
    const postData = {
        titulo: titulo,
        subtitulo: document.getElementById('post-subtitulo').value,
        categoria: document.getElementById('post-categoria').value,
        fecha_publicacion: document.getElementById('post-fecha').value,
        orden_prioridad: parseInt(document.getElementById('post-orden').value) || 0,
        imagen_portada: document.getElementById('post-imagen_portada').value,
        es_destacado: document.getElementById('post-es_destacado').checked,
        estado_programacion: estado,
        fecha_programada: estado === 'programado' ? fechaProgramada : null,
        esta_publicado: estado === 'publicado'
    };
    
    let postId = document.getElementById('post-id').value;
    let error;
    
    if (postId) {
        const result = await supabase.from('blog_posts').update(postData).eq('id', postId);
        error = result.error;
    } else {
        const result = await supabase.from('blog_posts').insert([postData]).select();
        error = result.error;
        if (result.data && result.data[0]) {
            postId = result.data[0].id;
        }
    }
    
    if (error) {
        if (messageEl) {
            messageEl.textContent = '❌ Error: ' + error.message;
            messageEl.className = 'form-message error';
            messageEl.style.display = 'block';
        }
        return;
    }
    
    if (postId) {
        await supabase.from('blog_secciones').delete().eq('post_id', postId);
        
        const seccionesData = secciones.map((s, index) => {
            let contenido = s.contenido;
            if (s.tipo === 'texto') {
                const editor = document.querySelector(`#quill-${s.id} .ql-editor`);
                if (editor) contenido = editor.innerHTML;
            }
            return {
                post_id: postId,
                tipo: s.tipo,
                titulo: s.titulo,
                contenido: contenido,
                imagen_url: s.imagen_url,
                pie_imagen: s.pie_imagen,
                datos_json: s.datos_json,
                orden: index
            };
        });
        
        const { error: seccionesError } = await supabase.from('blog_secciones').insert(seccionesData);
        if (seccionesError) {
            if (messageEl) {
                messageEl.textContent = '❌ Error al guardar secciones: ' + seccionesError.message;
                messageEl.className = 'form-message error';
                messageEl.style.display = 'block';
            }
            return;
        }
    }
    
    if (messageEl) {
        messageEl.textContent = '✅ Artículo guardado';
        messageEl.className = 'form-message success';
        messageEl.style.display = 'block';
    }
    setTimeout(() => showBlogList(), 1500);
};

window.deleteBlogPost = async function() {
    if (!currentPostId) return;
    if (!confirm('¿Eliminar este artículo? Esta acción no se puede deshacer.')) return;

    const { error } = await supabase.from('blog_posts').delete().eq('id', currentPostId);
    if (error) {
        alert('Error: ' + error.message);
        return;
    }
    showBlogList();
};

window.toggleBlogPostStatus = async function(postId, currentStatus) {
    await supabase.from('blog_posts').update({ esta_publicado: !currentStatus }).eq('id', postId);
    loadBlogPostsList();
};

window.handleBlogImageUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Máximo 2MB.');
        return;
    }

    const messageEl = document.getElementById('blog-form-message');
    if (messageEl) {
        messageEl.textContent = '📤 Comprimiendo y subiendo imagen...';
        messageEl.className = 'form-message';
        messageEl.style.display = 'block';
    }

    try {
        const compressed = await compressImage(file);
        const url = await uploadBlogImage(compressed);
        
        if (url) {
            uploadedPostImageUrl = url;
            const imgPortadaEl = document.getElementById('post-imagen_portada');
            if (imgPortadaEl) imgPortadaEl.value = url;
            
            const previewEl = document.getElementById('post-image-preview');
            if (previewEl) previewEl.innerHTML = `<img src="${url}" alt="Preview">`;
            
            if (messageEl) {
                messageEl.textContent = '✅ Imagen de portada subida';
                messageEl.className = 'form-message success';
                messageEl.style.display = 'block';
            }
            loadStorageUsage();
        }
    } catch (error) {
        if (messageEl) {
            messageEl.textContent = '❌ Error: ' + error.message;
            messageEl.className = 'form-message error';
            messageEl.style.display = 'block';
        }
    }
};

function resetBlogForm() {
    const form = document.getElementById('blog-form');
    if (form) form.reset();
    
    const idEl = document.getElementById('post-id');
    if (idEl) idEl.value = '';
    
    const previewEl = document.getElementById('post-image-preview');
    if (previewEl) previewEl.innerHTML = '';
    
    const fechaEl = document.getElementById('post-fecha');
    if (fechaEl) fechaEl.value = new Date().toISOString().split('T')[0];
    
    const fechaProgContainer = document.getElementById('fecha-programada-container');
    if (fechaProgContainer) fechaProgContainer.style.display = 'none';
    
    const publicadoRadio = document.querySelector('input[name="post-estado"][value="publicado"]');
    if (publicadoRadio) publicadoRadio.checked = true;
    
    secciones = [];
    const container = document.getElementById('secciones-container');
    if (container) container.innerHTML = '';
}

async function loadStorageUsage() {
    try {
        const { data: files, error } = await supabase.storage.from('blog').list();
        if (error) {
            console.error('Error al cargar storage:', error);
            return;
        }

        let totalBytes = 0;
        if (files) {
            for (const file of files) {
                if (file.metadata && file.metadata.size) {
                    totalBytes += file.metadata.size;
                }
            }
        }

        const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
        const percentage = Math.min((totalMB / STORAGE_LIMIT_MB) * 100, 100);
        
        const textEl = document.getElementById('storage-text');
        if (textEl) textEl.textContent = `${totalMB} / ${STORAGE_LIMIT_MB} MB`;
        
        const fillEl = document.getElementById('storage-fill');
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