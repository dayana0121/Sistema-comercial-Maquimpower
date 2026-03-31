import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, X, Send } from 'lucide-react';
import apiClient from '../../api/client';
import { ventasApi } from '../../api/ventas';
import { vendedoresApi } from '../../api/vendedores';
import { notasCreditoApi } from '../../api/notas_credito';
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
        canal_venta: 'tienda',
        metodo_pago: 'EFECTIVO',
        agencia_envio: '',
        
        // Campos de Nota de Crédito/Débito
        venta_id_ref: '', // ID de la venta original
        motivo_nota: '', // Motivo de la nota
    });

    // Clientes
    const [searchCliente, setSearchCliente] = useState('');
    const [clientesOptions, setClientesOptions] = useState([]);
    const [selectedCliente, setSelectedCliente] = useState(null);

    // Búsqueda Venta Referencia (NC/ND)
    const [busquedaVentaRef, setBusquedaVentaRef] = useState('');
    const [ventasEncontradas, setVentasEncontradas] = useState([]);

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

    // Búscar venta referencia para Nota de Crédito/Débito
    const buscarVentaReferencia = async (numero) => {
        if (!numero || numero.length < 4) {
            setVentasEncontradas([]);
            return;
        }
        try {
            const res = await ventasApi.listar({ search: numero, limit: 10 });
            if (res.success) {
                const arr = Array.isArray(res.data) ? res.data : (res.data?.ventas || []);
                setVentasEncontradas(arr);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const seleccionarVentaReferencia = async (venta) => {
        setBusquedaVentaRef(venta.numero_completo);
        setVentasEncontradas([]);
        
        // Heredar el cliente de la venta original obligatoriamente
        setForm(prev => ({
            ...prev,
            venta_id_ref: venta.id,
            cliente_id: venta.cliente_id
        }));
        setSelectedCliente({
            id: venta.cliente_id,
            razon_social: venta.cliente_nombre,
            numero_documento: venta.cliente_documento || 'Sin doc',
            tipo_documento: '6' // Asumimos RUC mayormente
        });
        
        // Cargar detalles de la venta al carrito
        try {
            const res = await ventasApi.obtener(venta.id);
            if (res.success && res.data.detalles) {
                const mapDetalles = res.data.detalles.map(d => ({
                    producto_id: d.producto_id,
                    codigo_producto: d.codigo_producto || '000',
                    descripcion: d.descripcion,
                    cantidad: d.cantidad,
                    precio_unitario: d.precio_unitario,
                    descuento_unitario: 0,
                    tipo_afectacion_igv: d.tipo_afectacion_igv || '10',
                    unidad_medida: d.unidad_medida || 'NIU'
                }));
                setDetalles(mapDetalles);
                toast.success('Detalles de comprobante cargados.');
            }
        } catch(e) {}
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
            return toast.error('Debe seleccionar o buscar un cliente');
        }
        if (detalles.length === 0) {
            return toast.error('El carrito de compras está vacío');
        }
        if (!form.vendedor_id) {
            return toast.error('Debe seleccionar un Vendedor para emitir el comprobante');
        }
        if (!form.tipo_comprobante) {
            return toast.error('Debe seleccionar el Tipo de Comprobante');
        }

        setLoading(true);

        try {
            let finalClienteId = form.cliente_id;
            
            // Autocrear cliente si viene de busqueda SUNAT y no existe en BD
            if (finalClienteId === 'NEW' && selectedCliente) {
                if (!selectedCliente.razon_social || !selectedCliente.numero_documento) {
                    setLoading(false);
                    return toast.error('Faltan datos obligatorios del cliente (Nombre y Documento)');
                }
                const resCli = await apiClient.post('/api/clientes', {
                    tipo_documento: selectedCliente.tipo_documento,
                    numero_documento: selectedCliente.numero_documento,
                    razon_social: selectedCliente.razon_social,
                    direccion_fiscal: selectedCliente.direccion_fiscal || '-',
                    email: '',
                    telefono: ''
                });

                if (resCli.success && resCli.data?.id) {
                    finalClienteId = resCli.data.id;
                    setForm(prev => ({ ...prev, cliente_id: finalClienteId })); 
                } else {
                    // Si falla porque ya está registrado, lo recuperamos
                    if (resCli.message && resCli.message.toLowerCase().includes('registrado')) {
                        try {
                            const matchRes = await apiClient.get(`/clientes?search=${selectedCliente.numero_documento}`);
                            const match = matchRes.data?.find(c => c.numero_documento === selectedCliente.numero_documento);
                            if (match) {
                                finalClienteId = match.id;
                                setForm(prev => ({ ...prev, cliente_id: finalClienteId }));
                            } else {
                                setLoading(false);
                                return toast.error('El cliente ya existe en BD pero no se pudo recuperar su ID. Seleccionelo de la BD.');
                            }
                        } catch(err) {
                            setLoading(false);
                            return toast.error('Error al recuperar el cliente existente en la Base de Datos.');
                        }
                    } else {
                        setLoading(false);
                        return toast.error('Error al registrar nuevo cliente automáticamente: ' + (resCli.message || 'Desconocido'));
                    }
                }
            }

            // Si es Nota de Crédito/Débito, enviamos a otra API
            if (form.tipo_comprobante === '07' || form.tipo_comprobante === '08') {
                if (!form.venta_id_ref) {
                    setLoading(false);
                    return toast.error('Debe seleccionar el comprobante original');
                }
                if (!form.motivo_nota) {
                    setLoading(false);
                    return toast.error('Debe ingresar el motivo de la Nota');
                }
                
                const res = await notasCreditoApi.crear({
                    tipo_comprobante: form.tipo_comprobante,
                    venta_id: form.venta_id_ref,
                    motivo: form.motivo_nota,
                    detalles: detalles.map(det => ({
                        producto_id: det.producto_id,
                        descripcion: det.descripcion,
                        cantidad: det.cantidad,
                        precio_unitario: det.precio_unitario,
                        valor_unitario: det.precio_unitario / 1.18,
                        tipo_afectacion_igv: det.tipo_afectacion_igv || '10'
                    }))
                });
                
                if (res.success) {
                    toast.success('✅ Nota registrada correctamente');
                    setTimeout(() => navigate('/ventas'), 1500);
                } else {
                    toast.error(res.message || 'Error al emitir nota');
                }
                setLoading(false);
                return;
            }

            const payload = {
                // Usamos el cliente generado o seleccionado
                cliente_id: finalClienteId,
                vendedor_id: form.vendedor_id,
                tipo_comprobante: form.tipo_comprobante,
                serie: form.serie,
                moneda: form.moneda,
                condicion_pago: form.condicion_pago,
                metodo_pago: form.metodo_pago || 'EFECTIVO',
                canal_venta: form.canal_venta || 'tienda',
                op_gravada: totales.gravada.toFixed(2),
                op_exonerada: totales.exonerada.toFixed(2),
                op_inafecta: totales.inafecta.toFixed(2),
                op_gratuita: totales.gratuita.toFixed(2),
                igv: totales.igv.toFixed(2),
                importe_total: totales.total.toFixed(2),
                observacion: form.agencia_envio,
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
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mb-2">
                            <BuscadorDocumento
                                label="Búsqueda SUNAT (Externo)"
                                onFound={async (data) => {
                                    const numero = data.ruc || data.dni;
                                    const nombre = data.razon_social || data.nombres;
                                    
                                    // 1. Verificar si YA EXISTE en BD
                                    try {
                                        const res = await apiClient.get(`/clientes?search=${numero}`);
                                        if (res.success && res.data && res.data.length > 0) {
                                            const match = res.data.find(c => c.numero_documento === numero);
                                            if (match) {
                                                toast.success(`Cargado desde Base de Datos: ${match.razon_social}`);
                                                setSearchCliente('');
                                                setForm(prev => ({ ...prev, cliente_id: match.id }));
                                                setSelectedCliente(match);
                                                return; // Evita ponerlo como NEW
                                            }
                                        }
                                    } catch(e) {}

                                    // Si no existe, lo tratamos como NEW
                                    toast.success(`Encontrado en SUNAT/RENIEC: ${nombre}`);
                                    setSearchCliente('');
                                    setForm(prev => ({ ...prev, cliente_id: 'NEW' }));
                                    setSelectedCliente({
                                        id: 'NEW', // Requiere creación automática al guardar
                                        razon_social: nombre,
                                        tipo_documento: (data.ruc ? '6' : '1'),
                                        numero_documento: numero,
                                        direccion_fiscal: data.direccion || ''
                                    });
                                }}
                            />
                        </div>

                        {/* Razón Social/Nombre */}
                        {selectedCliente && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-300 mb-4 transition-all space-y-3">
                                <div className="text-[10px] text-blue-500 font-bold uppercase mb-1 flex justify-between">
                                    <span>{selectedCliente.tipo_documento === '1' ? 'Cliente (Persona)' : 'Empresa (RUC)'}</span>
                                    {selectedCliente.id === 'NEW' && <span className="bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded border border-orange-200">Autoguardado Automático ⚡</span>}
                                </div>
                                
                                <div className="flex gap-2">
                                    <div className="w-1/3">
                                        <label className="text-[10px] font-bold text-blue-800 uppercase">Documento</label>
                                        <input 
                                            type="text" 
                                            value={selectedCliente.numero_documento} 
                                            readOnly={selectedCliente.id !== 'NEW'}
                                            onChange={e => setSelectedCliente({...selectedCliente, numero_documento: e.target.value})}
                                            className="w-full bg-white/50 border border-blue-200 px-2 py-1.5 rounded text-sm text-blue-900 font-bold outline-none"
                                        />
                                    </div>
                                    <div className="w-2/3">
                                        <label className="text-[10px] font-bold text-blue-800 uppercase">Nombre / Razón Social</label>
                                        <input 
                                            type="text" 
                                            value={selectedCliente.razon_social} 
                                            onChange={(e) => setSelectedCliente({...selectedCliente, razon_social: e.target.value})}
                                            className="w-full bg-white border border-blue-300 px-2 py-1.5 rounded text-sm text-blue-900 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            placeholder="Ingresa Nombre o Razón Social"
                                        />
                                    </div>
                                </div>

                                {selectedCliente.tipo_documento === '6' && (
                                    <div>
                                        <label className="text-[10px] font-bold text-blue-800 uppercase">Dirección (Requerido p/ Factura)</label>
                                        <input 
                                            type="text" 
                                            value={selectedCliente.direccion_fiscal} 
                                            onChange={(e) => setSelectedCliente({...selectedCliente, direccion_fiscal: e.target.value})}
                                            className="w-full bg-white border border-blue-300 px-2 py-1.5 rounded text-sm text-blue-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            placeholder="Dirección Fiscal (Opcional presencial)"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Búsqueda en BD */}
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <label className="text-sm font-semibold text-slate-700 block mb-2">Buscar en Base de Datos</label>
                                <input
                                    type="text"
                                    placeholder="RUC o Nombre..."
                                    value={searchCliente}
                                    onChange={e => setSearchCliente(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    setSearchCliente('');
                                    setClientesOptions([]);
                                    setForm(prev => ({ ...prev, cliente_id: 'NEW' }));
                                    setSelectedCliente({
                                        id: 'NEW',
                                        razon_social: '',
                                        tipo_documento: '1',
                                        numero_documento: '',
                                        direccion_fiscal: ''
                                    });
                                }}
                                className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-200 text-sm font-bold flex items-center gap-1 transition-colors"
                                title="Crear Cliente Manualmente (Sin buscar)"
                            >
                                <Plus size={16} /> Manual
                            </button>
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
                                        if (e.target.value === '07') s = 'FC01'; // Por defecto, el backend lo recalcula si es boleta (BC01)
                                        if (e.target.value === '08') s = 'FD01';
                                        setForm({ ...form, tipo_comprobante: e.target.value, serie: s });
                                    }}
                                >
                                    <option value="01">Factura</option>
                                    <option value="03">Boleta</option>
                                    <option value="00">Nota de Venta</option>
                                    <option value="07">Nota de Crédito (07)</option>
                                    <option value="08">Nota de Débito (08)</option>
                                </select>
                            </div>

                            {/* Campos solo para Notas de Crédito/Débito */}
                            {(form.tipo_comprobante === '07' || form.tipo_comprobante === '08') && (
                                <div className="mb-3 bg-red-50 p-3 rounded-lg border border-red-200">
                                    <h4 className="text-xs font-bold text-red-800 mb-2">Referencia (Requerido)</h4>
                                    
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Doc. a Modificar (F001-123)</label>
                                    <div className="relative mb-2">
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                            placeholder="Buscar Venta..."
                                            value={busquedaVentaRef}
                                            onChange={(e) => {
                                                setBusquedaVentaRef(e.target.value);
                                                buscarVentaReferencia(e.target.value);
                                            }}
                                        />
                                        {ventasEncontradas.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                                {ventasEncontradas.map(v => (
                                                    <div key={v.id} onClick={() => seleccionarVentaReferencia(v)} className="px-3 py-2 border-b hover:bg-red-50 cursor-pointer text-xs">
                                                        <div className="font-bold text-red-800">{v.numero_completo}</div>
                                                        <div className="text-slate-500 truncate">{v.cliente_nombre}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Motivo / Sustento</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                        placeholder="Ej: Anulación de la operación"
                                        value={form.motivo_nota}
                                        onChange={(e) => setForm({ ...form, motivo_nota: e.target.value })}
                                        required
                                    />
                                </div>
                            )}

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
                            <div className="mb-3">
                                <label className="text-xs font-semibold text-slate-600 block mb-1">Método de Pago</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-blue-600"
                                    value={form.metodo_pago}
                                    onChange={e => setForm({ ...form, metodo_pago: e.target.value })}
                                >
                                    <option value="EFECTIVO">Efectivo</option>
                                    <option value="TRANSFERENCIA BCP">Transferencia BCP</option>
                                    <option value="TRANSFERENCIA INTERBANK">Transferencia Interbank</option>
                                    <option value="YAPE">Yape</option>
                                    <option value="PLIN">Plin</option>
                                    <option value="POS">POS / Tarjeta</option>
                                    <option value="MIXTO">Mixto (Combinado)</option>
                                </select>
                            </div>

                            {/* Canal de Venta */}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-2">Canal de Venta</label>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <label className={`flex items-center p-2 border rounded cursor-pointer transition-colors ${form.canal_venta === 'tienda' ? 'bg-blue-50 border-blue-400 font-bold text-blue-700' : 'hover:bg-slate-50 border-slate-200'}`}>
                                        <input type="radio" value="tienda" checked={form.canal_venta === 'tienda'} onChange={e => setForm({ ...form, canal_venta: e.target.value })} className="mr-2" />
                                        Tienda (Físico)
                                    </label>
                                    <label className={`flex items-center p-2 border rounded cursor-pointer transition-colors ${form.canal_venta === 'envio_lima' ? 'bg-blue-50 border-blue-400 font-bold text-blue-700' : 'hover:bg-slate-50 border-slate-200'}`}>
                                        <input type="radio" value="envio_lima" checked={form.canal_venta === 'envio_lima'} onChange={e => setForm({ ...form, canal_venta: e.target.value })} className="mr-2" />
                                        Envío Lima
                                    </label>
                                    <label className={`flex items-center p-2 border rounded cursor-pointer transition-colors ${form.canal_venta === 'web' ? 'bg-blue-50 border-blue-400 font-bold text-blue-700' : 'hover:bg-slate-50 border-slate-200'}`}>
                                        <input type="radio" value="web" checked={form.canal_venta === 'web'} onChange={e => setForm({ ...form, canal_venta: e.target.value })} className="mr-2" />
                                        Pág. Web
                                    </label>
                                    <label className={`flex items-center p-2 border rounded cursor-pointer transition-colors ${form.canal_venta === 'envio_provincia' ? 'bg-blue-50 border-blue-400 font-bold text-blue-700' : 'hover:bg-slate-50 border-slate-200'}`}>
                                        <input type="radio" value="envio_provincia" checked={form.canal_venta === 'envio_provincia'} onChange={e => setForm({ ...form, canal_venta: e.target.value })} className="mr-2" />
                                        Envío Provincia
                                    </label>
                                </div>
                            </div>
                            
                            {/* Input condicional para Agencia */}
                            {(form.canal_venta === 'envio_provincia' || form.canal_venta === 'envio_lima') && (
                                <div className="mt-2 animate-in fade-in zoom-in duration-200">
                                    <label className="text-[10px] font-bold text-blue-800 uppercase">Destino / Agencia de Envío</label>
                                    <input 
                                        type="text" 
                                        value={form.agencia_envio}
                                        onChange={e => setForm({...form, agencia_envio: e.target.value})}
                                        className="w-full bg-blue-50 border border-blue-300 px-3 py-2 rounded text-sm text-blue-900 outline-none focus:ring-2 focus:ring-blue-500 placeholder-blue-300 transition-all font-semibold"
                                        placeholder="Ej: SHALOM LOS OLIVOS, OLVA COURIER, etc."
                                        required
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ================== COLUMNA CENTRAL: PRODUCTOS ================== */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
                        <h2 className="text-lg font-bold text-slate-800">Productos</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-3">
                        {/* Importar Cotización */}
                        <div className="flex justify-end mb-2">
                            <button 
                                onClick={() => toast.info('Seleccione la cotización a importar (Módulo en construcción)')}
                                className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-colors"
                            >
                                📥 Importar Cotización
                            </button>
                        </div>
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
                                                <div className="text-xs flex gap-2 items-center mt-1">
                                                    {det.descuento_unitario > 0 ? (
                                                        <>
                                                            <span className="text-slate-400 line-through">S/ {det.precio_unitario.toFixed(2)}</span>
                                                            <span className="text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">
                                                                S/ {(det.precio_unitario - det.descuento_unitario).toFixed(2)} final
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-500">S/ {det.precio_unitario.toFixed(2)} c/u</span>
                                                    )}
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
