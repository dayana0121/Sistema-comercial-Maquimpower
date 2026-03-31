import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { reportesApi } from '../../api/reportes';
import { vendedoresApi } from '../../api/vendedores';
import { useToast } from '../../hooks/useToast';
import { TrendingUp, Package, ArrowUpDown, Calendar, RefreshCw, DollarSign, PieChart, Users } from 'lucide-react';

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
  const [vendedorId, setVendedorId] = useState('');
  const [categoria, setCategoria] = useState('');
  
  const [loading, setLoading] = useState({ ventas: true, top: true, stock: true, rentabilidad: true });

  const [vendedores, setVendedores] = useState([]);
  const [ventasData, setVentasData] = useState([]);
  const [ventasResumen, setVentasResumen] = useState({});
  const [topData, setTopData] = useState([]);
  const [stockData, setStockData] = useState([]);
  
  // Rentabilidad
  const [rentGlobal, setRentGlobal] = useState({});
  const [rentSerie, setRentSerie] = useState([]);
  const [rentTop, setRentTop] = useState([]);

  useEffect(() => {
    // Cargar vendedores para el filtro
    vendedoresApi.listar().then(res => {
      if (res?.success && res.data) {
        setVendedores(res.data.vendedores || []);
      }
    }).catch(console.error);
  }, []);

  const cargar = useCallback(async () => {
    const params = { fecha_desde: desde, fecha_hasta: hasta };
    if (vendedorId) params.vendedor_id = vendedorId;
    if (categoria) params.categoria = categoria;

    setLoading({ ventas: true, top: true, stock: true, rentabilidad: true });

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

    // Movimientos stock (solo fechas)
    reportesApi.movimientosStock({ fecha_desde: desde, fecha_hasta: hasta }).then(res => {
      if (res?.success) setStockData(res.data);
      else toast.error('Error al cargar inventario');
      setLoading(l => ({ ...l, stock: false }));
    });

    // Rentabilidad
    reportesApi.rentabilidad(params).then(res => {
      if (res?.success && res.data) {
        setRentGlobal(res.data.global);
        setRentSerie(res.data.serie_tiempo);
        setRentTop(res.data.top_rentables);
      }
      setLoading(l => ({ ...l, rentabilidad: false }));
    }).catch(() => setLoading(l => ({ ...l, rentabilidad: false })));

  }, [desde, hasta, vendedorId, categoria]);

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
            <Users size={14} className="text-slate-400" />
            <select value={vendedorId} onChange={e => setVendedorId(e.target.value)} className="text-sm border-none outline-none bg-transparent text-slate-700 w-[120px]">
              <option value="">Todos los Vend.</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre} {v.apellido}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <Calendar size={14} className="text-slate-400" />
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              className="text-sm border-none outline-none bg-transparent text-slate-700" />
            <span className="text-slate-300 text-sm">—</span>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
              className="text-sm border-none outline-none bg-transparent text-slate-700" />
          </div>
          <button onClick={cargar}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg transition-colors">
            <RefreshCw size={14} />
            Aplicar Filtros
          </button>
        </div>
      </div>

      {/* KPIs FINANCIEROS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ingresos Netos"
          value={rentGlobal?.ingresos ? `S/ ${parseFloat(rentGlobal.ingresos).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '—'}
          sub={`${desde} → ${hasta}`}
          color="blue"
        />
        <KpiCard
          label="Costo de Ventas (COGS)"
          value={rentGlobal?.cogs ? `S/ ${parseFloat(rentGlobal.cogs).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '—'}
          sub="Costo ponderado estimado"
          color="orange"
        />
        <KpiCard
          label="Utilidad Bruta"
          value={rentGlobal?.utilidad ? `S/ ${parseFloat(rentGlobal.utilidad).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '—'}
          sub="Ingresos - Costos"
          color="green"
        />
        <div className={`bg-white rounded-xl border-t-4 border-emerald-500 shadow-sm p-5`}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Margen %</p>
            <p className="text-3xl font-extrabold text-emerald-600">{rentGlobal?.margen_porcentaje ?? 0}%</p>
            <p className="text-xs text-slate-400 mt-1">Margen sobre ventas netas</p>
        </div>
      </div>

      {/* RENTABILIDAD AVANZADA (Gráfico + Top) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Card title="Evolución de Rentabilidad (Costos vs Ingresos)" icon={TrendingUp} loading={loading.rentabilidad}>
                {rentSerie.length === 0
                ? <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Sin datos financieros para analizar</div>
                : <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={rentSerie} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `S/${v/1000}k`} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => `S/ ${value}`} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar yAxisId="left" dataKey="ingresos" name="Ingresos (S/)" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={35} />
                        <Bar yAxisId="left" dataKey="cogs" name="COGS (Costo S/)" fill="#fb923c" opacity={0.8} radius={[4, 4, 0, 0]} barSize={35} />
                        <Line yAxisId="left" type="monotone" dataKey="utilidad" name="Utilidad Bruta (S/)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                    </ResponsiveContainer>
                }
            </Card>
        </div>

        <div>
             <Card title="Top Márgenes por Producto" icon={PieChart} loading={loading.rentabilidad}>
                 {rentTop.length === 0
                 ? <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Sin datos para rankear</div>
                 : <div className="overflow-y-auto pr-2" style={{ maxHeight: '320px' }}>
                     {rentTop.slice(0, 10).map((prod, idx) => (
                         <div key={idx} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded px-2 transition-colors">
                             <div className="flex-1 w-[60%]">
                                 <p className="text-xs font-bold text-slate-800 truncate" title={prod.producto}>{prod.producto}</p>
                                 <p className="text-[10px] text-slate-400 uppercase tracking-wider">{prod.codigo}</p>
                             </div>
                             <div className="flex flex-col items-end w-[40%]">
                                 <span className="text-xs font-black text-emerald-600">S/ {parseFloat(prod.utilidad).toFixed(2)}</span>
                                 <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded ml-2">{prod.margen}%</span>
                             </div>
                         </div>
                     ))}
                 </div>
                 }
             </Card>
        </div>
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
