import React, { useState, useEffect } from 'react';
import { cotizacionesApi } from '../../api/cotizaciones';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import CotizacionForm from './CotizacionForm';
import { LuPencil, LuDownload, LuX, LuMessageCircle } from 'react-icons/lu';
import '../../styles/cotizaciones.css';

const CotizacionesPage = () => {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCotizacion, setSelectedCotizacion] = useState(null);
    const toast = useToast();

    const fetchCotizaciones = async () => {
        setLoading(true);
        try {
            const res = await cotizacionesApi.listar();
            if (res?.success && Array.isArray(res.data)) {
                setCotizaciones(res.data || []);
            } else if (res?.success && res.data && Array.isArray(res.data.cotizaciones)) {
                setCotizaciones(res.data.cotizaciones || []);
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

    const handleDescargarPdf = async (id) => {
        try {
            toast.success('Generando PDF...');
            await cotizacionesApi.generarPdf(id);
        } catch (error) {
            toast.error('Error al descargar el documento');
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

    const handleEliminar = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar esta cotización?')) return;

        try {
            toast.success('Cotización eliminada');
            fetchCotizaciones();
        } catch (error) {
            toast.error('Error al eliminar la cotización');
        }
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
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">Cargando cotizaciones...</td>
                                </tr>
                            ) : cotizaciones.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">No hay cotizaciones</td>
                                </tr>
                            ) : (
                                cotizaciones.map((cot) => (
                                    <tr key={cot.id} className="transition-colors hover:bg-gray-50 text-center">
                                        <td className="px-8 py-5 text-[14.5px] text-slate-700 font-medium text-center">#{cot.numero_correlativo}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {cot.cliente?.razon_social || cot.cliente?.nombre || 'Sin nombre'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {cot['fecha_emisión'] ? new Date(cot['fecha_emisión']).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center font-semibold text-gray-900">
                                            S/ {parseFloat(cot.total).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-xs font-semibold ${getEstadoBadge(cot.estado)}`}>
                                                {cot.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="cotizacion-actions-inline">
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
                                                    onClick={() => {
                                                        handleDescargarPdf(cot.id);
                                                    }}
                                                    className="cotizacion-action-chip is-blue"
                                                    title="Descargar PDF"
                                                >
                                                    <LuDownload size={14} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleEnviarWhatsapp(cot);
                                                    }}
                                                    className="cotizacion-action-chip is-green"
                                                    title="Enviar WhatsApp"
                                                >
                                                    <LuMessageCircle size={14} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleEliminar(cot.id);
                                                    }}
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
        </div>
    );
};

export default CotizacionesPage;
