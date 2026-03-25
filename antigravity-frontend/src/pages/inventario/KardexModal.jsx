import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { LuX, LuDownload, LuPackage } from 'react-icons/lu';
import '../../styles/business.css';

const KardexModal = ({ isOpen, onClose, producto }) => {
    const [kardex, setKardex] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && producto) {
            fetchKardex(producto.id);
        } else {
            setKardex([]);
        }
    }, [isOpen, producto]);

    const fetchKardex = async (prodId) => {
        try {
            setLoading(true);
            const resp = await apiClient.get(`/api/inventario/kardex?producto_id=${prodId}`);
            setKardex(resp.data?.data || []);
        } catch (error) {
            console.error("Error obteniendo kardex", error);
        } finally {
            setLoading(false);
        }
    };

    const exportarCSV = () => {
        if (kardex.length === 0) return;

        const headers = ["Fecha", "Tipo Movimiento", "Cantidad", "Stock Anterior", "Stock Nuevo", "Motivo", "Referencia", "Usuario"];
        const rows = kardex.map(k => [
            new Date(k.created_at).toLocaleString(),
            k.tipo_movimiento,
            k.cantidad,
            k.stock_anterior,
            k.stock_nuevo,
            `"${k.motivo || ''}"`,
            `"${k.referencia || ''}"`,
            `"${k.usuario_email || ''}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `kardex_${producto.sku || producto.id}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    const totales = kardex.reduce((acc, mov) => {
        if (mov.tipo_movimiento === 'ENTRADA' || mov.tipo_movimiento === 'AJUSTE') {
            acc.entradas += parseFloat(mov.cantidad);
        } else {
            acc.salidas += parseFloat(mov.cantidad);
        }
        return acc;
    }, { entradas: 0, salidas: 0 });

    const getColorMovimiento = (tipo) => {
        switch (tipo) {
            case 'ENTRADA': return 'success';
            case 'SALIDA': return 'error';
            case 'AJUSTE': return 'primary';
            case 'TRASLADO': return 'warning';
            case 'DEVOLUCION': return 'error';
            default: return 'secondary';
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div className="modal-content" style={{
                backgroundColor: 'var(--color-bg-principal)',
                width: '100%', maxWidth: '900px',
                height: '80vh', display: 'flex', flexDirection: 'column',
                borderRadius: 'var(--radius-base)',
                boxShadow: 'var(--sombra-modal)',
                overflow: 'hidden'
            }}>
                {/* HEAD */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <LuPackage color="var(--color-cta-primario)" />
                            Kardex de Producto
                        </h2>
                        <div className="text-secundario" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                            {producto.sku} - {producto.nombre}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button onClick={exportarCSV} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem' }} disabled={kardex.length === 0}>
                            <LuDownload size={16} /> Exportar CSV
                        </button>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-texto-suave)', cursor: 'pointer' }}>
                            <LuX size={24} />
                        </button>
                    </div>
                </div>

                {/* Resumen */}
                <div style={{ backgroundColor: 'var(--color-bg-secundario)', padding: '1rem 1.5rem', display: 'flex', gap: '2rem', borderBottom: '1px solid var(--color-borde)' }}>
                    <div>
                        <div className="text-secundario" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Total Entradas</div>
                        <div style={{ fontWeight: 'bold', color: 'var(--color-exito)' }}>+ {totales.entradas.toFixed(2)}</div>
                    </div>
                    <div>
                        <div className="text-secundario" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Total Salidas</div>
                        <div style={{ fontWeight: 'bold', color: 'var(--color-error)' }}>- {totales.salidas.toFixed(2)}</div>
                    </div>
                    <div style={{ borderLeft: '1px solid var(--color-borde)', paddingLeft: '2rem' }}>
                        <div className="text-secundario" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Stock Actual</div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{producto.stock_actual}</div>
                    </div>
                </div>

                {/* BODY / TABLA */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem 1.5rem' }}>
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando movimientos...</div>
                    ) : kardex.length > 0 ? (
                        <table style={{ width: '100%', marginTop: '1rem' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--color-bg-principal)', zIndex: 10 }}>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Movimiento</th>
                                    <th>Cant.</th>
                                    <th>Ant.</th>
                                    <th>Nuevo</th>
                                    <th>Motivo</th>
                                    <th>Ref.</th>
                                    <th>Usuario</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kardex.map((mov) => (
                                    <tr key={mov.id}>
                                        <td style={{ fontSize: '0.8rem' }}>{new Date(mov.created_at).toLocaleString('es-PE')}</td>
                                        <td>
                                            <span className={`badge badge-${getColorMovimiento(mov.tipo_movimiento)}`} style={{ fontSize: '0.7rem' }}>
                                                {mov.tipo_movimiento}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 'bold', color: getColorMovimiento(mov.tipo_movimiento) === 'error' ? 'var(--color-error)' : 'var(--color-exito)' }}>
                                            {(mov.tipo_movimiento === 'ENTRADA' || mov.tipo_movimiento === 'AJUSTE') ? '+' : '-'}{mov.cantidad}
                                        </td>
                                        <td className="text-secundario">{mov.stock_anterior}</td>
                                        <td style={{ fontWeight: 'bold' }}>{mov.stock_nuevo}</td>
                                        <td style={{ fontSize: '0.8rem' }}>{mov.motivo}</td>
                                        <td style={{ fontSize: '0.8rem' }} className="text-secundario">{mov.referencia || '-'}</td>
                                        <td style={{ fontSize: '0.8rem' }}>{mov.usuario_email?.split('@')[0] || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-texto-suave)' }}>
                            No hay movimientos registrados para este producto.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KardexModal;
