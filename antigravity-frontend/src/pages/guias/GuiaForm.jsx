import React, { useState, useEffect } from 'react';
import { guiasApi } from '../../api/guias';
import { ventasApi } from '../../api/ventas';
import { useToast } from '../../hooks/useToast';
import BuscadorDocumento from '../../components/ui/BuscadorDocumento';
import Modal from '../../components/ui/Modal';

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
                        <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                            <div>
                                <h3 className="text-sm font-bold text-blue-800">Importación Rápida</h3>
                                <p className="text-xs text-blue-600">Puede seleccionar múltiples facturas/boletas para consolidarlas en esta guía de remisión.</p>
                            </div>
                            <button type="button" onClick={abrirImportador} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded shadow text-sm font-medium flex items-center gap-2">
                                📥 Importar Comprobantes
                            </button>
                        </div>
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
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Observaciones / Doc. Relacionados</label>
                                <input type="text" name="observaciones" value={form.observaciones} onChange={handleChange} placeholder="Ej: Doc. Asociados: F001-00123" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
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
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold">Documento</label>
                                    <input type="text" placeholder="RUC/DNI" value={form.destinatario_ruc} readOnly className="block w-full border-gray-300 bg-gray-50 rounded-md shadow-sm text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold">
                                        {form.destinatario_ruc?.length === 8 ? 'Nombres y Apellidos' : 'Razón Social'}
                                    </label>
                                    <input type="text" placeholder="Nombre completo" value={form.destinatario_nombre} readOnly className="block w-full border-gray-300 bg-gray-50 rounded-md shadow-sm text-sm" />
                                </div>
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
                                <div className="pt-2">
                                    <label className="block text-xs font-bold text-blue-700 uppercase">Agencia / Destino (Ej: Shalom)</label>
                                    <input 
                                        type="text" 
                                        name="agencia_destino" 
                                        value={form.agencia_destino} 
                                        onChange={handleChange} 
                                        placeholder="Ingrese agencia de transporte"
                                        className="mt-1 block w-full border-blue-300 bg-blue-50 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                                    />
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
                        {loading ? 'Registrando...' : 'Registrar Guía'}
                    </button>
                )}
            </div>

            {/* Modal de Importación Multiples Ventas */}
            <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Importar Comprobantes de Venta">
                <div className="p-4 w-[600px] max-w-full">
                    <p className="text-sm text-gray-600 mb-4">Seleccione una o más ventas para consolidar sus productos en esta guía de remisión.</p>
                    
                    <div className="h-64 overflow-y-auto border rounded-lg bg-gray-50 p-2 space-y-2">
                        {loadingVentas ? (
                            <div className="text-center py-4 text-gray-500">Cargando comprobantes...</div>
                        ) : ventasDisponibles.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">No hay comprobantes recientes pendientes.</div>
                        ) : (
                            ventasDisponibles.map(v => {
                                const isSelected = ventasSeleccionadas.find(sel => sel.id === v.id);
                                return (
                                    <label key={v.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 border-blue-400' : 'bg-white hover:bg-gray-100 border-gray-200'}`}>
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 text-blue-600 rounded border-gray-300"
                                            checked={!!isSelected}
                                            onChange={() => toggleSeleccionVenta(v)}
                                        />
                                        <div className="ml-3 flex-1">
                                            <div className="font-bold text-gray-800">{v.numero_completo} <span className="text-xs font-normal text-gray-500 bg-gray-200 px-1.5 rounded">{v.fecha_emision}</span></div>
                                            <div className="text-sm text-gray-600 truncate">{v.cliente_nombre}</div>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-blue-800">S/ {parseFloat(v.importe_total).toFixed(2)}</span>
                                        </div>
                                    </label>
                                );
                            })
                        )}
                    </div>

                    <div className="mt-4 flex justify-between items-center pt-3 border-t">
                        <span className="text-sm font-medium text-gray-600">
                            Seleccionados: <span className="font-bold text-blue-600">{ventasSeleccionadas.length}</span> comprobantes
                        </span>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50">Cancelar</button>
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