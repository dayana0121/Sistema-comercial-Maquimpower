import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../api/client';
import { ventasApi } from '../../api/ventas';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import BuscadorDocumento from '../../components/ui/BuscadorDocumento';

const CAT54 = [
    { code: '022', name: 'Otros servicios empresariales', percent: 10 },
    { code: '037', name: 'Arrendamiento de bienes', percent: 10 },
    { code: '001', name: 'Azúcar y melaza de caña', percent: 10 },
];


const VentaForm = ({ isOpen, onClose, onSuccess }) => {
    const toast = useToast(); // ✅ Correcto: const toast = useToast();
    const [activeTab, setActiveTab] = useState(1);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        cliente_id: '',
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

    const [searchCliente, setSearchCliente] = useState('');
    const [clientesOptions, setClientesOptions] = useState([]);
    const [selectedCliente, setSelectedCliente] = useState(null);

    const [searchProducto, setSearchProducto] = useState('');
    const [productosOptions, setProductosOptions] = useState([]);
    const [detalles, setDetalles] = useState([]);

    // ==========================================
    // BUSCADORES CON DEBOUNCE
    // ==========================================
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

    useEffect(() => {
        if (searchProducto.trim().length < 2) return setProductosOptions([]);
        const timer = setTimeout(async () => {
            try {
                const res = await apiClient.get(`/productos?search=${encodeURIComponent(searchProducto)}`);
                if (res.success) setProductosOptions(res.data || []);
            } catch (err) { console.error(err); }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchProducto]);

    // ==========================================
    // LÓGICA DEL CARRITO
    // ==========================================
    const agregarProducto = (producto) => {
        const existe = detalles.find(d => d.producto_id === producto.id);
        if (existe) {
            actualizarLinea(existe.producto_id, 'cantidad', existe.cantidad + 1);
            toast.success('Cantidad actualizada');
        } else {
            // Usamos el precio con IGV que viene de la BD
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
        }
        setSearchProducto('');
        setProductosOptions([]);
    };

    const actualizarLinea = (id, campo, valor) => {
        setDetalles(detalles.map(det =>
            det.producto_id === id ? { ...det, [campo]: Number(valor) } : det
        ));
    };

    const totales = useMemo(() => {
        const gravada = detalles.reduce((acc, det) => acc + (det.cantidad * (det.precio_unitario / 1.18)), 0);
        const igv = gravada * 0.18;
        return { gravada, igv, total: gravada + igv };
    }, [detalles]);

    // ==========================================
    // ENVÍO AL BACKEND
    // ==========================================
    const handleGuardar = async () => {
        if (!form.cliente_id) return toast.error('Selecciona un cliente');
        if (detalles.length === 0) return toast.error('El carrito está vacío');

        setLoading(true);
        const payload = {
            cliente_id: form.cliente_id,
            tipo_comprobante: form.tipo_comprobante,
            serie: form.serie,
            moneda: form.moneda,
            condicion_pago: form.condicion_pago,
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

    const TabButton = ({ num, label }) => (
        <button
            onClick={() => setActiveTab(num)}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === num ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
                }`}
        >
            {num}. {label}
        </button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nueva Venta Electrónica" size="4xl">
            <div className="flex bg-gray-50 rounded-t-lg">
                <TabButton num={1} label="Cliente" />
                <TabButton num={2} label="Carrito" />
                <TabButton num={3} label="Finalizar" />
            </div>

            <div className="p-6 min-h-[450px]">
                {activeTab === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <BuscadorDocumento
                                label="Búsqueda SUNAT/RENIEC (Externo)"
                                onFound={(data) => {
                                    toast.success(`Encontrado: ${data.razon_social}. Por favor use el buscador de abajo para encontrarlo en el sistema o regístrelo si es nuevo.`);
                                    setSearchCliente(data.ruc || data.dni || data.numero_documento || '');
                                }}
                            />
                        </div>
                        <div className="relative flex flex-col gap-1 mt-4">
                            <label className="text-sm font-semibold text-gray-700">Buscar en Base de Datos</label>
                            <Input
                                label="Buscar Cliente"
                                placeholder="RUC o Nombre..."
                                value={searchCliente}
                                onChange={e => setSearchCliente(e.target.value)}
                            />
                            {clientesOptions.length > 0 && (
                                <div className="border rounded-md shadow-sm overflow-hidden">
                                    {clientesOptions.map(cli => (
                                        <div
                                            key={cli.id}
                                            className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 flex justify-between items-center"
                                            onClick={() => {
                                                setSelectedCliente(cli);
                                                setForm(prev => ({ ...prev, cliente_id: cli.id }));
                                                setClientesOptions([]);
                                                setSearchCliente('');
                                            }}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-800">
                                                    {cli.razon_social}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {cli.tipo_documento === '6' ? 'RUC' : 'DNI'}: {cli.numero_documento}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {selectedCliente && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-blue-900">{selectedCliente.nombre_razon_social}</p>
                                        <p className="text-xs text-blue-700">{selectedCliente.direccion}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                            <Input label="Comprobante" type="select" value={form.tipo_comprobante}
                                onChange={e => setForm({ ...form, tipo_comprobante: e.target.value, serie: e.target.value === '01' ? 'F001' : 'B001' })}>
                                <option value="01">Factura</option>
                                <option value="03">Boleta</option>
                            </Input>
                            <Input label="Serie" value={form.serie} readOnly onChange={() => { }} />
                        </div>
                    </div>
                )}

                {activeTab === 2 && (
                    <div className="space-y-4 animate-in fade-in">
                        <Input
                            placeholder="Buscar producto por nombre o código..."
                            value={searchProducto}
                            onChange={e => setSearchProducto(e.target.value)}
                        />
                        <div className="max-h-32 overflow-y-auto flex gap-2">
                            {productosOptions.map(p => (
                                <button key={p.id} onClick={() => agregarProducto(p)} className="p-2 border rounded-md text-xs hover:bg-emerald-50 whitespace-nowrap">
                                    {p.descripcion} <span className="block font-bold">S/ {p.precio_venta}</span>
                                </button>
                            ))}
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-3 text-left">Producto</th>
                                        <th className="p-3 text-center w-24">Cant.</th>
                                        <th className="p-3 text-right">P.Unit</th>
                                        <th className="p-3 text-right">Total</th>
                                        <th className="p-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detalles.map(det => (
                                        <tr key={det.producto_id} className="border-t">
                                            <td className="p-3 font-medium">{det.descripcion}</td>
                                            <td className="p-3">
                                                <input
                                                    type="number"
                                                    className="w-full border rounded text-center"
                                                    value={det.cantidad}
                                                    onChange={e => actualizarLinea(det.producto_id, 'cantidad', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3 text-right">S/ {det.precio_unitario.toFixed(2)}</td>
                                            <td className="p-3 text-right font-bold">S/ {(det.cantidad * det.precio_unitario).toFixed(2)}</td>
                                            <td className="p-3 text-center"><button onClick={() => setDetalles(detalles.filter(d => d.producto_id !== det.producto_id))} className="text-red-500">✕</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 3 && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-slate-800 text-white p-6 rounded-xl space-y-3">
                            <div className="flex justify-between text-slate-400"><span>Op. Gravada:</span><span>S/ {totales.gravada.toFixed(2)}</span></div>
                            <div className="flex justify-between text-slate-400"><span>IGV (18%):</span><span>S/ {totales.igv.toFixed(2)}</span></div>
                            <div className="flex justify-between border-t border-slate-700 pt-3 text-xl font-bold">
                                <span>TOTAL A PAGAR:</span>
                                <span className="text-orange-400 font-black">S/ {totales.total.toFixed(2)}</span>
                            </div>
                        </div>
                        {form.tipo_comprobante === '01' && totales.total >= 700 && (
                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-4">
                                <h4 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                                    ⚠️ Información de Detracción (Ley 26702)
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Bien/Servicio (Cat. 54)</label>
                                        <select
                                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-500"
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
                                    </div>
                                    <Input label="Monto Detracción" value={form.detraccion_monto} readOnly />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Cuenta Detracción" placeholder="00-000-0000" value={form.detraccion_cuenta} onChange={e => setForm({ ...form, detraccion_cuenta: e.target.value })} />
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Medio Pago (Cat. 59)</label>
                                        <select
                                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-500"
                                            value={form.detraccion_medio_pago} onChange={e => setForm({ ...form, detraccion_medio_pago: e.target.value })}
                                        >
                                            <option value="001">Depósito en cuenta</option>
                                            <option value="002">Giro</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                        <Input label="Observaciones" value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value })} />
                        <Button variant="primary" className="w-full py-4 text-lg" isLoading={loading} onClick={handleGuardar}>
                            EMITIR COMPROBANTE AHORA
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default VentaForm;