import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import {
    LuLayoutDashboard, LuReceipt, LuUsers, LuPackage, LuChartBar,
    LuSettings, LuLogOut, LuInfo, LuShoppingCart, LuBuilding2,
    LuWallet, LuTruck // <--- Agregamos LuTruck
} from 'react-icons/lu';
import '../../styles/sidebar.css';

const Sidebar = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    // Estados para submenús
    const [openMenus, setOpenMenus] = useState({
        ventas: true,
        clientes: false,
        productos: false,
        reportes: false,
        compras: false,
        caja: false,
        config: false
    });

    // Alertas de inventario e-comprobantes
    const [alertasCount, setAlertasCount] = useState(0);
    const [pendientesCount, setPendientesCount] = useState(0);

    useEffect(() => {
        const fetchAlertas = async () => {
            try {
                // ✅ Corregido: Quitamos el /api manual porque el proxy ya lo maneja
                const resp = await apiClient.get('/inventario/alertas');
                const data = resp?.data || [];
                setAlertasCount(data.length);
            } catch (error) {
                console.error("Error obteniendo alertas", error);
            }
        };

        const fetchPendientes = async () => {
            try {
                const resp = await apiClient.get('/ventas/pendientes-count');
                if (resp.success) {
                    setPendientesCount(resp.data.pendientes);
                }
            } catch (error) {
                console.error("Error obteniendo pendientes", error);
            }
        };

        fetchAlertas();
        fetchPendientes();

        const intervalAlertas = setInterval(fetchAlertas, 300000); // 5 min
        const intervalPendientes = setInterval(fetchPendientes, 30000); // 30 seg

        return () => {
            clearInterval(intervalAlertas);
            clearInterval(intervalPendientes);
        };
    }, []);

    const toggleMenu = (menu) => {
        setOpenMenus(prev => ({
            ...prev,
            [menu]: !prev[menu]
        }));
    };

    const handleLogout = () => {
        logout();
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <h1>MAQUIMPOWER</h1>
                <span>Sistema Comercial</span>
            </div>

            <nav className="sidebar-nav">
                <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <span className="nav-icon"><LuLayoutDashboard size={16} /></span> Dashboard
                </NavLink>

                <div className="nav-group-separator"></div>

                {/* VENTAS */}
                <div className="nav-group">
                    <div className={`nav-item has-submenu ${openMenus.ventas ? 'open' : ''}`} onClick={() => toggleMenu('ventas')}>
                        <div className="flex items-center gap-2">
                            <span className="nav-icon"><LuReceipt size={16} /></span> VENTAS
                            {pendientesCount > 0 && (
                                <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                                    {pendientesCount}
                                </span>
                            )}
                        </div>
                        <span className="submenu-arrow">{openMenus.ventas ? '▾' : '▸'}</span>
                    </div>
                    {openMenus.ventas && (
                        <div className="submenu">
                            <NavLink to="/ventas?nueva=true" className="submenu-item">→ Facturas y Boletas</NavLink>
                            <NavLink to="/ventas" className="submenu-item" end>→ Listado de ventas</NavLink>

                            {/* ✅ AGREGADO: Guías de Remisión */}
                            <NavLink to="/guias" className="submenu-item">
                                <span className="flex items-center gap-2">
                                    <LuTruck size={14} /> → Guías de Remisión <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[9px] font-bold">GRE</span>
                                </span>
                            </NavLink>

                            <div className="submenu-item disabled">→ Punto de Venta <span className="badge-soon">Pronto</span></div>
                            <div className="submenu-item disabled">→ Cotizaciones <span className="badge-soon">Pronto</span></div>
                        </div>
                    )}
                </div>

                <div className="nav-group-separator"></div>

                {/* CLIENTES */}
                <div className="nav-group">
                    <div className={`nav-item has-submenu ${openMenus.clientes ? 'open' : ''}`} onClick={() => toggleMenu('clientes')}>
                        <span className="nav-icon"><LuUsers size={16} /></span> CLIENTES
                        <span className="submenu-arrow">{openMenus.clientes ? '▾' : '▸'}</span>
                    </div>
                    {openMenus.clientes && (
                        <div className="submenu">
                            <NavLink to="/clientes" className="submenu-item" end>→ Lista de clientes</NavLink>
                            <NavLink to="/clientes/nuevo" className="submenu-item">→ Nuevo cliente</NavLink>
                        </div>
                    )}
                </div>

                <div className="nav-group-separator"></div>

                {/* PRODUCTOS */}
                <div className="nav-group">
                    <div className={`nav-item has-submenu ${openMenus.productos ? 'open' : ''}`} onClick={() => toggleMenu('productos')}>
                        <span className="nav-icon"><LuPackage size={16} /></span> PRODUCTOS
                        <span className="submenu-arrow">{openMenus.productos ? '▾' : '▸'}</span>
                    </div>
                    {openMenus.productos && (
                        <div className="submenu">
                            <NavLink to="/productos" className="submenu-item" end>→ Productos Base</NavLink>
                            <NavLink to="/inventario" className="submenu-item" end>→ Inventario / Kardex</NavLink>
                            <NavLink to="/inventario" className="submenu-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>→ Alertas de Stock</span>
                                {alertasCount > 0 && <span style={{ backgroundColor: 'var(--color-error)', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 'bold' }}>{alertasCount}</span>}
                            </NavLink>
                            <div className="submenu-item disabled">→ Categorías <span className="badge-soon">Pronto</span></div>
                        </div>
                    )}
                </div>

                <div className="nav-group-separator"></div>

                {/* COMPRAS */}
                <div className="nav-group">
                    <div className={`nav-item has-submenu ${openMenus.compras ? 'open' : ''}`} onClick={() => toggleMenu('compras')}>
                        <span className="nav-icon"><LuShoppingCart size={16} /></span> COMPRAS
                        <span className="submenu-arrow">{openMenus.compras ? '▾' : '▸'}</span>
                    </div>
                    {openMenus.compras && (
                        <div className="submenu">
                            <NavLink to="/compras" className="submenu-item" end>→ Órdenes de Compra</NavLink>
                            <NavLink to="/proveedores" className="submenu-item" end>→ Proveedores</NavLink>
                        </div>
                    )}
                </div>

                <div className="nav-group-separator"></div>

                {/* CAJA */}
                <div className="nav-group">
                    <div className={`nav-item has-submenu ${openMenus.caja ? 'open' : ''}`} onClick={() => toggleMenu('caja')}>
                        <span className="nav-icon"><LuWallet size={16} /></span> CAJA
                        <span className="submenu-arrow">{openMenus.caja ? '▾' : '▸'}</span>
                    </div>
                    {openMenus.caja && (
                        <div className="submenu">
                            <NavLink to="/caja" className="submenu-item" end>→ Movimientos de Caja</NavLink>
                        </div>
                    )}
                </div>

                <div className="nav-group-separator"></div>

                {/* REPORTES */}
                <div className="nav-group">
                    <div className={`nav-item has-submenu ${openMenus.reportes ? 'open' : ''}`} onClick={() => toggleMenu('reportes')}>
                        <span className="nav-icon"><LuChartBar size={16} /></span> REPORTES
                        <span className="submenu-arrow">{openMenus.reportes ? '▾' : '▸'}</span>
                    </div>
                    {openMenus.reportes && (
                        <div className="submenu">
                            <NavLink to="/reportes" className="submenu-item">→ Dashboard de Reportes</NavLink>
                            <div className="submenu-item disabled">→ Reporte de ventas <span className="badge-soon">Pronto</span></div>
                            <div className="submenu-item disabled">→ Kardex <span className="badge-soon">Pronto</span></div>
                        </div>
                    )}
                </div>

                <div className="nav-group-separator"></div>

                {/* CONFIGURACIÓN */}
                <div className="nav-group">
                    <div className={`nav-item has-submenu ${openMenus.config ? 'open' : ''}`} onClick={() => toggleMenu('config')}>
                        <span className="nav-icon"><LuSettings size={16} /></span> CONFIGURACIÓN
                        <span className="submenu-arrow">{openMenus.config ? '▾' : '▸'}</span>
                    </div>
                    {openMenus.config && (
                        <div className="submenu">
                            <div className="submenu-item disabled">→ Empresa <span className="badge-soon">Pronto</span></div>
                            <div className="submenu-item disabled">→ Series SUNAT <span className="badge-soon">Pronto</span></div>
                            <div className="submenu-item disabled">→ Usuarios <span className="badge-soon">Pronto</span></div>
                        </div>
                    )}
                </div>
            </nav>

            <div className="sidebar-footer">
                <button onClick={handleLogout} className="logout-btn">
                    <span className="nav-icon"><LuLogOut size={16} /></span> Cerrar Sesión
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;