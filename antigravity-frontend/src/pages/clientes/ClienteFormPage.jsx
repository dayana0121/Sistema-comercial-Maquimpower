import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import ClienteForm from './ClienteForm';

const ClienteFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [clienteToEdit, setClienteToEdit] = useState(null);
    const [loading, setLoading] = useState(isEdit);
    const [error, setError] = useState('');

    useEffect(() => {
        // Yo solo consulto el cliente cuando la ruta es de edición.
        const loadCliente = async () => {
            if (!isEdit) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const res = await apiClient.get(`/clientes/${id}`);
                if (res?.success) {
                    setClienteToEdit(res.data);
                } else {
                    setError(res?.message || 'No se pudo cargar el cliente.');
                }
            } catch (err) {
                setError(err?.message || 'Error de conexión con el servidor.');
            } finally {
                setLoading(false);
            }
        };

        loadCliente();
    }, [id, isEdit]);

    const handleSuccess = () => {
        navigate('/clientes');
    };

    const handleCancel = () => {
        navigate('/clientes');
    };

    if (loading) {
        return (
            <div className="p-6 max-w-[1100px] mx-auto">
                <div className="mb-6">
                    <Link to="/clientes" className="text-sm font-semibold text-slate-500 hover:text-slate-700">
                        ← Volver al listado
                    </Link>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
                    Cargando formulario de cliente...
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1100px] mx-auto">
            <div className="mb-6 flex flex-col gap-2">
                <Link to="/clientes" className="text-sm font-semibold text-slate-500 hover:text-slate-700">
                    ← Volver al listado
                </Link>
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">
                        {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">
                        {isEdit ? 'Actualiza los datos del cliente seleccionado' : 'Registra un nuevo cliente desde cero'}
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    {error}
                </div>
            )}

            {!error && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <ClienteForm
                        clienteToEdit={clienteToEdit}
                        onCancel={handleCancel}
                        onSuccess={handleSuccess}
                    />
                </div>
            )}
        </div>
    );
};

export default ClienteFormPage;
