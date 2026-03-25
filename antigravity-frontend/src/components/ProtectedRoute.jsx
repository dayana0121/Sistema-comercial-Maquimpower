import { Navigate, Outlet } from 'react-router-dom';
import { getToken, getUser } from '../api/auth'; // <--- ¡AQUÍ ESTÁ EL CAMBIO! (solo dos puntos)

const ProtectedRoute = ({ allowedRoles, children }) => {
    const token = getToken();
    const user = getUser();

    console.log("👮‍♂️ Guardián revisando - Token:", token ? "Sí hay token" : "NO HAY TOKEN");
    console.log("👮‍♂️ Guardián revisando - Usuario:", user);

    // 1. ¿No hay token? Al login de una.
    if (!token) {
        console.warn("🚫 Expulsado: No se encontró token en localStorage");
        return <Navigate to="/login" replace />;
    }

    // 2. ¿Hay roles permitidos y el usuario no tiene el adecuado?
    if (allowedRoles && (!user || !allowedRoles.includes(user.rol))) {
        console.warn(`🚫 Expulsado: El rol ${user?.rol} no está en la lista permitida`);
        return <Navigate to="/" replace />;
    }

    console.log("✅ Pase libre concedido. Dibujando pantalla...");
    // 3. Si todo está ok, renderiza la ruta hija
    return children ? children : <Outlet />;
};

export default ProtectedRoute;