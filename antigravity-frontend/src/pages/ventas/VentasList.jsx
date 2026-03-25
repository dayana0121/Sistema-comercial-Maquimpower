import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { LuPlus, LuSearch } from 'react-icons/lu';
import '../../styles/business.css';

const VentasList = () => {
    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVentas();
    }, []);

    const fetchVentas = async () => {
        try {
            const resp = await apiClient.get('/api/ventas');
            setVentas(resp.data || []);
        } catch (error) {
            console.error("Error cargando ventas", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Cargando historial de ventas...</div>;

    return (
        <div className="ventas-list">
            <header className="page-header">
                <h1>Historial de Ventas</h1>
                <Link to="/ventas/nueva" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LuPlus size={18} /> Emitir Comprobante
                </Link>
            </header>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Comprobante</th>
                            <th>Cliente</th>
                            <th>Total</th>
                            <th>Estado SUNAT</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ventas.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                    No se encontraron ventas registradas.
                                </td>
                            </tr>
                        ) : (
                            ventas.map((v) => (
                                <tr key={v.id}>
                                    <td>{v.fecha_emision}</td>
                                    <td>{v.tipo_comprobante === '01' ? 'Factura' : 'Boleta'} {v.serie}-{String(v.correlativo).padStart(8, '0')}</td>
                                    <td>{v.clientes?.razon_social || 'Cliente Variable'}</td>
                                    <td>{v.moneda} {parseFloat(v.total).toFixed(2)}</td>
                                    <td>
                                        <span className={`badge badge-${v.estado_sunat === 'ACEPTADO' ? 'success' : v.estado_sunat === 'PENDIENTE' ? 'warning' : 'error'}`}>
                                            {v.estado_sunat}
                                        </span>
                                    </td>
                                    <td>
                                        <Link to={`/ventas/${v.id}`} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <LuSearch size={16} /> Ver Detalle
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VentasList;
