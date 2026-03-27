import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiClient } from '../../api/client';

export default function UsuarioForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        nombres: '',
        apellidos: '',
        email: '',
        password: '',
        rol: 'vendedor',
        activo: 1
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isEdit) loadUser();
    }, [id]);

    const loadUser = async () => {
        const res = await apiClient.get(`/auth/usuarios/${id}`);
        if (res?.success) {
            setFormData({
                ...res.data,
                password: '' // No bajamos el hash de la clave
            });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit ? `/auth/usuarios/${id}` : '/auth/usuarios';

        try {
            const res = method === 'PUT'
                ? await apiClient.put(url, formData)
                : await apiClient.post(url, formData);

            if (res?.success) {
                navigate('/usuarios');
            } else {
                setError(res?.message || "Ocurrió un error");
            }
        } catch (err) {
            setError("Error de conexión con el servidor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container">
            <header className="form-header">
                <Link to="/usuarios" className="btn-back">← Volver al listado</Link>
                <h1 style={{ color: 'var(--color-texto-principal)', marginTop: '0.5rem' }}>
                    {isEdit ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
                </h1>
            </header>

            <form onSubmit={handleSubmit} className="form-card">
                {error && <div className="error-box">{error}</div>}

                <div className="form-grid">
                    <div className="input-group">
                        <label>Nombres</label>
                        <input name="nombres" value={formData.nombres} onChange={handleChange} required />
                    </div>

                    <div className="input-group">
                        <label>Apellidos</label>
                        <input name="apellidos" value={formData.apellidos} onChange={handleChange} required />
                    </div>

                    <div className="input-group">
                        <label>Correo Electrónico</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required disabled={isEdit} />
                    </div>

                    <div className="input-group">
                        <label>{isEdit ? 'Cambiar Contraseña (dejar vacío para mantener)' : 'Contraseña'}</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} required={!isEdit} />
                    </div>

                    <div className="input-group">
                        <label>Rol asignado</label>
                        <select name="rol" value={formData.rol} onChange={handleChange}>
                            <option value="vendedor">Vendedor</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Estado de cuenta</label>
                        <select name="activo" value={formData.activo} onChange={handleChange}>
                            <option value={1}>Activo</option>
                            <option value={0}>Inactivo / Suspendido</option>
                        </select>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn-save" disabled={loading}>
                        {loading ? 'Procesando...' : (isEdit ? 'Guardar Cambios' : 'Crear Usuario')}
                    </button>
                </div>
            </form>
        </div>
    );
}