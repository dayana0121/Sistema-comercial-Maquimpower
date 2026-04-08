import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// ❌ Supabase ELIMINADO
// import { supabase } from '../lib/supabaseClient';
import { LuReceipt, LuChartBar, LuTriangleAlert, LuUsers, LuEye, LuCheck, LuPlus, LuPackageSearch, LuDoorClosed, LuUserPlus, LuFileText } from 'react-icons/lu';
import { apiClient } from '../api/client'; // ✅ Nuevo cliente seguro
import { useToast } from '../hooks/useToast';
import '../styles/dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [stats, setStats] = useState({
        ventasHoy: 0,
        clientesActivos: 0,
        productosBajoStock: 0,
        totalVentasMes: 0,
        monto_hoy: 0.00,
    });
    const [lastVentas, setLastVentas] = useState([]);
    const [loading, setLoading] = useState(true);

    const getTipoComprobanteLabel = (venta) => {
        // Yo determino el tipo por prefijo del comprobante: B=Boleta, F=Factura.
        const base = String(venta?.numero_completo || venta?.serie || '').trim().toUpperCase();
        if (base.startsWith('B')) return 'Boleta';
        if (base.startsWith('F')) return 'Factura';
        return 'Comprobante';
    };

    const fetchDashboardData = async (showLoader = true) => {
        try {
            if (showLoader) setLoading(true);
            const res = await apiClient.get('/dashboard/stats');

            if (res.success) {
                setStats(res.data?.stats || {
                    ventasHoy: 0,
                    clientesActivos: 0,
                    productosBajoStock: 0,
                    totalVentasMes: 0,
                    monto_hoy: 0
                });
                setLastVentas(res.data?.lastVentas || []);
            }
        } catch (error) {
            console.error("Error cargando dashboard:", error);
            if (showLoader) {
                toast.error("No se pudieron cargar los indicadores");
            }
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    useEffect(() => {
        // Yo cargo al entrar al dashboard.
        fetchDashboardData(true);

        // Yo refresco periodicamente para mantener KPIs sincronizados con cambios de otras pantallas.
        const intervalId = window.setInterval(() => {
            fetchDashboardData(false);
        }, 20000);

        // Yo refresco al volver a la pestaña del navegador.
        const onFocus = () => fetchDashboardData(false);
        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchDashboardData(false);
            }
        };

        // Yo escucho cambios disparados desde otras pestañas del navegador.
        const onStorage = (e) => {
            if (e.key === 'mq_dashboard_refresh') {
                fetchDashboardData(false);
            }
        };
        const onInternalRefresh = () => fetchDashboardData(false);

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('storage', onStorage);
        window.addEventListener('mq:dashboard-refresh', onInternalRefresh);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('mq:dashboard-refresh', onInternalRefresh);
        };
    }, []);

    if (loading) return <div className="loading-screen">Cargando indicadores...</div>;

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>Resumen Ejecutivo</h1>
                <p>Indicadores clave de rendimiento comercial</p>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 stats-grid">
                {/* VENTAS DE HOY */}
                <div className="stat-card border-naranja">
                    <div className="stat-icon-wrapper text-naranja"><LuReceipt size={24} /></div>
                    <div className="stat-info">
                        <p className="stat-label">Ventas de Hoy</p>
                        <h3 className="stat-value">{stats.ventasHoy}</h3>
                    </div>
                </div>

                {/* MONTO DE HOY */}
                <div className="stat-card border-verde">
                    <div className="stat-icon-wrapper text-verde"><LuFileText size={24} /></div>
                    <div className="stat-info">
                        <p className="stat-label">Monto de Hoy</p>
                        <h3 className="stat-value">
                            S/ {stats.monto_hoy?.toLocaleString('es-PE', { minimumFractionDigits: 2 }) ?? '0.00'}
                        </h3>
                    </div>
                </div>

                {/* BAJO STOCK */}
                <div className="stat-card border-rojo">
                    <div className="stat-icon-wrapper text-rojo"><LuTriangleAlert size={24} /></div>
                    <div className="stat-info">
                        <p className="stat-label">Bajo Stock</p>
                        <h3 className="stat-value">{stats.productosBajoStock}</h3>
                    </div>
                </div>

                {/* CLIENTES ACTIVOS */}
                <div className="stat-card border-azul">
                    <div className="stat-icon-wrapper text-azul"><LuUsers size={24} /></div>
                    <div className="stat-info">
                        <p className="stat-label">Clientes Activos</p>
                        <h3 className="stat-value">{stats.clientesActivos}</h3>
                    </div>
                </div>

                {/* INGRESOS DEL MES */}
                <div className="stat-card border-verde">
                    <div className="stat-icon-wrapper text-verde-oscuro"><LuChartBar size={24} /></div>
                    <div className="stat-info">
                        <p className="stat-label">Ingresos del Mes</p>
                        <h3 className="stat-value">S/ {stats.totalVentasMes.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                </div>
            </div>

            <div className="dashboard-sections">
                <div className="recent-sales-card">
                    <div className="card-header">
                        <h2>Últimas 5 Ventas</h2>
                    </div>
                    <div className="table-responsive">
                        <table className="erp-table">
                            <thead>
                                <tr>
                                    <th>Comprobante</th>
                                    <th>Cliente</th>
                                    <th>Total</th>
                                    <th>Estado SUNAT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lastVentas.length > 0 ? lastVentas.map((v) => (
                                    <tr key={v.id}>
                                        <td>
                                            <span className="doc-number">{v.numero_completo || `${v.serie}-${v.correlativo}`}</span>
                                            <span className="doc-type">{getTipoComprobanteLabel(v)}</span>
                                        </td>
                                        <td>{v.clientes?.razon_social || 'Cliente final'}</td>
                                        <td>S/ {parseFloat(v.total).toFixed(2)}</td>
                                        <td className='text-center py-3'>
                                            <div className="flex justify-center items-center gap-2 w-full">
                                                <span className={`badge-status ${(v.estado_sunat || 'PENDIENTE').toLowerCase()}`}>
                                                    {v.estado_sunat || 'PENDIENTE'}
                                                </span>
                                                <div className="flex items-center">
                                                    {(v.estado_sunat === 'ACEPTADO') && (
                                                        <span className="action-circle text-naranja" title="PDF">
                                                            <LuFileText size={14} />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="text-center py-6 text-slate-500">
                                            Aún no hay ventas registradas
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* ALERTA DE STOCK */}
                {stats.productosBajoStock > 0 && (
                    <div className="dashboard-alert">
                        <LuTriangleAlert className="alert-icon" size={16} /> 
                        <span>{stats.productosBajoStock} productos en bajo stock</span>
                    </div>
                )}

                {/* BOTONES DE ACCION INFERIOR */}
                <div className="dashboard-bottom-actions">
                    <button className="btn-action btn-naranja" onClick={() => window.location.href='/ventas/nueva'}>
                        <LuPlus size={18} /> Nueva Venta
                    </button>
                    <button className="btn-action btn-blanco" onClick={() => window.location.href='/inventario'}>
                        <LuPackageSearch size={18} /> Ver Inventario
                    </button>
                    <button className="btn-action btn-azul" onClick={() => navigate('/clientes/nuevo')}>
                        <LuUserPlus size={18} /> Agregar Cliente
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
