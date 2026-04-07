import React, { useState, useEffect } from 'react';
import { cotizacionesApi } from '../../api/cotizaciones';
import { useToast } from '../../hooks/useToast';
import { exportToExcel } from '../../utils/exportar';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import CotizacionForm from './CotizacionForm';
import { LuMenu, LuDownload, LuX, LuMessageCircle, LuFileSpreadsheet } from 'react-icons/lu';

const CotizacionesPage = () => {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCotizacion, setSelectedCotizacion] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);

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
            // Aquí iría un endpoint DELETE en cotizacionesApi
            toast.success('Cotización eliminada');
            fetchCotizaciones();
        } catch (error) {
            toast.error('Error al eliminar la cotización');
        }
    };

    const handleExportarExcelListado = () => {
        if (cotizaciones.length === 0) {
            toast.error('No hay datos para exportar');
            return;
        }

        const dataExcel = cotizaciones.map(cot => ({
            'Número': `#${cot.numero_correlativo}`,
            'Cliente': cot.cliente_nombre || cot.cliente?.razon_social || '---',
            'Fecha': cot.fecha_emisión ? new Date(cot.fecha_emisión).toLocaleDateString() : '---',
            'Suma de Items': cot.detalles?.length || 0,
            'Total (S/)': parseFloat(cot.total).toFixed(2),
            'Estado': cot.estado,
            'Indicación': cot.detalles?.some(d => d.indicacion === 'indispensable') ? '🟢 CONTIENE INDISPENSABLES' : '⚪ NORMAL'
        }));

        exportToExcel(dataExcel, 'Listado_Cotizaciones_Maquimpower', 'Cotizaciones');
        toast.success('Listado exportado a Excel');
    };

    const handleExportarExcelIndividual = (cot) => {
        if (!cot.detalles || cot.detalles.length === 0) {
            toast.error('Esta cotización no tiene detalles para exportar');
            return;
        }

        const dataExcel = cot.detalles.map(d => {
            let prefijo = '⚪';
            const ind = (d.indicacion || '').toLowerCase();
            if (ind === 'indispensable') prefijo = '🟢';
            else if (ind === 'remplazable') prefijo = '🟠';
            else if (ind === 'prescindible') prefijo = '⚪';

            return {
                'Item': d.item,
                'Indicación': prefijo + ' ' + (d.indicacion || 'S/I').toUpperCase(),
                'Descripción': d.descripcion,
                'Código': d.codigo_interno || '---',
                'Cantidad': parseFloat(d.cantidad).toFixed(2),
                'P. Unitario': parseFloat(d.valor_unitario || 0).toFixed(2),
                'Total': (parseFloat(d.cantidad) * parseFloat(d.valor_unitario || 0)).toFixed(2)
            };
        });

        exportToExcel(dataExcel, `Cotización_${cot.numero_correlativo}_${cot.cliente_nombre || 'Cliente'}`, 'Detalle de Cotización');
        toast.success('Excel de cotización generado');
    };

    const getEstadoBadge = (estado) => {
        const estilos = {
            'PENDIENTE': 'bg-yellow-100 text-yellow-800',
            'CONVERTIDA': 'bg-green-100 text-green-800',
            'RECHAZADA': 'bg-red-100 text-red-800',
            'EXPIRADA': 'bg-gray-100 text-gray-800'
        };
        return estilos[estado] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Cotizaciones</h1>
                    <p className="text-sm text-gray-500 mt-1">Pre-ventas y proyectos de negocios</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleExportarExcelListado}
                        className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                    >
                        <LuFileSpreadsheet size={16} /> Exportar
                    </Button>
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
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
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
                                    <tr key={cot.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-semibold text-gray-900">#{cot.numero_correlativo}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {cot.cliente?.razon_social || cot.cliente?.nombre || 'Sin nombre'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {cot.fecha_emisión ? new Date(cot.fecha_emisión).toLocaleDateString() : '-'}
                                        </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {cot.detalles && cot.detalles.some(d => d.indicacion === 'indispensable') ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Contiene indispensables</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">-</span>
                                                )}
                                            </td>
                                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                            S/ {parseFloat(cot.total).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getEstadoBadge(cot.estado)}`}>
                                                {cot.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative inline-block text-left">
                                                <button
                                                    onClick={() => setOpenMenuId(openMenuId === cot.id ? null : cot.id)}
                                                    className="p-2 hover:bg-gray-100 rounded"
                                                >
                                                    <LuMenu size={16} />
                                                </button>
                                                {openMenuId === cot.id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-10 border border-gray-200">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedCotizacion(cot);
                                                                setIsModalOpen(true);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                                                        >
                                                            ✏️ Editar
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleDescargarPdf(cot.id);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                                                        >
                                                            <LuDownload size={14} /> Descargar PDF
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleExportarExcelIndividual(cot);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                                                        >
                                                            <LuFileSpreadsheet size={14} /> Exportar Excel
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleEnviarWhatsapp(cot);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                                                        >
                                                            <LuMessageCircle size={14} /> Enviar WhatsApp
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleEliminar(cot.id);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm flex items-center gap-2"
                                                        >
                                                            <LuX size={14} /> Eliminar
                                                        </button>
                                                    </div>
                                                )}
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
