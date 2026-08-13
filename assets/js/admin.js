import { supabase } from './supabase.js';

let currentBookId = null;
let uploadedImageUrl = null;
let currentAdminEmail = null;

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔐 Panel de admin cargado');
    await checkAdminAccess();
});

// ==========================================
// VERIFICAR ACCESO
// ==========================================
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
// NAVEGACIÓN ENTRE VISTAS
// ==========================================
window.switchView = function(viewId) {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    document.getElementById(viewId).classList.add('active');
    document.querySelector(`[data-view="${viewId}"]`).classList.add('active');
    
    if (viewId === 'view-admins') {
        loadAdminsList();
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
        email: email,
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
// LIBROS - LISTA
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
    await supabase.from('libros').update({ estado: newStatus, esta_publicado: newStatus === 'publicado' }).eq('id', bookId);
    loadBooksList();
};

// ==========================================
// IMÁGENES
// ==========================================
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

// ==========================================
// ✅ VISTA PREVIA EN VIVO
// ==========================================
window.updatePreview = function() {
    const titulo = document.getElementById('titulo').value || 'Título del libro';
    const subtitulo = document.getElementById('subtitulo').value || 'Subtítulo';
    const descripcion = document.getElementById('descripcion').value || 'La descripción aparecerá aquí mientras escribes...';
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
// ✅ GESTIÓN DE ADMINISTRADORES
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
    const isMaxReached = document.querySelectorAll('.admin-item').length >= 3;

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

    // Verificar límite de 3
    const { count } = await supabase.from('administradores').select('*', { count: 'exact', head: true });
    if (count >= 3) {
        messageEl.textContent = '❌ Límite alcanzado: máximo 3 administradores';
        messageEl.className = 'form-message error';
        messageEl.style.display = 'block';
        return;
    }

    // Verificar que no exista
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