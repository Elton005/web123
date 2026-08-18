import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const supabaseUrl = 'https://upquqtenaingsmeazzxt.supabase.co';
const supabaseKey = 'sb_publishable_6WGJohhCEvP_g8dDSjrkkA_ZXU5jpP4';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. FUNCIONES DE AUTENTICACIÓN
// ==========================================

// Verificar sesión activa
export async function checkSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        return null;
    }
}

// Login con Magic Link (Email)
export async function loginWithMagicLink(email) {
    try {
        const { data, error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                // ✅ CAMBIO: Forzar el dominio real + la página actual
                emailRedirectTo: 'https://lahuellaescrita.com' + window.location.pathname,
            },
        });
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al enviar magic link:', error);
        throw error;
    }
}

// Login con Google
export async function loginWithGoogle() {
    try {
        console.log('Iniciando login con Google...');
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // ✅ CAMBIO: Forzar el dominio real + la página actual
                redirectTo: 'https://lahuellaescrita.com' + window.location.pathname,
            },
        });
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al iniciar sesión con Google:', error);
        alert('Error al iniciar con Google: ' + error.message);
    }
}

// Cerrar sesión (Logout)
export async function logout() {
    try {
        console.log('Cerrando sesión...');
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // ✅ CAMBIO: Redirigir siempre al inicio del dominio real
        window.location.href = 'https://lahuellaescrita.com/';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        alert('Error al cerrar sesión: ' + error.message);
    }
}

// ==========================================
// 3. MANEJO DE INTERACCIONES (BONUS/JUEGOS)
// ==========================================
export async function handleBonusClick(bonusId, bookId, bonusUrl) {
    const session = await checkSession();
    
    if (!session) {
        if (typeof window.openLoginModal === 'function') {
            window.openLoginModal();
        } else {
            alert('Por favor inicia sesión para acceder a este contenido');
        }
        sessionStorage.setItem('redirectAfterLogin', bonusUrl);
        return;
    }

    // Registrar interacción en la base de datos
    try {
        const { error } = await supabase.from('user_interactions').insert({
            user_id: session.user.id,
            book_id: bookId,
            bonus_id: bonusId,
            action: 'bonus_accessed',
            metadata: { url: bonusUrl }
        });
        if (error) console.error('Error al registrar interacción:', error);
    } catch (error) {
        console.error('Error:', error);
    }

    // Redirigir al contenido
    window.location.href = bonusUrl;
}

// ==========================================
// 4. ACTUALIZACIÓN DE LA INTERFAZ (UI)
// ==========================================
function updateHeaderUI(user) {
    const loginContainer = document.getElementById('auth-login-container');
    const profileContainer = document.getElementById('auth-profile-container');
    const userEmailEl = document.getElementById('auth-user-email');
    const userInitialEl = document.getElementById('user-initial');

    if (user) {
        // Usuario logueado
        if (loginContainer) loginContainer.style.display = 'none';
        if (profileContainer) {
            profileContainer.style.display = 'flex';
            if (userEmailEl) {
                userEmailEl.textContent = user.email;
            }
            // Extraer inicial del email o nombre
            if (userInitialEl) {
                const email = user.email || '';
                const firstChar = email.charAt(0).toUpperCase();
                userInitialEl.textContent = firstChar;
            }
            // Hacer clickeable para abrir modal
            profileContainer.onclick = window.openProfileModal;
        }
    } else {
        // Usuario NO logueado
        if (loginContainer) loginContainer.style.display = 'block';
        if (profileContainer) {
            profileContainer.style.display = 'none';
            profileContainer.onclick = null;
        }
    }
}

// ==========================================
// 5. FUNCIONES GLOBALES PARA EL HTML
// ==========================================

// --- Modal de Login ---
window.openLoginModal = function() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.classList.add('is-active');
        setTimeout(() => document.getElementById('login-email')?.focus(), 100);
    }
};

window.closeLoginModal = function() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.classList.remove('is-active');
        const msgEl = document.getElementById('login-message');
        if (msgEl) msgEl.textContent = '';
    }
};

window.handleLoginSubmit = async function(event) {
    event.preventDefault();
    
    const emailInput = document.getElementById('login-email');
    const submitBtn = document.getElementById('login-submit-btn');
    const messageEl = document.getElementById('login-message');
    
    const email = emailInput.value.trim();
    if (!email) {
        messageEl.textContent = 'Por favor ingresa tu correo';
        messageEl.style.color = 'red';
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    messageEl.textContent = '';

    try {
        await loginWithMagicLink(email);
        messageEl.textContent = '¡Revisa tu correo! Te hemos enviado un enlace mágico.';
        messageEl.style.color = 'var(--color-dorado)';
        emailInput.value = '';
        
        setTimeout(() => {
            window.closeLoginModal();
        }, 3000);
    } catch (error) {
        messageEl.textContent = 'Error: ' + error.message;
        messageEl.style.color = 'red';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar enlace mágico';
    }
};

// --- Modal de Perfil ---
window.openProfileModal = function() {
    const modal = document.getElementById('profile-modal');
    const emailEl = document.getElementById('profile-email');
    
    if (modal) {
        const userEmail = document.getElementById('auth-user-email')?.textContent || '';
        if (emailEl) emailEl.textContent = userEmail;
        modal.classList.add('is-active');
    }
};

window.closeProfileModal = function() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.classList.remove('is-active');
};

// Hacer logout y login disponibles globalmente
window.logout = logout;
window.loginWithGoogle = loginWithGoogle;

// ==========================================
// 6. EVENT LISTENERS E INICIALIZACIÓN
// ==========================================

// Escuchar cambios de autenticación en tiempo real
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Evento de auth:', event);
    
    if (event === 'SIGNED_IN') {
        updateHeaderUI(session.user);
        
        // Redirigir si venía de un intento de acceso a contenido bloqueado
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirectUrl;
        }
        window.closeLoginModal();
    } else if (event === 'SIGNED_OUT') {
        updateHeaderUI(null);
    }
});

// Cerrar modal de perfil al hacer clic fuera de él
document.addEventListener('click', function(event) {
    const profileModal = document.getElementById('profile-modal');
    if (profileModal && event.target === profileModal) {
        window.closeProfileModal();
    }
});

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando Supabase...');
    const session = await checkSession();
    updateHeaderUI(session ? session.user : null);
});