import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { LuPlus, LuSearch, LuPencil, LuTrash2 } from 'react-icons/lu';
import '../../styles/business.css';

const ClientesList = () => {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchClientes();
    }, []);

    const fetchClientes = async (q = '') => {
        try {
            setLoading(true);
            const endpoint = q ? `/api/clientes?q=${encodeURIComponent(q)}` : '/api/clientes';
            const resp = await apiClient.get(endpoint);
            setClientes(resp.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchClientes(search);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Está seguro de querer desactivar este cliente?')) return;
        try {
            await apiClient.delete(`/api/clientes/${id}`);
            fetchClientes(search);
        } catch (error) {
            alert("Error eliminando cliente: " + error.message);
        }
    };

    if (loading && clientes.length === 0) return <div>Cargando catálogo de clientes...</div>;

    return (
        <div className="clientes-list">
            <header className="page-header">
                <h1>Gestión de Clientes</h1>
                <Link to="/clientes/nuevo" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><LuPlus size={18} /> Nuevo Cliente</Link>
            </header>

            <div className="search-bar" style={{ marginBottom: '1.5rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        placeholder="Buscar por RUC/DNI o Razón Social..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><LuSearch size={18} /> Buscar</button>
                </form>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Documento</th>
                            <th>Razón Social / Nombre</th>
                            <th>Contacto</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clientes.map((c) => (
                            <tr key={c.id}>
                                <td><small>{c.tipo_documento === '6' ? 'RUC' : 'DNI'}:</small> {c.numero_documento}</td>
                                <td><strong>{c.razon_social}</strong></td>
                                <td>
                                    <div>{c.email}</div>
                                    <small>{c.telefono}</small>
                                </td>
                                <td>
                                    <span className={`badge badge-${c.activo ? 'success' : 'error'}`}>
                                        {c.activo ? 'ACTIVO' : 'INACTIVO'}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Link to={`/clientes/editar/${c.id}`} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', display: 'inline-flex', alignItems: 'center' }}><LuPencil size={16} /></Link>
                                        <button onClick={() => handleDelete(c.id)} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', color: 'var(--color-error)', display: 'inline-flex', alignItems: 'center' }}><LuTrash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ClientesList;
