import React, { useState, useEffect } from 'react';
import { cotizacionesApi } from '../../api/cotizaciones';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import CotizacionForm from './CotizacionForm';
// Unificamos las importaciones de iconos
import { LuPencil, LuX, LuMessageCircle } from 'react-icons/lu';
import { FileText } from 'lucide-react'; 
import { abrirPdfVenta } from "../../utils/pdf";
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import '../../styles/cotizaciones.css';

const CotizacionesPage = () => {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCotizacion, setSelectedCotizacion] = useState(null);
    const toast = useToast();
    const { confirmData, showConfirm, closeConfirm } = useConfirmModal();

    const fetchCotizaciones = async () => {
        setLoading(true);
        try {
            const res = await cotizacionesApi.listar();
            if (res?.success) {
                // Manejamos ambas estructuras posibles de respuesta
                const data = Array.isArray(res.data) ? res.data : (res.data?.cotizaciones || []);
                setCotizaciones(data);
            } else {
                setCotizaciones([]);
                toast.error(res?.message || 'Error al cargar las cotizaciones');
            }
        } catch (error) {
            setCotizaciones([]);
            toast.error('Error de conexión al listar cotizaciones');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCotizaciones();
    }, []);

    const handleVerPdf = async (id) => {
        try {
            // Usamos la utilidad para abrir el PDF en una pestaña nueva
            await abrirPdfCotizacion(id, import.meta.env.VITE_API_URL);
        } catch (error) {
            toast.error('Error al generar el PDF A4');
        }
    };

    const handleEnviarWhatsapp = (cotizacion) => {
        if (!cotizacion.numero_whatsapp) {
            toast.error('No hay número de WhatsApp registrado para este cliente');
            return;
        }
        const mensaje = `Estimado, le enviamos nuestra cotización #${cotizacion.numero_correlativo} por S/ ${parseFloat(cotizacion.total).toFixed(2)}. Válida hasta ${cotizacion.fecha_vigencia}. Confirme su interés.`;
        const url = `https://wa.me/${cotizacion.numero_whatsapp}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    };

    const handleEliminar = (id) => {
        showConfirm({
            title: 'Confirmar eliminación',
            message: '¿Eliminar esta cotización? Esta acción no se puede revertir.',
            type: 'warning',
            confirmLabel: 'Sí, eliminar',
            cancelLabel: 'Cancelar',
            onConfirm: async () => {
                closeConfirm();
                try {
                    const res = await cotizacionesApi.eliminar(id);
                    if (res.success) {
                        toast.success('Cotización eliminada correctamente');
                        fetchCotizaciones();
                    } else {
                        toast.error(res.message || "No se pudo eliminar");
                    }
                } catch (err) {
                    toast.error("Error al procesar la solicitud");
                }
            },
        });
    };

    const getEstadoBadge = (estado) => {
        const estilos = {
            PENDIENTE: 'bg-yellow-100 text-yellow-800',
            CONVERTIDA: 'bg-green-100 text-green-800',
            RECHAZADA: 'bg-red-100 text-red-800',
            EXPIRADA: 'bg-gray-100 text-gray-800',
            ANULADA: 'bg-red-100 text-red-800',
            ANULADO: 'bg-red-100 text-red-800',
        };
        return estilos[estado] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="cotizaciones-page p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Cotizaciones</h1>
                    <p className="text-sm text-gray-500 mt-1">Pre-ventas y proyectos de negocios</p>
                </div>
                <Button
                    onClick={() => {
                        setSelectedCotizacion(null);
                        setIsModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    + Nueva Cotización
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th className="acciones px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-center justify-center">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">Cargando cotizaciones...</td>
                                </tr>
                            ) : cotizaciones.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No hay cotizaciones</td>
                                </tr>
                            ) : (
                                cotizaciones.map((cot) => (
                                    <tr key={cot.id} className="transition-colors hover:bg-gray-50">
                                        <td className="px-8 py-5 text-[14.5px] text-slate-700 font-medium">#{cot.numero_correlativo}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {cot.cliente?.razon_social || cot.cliente?.nombre || 'Sin nombre'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {cot['fecha_emisión'] ? new Date(cot['fecha_emisión']).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-center justify-center text-gray-900">
                                            S/ {parseFloat(cot.total).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getEstadoBadge(cot.estado)}`}>
                                                {cot.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCotizacion(cot);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="cotizacion-action-chip is-default"
                                                    title="Editar"
                                                >
                                                    <LuPencil size={14} />
                                                </button>

                                                <button
                                                    onClick={() => handleVerPdf(cot.id)}
                                                    className="cotizacion-action-chip is-blue"
                                                    title="Ver PDF A4"
                                                >
                                                    <FileText size={14} />
                                                </button>

                                                <button
                                                    onClick={() => handleEnviarWhatsapp(cot)}
                                                    className="cotizacion-action-chip is-green"
                                                    title="Enviar WhatsApp"
                                                >
                                                    <LuMessageCircle size={14} />
                                                </button>

                                                <button
                                                    onClick={() => handleEliminar(cot.id)}
                                                    className="cotizacion-action-chip is-red"
                                                    title="Eliminar"
                                                >
                                                    <LuX size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CotizacionForm
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedCotizacion(null);
                }}
                onSuccess={() => {
                    setIsModalOpen(false);
                    setSelectedCotizacion(null);
                    fetchCotizaciones();
                }}
                cotizacion={selectedCotizacion}
            />

            <ConfirmModal
                isOpen={confirmData.isOpen}
                title={confirmData.title}
                message={confirmData.message}
                type={confirmData.type}
                confirmLabel={confirmData.confirmLabel}
                cancelLabel={confirmData.cancelLabel}
                onConfirm={confirmData.onConfirm}
                onClose={closeConfirm}
            />
        </div>
    );
};

export default CotizacionesPage;