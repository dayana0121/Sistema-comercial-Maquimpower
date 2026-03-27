import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../api/client';
import { cotizacionesApi } from '../../api/cotizaciones';
import { vendedoresApi } from '../../api/vendedores';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import BuscadorDocumento from '../../components/ui/BuscadorDocumento';

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
            setSelectedCliente(cotizacion.cliente);
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
            }))
        };

        try {
            const res = cotizacion
                ? await apiClient.put(`/cotizaciones/${cotizacion.id}`, payload)
                : await cotizacionesApi.crear(payload);

            if (res.success) {
                toast.success(cotizacion ? 'Cotización actualizada' : 'Cotización creada');
                onSuccess();
            } else {
                toast.error(res.message || 'Error');
            }
        } catch (error) {
            toast.error('Error al guardar la cotización');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={cotizacion ? 'Editar Cotización' : 'Nueva Cotización'} size="6xl">
            <div className="grid grid-cols-3 gap-6 p-6">
                {/* COLUMNA 1: CLIENTE Y DATOS */}
                <div className="space-y-4 border-r pr-6">
                    <h3 className="text-lg font-bold text-gray-800">Datos</h3>

                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <BuscadorDocumento
                            label="Buscar en SUNAT/RENIEC"
                            onFound={(data) => {
                                toast.success(`Encontrado: ${data.razon_social}`);
                                setSearchCliente(data.ruc || data.dni || '');
                            }}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold text-gray-700">Buscar Cliente</label>
                        <Input
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

                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-1">Vendedor</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={form.vendedor_id}
                            onChange={e => setForm({ ...form, vendedor_id: e.target.value })}
                        >
                            <option value="">-- Seleccionar --</option>
                            {vendedores.map(v => (
                                <option key={v.id} value={v.id}>{v.nombre} {v.apellido}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-1">Fecha Vigencia</label>
                        <Input
                            type="date"
                            value={form.fecha_vigencia}
                            onChange={e => setForm({ ...form, fecha_vigencia: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-1">WhatsApp Cliente</label>
                        <Input
                            placeholder="+51 900000000"
                            value={form.numero_whatsapp}
                            onChange={e => setForm({ ...form, numero_whatsapp: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-1">Observaciones</label>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-20 resize-none"
                            value={form.observaciones}
                            onChange={e => setForm({ ...form, observaciones: e.target.value })}
                            placeholder="Notas..."
                        />
                    </div>
                </div>

                {/* COLUMNA 2: PRODUCTOS Y CARRITO */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-800">Productos</h3>

                    <Input
                        placeholder="Buscar producto..."
                        value={searchProducto}
                        onChange={e => setSearchProducto(e.target.value)}
                    />

                    <div className="border rounded-lg p-3 bg-gray-50 max-h-64 overflow-y-auto">
                        <div className="grid grid-cols-1 gap-2">
                            {productosOptions.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => agregarProducto(p)}
                                    className="text-left p-2 border border-gray-200 rounded hover:bg-blue-50 transition-all text-xs"
                                >
                                    <p className="font-semibold text-gray-800">{p.descripcion}</p>
                                    <p className="text-gray-500">S/ {parseFloat(p.precio_venta).toFixed(2)}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-100 p-2 text-xs font-bold text-gray-700 grid grid-cols-4 gap-1">
                            <div>Producto</div>
                            <div className="text-center">Cant.</div>
                            <div className="text-right">Precio</div>
                            <div className="text-right">Total</div>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {detalles.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 text-sm">Sin productos</div>
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
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUMNA 3: TOTALES Y FINALIZAR */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-800">Resumen</h3>

                    <div className="bg-slate-800 text-white p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm text-slate-300">
                            <span>Subtotal:</span>
                            <span>S/ {totales.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-300">
                            <span>IGV (18%):</span>
                            <span>S/ {totales.igv.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-slate-600 pt-2 flex justify-between font-bold text-lg">
                            <span>TOTAL:</span>
                            <span className="text-orange-400">S/ {totales.total.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                        <Button
                            variant="primary"
                            className="w-full py-3 text-base"
                            isLoading={loading}
                            onClick={handleGuardar}
                        >
                            {cotizacion ? '✓ ACTUALIZAR' : '✓ CREAR COTIZACIÓN'}
                        </Button>
                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default CotizacionForm;
