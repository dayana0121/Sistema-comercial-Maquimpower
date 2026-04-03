import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../api/client';
import { ventasApi } from '../../api/ventas';
import { vendedoresApi } from '../../api/vendedores';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import BuscadorDocumento from '../../components/ui/BuscadorDocumento';

// Opciones de afectación (solo 3)
const TIPO_AFECTACION = [
    { code: '10', name: 'Op. Gravadas' },
    { code: '11', name: 'Op. Exoneradas' },
    { code: '12', name: 'Gratuito' },
];

// Métodos de pago
const METODOS_PAGO = [
    { code: 'EFECTIVO', name: 'Efectivo', icon: '💵' },
    { code: 'TARJETA', name: 'Tarjeta de Crédito', icon: '💳' },
    { code: 'YAPE', name: 'Yape', icon: '📱' },
    { code: 'TRANSFERENCIA', name: 'Transferencia Bancaria', icon: '🏦' },
    { code: 'MIXTO', name: 'Mixto', icon: '🔀' },
];

const CAT54 = [
    { code: '022', name: 'Otros servicios empresariales', percent: 10 },
    { code: '037', name: 'Arrendamiento de bienes', percent: 10 },
    { code: '001', name: 'Azúcar y melaza de caña', percent: 10 },
];

const VentaForm = ({ isOpen, onClose, onSuccess }) => {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [showCotizacionesModal, setShowCotizacionesModal] = useState(false);
    const [cotizaciones, setCotizaciones] = useState([]);

    const [form, setForm] = useState({
        cliente_id: '',
        vendedor_id: '',
        tipo_comprobante: '01',
        serie: 'F001',
        condicion_pago: 'CONTADO',
        moneda: 'PEN',
        observacion: '',
        metodo_pago: 'EFECTIVO',
        detraccion_codigo: '',
        detraccion_porcentaje: 0,
        detraccion_monto: 0,
        detraccion_cuenta: '',
        detraccion_medio_pago: '001',
    });

    const [searchCliente, setSearchCliente] = useState('');
    const [clientesOptions, setClientesOptions] = useState([]);
    const [selectedCliente, setSelectedCliente] = useState(null);

    const [searchProducto, setSearchProducto] = useState('');
    const [todos_productos, setTodosProductos] = useState([]);
    const [productosOptions, setProductosOptions] = useState([]);
    const [detalles, setDetalles] = useState([]);

    const [vendedores, setVendedores] = useState([]);

    // Cargar vendedores y productos al montar
    useEffect(() => {
        const cargar = async () => {
            try {
                const [resVend, resProd] = await Promise.all([
                    vendedoresApi.listar(),
                    apiClient.get('/productos')
                ]);

                if (resVend.success) {
                    setVendedores(resVend.data.vendedores || []);
                }
                if (resProd.success) {
                    setTodosProductos(resProd.data || []);
                    setProductosOptions(resProd.data || []);
                }
            } catch (err) {
                console.error('Error cargando datos:', err);
            }
        };
        if (isOpen) cargar();
    }, [isOpen]);

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
        if (searchProducto.trim().length === 0) {
            setProductosOptions(todos_productos);
        } else {
            const filtered = todos_productos.filter(p =>
                p.descripcion.toLowerCase().includes(searchProducto.toLowerCase()) ||
                p.codigo_interno?.toLowerCase().includes(searchProducto.toLowerCase())
            );
            setProductosOptions(filtered);
        }
    }, [searchProducto, todos_productos]);

    // Agregar producto al carrito
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
                tipo_afectacion_igv: '10'
            }]);
            toast.success(`${producto.descripcion} agregado`);
        }
    };

    const actualizarLinea = (id, campo, valor) => {
        setDetalles(detalles.map(det =>
            det.producto_id === id ? { ...det, [campo]: Number(valor) || 0 } : det
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

    // Cargar cotizaciones
    const cargarCotizaciones = async () => {
        try {
            const res = await apiClient.get('/cotizaciones');
            if (res.success) {
                setCotizaciones(res.data || []);
                setShowCotizacionesModal(true);
            }
        } catch (err) {
            toast.error('Error cargando cotizaciones');
        }
    };

    // Importar cotización
    const importarCotizacion = async (cotizacionId) => {
        try {
            const res = await apiClient.get(`/cotizaciones/${cotizacionId}`);
            if (res.success) {
                const cot = res.data;
                setSelectedCliente(cot.cliente);
                setForm(prev => ({
                    ...prev,
                    cliente_id: cot.cliente_id,
                }));
                setDetalles(cot.detalles.map(d => ({
                    producto_id: d.producto_id,
                    codigo_producto: d.codigo_producto || 'S/C',
                    descripcion: d.descripcion,
                    unidad_medida: d.unidad_medida || 'NIU',
                    cantidad: d.cantidad,
                    precio_unitario: d.precio_unitario,
                    descuento_unitario: d.descuento_unitario || 0,
                    tipo_afectacion_igv: d.tipo_afectacion_igv || '10',
                    indicacion: d.indicacion || '' // preserve indicacion in frontend state
                })));
                setShowCotizacionesModal(false);
                toast.success('Cotización importada');
            }
        } catch (err) {
            toast.error('Error importando cotización');
        }
    };

    const handleGuardar = async () => {
        if (!form.cliente_id) return toast.error('Selecciona un cliente');
        if (detalles.length === 0) return toast.error('El carrito está vacío');

        setLoading(true);
        const payload = {
            cliente_id: form.cliente_id,
            vendedor_id: form.vendedor_id || null,
            tipo_comprobante: form.tipo_comprobante,
            serie: form.serie,
            moneda: form.moneda,
            condicion_pago: form.condicion_pago,
            metodo_pago: form.metodo_pago,
            op_gravada: totales.gravada.toFixed(2),
            igv: totales.igv.toFixed(2),
            importe_total: totales.total.toFixed(2),
            detraccion_codigo: form.detraccion_codigo,
            detraccion_porcentaje: form.detraccion_porcentaje,
            detraccion_monto: form.detraccion_monto,
            detraccion_cuenta: form.detraccion_cuenta,
            detraccion_medio_pago: form.detraccion_medio_pago,
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
            }))
        };

        try {
            const res = await ventasApi.crear(payload);
            if (res.success) {
                toast.success('Comprobante emitido correctamente');
                onSuccess();
                onClose();
            } else {
                toast.error(res.message || 'Error al emitir comprobante');
            }
        } catch (error) {
            toast.error('Error al procesar la venta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Nueva Venta Electrónica" size="6xl" bgClass="bg-[#FFF9F2]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* COLUMNA 1: CLIENTE Y DATOS */}
                    <div className="space-y-5 lg:border-r border-slate-200 lg:pr-8">
                        <h3 className="text-xl font-bold text-slate-800">Datos Principales</h3>

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
                                    className="bg-[#ee8425] hover:bg-[#d5731d] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
                                >
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
                                    Buscar
                                </button>
                            </div>
                        </div>

                        {/* Búsqueda de Cliente */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-bold text-slate-800">Buscar Cliente</label>
                            <input
                                className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm shadow-sm outline-none"
                                placeholder="RUC o Nombres..."
                                value={searchCliente}
                                onChange={e => setSearchCliente(e.target.value)}
                            />
                            {clientesOptions.length > 0 && (
                                <div className="border rounded-md shadow-sm max-h-40 overflow-y-auto">
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
                                            <p className="font-semibold">{cli.razon_social || cli.nombre_razon_social}</p>
                                            <p className="text-gray-500">{cli.numero_documento}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Cliente Seleccionado */}
                        {selectedCliente && (
                            <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-xs">
                                <p className="font-bold text-green-900">✓ {selectedCliente.razon_social || selectedCliente.nombre_razon_social}</p>
                                <p className="text-green-700">{selectedCliente.numero_documento}</p>
                            </div>
                        )}

                        {/* Vendedor */}
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

                        {/* Comprobante */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-bold text-slate-800">Comprobante</label>
                                <select
                                    className="bg-white px-3 py-2.5 border border-slate-200 rounded-lg text-sm shadow-sm outline-none"
                                    value={form.tipo_comprobante}
                                    onChange={e => setForm({
                                        ...form,
                                        tipo_comprobante: e.target.value,
                                        serie: e.target.value === '01' ? 'F001' : 'B001'
                                    })}
                                >
                                    <option value="01">Factura</option>
                                    <option value="03">Boleta</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-bold text-slate-800">Serie y Correlativo</label>
                                <input value={form.serie} readOnly className="px-3 py-2.5 bg-gray-100 border border-slate-200 rounded-lg text-sm text-slate-500 outline-none" />
                            </div>
                        </div>

                        {/* Método de Pago */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-slate-800">Método de Pago</label>
                            <div className="grid grid-cols-2 gap-2">
                                {METODOS_PAGO.map(mp => (
                                    <button
                                        key={mp.code}
                                        onClick={() => setForm({ ...form, metodo_pago: mp.code })}
                                        className={`p-2 rounded-lg border-2 text-center text-[11px] font-bold transition-all bg-white ${
                                            form.metodo_pago === mp.code
                                                ? 'border-[#ee8425] bg-orange-50 text-[#ee8425]'
                                                : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                        }`}
                                    >
                                        {mp.icon} {mp.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Observaciones */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-bold text-slate-800">Observaciones</label>
                            <textarea
                                className="bg-white px-3 py-2.5 border border-slate-200 rounded-lg text-sm shadow-sm h-20 outline-none resize-none"
                                value={form.observacion}
                                onChange={e => setForm({ ...form, observacion: e.target.value })}
                                placeholder="Notas adicionales..."
                            />
                        </div>

                        {/* Botón Importar Cotización */}
                        <button
                            type="button"
                            className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-sm font-bold transition-colors"
                            onClick={cargarCotizaciones}
                        >
                            📋 Importar Cotización
                        </button>
                    </div>

                    {/* COLUMNA 2: PRODUCTOS Y CARRITO */}
                    <div className="space-y-5 lg:border-r border-slate-200 lg:pr-8">
                        <h3 className="text-xl font-bold text-slate-800">Productos</h3>

                        {/* Búsqueda de productos */}
                        <input
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm shadow-sm outline-none"
                            placeholder="Buscar producto..."
                            value={searchProducto}
                            onChange={e => setSearchProducto(e.target.value)}
                        />

                        {/* Productos disponibles */}
                        <div className="border rounded-lg p-3 bg-gray-50 max-h-64 overflow-y-auto">
                            <div className="grid grid-cols-1 gap-2">
                                {productosOptions.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => agregarProducto(p)}
                                        className="text-left p-2 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-all text-xs"
                                    >
                                        <p className="font-semibold text-gray-800">{p.descripcion}</p>
                                        <p className="text-gray-500">{p.codigo_interno} • S/ {parseFloat(p.precio_venta).toFixed(2)}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tabla de carrito */}
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
                                                 <span className="flex items-center gap-2">
                                                    {det.descripcion}
                                                    {det.indicacion && (
                                                        <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{
                                                            backgroundColor: det.indicacion === 'indispensable' ? '#16a34a' : det.indicacion === 'remplazable' ? '#f59e0b' : '#9ca3af',
                                                            color: '#fff'
                                                        }}>{det.indicacion === 'indispensable' ? 'Indispensable' : det.indicacion === 'remplazable' ? 'Remplazable' : 'Prescindible'}</span>
                                                    )}
                                                </span>
                                                <button
                                                    onClick={() => setDetalles(detalles.filter((_, i) => i !== idx))}
                                                    className="text-red-500 hover:text-red-700 font-bold"
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
                                                    title="Editar precio"
                                                />
                                                <div className="text-right font-bold">
                                                    S/ {((det.cantidad * det.precio_unitario) - det.descuento_unitario).toFixed(2)}
                                                </div>
                                            </div>
                                            <select
                                                value={det.tipo_afectacion_igv}
                                                onChange={e => actualizarLinea(det.producto_id, 'tipo_afectacion_igv', e.target.value)}
                                                className="border rounded px-1 py-1 text-xs w-full"
                                            >
                                                {TIPO_AFECTACION.map(af => (
                                                    <option key={af.code} value={af.code}>{af.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA 3: TOTALES Y FINALIZAR */}
                    <div className="space-y-3 flex flex-col items-stretch">
                        <h3 className="text-xl font-bold text-slate-800">Resumen</h3>

                        {/* Card de totales */}
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

                        {/* Detracción (si aplica) */}
                        {form.tipo_comprobante === '01' && totales.total >= 700 && (
                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg space-y-3">
                                <h4 className="text-sm font-bold text-orange-900">⚠️ Detracción (Ley 26702)</h4>
                                <select
                                    className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm"
                                    value={form.detraccion_codigo}
                                    onChange={(e) => {
                                        const item = CAT54.find(c => c.code === e.target.value);
                                        const pct = item ? item.percent : 0;
                                        const monto = (totales.total * pct / 100).toFixed(2);
                                        setForm({ ...form, detraccion_codigo: e.target.value, detraccion_porcentaje: pct, detraccion_monto: monto });
                                    }}
                                >
                                    <option value="">-- Seleccione --</option>
                                    {CAT54.map(c => <option key={c.code} value={c.code}>{c.name} ({c.percent}%)</option>)}
                                </select>
                                {form.detraccion_codigo && (
                                    <>
                                        <Input
                                            label="Monto"
                                            value={form.detraccion_monto}
                                            readOnly
                                        />
                                        <Input
                                            label="Cuenta (00-000-0000)"
                                            placeholder="Cuenta"
                                            value={form.detraccion_cuenta}
                                            onChange={e => setForm({ ...form, detraccion_cuenta: e.target.value })}
                                        />
                                    </>
                                )}
                            </div>
                        )}

                        {/* Botones de acción */}
                        <div className="pt-2">
                            <button
                                type="button"
                                className="w-full py-3.5 bg-[#2c3338] text-white hover:bg-[#1a1f23] rounded-lg font-bold transition-colors mb-2"
                                onClick={onClose}
                            >
                                Cancelar
                            </button>
                            
                            <button
                                type="button"
                                className={`w-full py-3.5 bg-[#5ca335] hover:bg-[#4d8b2d] text-white rounded-lg font-bold transition-colors ${loading ? 'opacity-50' : ''}`}
                                onClick={handleGuardar}
                                disabled={loading}
                            >
                                ✓ EMITIR COMPROBANTE
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal para Cotizaciones */}
            <Modal isOpen={showCotizacionesModal} onClose={() => setShowCotizacionesModal(false)} title="Importar Cotización" size="2xl">
                <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                    {cotizaciones.length === 0 ? (
                        <p className="text-gray-500 text-center">No hay cotizaciones disponibles</p>
                    ) : (
                        <div className="space-y-2">
                            {cotizaciones.map(cot => (
                                <button
                                    key={cot.id}
                                    onClick={() => importarCotizacion(cot.id)}
                                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-gray-800">{cot.cliente?.razon_social || 'Cliente'}</p>
                                            <p className="text-sm text-gray-500">Cotización #{cot.numero_correlativo}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-blue-600">S/ {parseFloat(cot.total).toFixed(2)}</p>
                                            <p className="text-xs text-gray-500">{cot.estado}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};

export default VentaForm;