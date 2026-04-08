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
    const [comprasPendientesCount, setComprasPendientesCount] = useState(0);

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

        const fetchComprasPendientes = async () => {
            try {
                const resp = await apiClient.get('/compras/pendientes-count');
                if (resp.success) {
                    setComprasPendientesCount(resp.data.pendientes);
                }
            } catch (error) {
                console.error("Error obteniendo compras pendientes", error);
            }
        };

        fetchAlertas();
        fetchPendientes();
        fetchComprasPendientes();

        const intervalAlertas = setInterval(fetchAlertas, 300000); // 5 min
        const intervalPendientes = setInterval(fetchPendientes, 30000); // 30 seg
        const intervalCompras = setInterval(fetchComprasPendientes, 60000); // 1 min

        return () => {
            clearInterval(intervalAlertas);
            clearInterval(intervalPendientes);
            clearInterval(intervalCompras);
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
                <span>SISTEMA COMERCIAL</span>
            </div>
            
            <div className="sidebar-divider"></div>

            <nav className="sidebar-nav">
                <div className="nav-group">
                    <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <span className="nav-icon"><LuLayoutDashboard size={16} /></span> Dashboard
                    </NavLink>
                </div>

                {/* VENTAS */}
                <div className="nav-group">
                    <div className={`nav-item has-submenu ${openMenus.ventas ? 'open' : ''}`} onClick={() => toggleMenu('ventas')}>
                        <div className="flex items-center gap-2">
                            <span><span className="nav-icon"><LuReceipt size={16} /></span> VENTAS {pendientesCount > 0 && (
                                <span className="badge-count-red">{pendientesCount}</span>
                            )}</span>
                        </div>
                        <span className="submenu-arrow">{openMenus.ventas ? '▾' : '▸'}</span>
                    </div>
                    {openMenus.ventas && (
                        <div className="submenu">
                             {/* ✅ AGREGADO: Cotizaciones */}
                            <NavLink to="/cotizaciones" className="submenu-item">→ Cotizaciones</NavLink>

                            <NavLink to="/ventas/nueva" className="submenu-item">→ Facturas y Boletas</NavLink>
                            <NavLink to="/ventas" className="submenu-item" end>→ Listado de ventas</NavLink>

                            {/* ✅ AGREGADO: Guías de Remisión */}
                            <NavLink to="/guias" className="submenu-item">
                                <span className="flex items-center gap-2">
                                    <LuTruck size={14} /> → Guías de Remisión <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[9px] font-bold">GRE</span>
                                </span>
                            </NavLink>

                            <div className="submenu-item disabled">&mdash; Punto de Venta <span className="badge-soon">Pronto</span></div>
                        </div>
                    )}
                </div>

                {/* CLIENTES */}
                <div className="nav-group">
                    <div className={`nav-item has-submenu ${openMenus.clientes ? 'open' : ''}`} onClick={() => toggleMenu('clientes')}>
                        <span><span className="nav-icon"><LuUsers size={16} /></span> CLIENTES</span>
                        <span className="submenu-arrow">{openMenus.clientes ? '▾' : '▸'}</span>
                    </div>
                    {openMenus.clientes && (
                        <div className="submenu">
                            <NavLink to="/clientes" className="submenu-item" end>&mdash; Lista de clientes</NavLink>
                        </div>
                    )}
                </div>

                {/* PRODUCTOS */}
                <div className="nav-group">
                    <div className={`nav-item has-submenu ${openMenus.productos ? 'open' : ''}`} onClick={() => toggleMenu('productos')}>
                        <span><span className="nav-icon"><LuPackage size={16} /></span> PRODUCTOS</span>
                        <span className="submenu-arrow">{openMenus.productos ? '▾' : '▸'}</span>
                    </div>
                    {openMenus.productos && (
                        <div className="submenu">
                            <NavLink to="/productos" className="submenu-item" end>&mdash; Productos Base</NavLink>
                            <NavLink to="/inventario" className="submenu-item" end>&mdash; Inventario / Kardex</NavLink>
                            <NavLink to="/inventario" className="submenu-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>&mdash; Alertas de Stock</span>
                                {alertasCount > 0 && <span className="badge-count-red">{alertasCount}</span>}
                            </NavLink>
                            <div className="submenu-item disabled">&mdash; Categorías <span className="badge-soon">Pronto</span></div>
                        </div>
                    )}
                </div>

                {/* COMPRAS */}
                <div className="nav-group">
                    <div className={`nav-item has-submenu ${openMenus.compras ? 'open' : ''}`} onClick={() => toggleMenu('compras')}>
                        <div className="flex items-center gap-2">
                            <span><span className="nav-icon"><LuShoppingCart size={16} /></span> COMPRAS {comprasPendientesCount > 0 && (
                                <span className="badge-count-red">
                                    {comprasPendientesCount}
                                </span>
                            )}</span>
                        </div>
                        <span className="submenu-arrow">{openMenus.compras ? '▾' : '▸'}</span>
                    </div>
                    {openMenus.compras && (
                        <div className="submenu">
                            <NavLink to="/compras" className="submenu-item" end>&mdash; Órdenes de Compra</NavLink>
                            <NavLink to="/proveedores" className="submenu-item" end>&mdash; Proveedores</NavLink>
                        </div>
                    )}
                </div>

                {/* CAJA */}
                <div className="nav-group">
                    <div className={`nav-item has-submenu ${openMenus.caja ? 'open' : ''}`} onClick={() => toggleMenu('caja')}>
                        <span><span className="nav-icon"><LuWallet size={16} /></span> CAJA</span>
                        <span className="submenu-arrow">{openMenus.caja ? '▾' : '▸'}</span>
                    </div>
                    {openMenus.caja && (
                        <div className="submenu">
                            <NavLink to="/caja" className="submenu-item" end>&mdash; Movimientos de Caja</NavLink>
                        </div>
                    )}
                </div>

                {/* REPORTES */}
                <div className="nav-group">
                    <div className={`nav-item has-submenu ${openMenus.reportes ? 'open' : ''}`} onClick={() => toggleMenu('reportes')}>
                        <span><span className="nav-icon"><LuChartBar size={16} /></span> REPORTES</span>
                        <span className="submenu-arrow">{openMenus.reportes ? '▾' : '▸'}</span>
                    </div>
                    {openMenus.reportes && (
                        <div className="submenu">
                            <NavLink to="/reportes" className="submenu-item">&mdash; Dashboard de Reportes</NavLink>
                            <div className="submenu-item disabled">&mdash; Reporte de ventas <span className="badge-soon">Pronto</span></div>
                            <div className="submenu-item disabled">&mdash; Kardex <span className="badge-soon">Pronto</span></div>
                        </div>
                    )}
                </div>

                {/* CONFIGURACIÓN */}
                <div className="nav-group">
                    <div className={`nav-item has-submenu ${openMenus.config ? 'open' : ''}`} onClick={() => toggleMenu('config')}>
                        <span><span className="nav-icon"><LuSettings size={16} /></span> CONFIGURACIÓN</span>
                        <span className="submenu-arrow">{openMenus.config ? '▾' : '▸'}</span>
                    </div>
                    {openMenus.config && (
                        <div className="submenu">
                            <div className="submenu-item disabled">&mdash; Empresa <span className="badge-soon">Pronto</span></div>
                            <div className="submenu-item disabled">&mdash; Series SUNAT <span className="badge-soon">Pronto</span></div>
                            <div className="submenu-item disabled">&mdash; Usuarios <span className="badge-soon">Pronto</span></div>
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