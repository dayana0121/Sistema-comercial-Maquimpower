import { useState, useEffect } from 'react';
import { comprasApi, proveedoresApi } from '../../api/compras';
import { useToast } from '../../hooks/useToast';
import { Plus, Eye, X, Search, ShoppingCart, Package } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import apiClient from '../../api/client';

const itemVacio = { producto_id: '', descripcion: '', unidad_medida: 'NIU', cantidad: 1, costo_unitario: 0 };

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
    numero_comprobante: '', fecha_comprobante: new Date().toISOString().split('T')[0],
    moneda: 'PEN', observacion: '',
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
    if (prod) cambiarItem(idx, 'descripcion', prod.descripcion);
    cambiarItem(idx, 'producto_id', productoId);
  };

  const totales = items.reduce((acc, it) => {
    const sub = (parseFloat(it.cantidad) || 0) * (parseFloat(it.costo_unitario) || 0);
    return { gravada: acc.gravada + sub, igv: acc.igv + sub * 0.18, total: acc.total + sub * 1.18 };
  }, { gravada: 0, igv: 0, total: 0 });

  const handleGuardar = async () => {
    if (!form.proveedor_id) { toast.error('Selecciona un proveedor'); return; }
    if (items.some(i => !i.descripcion || !i.cantidad || !i.costo_unitario)) {
      toast.error('Completa todos los campos de los ítems'); return;
    }
    setGuardando(true);
    const res = await comprasApi.crear({ ...form, detalles: items });
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
              <label className="text-xs font-bold text-slate-500 uppercase">Nro. Comprobante</label>
              <input value={form.numero_comprobante} onChange={e => setForm(f=>({...f, numero_comprobante: e.target.value}))}
                placeholder="F001-00001" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
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
                  <th className="px-3 py-2 text-left font-bold text-slate-500">Producto</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500">Descripción</th>
                  <th className="px-3 py-2 text-center font-bold text-slate-500">Cant.</th>
                  <th className="px-3 py-2 text-center font-bold text-slate-500">Costo Unit.</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-500">Subtotal</th>
                  <th className="px-3 py-2"></th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-1.5">
                        <select value={it.producto_id} onChange={e => seleccionarProducto(idx, e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white">
                          <option value="">— Producto —</option>
                          {productos.map(p => <option key={p.id} value={p.id}>{p.codigo_interno}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5"><input value={it.descripcion} onChange={e => cambiarItem(idx,'descripcion',e.target.value)} placeholder="Descripción" className="w-full px-2 py-1 border border-slate-200 rounded text-xs"/></td>
                      <td className="px-2 py-1.5"><input type="number" value={it.cantidad} onChange={e => cambiarItem(idx,'cantidad',e.target.value)} className="w-16 px-2 py-1 border border-slate-200 rounded text-xs text-center"/></td>
                      <td className="px-2 py-1.5"><input type="number" step="0.01" value={it.costo_unitario} onChange={e => cambiarItem(idx,'costo_unitario',e.target.value)} className="w-24 px-2 py-1 border border-slate-200 rounded text-xs text-center"/></td>
                      <td className="px-2 py-1.5 text-right font-bold">S/ {((parseFloat(it.cantidad)||0)*(parseFloat(it.costo_unitario)||0)).toFixed(2)}</td>
                      <td className="px-2 py-1.5"><button onClick={() => quitarItem(idx)} className="text-red-400 hover:text-red-600"><X size={13}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1 min-w-[220px]">
              <div className="flex justify-between text-slate-600"><span>Op. Gravada:</span><span>S/ {totales.gravada.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-600"><span>IGV (18%):</span><span>S/ {totales.igv.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2"><span>TOTAL:</span><span className="text-orange-600">S/ {totales.total.toFixed(2)}</span></div>
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
