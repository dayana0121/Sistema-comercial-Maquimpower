import { useState, useEffect } from 'react';
import { proveedoresApi } from '../../api/compras';
import { useToast } from '../../hooks/useToast';
import { Plus, Edit, Trash2, Search, Building2, Phone, Mail } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import BuscadorDocumento from '../../components/ui/BuscadorDocumento';

const estadoInicial = {
  tipo_documento: 'RUC', numero_documento: '', razon_social: '',
  nombre_comercial: '', direccion: '', telefono: '', email: '',
  contacto_nombre: '', cuenta_bancaria: '', banco: '', cci: '',
  condicion_pago: 'CONTADO', dias_credito: 0,
};

export default function ProveedoresPage() {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(estadoInicial);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    const res = await proveedoresApi.listar();
    if (res?.success) setData(res.data);
    setLoading(false);
  };

  const abrirNuevo = () => { setEditando(null); setForm(estadoInicial); setIsModalOpen(true); };
  const abrirEditar = (p) => { setEditando(p); setForm(p); setIsModalOpen(true); };

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleGuardar = async () => {
    if (!form.razon_social || !form.numero_documento) { toast.error('RUC y razón social son obligatorios'); return; }
    setGuardando(true);
    const res = editando
      ? await proveedoresApi.actualizar(editando.id, form)
      : await proveedoresApi.crear(form);
    setGuardando(false);
    if (res?.success) { toast.success(res.message); setIsModalOpen(false); cargar(); }
    else toast.error(res?.message || 'Error al guardar');
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Desactivar este proveedor?')) return;
    const res = await proveedoresApi.eliminar(id);
    if (res?.success) { toast.success('Proveedor desactivado'); cargar(); }
    else toast.error(res?.message || 'Error');
  };

  const filtrados = data.filter(p =>
    p.razon_social?.toLowerCase().includes(search.toLowerCase()) ||
    p.numero_documento?.includes(search)
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Proveedores</h1>
          <p className="text-sm text-slate-500">Directorio de proveedores activos</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-100 bg-white"
              placeholder="Buscar por RUC o nombre..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={abrirNuevo}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus size={16} /> Nuevo Proveedor
          </button>
        </div>
      </div>

      {loading
        ? <div className="text-center py-12 text-slate-400">Cargando proveedores...</div>
        : filtrados.length === 0
          ? <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
            {search ? 'Sin resultados para la búsqueda' : 'No hay proveedores registrados'}
          </div>
          : <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtrados.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                      <Building2 size={18} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm leading-tight">{p.razon_social}</p>
                      <p className="text-xs text-slate-500 font-mono">{p.tipo_documento}: {p.numero_documento}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => abrirEditar(p)} className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"><Edit size={15} /></button>
                    <button onClick={() => handleEliminar(p.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-slate-500">
                  {p.telefono && <div className="flex items-center gap-2"><Phone size={11} />{p.telefono}</div>}
                  {p.email && <div className="flex items-center gap-2"><Mail size={11} />{p.email}</div>}
                  {p.condicion_pago && (
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${p.condicion_pago === 'CONTADO' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.condicion_pago}{p.dias_credito > 0 ? ` ${p.dias_credito}d` : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
      }

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={editando ? 'Editar Proveedor' : 'Nuevo Proveedor'} size="lg">
        {!editando && (
          <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
            <BuscadorDocumento
              label="Búsqueda Rápida SUNAT"
              onFound={(data) => {
                setForm(prev => ({
                  ...prev,
                  numero_documento: data.ruc || data.dni || prev.numero_documento,
                  razon_social: data.razon_social || prev.razon_social,
                  direccion: data.direccion || data.direccion_fiscal || prev.direccion,
                }));
                toast.success('Proveedor encontrado');
              }}
            />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'RUC / Documento *', name: 'numero_documento', placeholder: '20...' },
            { label: 'Razón Social *', name: 'razon_social', placeholder: 'Empresa S.A.C.' },
            { label: 'Nombre Comercial', name: 'nombre_comercial', placeholder: '' },
            { label: 'Dirección', name: 'direccion', placeholder: '' },
            { label: 'Teléfono', name: 'telefono', placeholder: '999...' },
            { label: 'Email', name: 'email', placeholder: 'proveedor@...' },
            { label: 'Contacto', name: 'contacto_nombre', placeholder: 'Nombre del contacto' },
            { label: 'Banco', name: 'banco', placeholder: 'BCP, Interbank...' },
            { label: 'Cuenta Bancaria', name: 'cuenta_bancaria', placeholder: '' },
            { label: 'CCI', name: 'cci', placeholder: '' },
          ].map(f => (
            <div key={f.name} className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{f.label}</label>
              <input name={f.name} value={form[f.name] || ''} onChange={handleChange} placeholder={f.placeholder}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-100" />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Condición de Pago</label>
            <select name="condicion_pago" value={form.condicion_pago} onChange={handleChange}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white">
              <option value="CONTADO">Contado</option>
              <option value="CREDITO">Crédito</option>
            </select>
          </div>
          {form.condicion_pago === 'CREDITO' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Días de Crédito</label>
              <input type="number" name="dias_credito" value={form.dias_credito || 0} onChange={handleChange}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-100" />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <button onClick={() => setIsModalOpen(false)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={handleGuardar} disabled={guardando}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
            {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Crear Proveedor'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
