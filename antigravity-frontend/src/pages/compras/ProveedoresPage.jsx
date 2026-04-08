import { useState, useEffect } from 'react';
import { proveedoresApi } from '../../api/compras';
import { useToast } from '../../hooks/useToast';
import { Plus, Edit, Trash2, Search, Building2, Phone, Mail, FileText, CreditCard } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import BuscadorDocumento from '../../components/ui/BuscadorDocumento';

const estadoInicial = {
  tipo_documento: 'RUC',
  numero_documento: '',
  razon_social: '',
  nombre_comercial: '',
  direccion: '',
  telefono: '',
  email: '',
  contacto_nombre: '',
  cuenta_bancaria: '',
  banco: '',
  cci: '',
  condicion_pago: 'CONTADO',
  dias_credito: 0,
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

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setLoading(true);
    const res = await proveedoresApi.listar();
    if (res?.success) setData(res.data);
    setLoading(false);
  };

  const abrirNuevo = () => {
    setEditando(null);
    setForm(estadoInicial);
    setIsModalOpen(true);
  };

  const abrirEditar = (p) => {
    setEditando(p);
    setForm(p);
    setIsModalOpen(true);
  };

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleGuardar = async () => {
    if (!form.razon_social || !form.numero_documento) {
      toast.error('RUC y razón social son obligatorios');
      return;
    }

    setGuardando(true);
    const res = editando ? await proveedoresApi.actualizar(editando.id, form) : await proveedoresApi.crear(form);
    setGuardando(false);

    if (res?.success) {
      toast.success(res.message);
      setIsModalOpen(false);
      cargar();
    } else {
      toast.error(res?.message || 'Error al guardar');
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Desactivar este proveedor?')) return;
    const res = await proveedoresApi.eliminar(id);
    if (res?.success) {
      toast.success('Proveedor desactivado');
      cargar();
    } else {
      toast.error(res?.message || 'Error');
    }
  };

  const filtrados = data.filter(
    (p) => p.razon_social?.toLowerCase().includes(search.toLowerCase()) || p.numero_documento?.includes(search)
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
            <input
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-100 bg-white"
              placeholder="Buscar por RUC o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={abrirNuevo}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} /> Nuevo Proveedor
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando proveedores...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
          {search ? 'Sin resultados para la búsqueda' : 'No hay proveedores registrados'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrados.map((p, index) => {
            const borderColors = ['border-t-orange-400', 'border-t-green-400', 'border-t-blue-400'];
            const borderColor = borderColors[index % borderColors.length];

            return (
              <div
                key={p.id}
                className={`bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden ${borderColor}`}
                style={{ borderTopWidth: '4px' }}
              >
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-[15px] leading-tight mb-1">{p.razon_social}</h3>
                      <p className="text-xs text-slate-500">
                        {p.tipo_documento}: {p.numero_documento}
                      </p>
                    </div>

                    <div className="flex gap-1 shrink-0 bg-slate-100 rounded-md p-0.5">
                      <button
                        onClick={() => abrirEditar(p)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded transition-colors"
                      >
                        <Edit size={14} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => handleEliminar(p.id)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded transition-colors"
                      >
                        <Trash2 size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2 text-[13px] text-slate-600">
                    {p.telefono && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-orange-400" />
                        <span>{p.telefono}</span>
                      </div>
                    )}
                    {p.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-orange-400" />
                        <span>{p.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-slate-100 bg-white">
                  <span className="text-[10px] font-bold text-green-600 tracking-wider uppercase">Contacto</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editando ? 'Editar Proveedor' : 'Nuevo Proveedor'} size="lg">
        {/* Cuerpo del formulario */}
        <div className="bg-white proveedores-modal-content">
          {!editando && (
            <div className="modal-soft-section">
              <BuscadorDocumento
                label="Búsqueda Rápida SUNAT"
                onFound={(data) => {
                  setForm((prev) => ({
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'RUC / Documento *', name: 'numero_documento', placeholder: '20...', icon: FileText, color: 'text-orange', highlight: true },
              { label: 'Razón Social *', name: 'razon_social', placeholder: 'Empresa S.A.C.', icon: Building2, color: 'text-blue' },
              { label: 'Nombre Comercial', name: 'nombre_comercial', placeholder: '' },
              { label: 'Dirección', name: 'direccion', placeholder: '' },
              { label: 'Teléfono', name: 'telefono', placeholder: '999...', icon: Phone, color: 'text-orange' },
              { label: 'Email', name: 'email', placeholder: 'proveedor@...' },
              { label: 'Contacto', name: 'contacto_nombre', placeholder: 'Nombre del contacto' },
              { label: 'Banco', name: 'banco', placeholder: 'BCP, Interbank...', icon: CreditCard, color: 'text-green' },
              { label: 'Cuenta Bancaria', name: 'cuenta_bancaria', placeholder: '' },
              { label: 'CCI', name: 'cci', placeholder: '' },
            ].map((f) => (
              <div key={f.name} className="form-group-custom">
                <label className="form-label-custom">{f.label}</label>
                <div className="form-input-container">
                  {f.icon && (
                    <div className={`form-input-icon ${f.color}`}>
                      <f.icon size={16} strokeWidth={2.5} />
                    </div>
                  )}
                  <input
                    name={f.name}
                    value={form[f.name] || ''}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                    className={`form-input-custom ${f.icon ? 'with-icon' : ''} ${f.highlight && !form[f.name] ? 'highlight' : ''}`}
                  />
                </div>
              </div>
            ))}

            <div className="form-group-custom">
              <label className="form-label-custom">Condición de Pago</label>
              <select name="condicion_pago" value={form.condicion_pago} onChange={handleChange} className="form-input-custom">
                <option value="CONTADO">Contado</option>
                <option value="CREDITO">Crédito</option>
              </select>
            </div>

            {form.condicion_pago === 'CREDITO' && (
              <div className="form-group-custom">
                <label className="form-label-custom">Días de Crédito</label>
                <input type="number" name="dias_credito" value={form.dias_credito || 0} onChange={handleChange} className="form-input-custom" />
              </div>
            )}
          </div>
        </div>

        {/* Acciones del modal */}
        <div className="form-actions-custom border-t text-sm border-slate-100 flex justify-end gap-3 mt-4 proveedores-modal-actions">
          <button onClick={() => setIsModalOpen(false)} className="btn-cancel-custom">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={guardando} className="btn-submit-custom disabled:opacity-50">
            {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Crear Proveedor'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
