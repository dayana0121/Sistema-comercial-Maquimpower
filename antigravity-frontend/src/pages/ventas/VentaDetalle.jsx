import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { abrirPdfVenta } from '../../utils/pdf';
import Modal from '../../components/ui/Modal';
import AlertModal from '../../components/ui/AlertModal';
import GuiaForm from '../guias/GuiaForm';
import { useAlertModal } from '../../hooks/useAlertModal';
import '../../styles/business.css';

const VentaDetalle = ({ id: propId }) => {
    const { id: paramId } = useParams();
    const id = propId || paramId;
    const navigate = useNavigate();
    const { showAlert, closeAlert, alertData } = useAlertModal();
    const [venta, setVenta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generandoPdf, setGenerandoPdf] = useState(false);
    const [isGuiaModalOpen, setIsGuiaModalOpen] = useState(false);

    const verPDF = async (formato = 'ticket') => {
        setGenerandoPdf(true);
        try {
            await abrirPdfVenta(id, import.meta.env.VITE_API_URL, formato);
        } catch (e) {
            console.error(`Error al generar PDF ${formato}:`, e);
            // Mostrar alerta modal en lugar de window.alert()
            showAlert(
                'Error en PDF',
                `Error al generar el PDF en formato ${formato}`,
                'error'
            );
        } finally {
            setGenerandoPdf(false);
        }
    };

    useEffect(() => {
        const fetchVenta = async () => {
            try {
                const resp = await apiClient.get(`/api/ventas/${id}`);
                setVenta(resp.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchVenta();
    }, [id]);

    if (loading) return <div>Cargando detalle de venta...</div>;
    if (!venta) return <div>No se encontró la venta.</div>;

    return (
        <div className="venta-detalle">
            <header className="page-header">
                <h1>Detalle de Comprobante</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => verPDF('ticket')}
                        disabled={generandoPdf}
                        className="btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: generandoPdf ? 'wait' : 'pointer', opacity: generandoPdf ? 0.6 : 1, backgroundColor: '#475569' }}
                    >
                        📄 {generandoPdf ? '...' : 'Imprimir Ticket'}
                    </button>
                    <button
                        onClick={() => verPDF('a4')}
                        disabled={generandoPdf}
                        className="btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: generandoPdf ? 'wait' : 'pointer', opacity: generandoPdf ? 0.6 : 1 }}
                    >
                        📄 {generandoPdf ? '...' : 'Imprimir A4'}
                    </button>
                    <button
                        onClick={() => setIsGuiaModalOpen(true)}
                        className="btn-secondary"
                        style={{ backgroundColor: '#1e293b', color: 'white', border: 'none' }}
                    >
                        🚚 Generar Guía
                    </button>
                </div>
            </header>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Nro. Comprobante</h3>
                        <p className="stat-value" style={{ fontSize: '1.2rem' }}>
                            {venta.serie}-{String(venta.correlativo).padStart(8, '0')}
                        </p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Estado SUNAT</h3>
                        <span className={`badge badge-${venta.estado_sunat === 'ACEPTADO' ? 'success' : 'warning'}`}>
                            {venta.estado_sunat}
                        </span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Fecha Emisión</h3>
                        <p className="stat-value" style={{ fontSize: '1.2rem' }}>{venta.fecha_emision}</p>
                    </div>
                </div>
            </div>

            <div className="table-container" style={{ marginTop: '2rem' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-borde)' }}>
                    <h3>Información del Cliente</h3>
                    <p><strong>Razón Social:</strong> {venta.cliente_nombre || 'Cliente Final'}</p>
                    <p><strong>Documento:</strong> {venta.cliente_documento || '—'}</p>
                    <p><strong>Email:</strong> {venta.cliente_email || 'n/a'}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Descripción</th>
                            <th>Cant</th>
                            <th>V. Unit</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {venta.detalles?.map((d) => (
                            <tr key={d.id}>
                                <td>{d.item}</td>
                                <td>{d.descripcion}</td>
                                <td>{d.cantidad}</td>
                                <td>{parseFloat(d.valor_unitario || 0).toFixed(2)}</td>
                                <td>S/ {parseFloat(d.precio_total || d.precio_unitario * d.cantidad || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <p>Op. Gravada: S/ {parseFloat(venta.op_gravada || 0).toFixed(2)}</p>
                    <p>IGV (18%): S/ {parseFloat(venta.igv || 0).toFixed(2)}</p>
                    <h2 style={{ color: 'var(--color-cta-primario)' }}>TOTAL: S/ {parseFloat(venta.importe_total || 0).toFixed(2)}</h2>
                </div>
            </div>
            
            {/* Modal para Generar Guía */}
            <Modal 
                isOpen={isGuiaModalOpen} 
                onClose={() => setIsGuiaModalOpen(false)} 
                title="Generar Guía de Remisión desde Venta"
            >
                <GuiaForm 
                    preData={{
                        destinatario_ruc: venta.cliente_documento,
                        destinatario_nombre: venta.cliente_nombre,
                        llegada_direccion: venta.direccion,
                        items: venta.detalles?.map(d => ({
                            id: d.producto_id,
                            codigo: d.codigo_producto,
                            descripcion: d.descripcion,
                            cantidad: d.cantidad,
                            unidad_medida: d.unidad_medida || 'NIU'
                        }))
                    }}
                    onSuccess={() => {
                        setIsGuiaModalOpen(false);
                        navigate('/guias');
                    }} 
                    onCancel={() => setIsGuiaModalOpen(false)}
                />
            </Modal>

            {/* Modal de Alerta para reemplazar window.alert() */}
            <AlertModal
                isOpen={alertData.isOpen}
                title={alertData.title}
                message={alertData.message}
                type={alertData.type}
                onClose={closeAlert}
            />
        </div >
    );
};

export default VentaDetalle;