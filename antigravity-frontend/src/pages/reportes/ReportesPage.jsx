import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { reportesApi } from '../../api/reportes';
import { useToast } from '../../hooks/useToast';
import { TrendingUp, Package, ArrowUpDown, Calendar, RefreshCw } from 'lucide-react';

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, color = 'orange' }) => {
  const colors = {
    orange: 'border-orange-500 text-orange-600',
    green:  'border-green-500 text-green-600',
    blue:   'border-blue-500 text-blue-600',
  };
  return (
    <div className={`bg-white rounded-xl border-t-4 ${colors[color]} shadow-sm p-5`}>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
};

// ─── Section Card ─────────────────────────────────────────────────────────────
const Card = ({ title, icon: Icon, children, loading }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
        <Icon size={16} className="text-orange-500" />
      </div>
      <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
    </div>
    <div className="p-6">
      {loading
        ? <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Cargando...</div>
        : children}
    </div>
  </div>
);

// ─── Tooltip custom ──────────────────────────────────────────────────────────
const TooltipVentas = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.name.includes('S/') || p.name === 'total' || p.name === 'gravada' || p.name === 'igv'
            ? `S/ ${parseFloat(p.value).toFixed(2)}`
            : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Componente principal ────────────────────────────────────────────────────
export default function ReportesPage() {
  const toast = useToast();

  // Rango de fechas — último mes por defecto
  const hoy = new Date().toISOString().split('T')[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [desde, setDesde] = useState(inicioMes);
  const [hasta, setHasta] = useState(hoy);
  const [loading, setLoading] = useState({ ventas: true, top: true, stock: true });

  const [ventasData, setVentasData] = useState([]);
  const [ventasResumen, setVentasResumen] = useState({});
  const [topData, setTopData] = useState([]);
  const [stockData, setStockData] = useState([]);

  const cargar = useCallback(async () => {
    const params = { fecha_desde: desde, fecha_hasta: hasta };
    setLoading({ ventas: true, top: true, stock: true });

    // Ventas por día
    reportesApi.ventasPorDia(params).then(res => {
      if (res?.success) { setVentasData(res.data); setVentasResumen(res.resumen); }
      else toast.error('Error al cargar ventas');
      setLoading(l => ({ ...l, ventas: false }));
    });

    // Top productos
    reportesApi.topProductos({ ...params, limit: 8 }).then(res => {
      if (res?.success) setTopData(res.data);
      else toast.error('Error al cargar productos');
      setLoading(l => ({ ...l, top: false }));
    });

    // Movimientos stock
    reportesApi.movimientosStock(params).then(res => {
      if (res?.success) setStockData(res.data);
      else toast.error('Error al cargar inventario');
      setLoading(l => ({ ...l, stock: false }));
    });
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Reportes</h1>
          <p className="text-sm text-slate-500">Análisis de ventas e inventario</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <Calendar size={14} className="text-slate-400" />
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              className="text-sm border-none outline-none bg-transparent text-slate-700" />
            <span className="text-slate-300 text-sm">—</span>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
              className="text-sm border-none outline-none bg-transparent text-slate-700" />
          </div>
          <button onClick={cargar}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
            <RefreshCw size={14} />
            Actualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Ventas"
          value={ventasResumen.total_ventas ?? '—'}
          sub={`${desde} → ${hasta}`}
          color="orange"
        />
        <KpiCard
          label="Ingresos Totales"
          value={ventasResumen.total_ingresos ? `S/ ${parseFloat(ventasResumen.total_ingresos).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '—'}
          sub="Sin anulados"
          color="green"
        />
        <KpiCard
          label="Top Producto"
          value={topData[0]?.producto?.slice(0, 20) || '—'}
          sub={topData[0] ? `S/ ${parseFloat(topData[0].total).toFixed(2)}` : ''}
          color="blue"
        />
        <KpiCard
          label="Días con ventas"
          value={ventasData.filter(d => d.ventas > 0).length || '—'}
          sub="En el periodo"
          color="orange"
        />
      </div>

      {/* Gráfico 1 — Ventas por día */}
      <Card title="Ventas por Día" icon={TrendingUp} loading={loading.ventas}>
        {ventasData.length === 0
          ? <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Sin datos en el periodo seleccionado</div>
          : <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={ventasData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradIgv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `S/${v}`} />
                <Tooltip content={<TooltipVentas />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="total" name="Total S/" stroke="#f97316" strokeWidth={2} fill="url(#gradTotal)" />
                <Area type="monotone" dataKey="igv" name="IGV S/" stroke="#3b82f6" strokeWidth={1.5} fill="url(#gradIgv)" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
        }
      </Card>

      {/* Gráfico 2 — Top Productos */}
      <Card title="Top Productos más Vendidos" icon={Package} loading={loading.top}>
        {topData.length === 0
          ? <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Sin datos en el periodo seleccionado</div>
          : <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `S/${v}`} />
                <YAxis type="category" dataKey="producto" width={160}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={v => v.length > 22 ? v.slice(0, 22) + '…' : v} />
                <Tooltip
                  formatter={(v, n) => [n === 'total' ? `S/ ${parseFloat(v).toFixed(2)}` : v, n === 'total' ? 'Ingreso' : 'Unidades']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="total" name="Ingreso S/" fill="#f97316" radius={[0, 4, 4, 0]} />
                <Bar dataKey="cantidad" name="Unidades" fill="#fb923c" opacity={0.6} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
        }
      </Card>

      {/* Gráfico 3 — Movimientos de inventario */}
      <Card title="Movimientos de Inventario" icon={ArrowUpDown} loading={loading.stock}>
        {stockData.length === 0
          ? <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Sin movimientos en el periodo seleccionado</div>
          : <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stockData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="ENTRADA" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="SALIDA"  stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="AJUSTE"  stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
        }
      </Card>

    </div>
  );
}
