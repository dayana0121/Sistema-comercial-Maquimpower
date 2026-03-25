import { Navigate, Outlet } from 'react-router-dom';
import { getToken } from '../api/auth';

const ProtectedRoute = ({ allowedRoles, children }) => {
    const token = getToken();
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    // 1. ¿No hay token? Al login de una.
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // 2. ¿Hay roles permitidos y el usuario no tiene el adecuado?
    if (allowedRoles && !allowedRoles.includes(user?.rol)) {
        // Si no tiene permisos, lo mandamos al inicio (o a una página de "No autorizado")
        return <Navigate to="/" replace />;
    }

    // 3. Si se pasaron componentes hijos (ej: <UsuariosList />), renderízalos.
    // Si no, renderiza el <Outlet /> para que funcionen las rutas anidadas.
    return children ? children : <Outlet />;
};

export default ProtectedRoute;