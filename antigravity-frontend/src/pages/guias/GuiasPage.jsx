import React, { useState, useEffect } from 'react';
import { guiasApi } from '../../api/guias';
import { useToast } from '../../hooks/useToast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import GuiaForm from './GuiaForm';
import '../../styles/modal-guias.css';

const GuiasPage = () => {
    const [guias, setGuias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const toast = useToast();

    const fetchGuias = async () => {
        setLoading(true);
        try {
            const res = await guiasApi.listar();
            if (res?.success) {
                const guiasData = Array.isArray(res.data) ? res.data : (res.data?.guias || []);
                setGuias(guiasData);
            } else {
                setGuias([]);
                toast.error(res?.message || 'Error al cargar las guías');
            }
        } catch (error) {
            setGuias([]);
            toast.error('Error de conexión al listar guías');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGuias();
    }, []);

    const handleConsultarEstado = async (id) => {
        try {
            const res = await guiasApi.consultarEstado(id);
            if (res?.success) {
                toast.success('Estado actualizado desde SUNAT');
                fetchGuias();
            } else {
                toast.error(res?.message || 'Error al consultar el ticket en SUNAT');
            }
        } catch (error) {
            toast.error('Error al conectar con SUNAT');
        }
    };

    const handleDescargarPdf = async (id) => {
        try {
            toast.success('Generando PDF...');
            await guiasApi.descargarPdf(id);
        } catch (error) {
            toast.error('Error al descargar el documento');
        }
    };

    const getBadgeColor = (estado) => {
        switch (estado?.toLowerCase()) {
            case 'aceptado':
                return 'bg-green-100 text-green-800';
            case 'rechazado':
                return 'bg-red-100 text-red-800';
            case 'enviada':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getEstadoLabel = (estado) => {
        // Yo normalizo el estado para que la tabla no se rompa si viene vacío desde la API.
        return String(estado ?? 'pendiente').trim().toUpperCase();
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Guías de Remisión Electrónica</h1>
                    <p className="text-sm text-gray-500 mt-1">Gestión de traslados y envíos GRE a SUNAT</p>
                </div>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    + Nueva Guía
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destinatario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado SUNAT</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Cargando guías...</td>
                                </tr>
                            ) : guias.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No hay guías registradas. Crea la primera.</td>
                                </tr>
                            ) : (
                                guias.map((guia) => (
                                    <tr key={guia.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                            {guia.serie}-{guia.numero}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {guia.fecha_emision}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {guia.destinatario_nombre}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getBadgeColor(guia.estado)}`}>
                                                {getEstadoLabel(guia.estado)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {String(guia.estado ?? '').toLowerCase() === 'enviada' && (
                                                <button
                                                    onClick={() => handleConsultarEstado(guia.id)}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                                                >
                                                    Consultar Ticket
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDescargarPdf(guia.id)}
                                                className="text-gray-600 hover:text-gray-900"
                                            >
                                                PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Emitir Nueva Guía">
                <div className="modal-guias-shell">
                    <GuiaForm
                        onSuccess={() => {
                            setIsModalOpen(false);
                            fetchGuias();
                        }}
                        onCancel={() => setIsModalOpen(false)}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default GuiasPage;
