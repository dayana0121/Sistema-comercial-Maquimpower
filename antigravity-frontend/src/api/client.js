// src/api/client.js
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost/Maquimpower_Sistema_Comercial_1.0/antigravity-backend';

async function getToken() {
    // ✅ Obtenemos el token que guardamos en AuthController.php
    return localStorage.getItem('token');
}

async function fetchWithAuth(url, options = {}) {
    const _t0 = Date.now();
    const _mod = url.split('/').filter(Boolean)[0] || 'api';

    // DEBUG — request
    window.__mqdebug?.({ type: 'request', url, module: _mod, method: options.method || 'GET', body: options.body || null });

    const token = await getToken();

    // Si ni siquiera hay token, mandamos al login de una
    if (!token) {
        window.location.href = "/login?error=no_session";
        throw new Error('No hay sesión activa.');
    }

    try {
        const res = await fetch(`${BASE_URL}${url}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            },
        });

        let data = {};
        const text = await res.text(); // Leemos como texto primero para evitar errores de JSON

        try {
            data = JSON.parse(text);
        } catch (err) {
            console.error("El servidor no respondió con JSON:", text);
            throw new Error("Error crítico en el servidor.");
        }

        // DEBUG — response
        window.__mqdebug?.({ type: 'response', url, module: _mod, status: res.status, duration: Date.now() - _t0, data });

        // ✅ MANEJO DE EXPIRACIÓN: Si el backend dice que el token murió
        if (data.message === "Token inválido o expirado" || res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = "/login?expired=true";
            return;
        }

        if (res.status >= 500) throw new Error(data.message || `Error ${res.status}`);

        return data;
    } catch (err) {
        // DEBUG — error
        window.__mqdebug?.({ type: 'error', url, module: _mod, message: err.message, duration: Date.now() - _t0 });
        throw err;
    }
}

export const apiClient = {
    get: (url) => fetchWithAuth(url, { method: 'GET' }),
    post: (url, body) => fetchWithAuth(url, { method: 'POST', body: JSON.stringify(body) }),
    put: (url, body) => fetchWithAuth(url, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (url) => fetchWithAuth(url, { method: 'DELETE' }),
}

export default apiClient;