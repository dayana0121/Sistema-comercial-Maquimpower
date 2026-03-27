import { useEffect, useState } from 'react';
// ❌ Supabase ELIMINADO
// import { supabase } from '../lib/supabaseClient';
import { LuReceipt, LuChartBar, LuTriangleAlert, LuUsers } from 'react-icons/lu';
import { apiClient } from '../api/client'; // ✅ Nuevo cliente seguro
import { useToast } from '../hooks/useToast';
import '../styles/dashboard.css';

const Dashboard = () => {
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

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                // ✅ Consulta única al backend PHP local
                const res = await apiClient.get('/dashboard/stats');

                if (res.success) {
                    setStats(res.data.stats);
                    setLastVentas(res.data.lastVentas);
                }
            } catch (error) {
                console.error("Error cargando dashboard:", error);
                toast.error("No se pudieron cargar los indicadores");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return <div className="loading-screen">Cargando indicadores...</div>;

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>Resumen Ejecutivo</h1>
                <p>Indicadores clave de rendimiento comercial</p>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* VENTAS DE HOY */}
                <div className="stat-card border-naranja">
                    <div className="stat-icon-wrapper text-naranja"><LuReceipt size={20} /></div>
                    <div className="stat-info">
                        <p className="stat-label">Ventas de Hoy</p>
                        <h3 className="stat-value">{stats.ventasHoy}</h3>
                    </div>
                </div>

                {/* INGRESOS DEL MES */}
                <div className="stat-card border-verde">
                    <div className="stat-icon-wrapper text-verde"><LuChartBar size={20} /></div>
                    <div className="stat-info">
                        <p className="stat-label">Ingresos del Mes</p>
                        <h3 className="stat-value">S/ {stats.totalVentasMes.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                {/* BAJO STOCK */}
                <div className="stat-card border-rojo">
                    <div className="stat-icon-wrapper text-rojo"><LuTriangleAlert size={20} /></div>
                    <div className="stat-info">
                        <p className="stat-label">Bajo Stock</p>
                        <h3 className="stat-value">{stats.productosBajoStock}</h3>
                    </div>
                </div>

                {/* CLIENTES ACTIVOS */}
                <div className="stat-card border-azul">
                    <div className="stat-icon-wrapper text-azul"><LuUsers size={20} /></div>
                    <div className="stat-info">
                        <p className="stat-label">Clientes Activos</p>
                        <h3 className="stat-value">{stats.clientesActivos}</h3>
                    </div>
                </div>

                {/* MONTO DE HOY */}
                <div className="stat-card border-verde">
                    <div className="stat-icon-wrapper text-verde"><LuChartBar size={20} /></div>
                    <div className="stat-info">
                        <p className="stat-label">Monto de Hoy</p>
                        <h3 className="stat-value">
                            S/ {stats.monto_hoy?.toLocaleString('es-PE', { minimumFractionDigits: 2 }) ?? '0.00'}
                        </h3>
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
                                    <th>Número</th>
                                    <th>Cliente</th>
                                    <th>Total</th>
                                    <th>Estado SUNAT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lastVentas.length > 0 ? lastVentas.map((v) => (
                                    <tr key={v.id}>
                                        <td><strong>{`${v.serie}-${v.correlativo}`}</strong></td>
                                        <td>{v.clientes?.razon_social || 'Cliente final'}</td>
                                        <td>S/ {parseFloat(v.total).toFixed(2)}</td>
                                        <td>
                                            <span className={`badge-status ${v.estado_sunat?.toLowerCase()}`}>
                                                {v.estado_sunat || 'PENDIENTE'}
                                            </span>
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
            </div>
        </div>
    );
};

export default Dashboard;