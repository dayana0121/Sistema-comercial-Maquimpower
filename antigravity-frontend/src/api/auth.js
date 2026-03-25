// src/api/auth.js
const API = import.meta.env.VITE_API_URL;

/**
 * Iniciar sesión y guardar persistencia
 * CAMBIO: Se renombra a 'loginService' para coincidir con el import en Login.jsx
 */
export async function loginService(email, password) {
    const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!data.success) {
        throw new Error(data.message || "Error al iniciar sesión");
    }

    // Persistencia de sesión
    localStorage.setItem("token", data.data.token);
    localStorage.setItem("user", JSON.stringify(data.data.user));

    return data.data;
}

/**
 * Helpers de acceso a datos
 */
export const getToken = () => localStorage.getItem("token");

export const getUser = () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
};

/**
 * Limpiar sesión y salir
 */
export function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
}

/**
 * Wrapper universal para peticiones autenticadas
 * @deprecated — usar apiClient de ./client en módulos nuevos
 */
export async function apiFetch(endpoint, options = {}) {
    const token = getToken();

    const fetchOptions = {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...options.headers
        }
    };

    try {
        const res = await fetch(`${API}${endpoint}`, fetchOptions);

        // Manejo automático de sesión expirada
        if (res.status === 401) {
            logout();
            return null;
        }

        return await res.json();
    } catch (error) {
        console.error("Error de red en apiFetch:", error);
        throw error;
    }
}