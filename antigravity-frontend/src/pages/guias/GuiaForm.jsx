import React, { useState } from 'react';
import { guiasApi } from '../../api/guias';
import { useToast } from '../../hooks/useToast';
import BuscadorDocumento from '../../components/ui/BuscadorDocumento';

const GuiaForm = ({ onSuccess, onCancel }) => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState(1);
    const [loading, setLoading] = useState(false);

    // Estado centralizado alineado con el payload del backend
    const [form, setForm] = useState({
        empresa_id: 1, // Por defecto o tomar del AuthContext
        ruc: '20606853182', // RUC de Maquimpower
        serie: 'T001',
        numero: '', // El backend debería auto-generarlo, pero lo enviamos por si acaso
        fecha_emision: new Date().toISOString().split('T')[0],
        fecha_traslado: new Date().toISOString().split('T')[0],
        motivo_traslado: '01',
        modalidad_traslado: '01',
        destinatario_ruc: '',
        destinatario_nombre: '',
        partida_ubigeo: '150101', // Lima por defecto
        partida_direccion: 'Av. Principal 123, Lima',
        llegada_ubigeo: '',
        llegada_direccion: '',
        peso_total: 0,
        items: []
    });

    const [itemActual, setItemActual] = useState({
        codigo: '', descripcion: '', cantidad: 1, unidad_medida: 'NIU'
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleAddItem = () => {
        if (!itemActual.descripcion || itemActual.cantidad <= 0) {
            return toast.error('La descripción y cantidad son obligatorias');
        }
        setForm(prev => ({
            ...prev,
            items: [...prev.items, itemActual]
        }));
        setItemActual({ codigo: '', descripcion: '', cantidad: 1, unidad_medida: 'NIU' });
    };

    const handleRemoveItem = (index) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones rápidas
        if (!form.destinatario_ruc || !form.llegada_direccion) {
            return toast.error('Faltan datos del destinatario o dirección de llegada');
        }
        if (form.items.length === 0) {
            return toast.error('Debe agregar al menos un ítem a la guía');
        }

        setLoading(true);
        try {
            const res = await guiasApi.crear(form);
            if (res?.success) {
                toast.success(res.message || 'Guía emitida exitosamente');
                onSuccess(); // Cierra modal y recarga tabla
            } else {
                toast.error(res?.message || 'Error al emitir la guía');
            }
        } catch (error) {
            toast.error('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
            {/* Tabs Navigation */}
            <div className="flex border-b mb-4">
                <button type="button" onClick={() => setActiveTab(1)} className={`py-2 px-4 ${activeTab === 1 ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}>1. General</button>
                <button type="button" onClick={() => setActiveTab(2)} className={`py-2 px-4 ${activeTab === 2 ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}>2. Traslado</button>
                <button type="button" onClick={() => setActiveTab(3)} className={`py-2 px-4 ${activeTab === 3 ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}>3. Bienes</button>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto pr-2 pb-4">

                {/* TAB 1: GENERAL */}
                {activeTab === 1 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Serie y Correlativo</label>
                                <div className="flex gap-2">
                                    <input type="text" name="serie" value={form.serie} onChange={handleChange} className="mt-1 block w-1/3 border-gray-300 rounded-md shadow-sm" readOnly />
                                    <input type="text" name="numero" placeholder="Auto" disabled className="mt-1 block w-2/3 border-gray-300 bg-gray-100 rounded-md shadow-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Motivo de Traslado</label>
                                <select name="motivo_traslado" value={form.motivo_traslado} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                    <option value="01">Venta</option>
                                    <option value="02">Compra</option>
                                    <option value="04">Traslado entre establecimientos</option>
                                    <option value="13">Otros</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fecha de Emisión</label>
                                <input type="date" name="fecha_emision" value={form.fecha_emision} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fecha de Traslado</label>
                                <input type="date" name="fecha_traslado" value={form.fecha_traslado} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <h3 className="font-medium text-gray-900 mb-2">Datos del Destinatario</h3>
                            {/* Integramos tu mejora Prioridad 1B */}
                            <BuscadorDocumento
                                onFound={(data) => setForm({
                                    ...form,
                                    destinatario_ruc: data.numeroDocumento,
                                    destinatario_nombre: data.razonSocial || data.nombres
                                })}
                            />
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <input type="text" placeholder="RUC/DNI" value={form.destinatario_ruc} readOnly className="block w-full border-gray-300 bg-gray-50 rounded-md shadow-sm" />
                                <input type="text" placeholder="Razón Social / Nombres" value={form.destinatario_nombre} readOnly className="block w-full border-gray-300 bg-gray-50 rounded-md shadow-sm" />
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: TRASLADO */}
                {activeTab === 2 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Modalidad de Traslado</label>
                            <select name="modalidad_traslado" value={form.modalidad_traslado} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                <option value="01">Transporte Público (Terceros)</option>
                                <option value="02">Transporte Privado (Propio)</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-2">
                            <div className="space-y-3">
                                <h3 className="font-medium text-gray-900 border-b pb-1">Punto de Partida</h3>
                                <div>
                                    <label className="block text-xs text-gray-500">Ubigeo</label>
                                    <input type="text" name="partida_ubigeo" value={form.partida_ubigeo} onChange={handleChange} maxLength="6" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500">Dirección completa</label>
                                    <input type="text" name="partida_direccion" value={form.partida_direccion} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="font-medium text-gray-900 border-b pb-1">Punto de Llegada</h3>
                                <div>
                                    <label className="block text-xs text-gray-500">Ubigeo</label>
                                    <input type="text" name="llegada_ubigeo" value={form.llegada_ubigeo} onChange={handleChange} maxLength="6" placeholder="Ej: 150101" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500">Dirección completa</label>
                                    <input type="text" name="llegada_direccion" value={form.llegada_direccion} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: BIENES */}
                {activeTab === 3 && (
                    <div className="space-y-4">
                        <div className="flex gap-4 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500">Código</label>
                                <input type="text" value={itemActual.codigo} onChange={(e) => setItemActual({ ...itemActual, codigo: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                            </div>
                            <div className="flex-[2]">
                                <label className="block text-xs text-gray-500">Descripción del Bien *</label>
                                <input type="text" value={itemActual.descripcion} onChange={(e) => setItemActual({ ...itemActual, descripcion: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                            </div>
                            <div className="w-24">
                                <label className="block text-xs text-gray-500">UND</label>
                                <select value={itemActual.unidad_medida} onChange={(e) => setItemActual({ ...itemActual, unidad_medida: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm">
                                    <option value="NIU">Unidad</option>
                                    <option value="KGM">Kilos</option>
                                    <option value="BX">Caja</option>
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="block text-xs text-gray-500">Cant *</label>
                                <input type="number" step="0.01" value={itemActual.cantidad} onChange={(e) => setItemActual({ ...itemActual, cantidad: parseFloat(e.target.value) })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                            </div>
                            <button type="button" onClick={handleAddItem} className="mb-px bg-gray-800 text-white px-4 py-2 rounded shadow hover:bg-gray-700 text-sm">
                                Agregar
                            </button>
                        </div>

                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2 text-left text-gray-600">Código</th>
                                    <th className="px-4 py-2 text-left text-gray-600">Descripción</th>
                                    <th className="px-4 py-2 text-center text-gray-600">Cant</th>
                                    <th className="px-4 py-2 text-center text-gray-600">UND</th>
                                    <th className="px-4 py-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {form.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-2 text-gray-500">{item.codigo || '-'}</td>
                                        <td className="px-4 py-2 text-gray-900 font-medium">{item.descripcion}</td>
                                        <td className="px-4 py-2 text-center">{item.cantidad}</td>
                                        <td className="px-4 py-2 text-center text-gray-500">{item.unidad_medida}</td>
                                        <td className="px-4 py-2 text-right">
                                            <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">X</button>
                                        </td>
                                    </tr>
                                ))}
                                {form.items.length === 0 && (
                                    <tr><td colSpan="5" className="text-center py-4 text-gray-400">Sin ítems agregados</td></tr>
                                )}
                            </tbody>
                        </table>

                        <div className="flex justify-end items-center mt-4">
                            <label className="text-sm font-medium text-gray-700 mr-2">Peso Bruto Total (KGM):</label>
                            <input type="number" name="peso_total" step="0.01" value={form.peso_total} onChange={handleChange} className="w-32 border-gray-300 rounded-md shadow-sm" />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Botones de Acción */}
            <div className="pt-4 border-t flex justify-end gap-3 mt-auto bg-white">
                <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                    Cancelar
                </button>
                {activeTab < 3 ? (
                    <button type="button" onClick={() => setActiveTab(activeTab + 1)} className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900">
                        Siguiente
                    </button>
                ) : (
                    <button type="submit" disabled={loading} className={`px-4 py-2 text-white rounded-md ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {loading ? 'Emitiendo...' : 'Firmar y Enviar a SUNAT'}
                    </button>
                )}
            </div>
        </form>
    );
};

export default GuiaForm;