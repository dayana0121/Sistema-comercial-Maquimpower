import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import MainLayout from './components/layout/MainLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Ventas
import VentasList from './pages/ventas/VentasList';
import VentaForm from './pages/ventas/VentaForm';
import VentaDetalle from './pages/ventas/VentaDetalle';
import VentasPage from './pages/ventas/VentasPage';

//guias
import GuiasPage from './pages/guias/GuiasPage';

// Clientes
import ClientesPage from './pages/clientes/ClientesPage';

// Productos / Inventario (✅ Importaciones limpias y unificadas)
import ProductosPage from './pages/productos/ProductosPage';
import InventarioList from './pages/inventario/InventarioList';

// Usuarios (Administración)
import UsuariosList from './pages/usuarios/UsuariosList';
import UsuarioForm from './pages/usuarios/UsuarioForm';

// Reportes
import ReportesPage from './pages/reportes/ReportesPage';
import ProveedoresPage from './pages/compras/ProveedoresPage';
import ComprasPage from './pages/compras/ComprasPage';
import CajaPage from './pages/caja/CajaPage';

// Global Styles
import './styles/variables.css';

// Toaster para notificaciones globales
import { Toaster } from 'react-hot-toast';

function NavLogger() {
  const location = useLocation();
  useEffect(() => {
    window.__mqdebug?.({ type: 'nav', route: location.pathname, message: 'Navegar a ' + location.pathname });
  }, [location]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <NavLogger />
      <Routes>
        {/* 1. Rutas Públicas */}
        <Route path="/login" element={<Login />} />

        {/* 2. Rutas Protegidas (General: Ventas, Clientes, Productos) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>

            <Route path="/" element={<Dashboard />} />

            {/* Ventas */}
            <Route path="/ventas" element={<ProtectedRoute><VentasPage /></ProtectedRoute>} />
            <Route path="/ventas/:id" element={<VentaDetalle />} />

            {/* Guías de Remisión */}
            <Route
              path="/guias"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <GuiasPage />
                </ProtectedRoute>
              }
            />

            {/* Clientes */}
            <Route path="/clientes" element={<ClientesPage />} />

            {/* Productos (✅ Ruteo unificado a una sola página) */}
            <Route path="/productos" element={<ProductosPage />} />

            {/* Inventario */}
            <Route path="/inventario" element={<InventarioList />} />

            {/* Reportes */}
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/proveedores" element={<ProveedoresPage />} />
            <Route path="/compras" element={<ComprasPage />} />
            <Route path="/caja" element={<CajaPage />} />

            {/* 3. Rutas Protegidas Especiales (Solo ADMIN) */}
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UsuariosList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/usuarios/nuevo"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UsuarioForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/usuarios/editar/:id"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UsuarioForm />
                </ProtectedRoute>
              }
            />
          </Route>
        </Route>

        {/* Fallback - Redirige a inicio si la ruta no existe */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Colocar el Toaster en la base de la aplicación */}
      <Toaster />
    </BrowserRouter>
  );
}

export default App;