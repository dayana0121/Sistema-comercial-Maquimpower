import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { LuPackage, LuSearch, LuFilter, LuTrendingUp, LuTrendingDown, LuInfo, LuCheck } from 'react-icons/lu';
import '../../styles/business.css';

// Componentes modales
import MovimientoModal from './MovimientoModal';
import KardexModal from './KardexModal';

const InventarioList = () => {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');

    // Estados para modales
    const [modalMovimientoOpen, setModalMovimientoOpen] = useState(false);
    const [modalKardexOpen, setModalKardexOpen] = useState(false);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [tipoMovimientoInicial, setTipoMovimientoInicial] = useState('ENTRADA'); // ENTRADA o AJUSTE

    // Indicadores clave
    const [stats, setStats] = useState({
        total: 0,
        enStock: 0,
        bajoStock: 0,
        agotados: 0
    });

    useEffect(() => {
        fetchInventario();
    }, [filtroEstado]);

    const fetchInventario = async (q = '') => {
        try {
            setLoading(true);
            let endpoint = '/api/inventario';
            const params = new URLSearchParams();
            if (q) params.append('q', q);
            if (filtroEstado) params.append('estado_stock', filtroEstado);

            if (params.toString()) {
                endpoint += `?${params.toString()}`;
            }

            const resp = await apiClient.get(endpoint);
            const data = resp.data || [];
            setProductos(data);

            // Calcular stats (solo en carga sin filtros para totales reales)
            if (!q && !filtroEstado) {
                setStats({
                    total: data.length,
                    enStock: data.filter(p => p.estado_stock === 'en_stock').length,
                    bajoStock: data.filter(p => p.estado_stock === 'bajo_stock').length,
                    agotados: data.filter(p => p.estado_stock === 'agotado').length
                });
            }
        } catch (error) {
            console.error("Error cargando inventario:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchInventario(search);
    };

    const abrirMovimiento = (tipo, producto = null) => {
        setTipoMovimientoInicial(tipo);
        setProductoSeleccionado(producto || null); // Si es null, el modal deberá mostrar un buscador
        setModalMovimientoOpen(true);
    };

    const abrirKardex = (producto) => {
        setProductoSeleccionado(producto);
        setModalKardexOpen(true);
    };

    const handleCerrarModales = (recargar = false) => {
        setModalMovimientoOpen(false);
        setModalKardexOpen(false);
        setProductoSeleccionado(null);
        if (recargar) fetchInventario(search);
    };

    // Helper estado visual
    const getStockColorClass = (stockActual, stockMinimo) => {
        if (stockActual <= 0) return 'text-error';
        if (stockActual <= stockMinimo) return 'text-warning';
        return 'text-success';
    };

    if (loading && productos.length === 0) return <div>Cargando inventario...</div>;

    return (
        <div className="inventario-list">
            <header className="page-header" style={{ marginBottom: '1rem' }}>
                <div>
                    <h1>Inventario y Kardex</h1>
                    <p className="text-secundario">Gestión de existencias y movimientos</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => abrirMovimiento('TRASLADO')} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--color-naranja)', color: 'var(--color-naranja)' }}>
                        <LuTrendingUp size={18} style={{ transform: 'rotate(90deg)' }} /> Traslado Físico
                    </button>
                    <button onClick={() => abrirMovimiento('AJUSTE')} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <LuTrendingDown size={18} /> Ajuste/Salida
                    </button>
                    <button onClick={() => abrirMovimiento('ENTRADA')} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <LuTrendingUp size={18} /> Registrar Entrada
                    </button>
                </div>
            </header>

            {/* Indicadores */}
            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="stat-card border-azul" style={{ cursor: 'pointer' }} onClick={() => { setFiltroEstado(''); fetchInventario(search); }}>
                    <div className="stat-icon-wrapper text-azul"><LuPackage size={20} /></div>
                    <div className="stat-info">
                        <p className="stat-label">Total Productos</p>
                        <h3 className="stat-value">{stats.total}</h3>
                    </div>
                </div>
                <div className="stat-card border-verde" style={{ cursor: 'pointer' }} onClick={() => { setFiltroEstado('en_stock'); fetchInventario(search); }}>
                    <div className="stat-icon-wrapper text-verde"><LuCheck size={20} /></div>
                    <div className="stat-info">
                        <p className="stat-label">En Stock Óptimo</p>
                        <h3 className="stat-value">{stats.enStock}</h3>
                    </div>
                </div>
                <div className="stat-card border-naranja" style={{ cursor: 'pointer' }} onClick={() => { setFiltroEstado('bajo_stock'); fetchInventario(search); }}>
                    <div className="stat-icon-wrapper text-naranja"><LuInfo size={20} /></div>
                    <div className="stat-info">
                        <p className="stat-label">Bajo Stock</p>
                        <h3 className="stat-value">{stats.bajoStock}</h3>
                    </div>
                </div>
                <div className="stat-card border-rojo" style={{ cursor: 'pointer' }} onClick={() => { setFiltroEstado('agotado'); fetchInventario(search); }}>
                    <div className="stat-icon-wrapper text-rojo"><LuTrendingDown size={20} /></div>
                    <div className="stat-info">
                        <p className="stat-label">Agotados</p>
                        <h3 className="stat-value">{stats.agotados}</h3>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="search-bar" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <LuSearch size={18} /> Buscar
                    </button>
                </form>

                <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="select-input"
                    style={{ padding: '0.6rem', borderRadius: 'var(--radius-base)', border: '1px solid var(--color-borde)', backgroundColor: 'var(--color-bg-principal)', color: 'var(--color-texto-principal)' }}
                >
                    <option value="">🎯 Todos los estados</option>
                    <option value="en_stock">✅ En Stock</option>
                    <option value="bajo_stock">⚠️ Bajo Stock</option>
                    <option value="agotado">❌ Agotado</option>
                </select>
            </div>

            {/* Tabla Principal */}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th style={{ textAlign: 'center' }}>Stock Mínimo</th>
                            <th style={{ textAlign: 'center' }}>Stock Actual</th>
                            <th>Estado</th>
                            <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productos.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                    No se encontraron productos en el inventario.
                                </td>
                            </tr>
                        ) : (
                            productos.map((p) => (
                                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => abrirKardex(p)} className="row-hover">
                                    <td><small className="text-secundario">{p.sku || 'N/A'}</small></td>
                                    <td><strong>{p.nombre}</strong></td>
                                    <td>{p.categorias?.nombre || '-'}</td>
                                    <td style={{ textAlign: 'center', color: 'var(--color-texto-suave)' }}>{p.stock_minimo}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }} className={getStockColorClass(p.stock_actual, p.stock_minimo)}>
                                            {p.stock_actual}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge badge-${p.estado_stock === 'en_stock' ? 'success' : p.estado_stock === 'bajo_stock' ? 'warning' : 'error'}`}>
                                            {p.estado_stock ? p.estado_stock.toUpperCase().replace('_', ' ') : 'DESCONOCIDO'}
                                        </span>
                                    </td>
                                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => abrirMovimiento('ENTRADA', p)}
                                                className="btn-secondary"
                                                style={{ padding: '0.3rem 0.6rem', color: 'var(--color-exito)' }}
                                                title="Ingresar Stock"
                                            >
                                                +
                                            </button>
                                            <button
                                                onClick={() => abrirMovimiento('SALIDA', p)}
                                                className="btn-secondary"
                                                style={{ padding: '0.3rem 0.6rem', color: 'var(--color-error)' }}
                                                title="Retirar Stock"
                                            >
                                                -
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Renderizado de Modales */}
            {modalMovimientoOpen && (
                <MovimientoModal
                    isOpen={modalMovimientoOpen}
                    onClose={() => handleCerrarModales(false)}
                    onSuccess={() => handleCerrarModales(true)}
                    producto={productoSeleccionado}
                    tipoInicial={tipoMovimientoInicial}
                />
            )}

            {modalKardexOpen && productoSeleccionado && (
                <KardexModal
                    isOpen={modalKardexOpen}
                    onClose={() => handleCerrarModales(false)}
                    producto={productoSeleccionado}
                />
            )}
        </div>
    );
};

export default InventarioList;
