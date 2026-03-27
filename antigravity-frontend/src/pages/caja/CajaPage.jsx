import { useState, useEffect } from 'react';
import { cajaApi } from '../../api/caja';
import { useToast } from '../../hooks/useToast';
import { Plus, ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import Modal from '../../components/ui/Modal';

const FORMAS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'YAPE', 'PLIN', 'TARJETA', 'CHEQUE'];
const ORIGENES    = ['MANUAL', 'VENTA', 'COMPRA', 'GASTO', 'PRESTAMO', 'OTRO'];

const estadoInicial = {
  tipo: 'INGRESO', monto: '', forma_pago: 'EFECTIVO',
  origen: 'MANUAL', descripcion: '', fecha: new Date().toISOString().split('T')[0],
};

export default function CajaPage() {
  const toast = useToast();
  const [movimientos, setMovimientos] = useState([]);
  const [resumen, setResumen] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(estadoInicial);
  const [guardando, setGuardando] = useState(false);
  const [fechaDesde, setFechaDesde] = useState(new Date().toISOString().split('T')[0]);
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0]);
  const [filtroTipo, setFiltroTipo] = useState('');

  useEffect(() => { cargarResumen(); }, []);
  useEffect(() => { cargarMovimientos(); }, [fechaDesde, fechaHasta, filtroTipo]);

  const cargarResumen = async () => {
    const res = await cajaApi.resumen();
    if (res?.success) setResumen(res.data);
  };

  const cargarMovimientos = async () => {
    setLoading(true);
    const params = { fecha_desde: fechaDesde, fecha_hasta: fechaHasta };
    if (filtroTipo) params.tipo = filtroTipo;
    const res = await cajaApi.listar(params);
    if (res?.success) setMovimientos(res.data);
    setLoading(false);
  };

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleGuardar = async () => {
    if (!form.monto || parseFloat(form.monto) <= 0) { toast.error('Ingresa un monto válido'); return; }
    setGuardando(true);
    const res = await cajaApi.registrar({ ...form, monto: parseFloat(form.monto) });
    setGuardando(false);
    if (res?.success) {
      toast.success(`Movimiento registrado. Nuevo saldo: S/ ${res.data.saldo_nuevo.toFixed(2)}`);
      setIsModalOpen(false);
      setForm(estadoInicial);
      cargarResumen();
      cargarMovimientos();
    } else {
      toast.error(res?.message || 'Error al registrar');
    }
  };

  const fmt = (n) => `S/ ${parseFloat(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Caja</h1>
          <p className="text-sm text-slate-500">Control de ingresos y egresos</p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <button
            onClick={() => { setForm({ ...estadoInicial, tipo: 'INGRESO' }); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors">
            <ArrowUpCircle size={16} /> Ingreso
          </button>
          <button
            onClick={() => { setForm({ ...estadoInicial, tipo: 'EGRESO' }); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors">
            <ArrowDownCircle size={16} /> Egreso
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Saldo Actual',    value: fmt(resumen.saldo_actual),  color: 'border-orange-500', icon: Wallet },
          { label: 'Ingresos Hoy',    value: fmt(resumen.ingresos_hoy),  color: 'border-green-500',  icon: TrendingUp },
          { label: 'Egresos Hoy',     value: fmt(resumen.egresos_hoy),   color: 'border-red-500',    icon: TrendingDown },
          { label: 'Ingresos Mes',    value: fmt(resumen.ingresos_mes),  color: 'border-blue-500',   icon: TrendingUp },
          { label: 'Egresos Mes',     value: fmt(resumen.egresos_mes),   color: 'border-purple-500', icon: TrendingDown },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`bg-white rounded-xl border-t-4 ${color} shadow-sm p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className="text-slate-400" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
            </div>
            <p className="text-xl font-extrabold text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center bg-white border border-slate-200 rounded-xl p-4">
        <Calendar size={14} className="text-slate-400" />
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none" />
        <span className="text-slate-300">—</span>
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none" />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white outline-none">
          <option value="">Todos</option>
          <option value="INGRESO">Ingresos</option>
          <option value="EGRESO">Egresos</option>
        </select>
      </div>

      {/* Tabla movimientos */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Fecha','Tipo','Origen','Descripción','Forma Pago','Monto','Saldo Anterior','Saldo Nuevo'].map(h =>
                <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading
              ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Cargando...</td></tr>
              : movimientos.length === 0
                ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Sin movimientos en el periodo</td></tr>
                : movimientos.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">{m.fecha}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${m.tipo === 'INGRESO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{m.origen}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 max-w-xs truncate">{m.descripcion || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{m.forma_pago}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${m.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                      {m.tipo === 'INGRESO' ? '+' : '-'} {fmt(m.monto)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{fmt(m.saldo_anterior)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-800">{fmt(m.saldo_nuevo)}</td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={form.tipo === 'INGRESO' ? 'Registrar Ingreso' : 'Registrar Egreso'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
              <div className="flex gap-2">
                {['INGRESO','EGRESO'].map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm(f => ({...f, tipo: t}))}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${form.tipo === t
                      ? t === 'INGRESO' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Monto (S/) *</label>
              <input type="number" step="0.01" name="monto" value={form.monto} onChange={handleChange}
                placeholder="0.00" className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-100 text-lg font-bold" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Forma de Pago</label>
              <select name="forma_pago" value={form.forma_pago} onChange={handleChange}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none">
                {FORMAS_PAGO.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Origen</label>
              <select name="origen" value={form.origen} onChange={handleChange}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none">
                {ORIGENES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Fecha</label>
            <input type="date" name="fecha" value={form.fecha} onChange={handleChange}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Descripción</label>
            <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
              placeholder="Descripción del movimiento..."
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button onClick={handleGuardar} disabled={guardando}
              className={`px-4 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors ${form.tipo === 'INGRESO' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
              {guardando ? 'Registrando...' : `Registrar ${form.tipo}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
