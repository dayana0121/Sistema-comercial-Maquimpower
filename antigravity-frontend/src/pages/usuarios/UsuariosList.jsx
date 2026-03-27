import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

export default function UsuariosList() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => { loadUsuarios(); }, []);

    const loadUsuarios = async () => {
        setLoading(true);
        const res = await apiClient.get('/auth/usuarios');
        if (res?.success) setUsuarios(res.data);
        setLoading(false);
    };

    return (
        <div className="form-container" style={{ maxWidth: '1000px' }}>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ color: 'var(--color-texto-principal)' }}>Usuarios del Sistema</h1>
                    <p style={{ color: 'var(--color-texto-secundario)' }}>Gestiona los accesos de Maquimpower</p>
                </div>
                <button className="btn-save" onClick={() => navigate('/usuarios/nuevo')}>
                    + Nuevo Usuario
                </button>
            </header>

            <div className="form-card" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'var(--color-bg-principal)', borderBottom: '1px solid var(--color-borde)' }}>
                        <tr>
                            <th style={{ padding: '1rem' }}>Usuario</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid var(--color-borde-suave)' }}>
                                <td style={{ padding: '1rem' }}>
                                    <strong>{u.nombres} {u.apellidos}</strong>
                                </td>
                                <td>{u.email}</td>
                                <td>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                                        backgroundColor: u.rol === 'admin' ? 'var(--color-info-suave)' : 'var(--color-borde-suave)',
                                        color: u.rol === 'admin' ? 'var(--color-info)' : 'var(--color-texto-secundario)'
                                    }}>
                                        {u.rol.toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    <span style={{ color: u.activo ? 'var(--color-exito)' : 'var(--color-error)' }}>
                                        {u.activo ? '● Activo' : '● Inactivo'}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        onClick={() => navigate(`/usuarios/editar/${u.id}`)}
                                        style={{ background: 'none', color: 'var(--color-info)', marginRight: '10px' }}
                                    >
                                        Editar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}