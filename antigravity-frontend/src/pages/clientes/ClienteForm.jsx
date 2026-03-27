// src/pages/clientes/ClienteForm.jsx
import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Search, Building2, MapPin, Contact2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import BuscadorDocumento from '../../components/ui/BuscadorDocumento';
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
const ClienteForm = ({ clienteToEdit = null, isReadOnly = false, onSuccess, onCancel }) => {
    const toast = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        tipo_documento: '6',
        numero_documento: '',
        razon_social: '',
        nombre_comercial: '',
        direccion_fiscal: '',
        ubigeo: '',
        departamento: '',
        provincia: '',
        distrito: '',
        contacto_nombre: '',
        email: '',
        telefono: '',
        activo: true
    });

    // src/pages/clientes/ClienteForm.jsx
    useEffect(() => {
        if (clienteToEdit) {
            setFormData(clienteToEdit);
        } else {
            // Si no hay cliente (es uno nuevo), resetear a valores iniciales
            setFormData({
                tipo_documento: '6',
                numero_documento: '',
                razon_social: '',
                direccion_fiscal: '',
                departamento: '',
                provincia: '',
                distrito: '',
                email: '',
                telefono: '',
                activo: true
            });
        }
    }, [clienteToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = clienteToEdit ? `/clientes/${clienteToEdit.id}` : '/clientes';
            const method = clienteToEdit ? 'PUT' : 'POST';
            const res = method === 'PUT' ? await apiClient.put(url, formData) : await apiClient.post(url, formData);
            if (res.success) {
                toast.success("Guardado correctamente");
                onSuccess();
            } else toast.error(res.message);
        } catch {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const SectionTitle = ({ icon: Icon, title }) => (
        <div className="flex items-center gap-2 mb-3 mt-2 border-b border-slate-100 pb-2 text-slate-500">
            <Icon size={16} />
            <span className="text-[0.7rem] font-bold uppercase tracking-wider">{title}</span>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
                <SectionTitle icon={Building2} title="Identificación Legal" />
                {!isReadOnly && (
                    <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-dashed border-slate-300">
                        <BuscadorDocumento
                            label="Búsqueda Rápida (SUNAT/RENIEC)"
                            onFound={(data) => {
                                setFormData(prev => ({
                                    ...prev,
                                    numero_documento: data.ruc || data.dni || prev.numero_documento,
                                    razon_social: data.razon_social || prev.razon_social,
                                    direccion_fiscal: data.direccion || data.direccion_fiscal || prev.direccion_fiscal,
                                    departamento: data.departamento || prev.departamento,
                                    provincia: data.provincia || prev.provincia,
                                    distrito: data.distrito || prev.distrito,
                                    ubigeo: data.ubigeo || prev.ubigeo || ''
                                }));
                                toast.success("Datos cargados correctamente");
                            }}
                        />
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500">Tipo Documento</label>
                        <select
                            name="tipo_documento" value={formData.tipo_documento} onChange={handleChange} disabled={isReadOnly}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500"
                        >
                            <option value="6">RUC</option>
                            <option value="1">DNI</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <Input label="Nro Documento" name="numero_documento" value={formData.numero_documento} onChange={handleChange} disabled={isReadOnly} placeholder="Ingresa nro..." />
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 mt-4">
                    <Input label="Razón Social" name="razon_social" value={formData.razon_social} onChange={handleChange} disabled={isReadOnly} />
                </div>
            </div>

            {/* SECCIÓN 2: UBICACIÓN */}
            <div>
                <SectionTitle icon={MapPin} title="Dirección y Ubicación" />
                <Input label="Dirección Fiscal" name="direccion_fiscal" value={formData.direccion_fiscal} onChange={handleChange} disabled={isReadOnly} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <Input label="Departamento" name="departamento" value={formData.departamento} onChange={handleChange} disabled={isReadOnly} />
                    <Input label="Provincia" name="provincia" value={formData.provincia} onChange={handleChange} disabled={isReadOnly} />
                    <Input label="Distrito" name="distrito" value={formData.distrito} onChange={handleChange} disabled={isReadOnly} />
                </div>
            </div>

            {/* SECCIÓN 3: CONTACTO */}
            <div>
                <SectionTitle icon={Contact2} title="Información de Contacto" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input type="email" label="Email" name="email" value={formData.email} onChange={handleChange} disabled={isReadOnly} placeholder="ejemplo@correo.com" />
                    <Input label="Teléfono" name="telefono" value={formData.telefono} onChange={handleChange} disabled={isReadOnly} placeholder="999..." />
                </div>
            </div>

            {/* BOTONES */}
            <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
                <Button variant="secondary" onClick={onCancel} type="button">Cerrar</Button>
                {!isReadOnly && (
                    <Button type="submit" variant="primary" loading={loading}>
                        {clienteToEdit ? 'Actualizar Datos' : 'Registrar Cliente'}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default ClienteForm;