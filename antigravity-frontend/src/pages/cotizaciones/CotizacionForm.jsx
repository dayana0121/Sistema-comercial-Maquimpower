import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../api/client';
import { cotizacionesApi } from '../../api/cotizaciones';
import { vendedoresApi } from '../../api/vendedores';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import BuscadorDocumento from '../../components/ui/BuscadorDocumento';
import "../../styles/cotizaciones.css"

const TIPO_AFECTACION = [
    { code: '10', name: 'Op. Gravadas' },
    { code: '11', name: 'Op. Exoneradas' },
    { code: '12', name: 'Gratuito' },
];

const CotizacionForm = ({ isOpen, onClose, onSuccess, cotizacion }) => {
    const toast = useToast();
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        cliente_id: '',
        vendedor_id: '',
        fecha_vigencia: '',
        moneda: 'PEN',
        numero_whatsapp: '',
        observaciones: '',
    });

    const [searchCliente, setSearchCliente] = useState('');
    const [clientesOptions, setClientesOptions] = useState([]);
    const [selectedCliente, setSelectedCliente] = useState(null);

    const [searchProducto, setSearchProducto] = useState('');
    const [todos_productos, setTodosProductos] = useState([]);
    const [productosOptions, setProductosOptions] = useState([]);
    const [detalles, setDetalles] = useState([]);

    const [vendedores, setVendedores] = useState([]);

    useEffect(() => {
        if (!isOpen) return;

        const cargar = async () => {
            try {
                const [resVend, resProd] = await Promise.all([
                    vendedoresApi.listar(),
                    apiClient.get('/productos')
                ]);

                if (resVend.success) setVendedores(resVend.data.vendedores || []);
                if (resProd.success) {
                    setTodosProductos(resProd.data || []);
                    setProductosOptions(resProd.data || []);
                }
            } catch (err) {
                console.error('Error:', err);
            }
        };

        cargar();
    }, [isOpen]);

    // Llenar datos si es edición
    useEffect(() => {
        if (cotizacion && isOpen) {
            setForm({
                cliente_id: cotizacion.cliente_id || '',
                vendedor_id: cotizacion.vendedor_id || '',
                fecha_vigencia: cotizacion.fecha_vigencia || '',
                moneda: cotizacion.moneda || 'PEN',
                numero_whatsapp: cotizacion.numero_whatsapp || '',
                observaciones: cotizacion.observaciones || '',
            });
            setSelectedCliente(
                cotizacion.cliente || (
                    cotizacion.cliente_nombre
                        ? { id: cotizacion.cliente_id, razon_social: cotizacion.cliente_nombre }
                        : null
                )
            );
            setDetalles(cotizacion.detalles || []);
        } else {
            setForm({
                cliente_id: '',
                vendedor_id: '',
                fecha_vigencia: '',
                moneda: 'PEN',
                numero_whatsapp: '',
                observaciones: '',
            });
            setSelectedCliente(null);
            setDetalles([]);
        }
    }, [cotizacion, isOpen]);

    // Buscar clientes
    useEffect(() => {
        if (searchCliente.trim().length < 3) return setClientesOptions([]);
        const timer = setTimeout(async () => {
            try {
                const res = await apiClient.get(`/clientes?search=${encodeURIComponent(searchCliente)}`);
                if (res.success) setClientesOptions(res.data || []);
            } catch (err) { console.error(err); }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchCliente]);

    // Buscar productos
    useEffect(() => {
        if (searchProducto.trim() === '') {
            setProductosOptions(todos_productos);
        } else {
            const filtered = todos_productos.filter(p =>
                p.descripcion.toLowerCase().includes(searchProducto.toLowerCase()) ||
                p.codigo_interno?.toLowerCase().includes(searchProducto.toLowerCase())
            );
            setProductosOptions(filtered);
        }
    }, [searchProducto, todos_productos]);

    const agregarProducto = (producto) => {
        const existe = detalles.find(d => d.producto_id === producto.id);
        if (existe) {
            actualizarLinea(existe.producto_id, 'cantidad', existe.cantidad + 1);
        } else {
            const precioVenta = parseFloat(producto.precio_venta || producto.precio_unitario_con_igv);
            setDetalles([...detalles, {
                producto_id: producto.id,
                codigo_producto: producto.codigo_interno || 'S/C',
                descripcion: producto.descripcion,
                unidad_medida: producto.unidad_medida || 'NIU',
                cantidad: 1,
                precio_unitario: precioVenta,
                descuento_unitario: 0,
                tipo_afectacion_igv: '10',
                indicacion: '' // '', 'indispensable', 'remplazable', 'prescindible'
            }]);
            toast.success(`${producto.descripcion} agregado`);
        }
    };

    const actualizarLinea = (id, campo, valor) => {
        setDetalles(detalles.map(det =>
            det.producto_id === id ? { ...det, [campo]: campo === 'indicacion' ? valor : Number(valor) || 0 } : det
        ));
    };

    const totales = useMemo(() => {
        const subtotal = detalles.reduce((acc, det) => {
            const subtotalLinea = (det.cantidad * det.precio_unitario) - (det.descuento_unitario || 0);
            return acc + subtotalLinea;
        }, 0);
        const gravada = subtotal / 1.18;
        const igv = subtotal - gravada;
        return { subtotal, gravada, igv, total: subtotal };
    }, [detalles]);

    const handleGuardar = async () => {
        if (!form.cliente_id) return toast.error('Selecciona un cliente');
        if (detalles.length === 0) return toast.error('Agrega al menos un producto');

        setLoading(true);
        const payload = {
            cliente_id: form.cliente_id,
            vendedor_id: form.vendedor_id || null,
            fecha_vigencia: form.fecha_vigencia,
            moneda: form.moneda,
            numero_whatsapp: form.numero_whatsapp,
            observaciones: form.observaciones,
            op_gravada: totales.gravada.toFixed(2),
            igv: totales.igv.toFixed(2),
            total: totales.total.toFixed(2),
            detalles: detalles.map(det => ({
                producto_id: det.producto_id,
                codigo_producto: det.codigo_producto,
                descripcion: det.descripcion,
                unidad_medida: det.unidad_medida,
                cantidad: parseFloat(det.cantidad),
                valor_unitario: (det.precio_unitario / 1.18).toFixed(4),
                precio_unitario: parseFloat(det.precio_unitario),
                descuento_unitario: parseFloat(det.descuento_unitario || 0),
                tipo_afectacion_igv: det.tipo_afectacion_igv || '10',
                indicacion: det.indicacion || ''
            }))
        };

        try {
            const res = cotizacion
                ? await cotizacionesApi.actualizar(cotizacion.id, payload)
                : await cotizacionesApi.crear(payload);

            if (res.success) {
                toast.success(cotizacion ? 'Cotización actualizada' : 'Cotización creada');
                onSuccess();
            } else {
                toast.error(res.message || 'Error');
            }
        } catch (error) {
            // Yo muestro el mensaje real del backend para diagnosticar rapido cualquier fallo futuro.
            toast.error(error?.message || 'Error al guardar la cotización');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={cotizacion ? 'Editar Cotización' : 'Nueva Cotización'} size="6xl" bgClass="bg-[#FFF9F2]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* COLUMNA 1: CLIENTE Y DATOS */}
                <div className="space-y-5 lg:border-r border-slate-200 lg:pr-8">
                    <h3 className="text-xl font-bold text-slate-800">Datos</h3>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold text-slate-800">Buscar en SUNAT/RENIEC</label>
                        <div className="flex gap-2">
                            <input
                                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm shadow-sm outline-none w-full"
                                placeholder="8 u 11 dígitos"
                                value={searchCliente}
                                onChange={e => setSearchCliente(e.target.value)}
                            />
                            <button
                                type="button"
                                className="hover:bg-[#d5731d] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
                                Buscar
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold text-slate-800">Buscar Cliente</label>
                        <input
                            className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm shadow-sm outline-none"
                            placeholder="RUC o Nombre..."
                            value={searchCliente}
                            onChange={e => setSearchCliente(e.target.value)}
                        />
                        {clientesOptions.length > 0 && (
                            <div className="border rounded-md max-h-40 overflow-y-auto">
                                {clientesOptions.map(cli => (
                                    <div
                                        key={cli.id}
                                        className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0 text-xs"
                                        onClick={() => {
                                            setSelectedCliente(cli);
                                            setForm(prev => ({ ...prev, cliente_id: cli.id }));
                                            setClientesOptions([]);
                                            setSearchCliente('');
                                        }}
                                    >
                                        <p className="font-semibold">{cli.razon_social}</p>
                                        <p className="text-gray-500">{cli.numero_documento}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedCliente && (
                        <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-xs">
                            <p className="font-bold text-green-900">✓ {selectedCliente.razon_social}</p>
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold text-slate-800">Vendedor</label>
                        <select
                            className="bg-white px-3 py-2.5 border border-slate-200 rounded-lg text-sm shadow-sm outline-none"
                            value={form.vendedor_id}
                            onChange={e => setForm({ ...form, vendedor_id: e.target.value })}
                        >
                            <option value="">-- Seleccionar --</option>
                            {vendedores.map(v => (
                                <option key={v.id} value={v.id}>{v.nombre} {v.apellido}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold text-slate-800">Fecha Vigencia</label>
                        <input
                            type="date"
                            className="bg-white px-3 py-2.5 border border-slate-200 rounded-lg text-sm shadow-sm outline-none text-slate-500"
                            value={form.fecha_vigencia}
                            onChange={e => setForm({ ...form, fecha_vigencia: e.target.value })}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold text-slate-800">WhatsApp Cliente</label>
                        <input
                            className="bg-white px-3 py-2.5 border border-slate-200 rounded-lg text-sm shadow-sm outline-none"
                            placeholder="+51 900000000"
                            value={form.numero_whatsapp}
                            onChange={e => setForm({ ...form, numero_whatsapp: e.target.value })}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold text-slate-800">Observaciones</label>
                        <div className="relative">
                            <select
                                className="w-full bg-white px-3 py-2.5 border border-slate-200 rounded-lg text-sm shadow-sm outline-none appearance-none text-slate-500"
                                value={form.observaciones}
                                onChange={e => setForm({ ...form, observaciones: e.target.value })}
                            >
                                <option value="">Notas...</option>
                                <option value="Aprobado">Aprobado</option>
                                <option value="Crédito">Sujeto a crédito</option>
                            </select>
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMNA 2: PRODUCTOS Y CARRITO */}
                <div className="space-y-5 lg:border-r border-slate-200 lg:pr-8">
                    <h3 className="text-xl font-bold text-slate-800">Productos</h3>

                    <input
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm shadow-sm outline-none"
                        placeholder="Buscar producto..."
                        value={searchProducto}
                        onChange={e => setSearchProducto(e.target.value)}
                    />

                    <div className="border rounded-lg p-3 bg-gray-50 max-h-167 overflow-y-auto">
                        <div className="grid grid-cols-1 gap-2">
                            {productosOptions.map(p => {
                                // CAMBIO AQUÍ: Verificamos si el ID del producto está en la lista de detalles
                                const isSelected = detalles.some(det => det.producto_id === p.id);

                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            agregarProducto(p);
                                            // Ya no necesitas el setSelectedProductoId(p.id)
                                        }}
                                        className={`text-left p-2 border border-gray-200 rounded transition-all text-xs flex flex-col gap-1 ${isSelected ? 'is-selected' : 'hover:bg-blue-50'}`}
                                    >
                                        <p className="font-semibold">{p.descripcion}</p>
                                        <p className="">S/ {parseFloat(p.precio_venta).toFixed(2)}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* COLUMNA 3: TOTALES Y FINALIZAR */}
                <div className="space-y-3 flex flex-col items-stretch">
                    <h3 className="text-xl font-bold text-slate-800">Resumen</h3>

                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[160px]">
                        <div className="bg-[#f8f9fa] border-b border-slate-200 p-2.5 text-xs font-bold text-slate-800 grid grid-cols-4 gap-1">
                            <div>Producto</div>
                            <div className="text-center">Cant.</div>
                            <div className="text-right">Precio</div>
                            <div className="text-right">Total</div>
                        </div>
                        <div className="max-h-96 overflow-y-auto bg-white">
                            {detalles.length === 0 ? (
                                <div className="p-10 flex items-center justify-center text-slate-400 text-[15px]">Sin productos</div>
                            ) : (
                                detalles.map((det, idx) => (
                                    <div key={idx} className="border-t p-2 text-xs space-y-1">
                                        <div className="font-semibold text-gray-800 flex justify-between">
                                            <span>{det.descripcion}</span>
                                            <button
                                                onClick={() => setDetalles(detalles.filter((_, i) => i !== idx))}
                                                className="text-red-500 font-bold"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-4 gap-1">
                                            <input
                                                type="number"
                                                min="1"
                                                value={det.cantidad}
                                                onChange={e => actualizarLinea(det.producto_id, 'cantidad', e.target.value)}
                                                className="border rounded px-1 py-1 text-center"
                                            />
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={det.descuento_unitario}
                                                onChange={e => actualizarLinea(det.producto_id, 'descuento_unitario', e.target.value)}
                                                className="border rounded px-1 py-1 text-center text-red-600"
                                                title="Descuento"
                                            />
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={det.precio_unitario}
                                                onChange={e => actualizarLinea(det.producto_id, 'precio_unitario', e.target.value)}
                                                className="border rounded px-1 py-1 text-right font-semibold"
                                            />
                                            <div className="text-right font-bold">
                                                S/ {((det.cantidad * det.precio_unitario) - det.descuento_unitario).toFixed(2)}
                                            </div>
                                        </div>

                                        {/* Indicaciones: prioridad/importance */}
                                        <div className="flex items-center gap-2 pt-4">
                                            <label className="text-xs font-semibold">Indicacion:</label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    aria-label={`set-indispensable-${det.producto_id}`}
                                                    onClick={() => actualizarLinea(det.producto_id, 'indicacion', 'indispensable')}
                                                    className={`w-6 h-6 rounded-full border ${det.indicacion === 'indispensable' ? 'ring-2 ring-green-400' : ''}`}
                                                    style={{ backgroundColor: det.indicacion === 'indispensable' ? '#16a34a' : '#e6f4ea' }}
                                                />
                                                <button
                                                    aria-label={`set-remplazable-${det.producto_id}`}
                                                    onClick={() => actualizarLinea(det.producto_id, 'indicacion', 'remplazable')}
                                                    className={`w-6 h-6 rounded-full border ${det.indicacion === 'remplazable' ? 'ring-2 ring-yellow-300' : ''}`}
                                                    style={{ backgroundColor: det.indicacion === 'remplazable' ? '#f59e0b' : '#fff7ed' }}
                                                />
                                                <button
                                                    aria-label={`set-prescindible-${det.producto_id}`}
                                                    onClick={() => actualizarLinea(det.producto_id, 'indicacion', 'prescindible')}
                                                    className={`w-6 h-6 rounded-full border ${det.indicacion === 'prescindible' ? 'ring-2 ring-gray-400' : ''}`}
                                                    style={{ backgroundColor: det.indicacion === 'prescindible' ? '#9ca3af' : '#f3f4f6' }}
                                                />
                                                <button
                                                    aria-label={`clear-indicacion-${det.producto_id}`}
                                                    onClick={() => actualizarLinea(det.producto_id, 'indicacion', '')}
                                                    className="text-xs px-2 py-1 border rounded text-gray-600"
                                                >
                                                    Clear
                                                </button>
                                                <div className="text-xs text-gray-600 ml-2">{det.indicacion || 'Sin marca'}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-[#1b2532] text-white p-5 rounded-lg space-y-4 shadow-xl">
                        <div className="flex justify-between text-[15px] border-b border-slate-600 pb-3">
                            <span className="text-slate-300">Subtotal:</span>
                            <span className="text-slate-200">S/ {totales.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[15px] border-b border-slate-600 pb-3">
                            <span className="text-slate-300">IGV (18%):</span>
                            <span className="text-slate-200">S/ {totales.igv.toFixed(2)}</span>
                        </div>
                        <div className="pt-2 flex justify-between font-bold text-[22px]">
                            <span className="text-white">TOTAL:</span>
                            <span className="text-[#ee8425]">S/ {totales.total.toFixed(2)}</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="w-full py-3.5 bg-[#2c3338] text-white hover:bg-[#1a1f23] rounded-lg font-bold transition-colors mt-2"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        className={`w-full py-3.5 bg-[#5ca335] hover:bg-[#4d8b2d] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors ${loading ? 'opacity-50' : ''}`}
                        onClick={handleGuardar}
                        disabled={loading}
                    >
                        {cotizacion ? '✓ ACTUALIZAR' : '✓ CREAR COTIZACIÓN'}
                    </button>
                </div>
            </div>

            {/* Ignoramos el footer genérico puesto por error por el diseñador en el otro formulario, 
                ya incluimos los botones correctos arriba. */}
        </Modal>
    );
};

export default CotizacionForm;
