import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, X, Send } from 'lucide-react';
import apiClient from '../../api/client';
import { ventasApi } from '../../api/ventas';
import { vendedoresApi } from '../../api/vendedores';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import BuscadorDocumento from '../../components/ui/BuscadorDocumento';

const CAT54 = [
    { code: '022', name: 'Otros servicios empresariales', percent: 10 },
    { code: '037', name: 'Arrendamiento de bienes', percent: 10 },
    { code: '001', name: 'Azúcar y melaza de caña', percent: 10 },
];

const VentasCreatePage = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(false);

    // Estado del formulario
    const [form, setForm] = useState({
        cliente_id: '',
        vendedor_id: '',
        tipo_comprobante: '01',
        serie: 'F001',
        condicion_pago: 'CONTADO',
        moneda: 'PEN',
        observacion: '',
        detraccion_codigo: '',
        detraccion_porcentaje: 0,
        detraccion_monto: 0,
        detraccion_cuenta: '',
        detraccion_medio_pago: '001',
    });

    // Clientes
    const [searchCliente, setSearchCliente] = useState('');
    const [clientesOptions, setClientesOptions] = useState([]);
    const [selectedCliente, setSelectedCliente] = useState(null);

    // Vendedores
    const [vendedores, setVendedores] = useState([]);

    // Productos
    const [searchProducto, setSearchProducto] = useState('');
    const [productosOptions, setProductosOptions] = useState([]);
    const [detalles, setDetalles] = useState([]);

    // ==========================================
    // Cargar vendedores
    // ==========================================
    useEffect(() => {
        const cargarVendedores = async () => {
            try {
                const res = await vendedoresApi.listar();
                if (res.success) {
                    setVendedores(res.data.vendedores || []);
                }
            } catch (err) {
                console.error('Error cargando vendedores:', err);
            }
        };
        cargarVendedores();
    }, []);

    // ==========================================
    // Búsqueda de clientes con debounce
    // ==========================================
    useEffect(() => {
        if (searchCliente.trim().length < 3) {
            setClientesOptions([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await apiClient.get(`/clientes?search=${encodeURIComponent(searchCliente)}`);
                if (res.success) setClientesOptions(res.data || []);
            } catch (err) {
                console.error(err);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [searchCliente]);

    // ==========================================
    // Búsqueda de productos con debounce
    // ==========================================
    useEffect(() => {
        if (searchProducto.trim().length < 2) {
            setProductosOptions([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await apiClient.get(`/productos?search=${encodeURIComponent(searchProducto)}`);
                if (res.success) setProductosOptions(res.data || []);
            } catch (err) {
                console.error(err);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [searchProducto]);

    // ==========================================
    // Lógica del carrito
    // ==========================================
    const agregarProducto = (producto) => {
        const existe = detalles.find(d => d.producto_id === producto.id);
        if (existe) {
            actualizarLinea(existe.producto_id, 'cantidad', existe.cantidad + 1);
            toast.success('Cantidad actualizada');
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
            toast.success(`${producto.descripcion} agregado al carrito`);
        }
        setSearchProducto('');
        setProductosOptions([]);
    };

    const actualizarLinea = (id, campo, valor) => {
        setDetalles(detalles.map(det =>
            det.producto_id === id ? { ...det, [campo]: ['cantidad', 'precio_unitario', 'descuento_unitario'].includes(campo) ? Number(valor) : valor } : det
        ));
    };

    const eliminarLinea = (id) => {
        setDetalles(detalles.filter(d => d.producto_id !== id));
    };

    // ==========================================
    // Cálculos
    // ==========================================
    const totales = useMemo(() => {
        let gravada = 0;
        let exonerada = 0;
        let inafecta = 0;
        let gratuita = 0;
        let igv = 0;

        detalles.forEach(det => {
            const precio = parseFloat(det.precio_unitario);
            const cantidad = parseFloat(det.cantidad);
            const descuento = parseFloat(det.descuento_unitario || 0);
            const unitarioNeto = precio - descuento;
            const subtotalFila = unitarioNeto * cantidad;

            const tipo = det.tipo_afectacion_igv || '10';

            // 10: Gravado - Operación Onerosa
            if (tipo === '10') {
                const sub = subtotalFila / 1.18;
                gravada += sub;
                igv += (subtotalFila - sub);
            } 
            // 20: Exonerado - Operación Onerosa
            else if (tipo === '20') {
                exonerada += subtotalFila;
            }
            // 30: Inafecto - Operación Onerosa
            else if (tipo === '30') {
                inafecta += subtotalFila;
            }
            // 21, 31, etc: Gratuito
            else if (['11', '12', '13', '14', '15', '16', '21', '31', '32', '33', '34', '35', '36'].includes(tipo)) {
                gratuita += subtotalFila;
            }
        });

        const total = gravada + igv + exonerada + inafecta;
        return { gravada, exonerada, inafecta, gratuita, igv, total };
    }, [detalles]);

    // ==========================================
    // Guardar venta
    // ==========================================
    const handleGuardar = async () => {
        if (!form.cliente_id) {
            toast.error('Selecciona un cliente');
            return;
        }
        if (detalles.length === 0) {
            toast.error('El carrito está vacío');
            return;
        }

        setLoading(true);
        const payload = {
            cliente_id: form.cliente_id,
            vendedor_id: form.vendedor_id || null,
            tipo_comprobante: form.tipo_comprobante,
            serie: form.serie,
            moneda: form.moneda,
            condicion_pago: form.condicion_pago,
            metodo_pago: form.metodo_pago || 'EFECTIVO',
            op_gravada: totales.gravada.toFixed(2),
            op_exonerada: totales.exonerada.toFixed(2),
            op_inafecta: totales.inafecta.toFixed(2),
            op_gratuita: totales.gratuita.toFixed(2),
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
                valor_unitario: det.tipo_afectacion_igv === '10' 
                    ? (det.precio_unitario / 1.18).toFixed(4) 
                    : parseFloat(det.precio_unitario).toFixed(4),
                precio_unitario: parseFloat(det.precio_unitario),
                descuento_unitario: parseFloat(det.descuento_unitario || 0),
                tipo_afectacion_igv: det.tipo_afectacion_igv || '10',
            }))
        };

        try {
            const res = await ventasApi.crear(payload);
            if (res.success) {
                toast.success('✅ Comprobante emitido correctamente');
                setTimeout(() => {
                    navigate('/ventas');
                }, 1500);
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
        <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/ventas')}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Volver"
                    >
                        <ChevronLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Nueva Venta Electrónica</h1>
                        <p className="text-sm text-slate-500">Emite comprobantes SUNAT en tiempo real</p>
                    </div>
                </div>
            </div>

            {/* Main Content - 3 Columnas */}
            <div className="flex-1 grid grid-cols-3 gap-4 p-6 overflow-hidden">
                
                {/* ================== COLUMNA IZQUIERDA: CLIENTE ================== */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <h2 className="text-lg font-bold text-slate-800">Cliente</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {/* Búsqueda SUNAT */}
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <BuscadorDocumento
                                label="Búsqueda SUNAT (Externo)"
                                onFound={(data) => {
                                    toast.success(`Encontrado: ${data.razon_social || data.nombres}`);
                                    setSearchCliente(data.ruc || data.dni || '');
                                }}
                            />
                        </div>

                        {/* Búsqueda en BD */}
                        <div>
                            <label className="text-sm font-semibold text-slate-700 block mb-2">Buscar en Base de Datos</label>
                            <input
                                type="text"
                                placeholder="RUC o Nombre..."
                                value={searchCliente}
                                onChange={e => setSearchCliente(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>

                        {/* Opciones búsqueda */}
                        {clientesOptions.length > 0 && (
                            <div className="border rounded-lg overflow-hidden bg-white">
                                {clientesOptions.map(cli => (
                                    <div
                                        key={cli.id}
                                        className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 transition-colors"
                                        onClick={() => {
                                            setSelectedCliente(cli);
                                            setForm(prev => ({ ...prev, cliente_id: cli.id }));
                                            setClientesOptions([]);
                                            setSearchCliente('');
                                        }}
                                    >
                                        <div className="font-semibold text-slate-800 text-sm">{cli.razon_social}</div>
                                        <div className="text-xs text-slate-500">
                                            {cli.tipo_documento === '6' ? 'RUC' : 'DNI'}: {cli.numero_documento}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Cliente seleccionado */}
                        {selectedCliente && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-300">
                                <div className="text-[10px] text-blue-500 font-bold uppercase mb-1">
                                    {selectedCliente.tipo_documento === '1' ? 'Cliente (Persona)' : 'Empresa (RUC)'}
                                </div>
                                <div className="font-bold text-blue-900 text-sm">{selectedCliente.razon_social}</div>
                                <div className="text-xs text-blue-700 mt-1">✓ Seleccionado</div>
                            </div>
                        )}

                        {/* Divider */}
                        <div className="border-t border-slate-200 pt-4">
                            <h3 className="text-sm font-bold text-slate-700 mb-3">Comprobante</h3>

                            {/* Vendedor */}
                            <div className="mb-3">
                                <label className="text-xs font-semibold text-slate-600 block mb-1">Vendedor</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    value={form.vendedor_id}
                                    onChange={e => setForm({ ...form, vendedor_id: e.target.value })}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {vendedores.map(v => (
                                        <option key={v.id} value={v.id}>{v.nombre} {v.apellido}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Tipo Comprobante */}
                            <div className="mb-3">
                                <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    value={form.tipo_comprobante}
                                    onChange={e => {
                                        let s = 'F001';
                                        if (e.target.value === '03') s = 'B001';
                                        if (e.target.value === '00') s = 'NV01';
                                        setForm({ ...form, tipo_comprobante: e.target.value, serie: s });
                                    }}
                                >
                                    <option value="01">Factura</option>
                                    <option value="03">Boleta</option>
                                    <option value="00">Nota de Venta</option>
                                </select>
                            </div>

                            {/* Serie (Read-Only) */}
                            <div className="mb-3">
                                <label className="text-xs font-semibold text-slate-600 block mb-1">Serie</label>
                                <input
                                    type="text"
                                    value={form.serie}
                                    readOnly
                                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-bold text-slate-600"
                                />
                            </div>

                             {/* Método de Pago */}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-1">Método de Pago</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-blue-600"
                                    value={form.metodo_pago}
                                    onChange={e => setForm({ ...form, metodo_pago: e.target.value })}
                                >
                                    <option value="EFECTIVO">Efectivo</option>
                                    <option value="YAPE">Yape</option>
                                    <option value="PLIN">Plin</option>
                                    <option value="TRANSFERENCIA">Transferencia</option>
                                    <option value="TARJETA">Tarjeta</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================== COLUMNA CENTRAL: PRODUCTOS ================== */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
                        <h2 className="text-lg font-bold text-slate-800">Productos</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-3">
                        {/* Búsqueda */}
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={searchProducto}
                            onChange={e => setSearchProducto(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm sticky top-0 bg-white"
                        />

                        {/* Resultados búsqueda */}
                        {searchProducto && productosOptions.length > 0 && (
                            <div className="space-y-2 pb-2">
                                <div className="text-xs font-semibold text-slate-500 uppercase">Resultados ({productosOptions.length})</div>
                                {productosOptions.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => agregarProducto(p)}
                                        className="w-full p-3 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 border border-emerald-200 rounded-lg text-left transition-colors text-sm"
                                    >
                                        <div className="font-semibold text-slate-800">{p.descripcion}</div>
                                        <div className="text-xs text-slate-600 mt-1 flex justify-between">
                                            <span>Stock: {p.stock_actual || 0}</span>
                                            <span className="font-bold text-green-700">S/ {p.precio_venta}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {searchProducto && productosOptions.length === 0 && (
                            <div className="text-center text-slate-500 text-sm py-8">
                                No se encontraron productos
                            </div>
                        )}

                        {!searchProducto && (
                            <div className="text-center text-slate-400 text-sm py-8">
                                <p>Escribe para buscar productos</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ================== COLUMNA DERECHA: CARRITO + TOTALES ================== */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-amber-50">
                        <h2 className="text-lg font-bold text-slate-800">Carrito ({detalles.length})</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {detalles.length === 0 ? (
                            <div className="text-center text-slate-400 py-8">
                                <p className="text-sm">Carrito vacío</p>
                                <p className="text-xs mt-2">Selecciona productos para comenzar</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {detalles.map(det => (
                                    <div key={det.producto_id} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                <div className="font-semibold text-sm text-slate-800">
                                                    <input 
                                                        type="text" 
                                                        value={det.descripcion} 
                                                        onChange={e => actualizarLinea(det.producto_id, 'descripcion', e.target.value)}
                                                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white outline-none px-1 py-0.5 rounded transition-all"
                                                    />
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">
                                                    S/ {det.precio_unitario.toFixed(2)} c/u
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => eliminarLinea(det.producto_id)}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 mt-2">
                                            <div>
                                                <label className="text-[10px] text-slate-500 block uppercase font-bold">Cant.</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={det.cantidad}
                                                    onChange={e => actualizarLinea(det.producto_id, 'cantidad', e.target.value)}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-center outline-none focus:ring-2 focus:ring-orange-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 block uppercase font-bold">P. Unit</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={det.precio_unitario}
                                                    onChange={e => actualizarLinea(det.producto_id, 'precio_unitario', e.target.value)}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-center outline-none focus:ring-2 focus:ring-orange-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 block uppercase font-bold text-red-600">Desc.</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={det.descuento_unitario}
                                                    onChange={e => actualizarLinea(det.producto_id, 'descuento_unitario', e.target.value)}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-center outline-none focus:ring-2 focus:ring-orange-500 text-red-600"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 block uppercase font-bold">IGV</label>
                                                <select
                                                    value={det.tipo_afectacion_igv || '10'}
                                                    onChange={e => actualizarLinea(det.producto_id, 'tipo_afectacion_igv', e.target.value)}
                                                    className="w-full px-1 py-1 border border-slate-300 rounded text-[10px] outline-none focus:ring-2 focus:ring-orange-500"
                                                >
                                                    <option value="10">Gravado</option>
                                                    <option value="20">Exonerado</option>
                                                    <option value="30">Inafecto</option>
                                                    <option value="11">Gratuito</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                                            <span className="text-xs text-slate-500">Subtotal:</span>
                                            <span className="text-sm font-bold text-slate-700">
                                                S/ {(det.cantidad * (det.precio_unitario - (det.descuento_unitario || 0))).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Totales y Acciones */}
                    <div className="border-t border-slate-200 px-6 py-4 space-y-4">
                        {/* Resumen Totales */}
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 rounded-lg space-y-1">
                            {totales.gravada > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Op. Gravada:</span>
                                    <span className="font-medium">S/ {totales.gravada.toFixed(2)}</span>
                                </div>
                            )}
                            {totales.exonerada > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Op. Exonerada:</span>
                                    <span className="font-medium">S/ {totales.exonerada.toFixed(2)}</span>
                                </div>
                            )}
                            {totales.inafecta > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Op. Inafecta:</span>
                                    <span className="font-medium">S/ {totales.inafecta.toFixed(2)}</span>
                                </div>
                            )}
                            {totales.gratuita > 0 && (
                                <div className="flex justify-between text-xs text-green-400">
                                    <span className="text-green-500/80">Op. Gratuita:</span>
                                    <span className="font-medium">S/ {totales.gratuita.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xs border-t border-slate-700/50 mt-1 pt-1">
                                <span className="text-slate-400">IGV (18%):</span>
                                <span className="font-medium">S/ {totales.igv.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-slate-700 pt-2 flex justify-between">
                                <span className="text-lg font-bold">TOTAL:</span>
                                <span className="text-2xl font-black text-orange-400">S/ {totales.total.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Detracción (si aplica) */}
                        {form.tipo_comprobante === '01' && totales.total >= 700 && (
                            <details className="bg-orange-50 p-3 rounded-lg border border-orange-200" open>
                                <summary className="font-bold text-orange-800 text-sm cursor-pointer mb-2">
                                    ⚠️ Detracción (expandir)
                                </summary>
                                <div className="space-y-2">
                                    <select
                                        className="w-full px-3 py-2 border border-orange-300 rounded text-sm outline-none focus:ring-2 focus:ring-orange-500"
                                        value={form.detraccion_codigo}
                                        onChange={(e) => {
                                            const item = CAT54.find(c => c.code === e.target.value);
                                            const pct = item ? item.percent : 0;
                                            const monto = (totales.total * pct / 100).toFixed(2);
                                            setForm({ ...form, detraccion_codigo: e.target.value, detraccion_porcentaje: pct, detraccion_monto: monto });
                                        }}
                                    >
                                        <option value="">Seleccionar bien/servicio</option>
                                        {CAT54.map(c => <option key={c.code} value={c.code}>{c.name} ({c.percent}%)</option>)}
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Cuenta detracción"
                                        value={form.detraccion_cuenta}
                                        onChange={e => setForm({ ...form, detraccion_cuenta: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </details>
                        )}

                        {/* Botones */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigate('/ventas')}
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGuardar}
                                disabled={loading || detalles.length === 0 || !form.cliente_id}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Send size={16} />
                                {loading ? 'Procesando...' : 'EMITIR VENTA'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VentasCreatePage;
