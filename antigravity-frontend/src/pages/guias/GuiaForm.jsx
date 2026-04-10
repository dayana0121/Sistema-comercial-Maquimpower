import React, { useState, useEffect } from 'react';
import { guiasApi } from '../../api/guias';
import { ventasApi } from '../../api/ventas';
import { useToast } from '../../hooks/useToast';
import BuscadorDocumento from '../../components/ui/BuscadorDocumento';
import Modal from '../../components/ui/Modal';
import '../../styles/guias.css';

const GuiaForm = ({ onSuccess, onCancel, preData = null }) => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState(1);
    const [loading, setLoading] = useState(false);

    // Estados para la importación
    const [showImportModal, setShowImportModal] = useState(false);
    const [loadingVentas, setLoadingVentas] = useState(false);
    const [ventasDisponibles, setVentasDisponibles] = useState([]);
    const [ventasSeleccionadas, setVentasSeleccionadas] = useState([]);

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
        llegada_ubigeo: preData?.cliente_ubigeo || '',
        llegada_direccion: preData?.direccion || preData?.cliente_direccion || '',
        peso_total: 0,
        agencia_destino: '',
        destinatario_ruc: preData?.cliente_documento || preData?.destinatario_ruc || '',
        destinatario_nombre: preData?.cliente_nombre || preData?.destinatario_nombre || '',
        items: (preData?.detalles || preData?.items || []).map(d => ({
            codigo: d.codigo_producto || d.codigo || '',
            descripcion: d.descripcion || '',
            cantidad: d.cantidad || 1,
            unidad_medida: d.unidad_medida || 'NIU'
        })),
        observaciones: ''
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

    // ==========================================
    // LÓGICA DE IMPORTACIÓN MULTIPLE
    // ==========================================
    const abrirImportador = async () => {
        setShowImportModal(true);
        setLoadingVentas(true);
        try {
            const res = await ventasApi.listar({ limit: 50 }); // Últimas 50
            if (res?.success) {
                const arr = Array.isArray(res.data) ? res.data : (res.data?.ventas || []);
                setVentasDisponibles(arr);
            }
        } catch (e) {
            toast.error('Error al cargar ventas recientes');
        } finally {
            setLoadingVentas(false);
        }
    };

    const toggleSeleccionVenta = (venta) => {
        if (ventasSeleccionadas.find(v => v.id === venta.id)) {
            setVentasSeleccionadas(ventasSeleccionadas.filter(v => v.id !== venta.id));
        } else {
            setVentasSeleccionadas([...ventasSeleccionadas, venta]);
        }
    };

    const confirmarImportacion = async () => {
        if (ventasSeleccionadas.length === 0) {
            return toast.error('Debe seleccionar al menos una venta');
        }

        setLoading(true);
        try {
            let nuevosItems = [];
            let documentosAsociados = [];

            // Obtener detalles de cada venta seleccionada
            for (const venta of ventasSeleccionadas) {
                const res = await ventasApi.obtener(venta.id);
                if (res?.success && res.data?.detalles) {
                    const dets = res.data.detalles.map(d => ({
                        codigo: d.codigo_producto || '000',
                        descripcion: d.descripcion,
                        cantidad: d.cantidad,
                        unidad_medida: d.unidad_medida || 'NIU'
                    }));
                    nuevosItems = [...nuevosItems, ...dets];
                    documentosAsociados.push(res.data.numero_completo);
                }
            }

            // Consolidar ítems (agrupar por código/descripción) o simplemente appends
            // Aquí hacemos append directo para no perder detalles si hay precios distintos
            // Pero en Guía solo importa código, descripción y cantidad. Se agruparán si son exactos.
            const agrupados = [];
            nuevosItems.forEach(item => {
                const existe = agrupados.find(a => a.descripcion === item.descripcion && a.codigo === item.codigo && a.unidad_medida === item.unidad_medida);
                if (existe) {
                    existe.cantidad += parseFloat(item.cantidad);
                } else {
                    agrupados.push({ ...item, cantidad: parseFloat(item.cantidad) });
                }
            });

            // Usamos datos del cliente de la primera venta para auto-completar destinatorio
            const primera = ventasSeleccionadas[0];
            const nuevaObs = `Doc. Asociados: ${documentosAsociados.join(', ')}`;

            setForm(prev => ({
                ...prev,
                destinatario_ruc: primera.cliente_documento || prev.destinatario_ruc,
                destinatario_nombre: primera.cliente_nombre || prev.destinatario_nombre,
                items: [...prev.items, ...agrupados],
                observaciones: prev.observaciones ? `${prev.observaciones}\n${nuevaObs}` : nuevaObs
            }));

            toast.success('Comprobantes importados y agrupados correctamente');
            setShowImportModal(false);
            setVentasSeleccionadas([]);
            setActiveTab(3); // Saltar a la vista de bienes
        } catch (e) {
            toast.error('Error al importar detalles de las ventas');
        } finally {
            setLoading(false);
        }
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
        
        <form onSubmit={handleSubmit} className="modal-guias-form flex flex-col h-full">
            {/* Tabs Navigation */}
            <div className="modal-guias-tabs flex items-center border-b border-slate-200 mb-6 sticky top-0 bg-white z-10 w-full overflow-x-auto">
                <button type="button" onClick={() => setActiveTab(1)} className={`modal-guias-tab py-3 px-6 text-sm font-bold flex-1 md:flex-none border-b-2 transition-colors ${activeTab === 1 ? 'is-active border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>1. General</button>
                <button type="button" onClick={() => setActiveTab(2)} className={`modal-guias-tab py-3 px-6 text-sm font-bold flex-1 md:flex-none border-b-2 transition-colors ${activeTab === 2 ? 'is-active border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>2. Traslado</button>
                <button type="button" onClick={() => setActiveTab(3)} className={`modal-guias-tab py-3 px-6 text-sm font-bold flex-1 md:flex-none border-b-2 transition-colors ${activeTab === 3 ? 'is-active border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>3. Bienes</button>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto pr-2 pb-4">

                {/* TAB 1: GENERAL */}
                {activeTab === 1 && (
                    <div className="modal-guias-tab-panel space-y-6">
                        <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                            <div>
                                <h3 className="text-sm font-bold text-blue-800">Importación Rápida</h3>
                                <p className="text-xs text-blue-600">Puede seleccionar múltiples facturas/boletas para consolidarlas en esta guía de remisión.</p>
                            </div>
                            <button type="button" onClick={abrirImportador} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded shadow text-sm font-medium flex items-center gap-2">
                                📥 Importar Comprobantes
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group-custom">
                                <label className="form-label-custom">Serie y Correlativo</label>
                                <div className="flex gap-3">
                                    <input type="text" name="serie" value={form.serie} onChange={handleChange} className="form-input-custom w-[100px] bg-slate-50" readOnly />
                                </div>
                            </div>
                            <div className="form-group-custom">
                                <label className="form-label-custom">Motivo de Traslado</label>
                                <select name="motivo_traslado" value={form.motivo_traslado} onChange={handleChange} className="form-input-custom">
                                    <option value="01">Venta</option>
                                    <option value="02">Compra</option>
                                    <option value="04">Traslado entre establecimientos</option>
                                    <option value="13">Otros</option>
                                </select>
                            </div>
                            <div className="form-group-custom">
                                <label className="form-label-custom">Fecha de Emisión</label>
                                <input type="date" name="fecha_emision" value={form.fecha_emision} onChange={handleChange} className="form-input-custom" />
                            </div>
                            <div className="form-group-custom">
                                <label className="form-label-custom">Fecha de Traslado</label>
                                <input type="date" name="fecha_traslado" value={form.fecha_traslado} onChange={handleChange} className="form-input-custom" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Observaciones / Doc. Relacionados</label>
                                <input type="text" name="observaciones" value={form.observaciones} onChange={handleChange} placeholder="Ej: Doc. Asociados: F001-00123" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                            <h3 className="form-label-custom mb-3">Datos del Destinatario</h3>
                            <BuscadorDocumento
                                onFound={(data) => setForm({
                                    ...form,
                                    destinatario_ruc: data.numeroDocumento,
                                    destinatario_nombre: data.razonSocial || data.nombres
                                })}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <input type="text" placeholder="RUC/DNI" value={form.destinatario_ruc} readOnly className="form-input-custom bg-slate-50" />
                                <input type="text" placeholder="Razón Social / Nombres" value={form.destinatario_nombre} readOnly className="form-input-custom bg-slate-50" />
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: TRASLADO */}
                {activeTab === 2 && (
                    <div className="modal-guias-tab-panel space-y-6 mt-4">
                        <div className="form-group-custom">
                            <label className="form-label-custom">Modalidad de Traslado</label>
                            <select name="modalidad_traslado" value={form.modalidad_traslado} onChange={handleChange} className="form-input-custom">
                                <option value="01">Transporte Público (Terceros)</option>
                                <option value="02">Transporte Privado (Propio)</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div className="space-y-4">
                                <h3 className="form-label-custom border-b border-slate-100 pb-2">Punto de Partida</h3>
                                <div className="form-group-custom">
                                    <label className="form-label-custom">Ubigeo</label>
                                    <input type="text" name="partida_ubigeo" value={form.partida_ubigeo} onChange={handleChange} maxLength="6" className="form-input-custom" />
                                </div>
                                <div className="form-group-custom">
                                    <label className="form-label-custom">Dirección completa</label>
                                    <input type="text" name="partida_direccion" value={form.partida_direccion} onChange={handleChange} className="form-input-custom" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="form-label-custom border-b border-slate-100 pb-2">Punto de Llegada</h3>
                                <div className="form-group-custom">
                                    <label className="form-label-custom">Ubigeo</label>
                                    <input type="text" name="llegada_ubigeo" value={form.llegada_ubigeo} onChange={handleChange} maxLength="6" placeholder="Ej: 150101" className="form-input-custom" />
                                </div>
                                <div className="form-group-custom">
                                    <label className="form-label-custom">Dirección completa</label>
                                    <input type="text" name="llegada_direccion" value={form.llegada_direccion} onChange={handleChange} className="form-input-custom" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: BIENES */}
                {activeTab === 3 && (
                    <div className="modal-guias-tab-panel space-y-4">
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
            <div className="form-actions-custom border-t border-slate-100 bg-white sticky bottom-0 z-10">
                <button type="button" onClick={onCancel} className="btn-cancel-custom">
                    Cancelar
                </button>
                {activeTab < 3 ? (
                    <button type="button" onClick={() => setActiveTab(activeTab + 1)} className="btn-submit-custom bg-slate-800 hover:bg-slate-900 border-none">
                        Siguiente
                    </button>
                ) : (
                    <button type="submit" disabled={loading} className={`btn-submit-custom ${loading ? 'opacity-50' : ''}`}>
                        {loading ? 'Emitiendo...' : 'Firmar y Enviar a SUNAT'}
                    </button>
                )}
            </div>

            {/* Modal de Importación Multiples Ventas */}
            <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Importar Comprobantes de Venta">
                <div className="p-4 w-[600px] max-w-full">
                    <p className="texto text-sm text-gray-600 mb-4">Seleccione una o más ventas para consolidar sus productos en esta guía de remisión.</p>

                    <div className="cuadro h-64 overflow-y-auto border rounded-lg bg-gray-50 p-2 space-y-2">
                        {loadingVentas ? (
                            <div className="text-center py-4 text-gray-500">Cargando comprobantes...</div>
                        ) : ventasDisponibles.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">No hay comprobantes recientes pendientes.</div>
                        ) : (
                            ventasDisponibles.map(v => {
                                const isSelected = ventasSeleccionadas.find(sel => sel.id === v.id);
                                return (
                                    <label key={v.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'btn-primary border-blue-400 text-white' : 'bg-white hover:bg-gray-100 border-gray-200'}`}>
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 text-blue-600 rounded border-gray-300"
                                            checked={!!isSelected}
                                            onChange={() => toggleSeleccionVenta(v)}
                                        />
                                        <div className="ml-3 flex-1">
                                            {/* Cambiamos text-gray-800 por blanco si está seleccionado */}
                                            <div className={`font-bold ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                                                {v.numero_completo}
                                                {/* El badge de la fecha también debería cambiar para que no se pierda */}
                                                <span className={`text-xs font-normal ml-1 px-1.5 rounded ${isSelected ? 'bg-gray-200 text-gray-500' : 'bg-gray-200 text-gray-500'}`}>
                                                    {v.fecha_emision}
                                                </span>
                                            </div>

                                            {/* Cambiamos text-gray-600 por una variante clara si está seleccionado */}
                                            <div className={`text-sm truncate ${isSelected ? 'text-blue-100' : 'text-gray-600'}`}>
                                                {v.cliente_nombre}
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className={`font-bold ${isSelected ? 'text-white' : 'text-blue-800'}`}>
                                                S/ {parseFloat(v.importe_total).toFixed(2)}
                                            </span>
                                        </div>
                                    </label>
                                );
                            })
                        )}
                    </div>

                    <div className="mt-4 flex justify-between items-center pt-3 border-t">
                        <span className="text-sm font-medium text-gray-600">
                            Seleccionados: 
                            <br />
                            <span className="font-bold text-blue-600">{ventasSeleccionadas.length}</span> comprobantes
                        </span>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 border rounded-md text-white cancelar">Cancelar</button>
                            <button type="button" onClick={confirmarImportacion} disabled={loading || ventasSeleccionadas.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                                {loading ? 'Importando...' : 'Confirmar Importación'}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </form>
    );
};

export default GuiaForm;
