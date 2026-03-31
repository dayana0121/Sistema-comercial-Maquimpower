import { useState, useEffect } from 'react';
import { comprasApi, proveedoresApi } from '../../api/compras';
import { useToast } from '../../hooks/useToast';
import { Plus, Eye, X, Search, ShoppingCart, Package } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import apiClient from '../../api/client';

const itemVacio = { producto_id: '', descripcion: '', unidad_medida: 'NIU', cantidad: 1, costo_unitario: 0, tipo_afectacion_igv: '10', incluye_igv: false };

export default function ComprasPage() {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [compraDetalle, setCompraDetalle] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [form, setForm] = useState({
    proveedor_id: '', tipo_comprobante: 'FACTURA',
    serie: '', correlativo: '', fecha_comprobante: new Date().toISOString().split('T')[0],
    moneda: 'PEN', observacion: '', metodo_pago: 'CONTADO', termino_pago_dias: 0
  });
  const [items, setItems] = useState([{ ...itemVacio }]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargar();
    proveedoresApi.listar().then(r => r?.success && setProveedores(r.data));
    apiClient.get('/api/productos').then(r => r?.success && setProductos(r.data));
  }, []);

  const cargar = async () => {
    setLoading(true);
    const res = await comprasApi.listar(filtroEstado ? { estado: filtroEstado } : {});
    if (res?.success) setData(res.data);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [filtroEstado]);

  const agregarItem = () => setItems(i => [...i, { ...itemVacio }]);
  const quitarItem = (idx) => setItems(i => i.filter((_, j) => j !== idx));
  const cambiarItem = (idx, campo, valor) => setItems(i => i.map((it, j) => j === idx ? { ...it, [campo]: valor } : it));

  const seleccionarProducto = (idx, productoId) => {
    const prod = productos.find(p => p.id === productoId);
    if (prod) {
        cambiarItem(idx, 'descripcion', prod.descripcion);
        cambiarItem(idx, 'unidad_medida', prod.unidad_medida || 'NIU');
    }
    cambiarItem(idx, 'producto_id', productoId);
  };
  
  // Buscador de productos
  const [busquedaProducto, setBusquedaProducto] = useState({});
  const buscarProd = (idx, texto) => {
    setBusquedaProducto(p => ({...p, [idx]: texto}));
    // No seleccionamos producto hasta que click, pero vaciamos si borra
    if (!texto) cambiarItem(idx, 'producto_id', '');
  };

  const totales = items.reduce((acc, it) => {
    const cantidad = parseFloat(it.cantidad) || 0;
    const pIngresado = parseFloat(it.costo_unitario) || 0;
    const pBase = it.incluye_igv ? pIngresado / 1.18 : pIngresado;
    const subtotal = cantidad * pBase;
    
    let g = 0, e = 0, i = 0, igv = 0;
    if (it.tipo_afectacion_igv === '10') { g = subtotal; igv = subtotal * 0.18; }
    else if (it.tipo_afectacion_igv === '20') { e = subtotal; }
    else { i = subtotal; }
    
    return { gravada: acc.gravada + g, exonerada: acc.exonerada + e, inafecta: acc.inafecta + i, igv: acc.igv + igv, total: acc.total + g + e + i + igv };
  }, { gravada: 0, exonerada: 0, inafecta: 0, igv: 0, total: 0 });

  const handleGuardar = async () => {
    if (!form.proveedor_id) { toast.error('Selecciona un proveedor'); return; }
    if (items.some(i => !i.descripcion || !i.cantidad || !i.costo_unitario)) {
      toast.error('Completa todos los campos de los ítems'); return;
    }
    setGuardando(true);
    const itemsProc = items.map(it => ({
        ...it, 
        costo_unitario: it.incluye_igv ? ((parseFloat(it.costo_unitario)||0) / 1.18).toFixed(4) : (parseFloat(it.costo_unitario)||0)
    }));
    const res = await comprasApi.crear({ ...form, detalles: itemsProc });
    setGuardando(false);
    if (res?.success) { toast.success('Compra registrada. Stock actualizado.'); setIsModalOpen(false); cargar(); setItems([{ ...itemVacio }]); }
    else toast.error(res?.message || 'Error al registrar');
  };

  const verDetalle = async (id) => {
    const res = await comprasApi.obtener(id);
    if (res?.success) { setCompraDetalle(res.data); setDetalleOpen(true); }
  };

  const handleAnular = async (id) => {
    if (!window.confirm('¿Anular esta compra?')) return;
    const res = await comprasApi.anular(id);
    if (res?.success) { toast.success('Compra anulada'); cargar(); }
  };

  const badgeEstado = (e) => {
    const m = { PENDIENTE: 'bg-amber-100 text-amber-700', RECIBIDO: 'bg-green-100 text-green-700', ANULADO: 'bg-slate-100 text-slate-500', PARCIAL: 'bg-blue-100 text-blue-700' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${m[e] || 'bg-slate-100 text-slate-500'}`}>{e}</span>;
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Órdenes de Compra</h1>
          <p className="text-sm text-slate-500">Registro de compras a proveedores</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none">
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="RECIBIDO">Recibido</option>
            <option value="ANULADO">Anulado</option>
          </select>
          <button onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg">
            <Plus size={16} /> Nueva Compra
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Nro. Comprobante','Proveedor','Fecha','Total','Estado','Estado Pago','Acciones'].map(h =>
              <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading
              ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Cargando...</td></tr>
              : data.length === 0
                ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No hay compras registradas</td></tr>
                : data.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-bold">{c.numero_comprobante || '—'}<br/><span className="text-xs font-normal text-slate-400">{c.tipo_comprobante}</span></td>
                    <td className="px-4 py-3 text-sm">{c.proveedor_nombre}<br/><span className="text-xs text-slate-400">{c.proveedor_ruc}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.fecha_comprobante}</td>
                    <td className="px-4 py-3 text-sm font-bold text-orange-600">S/ {parseFloat(c.importe_total).toFixed(2)}</td>
                    <td className="px-4 py-3">{badgeEstado(c.estado)}</td>
                    <td className="px-4 py-3">{badgeEstado(c.estado_pago)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => verDetalle(c.id)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><Eye size={15}/></button>
                        {c.estado !== 'ANULADO' && <button onClick={() => handleAnular(c.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><X size={15}/></button>}
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Modal Nueva Compra */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Orden de Compra" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Proveedor *</label>
              <select value={form.proveedor_id} onChange={e => setForm(f => ({...f, proveedor_id: e.target.value}))}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none">
                <option value="">— Seleccionar —</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Tipo Comprobante</label>
              <select value={form.tipo_comprobante} onChange={e => setForm(f=>({...f, tipo_comprobante: e.target.value}))}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none">
                <option value="FACTURA">Factura</option>
                <option value="BOLETA">Boleta</option>
                <option value="ORDEN">Orden de Compra</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Serie y Número</label>
              <div className="flex gap-2">
                  <input value={form.serie} onChange={e => setForm(f=>({...f, serie: e.target.value}))}
                    placeholder="F001" className="w-1/3 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none uppercase" />
                  <input value={form.correlativo} onChange={e => setForm(f=>({...f, correlativo: e.target.value}))}
                    placeholder="000001" className="w-2/3 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Método de Pago</label>
              <select value={form.metodo_pago} onChange={e => setForm(f => ({...f, metodo_pago: e.target.value, termino_pago_dias: e.target.value === 'CREDITO_30' ? 30 : e.target.value === 'CREDITO_15' ? 15 : e.target.value === 'CREDITO_45' ? 45 : 0}))}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none">
                <option value="CONTADO">Contado (Efectivo/Transf)</option>
                <option value="CREDITO_15">Crédito a 15 días</option>
                <option value="CREDITO_30">Crédito a 30 días</option>
                <option value="CREDITO_45">Crédito a 45 días</option>
                <option value="PERSONALIZADO">Crédito Personalizado</option>
              </select>
            </div>
            {form.metodo_pago === 'PERSONALIZADO' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Plazo (Días)</label>
                <input type="number" min="1" value={form.termino_pago_dias} onChange={e => setForm(f=>({...f, termino_pago_dias: parseInt(e.target.value)||0}))}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none" />
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Ítems de Compra</label>
              <button onClick={agregarItem} className="text-xs text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-1"><Plus size={12}/>Agregar ítem</button>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50"><tr>
                  <th className="px-3 py-2 text-left font-bold text-slate-500 min-w[180px]">Producto</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500">Descripción / U.M.</th>
                  <th className="px-3 py-2 text-center font-bold text-slate-500 min-w[80px]">Cant.</th>
                  <th className="px-3 py-2 text-center font-bold text-slate-500 min-w[110px]">Costo Unit.</th>
                  <th className="px-3 py-2 text-center font-bold text-slate-500">Afectación</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-500">Subtotal</th>
                  <th className="px-3 py-2"></th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-1.5 align-top relative">
                        <input value={busquedaProducto[idx] !== undefined ? busquedaProducto[idx] : (productos.find(p=>p.id===it.producto_id)?.codigo_interno || '')} onChange={e => buscarProd(idx, e.target.value)} placeholder="Buscar SKU..." className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"/>
                        {(busquedaProducto[idx] && !it.producto_id) && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 shadow-md rounded max-h-32 overflow-y-auto">
                                {productos.filter(p => (p.codigo_interno || '').toLowerCase().includes(busquedaProducto[idx].toLowerCase()) || (p.descripcion || '').toLowerCase().includes(busquedaProducto[idx].toLowerCase())).slice(0, 10).map(p => (
                                    <div key={p.id} onClick={() => {seleccionarProducto(idx, p.id); setBusquedaProducto(pb => ({...pb, [idx]: p.codigo_interno}));}} className="px-2 py-1 hover:bg-slate-50 cursor-pointer text-xs border-b">
                                        <div className="font-bold">{p.codigo_interno}</div><div className="text-[10px] text-slate-500 truncate">{p.descripcion}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5 align-top">
                          <input value={it.descripcion} onChange={e => cambiarItem(idx,'descripcion',e.target.value)} placeholder="Descripción" className="w-full px-2 py-1 border border-slate-200 rounded text-xs mb-1"/>
                          <input value={it.unidad_medida} onChange={e => cambiarItem(idx,'unidad_medida',e.target.value)} placeholder="NIU" className="w-full px-2 py-1 border border-slate-200 rounded text-[10px] text-slate-500 bg-slate-50" title="Unidad de Medida (NIU, KGM, LTR)"/>
                      </td>
                      <td className="px-2 py-1.5 align-top"><input type="number" value={it.cantidad} onChange={e => cambiarItem(idx,'cantidad',e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs text-center"/></td>
                      <td className="px-2 py-1.5 align-top">
                          <input type="number" step="0.01" value={it.costo_unitario} onChange={e => cambiarItem(idx,'costo_unitario',e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs text-center mb-1"/>
                          <label className="flex items-center gap-1 text-[10px] text-slate-500 justify-center cursor-pointer">
                              <input type="checkbox" checked={it.incluye_igv} onChange={e => cambiarItem(idx, 'incluye_igv', e.target.checked)} /> <span>+ IGV (18%)</span>
                          </label>
                      </td>
                      <td className="px-2 py-1.5 align-top text-center">
                          <select value={it.tipo_afectacion_igv} onChange={e => cambiarItem(idx,'tipo_afectacion_igv',e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded text-[10px] outline-none overflow-hidden text-ellipsis">
                              <option value="10">10-Grav.</option>
                              <option value="20">20-Exon.</option>
                              <option value="30">30-Inaf.</option>
                          </select>
                      </td>
                      <td className="px-2 py-1.5 align-top text-right font-bold text-slate-700">
                          S/ {(() => {
                              const cb = it.incluye_igv ? (parseFloat(it.costo_unitario)||0)/1.18 : (parseFloat(it.costo_unitario)||0); 
                              const sb = cb * (parseFloat(it.cantidad)||0);
                              return (it.tipo_afectacion_igv==='10' ? sb * 1.18 : sb).toFixed(2);
                          })()}
                      </td>
                      <td className="px-2 py-1.5 align-top pt-2"><button onClick={() => quitarItem(idx)} className="text-red-400 hover:text-red-600"><X size={14}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1 min-w-[240px]">
              {totales.exonerada > 0 && <div className="flex justify-between text-slate-600 text-xs"><span>Op. Exonerada:</span><span>S/ {totales.exonerada.toFixed(2)}</span></div>}
              {totales.inafecta > 0 && <div className="flex justify-between text-slate-600 text-xs"><span>Op. Inafecta:</span><span>S/ {totales.inafecta.toFixed(2)}</span></div>}
              <div className="flex justify-between text-slate-600"><span>Op. Gravada:</span><span>S/ {totales.gravada.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-600"><span>IGV (18%):</span><span>S/ {totales.igv.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t border-slate-200 pt-2 text-slate-800"><span>TOTAL:</span><span className="text-orange-600">S/ {totales.total.toFixed(2)}</span></div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Observación</label>
            <textarea value={form.observacion} onChange={e => setForm(f=>({...f, observacion: e.target.value}))} rows={2}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none resize-none"/>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button onClick={handleGuardar} disabled={guardando}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
              {guardando ? 'Registrando...' : 'Registrar Compra'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Detalle */}
      <Modal isOpen={detalleOpen} onClose={() => setDetalleOpen(false)} title={`Detalle: ${compraDetalle?.numero_comprobante || ''}`} size="lg">
        {compraDetalle && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500 text-xs uppercase font-bold">Proveedor</span><p className="font-semibold">{compraDetalle.proveedor_nombre}</p></div>
              <div><span className="text-slate-500 text-xs uppercase font-bold">Estado</span><p>{compraDetalle.estado}</p></div>
              <div><span className="text-slate-500 text-xs uppercase font-bold">Fecha</span><p>{compraDetalle.fecha_comprobante}</p></div>
              <div><span className="text-slate-500 text-xs uppercase font-bold">Total</span><p className="font-bold text-orange-600">S/ {parseFloat(compraDetalle.importe_total).toFixed(2)}</p></div>
            </div>
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50"><tr>
                <th className="px-3 py-2 text-left">Descripción</th>
                <th className="px-3 py-2 text-center">Cant.</th>
                <th className="px-3 py-2 text-right">Costo Unit.</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(compraDetalle.detalles || []).map((d, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{d.descripcion}</td>
                    <td className="px-3 py-2 text-center">{d.cantidad}</td>
                    <td className="px-3 py-2 text-right">S/ {parseFloat(d.costo_unitario).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-bold">S/ {parseFloat(d.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
