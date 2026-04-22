import { useState, useEffect } from 'react';
import { cajaApi } from '../../api/caja';
import { useToast } from '../../hooks/useToast';
import { Plus, ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import "../../styles/caja.css";


const FORMAS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'YAPE', 'PLIN', 'TARJETA', 'CHEQUE'];
const ORIGENES = ['MANUAL', 'VENTA', 'COMPRA', 'GASTO', 'PRESTAMO', 'OTRO'];

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
    <div className="p-6 mx-auto space-y-6">

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
          { label: 'Saldo Actual', value: fmt(resumen.saldo_actual), color: 'border-orange-500', icon: Wallet },
          { label: 'Ingresos Hoy', value: fmt(resumen.ingresos_hoy), color: 'border-green-500', icon: TrendingUp },
          { label: 'Egresos Hoy', value: fmt(resumen.egresos_hoy), color: 'border-red-500', icon: TrendingDown },
          { label: 'Ingresos Mes', value: fmt(resumen.ingresos_mes), color: 'border-blue-500', icon: TrendingUp },
          { label: 'Egresos Mes', value: fmt(resumen.egresos_mes), color: 'border-purple-500', icon: TrendingDown },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`tarjetas bg-white rounded-xl border-t-4 ${color} shadow-sm p-4`}>
            <div className="texto-card flex items-center gap-2 mb-1">
              <Icon size={14} className="text-slate-400" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
            </div>
            <p className="text-xl font-extrabold text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="filtros flex gap-3 flex-wrap items-center bg-white border border-slate-200 rounded-xl p-4">
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
      <div className="caja-table-container bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
        <table className="caja-table w-full text-center">
          <thead className="caja-table-head bg-[#F8F9FA] border-b border-slate-100">
            <tr>
              {['Fecha', 'Tipo', 'Origen', 'Descripción', 'Forma Pago', 'Monto', 'Saldo Anterior', 'Saldo Nuevo'].map((h, index) =>
                <th key={h} className="caja-table-th px-8 py-5 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider text-center">{h}</th>)}
            </tr>
          </thead>
          <tbody className="caja-table-body">
            {loading
              ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Cargando...</td></tr>
              : movimientos.length === 0
                ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Sin movimientos en el periodo</td></tr>
                : movimientos.map((m, index) => {
                  const rowClasses = `caja-table-row transition-colors hover:bg-[#FDEFE6] ${m.tipo === 'EGRESO' ? 'bg-[#FFF9F0]' : 'bg-white'}`;
                  return (
                    <tr key={m.id} className={rowClasses}>
                      <td className="caja-table-td px-8 py-5 text-[14.5px] text-slate-700 font-medium text-center">{m.fecha}</td>
                      <td className="caja-table-td px-8 py-5 text-[14.5px] text-slate-700 font-medium text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${m.tipo === 'INGRESO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {m.tipo}
                        </span>
                      </td>
                      <td className="caja-table-td px-8 py-5 text-[14.5px] text-slate-700 font-medium text-center">{m.origen}</td>
                      <td className="caja-table-td px-8 py-5 text-[14.5px] text-slate-700 font-medium text-center max-w-xs truncate">{m.descripcion || '—'}</td>
                      <td className="caja-table-td px-8 py-5 text-[14.5px] text-slate-700 font-medium text-center">{m.forma_pago}</td>
                      <td className={`caja-table-td px-8 py-5 text-[14.5px] font-bold text-center ${m.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                        {m.tipo === 'INGRESO' ? '+' : '-'} {fmt(m.monto)}
                      </td>
                      <td className="caja-table-td px-8 py-5 text-[14.5px] text-slate-700 font-medium text-center">{fmt(m.saldo_anterior)}</td>
                      <td className="caja-table-td px-8 py-5 text-[14.5px] text-slate-700 font-medium text-center font-bold text-slate-800">{fmt(m.saldo_nuevo)}</td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={form.tipo === 'INGRESO' ? 'Registrar Ingreso' : 'Registrar Egreso'} size="md">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="form-group-custom">
              <label className="form-label-custom">Tipo</label>
              <div className="flex gap-2">
                {['INGRESO', 'EGRESO'].map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm(f => ({ ...f, tipo: t }))}
                    // Si el botón es el seleccionado, le ponemos 'btn-activo', si no, 'btn-inactivo'
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${form.tipo === t ? 'btn-tipo-activo' : 'btn-tipo-inactivo'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group-custom">
              <label className="form-label-custom">Monto (S/) *</label>
              <input type="number" step="0.01" name="monto" value={form.monto} onChange={handleChange}
                placeholder="0.00" className="form-input-custom text-lg font-bold text-slate-800 focus:text-slate-900" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="form-group-custom">
              <label className="form-label-custom">Forma de Pago</label>
              <select name="forma_pago" value={form.forma_pago} onChange={handleChange}
                className="form-input-custom">
                {FORMAS_PAGO.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-group-custom">
              <label className="form-label-custom">Origen</label>
              <select name="origen" value={form.origen} onChange={handleChange}
                className="form-input-custom">
                {ORIGENES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group-custom">
            <label className="form-label-custom">Fecha</label>
            <input type="date" name="fecha" value={form.fecha} onChange={handleChange}
              className="form-input-custom" />
          </div>
          <div className="form-group-custom">
            <label className="form-label-custom">Descripción</label>
            <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
              placeholder="Descripción del movimiento..."
              className="form-input-custom resize-none" />
          </div>
          <div className="form-actions-custom border-t border-slate-100">
            <button onClick={() => setIsModalOpen(false)}
              className="btn-cancel-custom">Cancelar</button>
            <button onClick={handleGuardar} disabled={guardando}
              className={`registrar px-4 py-2 text-white text-sm font-semibold rounded-md disabled:opacity-50 transition-colors ${form.tipo === 'INGRESO' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
              {guardando ? 'Registrando...' : `Registrar ${form.tipo}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
