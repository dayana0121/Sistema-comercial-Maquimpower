import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
// ✅ Cambiamos a LuTriangleAlert (nombre moderno de Lucide)
import { LuPlus, LuSearch, LuPencil, LuPackage, LuTriangleAlert } from 'react-icons/lu';
import '../../styles/business.css';

const ProductosList = () => {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchProductos();
    }, []);

    const fetchProductos = async () => {
        try {
            setLoading(true);
            const resp = await apiClient.get('/productos');
            if (resp.data.success) {
                setProductos(resp.data.data || []);
            }
        } catch (error) {
            console.error("Error cargando productos:", error);
        } finally {
            setLoading(false);
        }
    };

    const productosFiltrados = productos.filter(p =>
        p.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo_interno?.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading && productos.length === 0) {
        return <div className="p-6 text-center">Cargando inventario de Maquimpower...</div>;
    }

    return (
        <div className="productos-list p-6">
            <header className="page-header flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Inventario de Productos</h1>
                    <p className="text-sm text-slate-500">Gestión de activos y stock crítico</p>
                </div>
                <Link to="/productos/nuevo" className="btn-primary flex items-center gap-2">
                    <LuPlus size={18} /> Nuevo Producto
                </Link>
            </header>

            <div className="search-bar mb-6">
                <div className="relative max-w-md">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <LuSearch size={18} />
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar por descripción..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-container bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">SKU / Código</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Descripción</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Precio</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center">Stock</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center">Estado</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {productosFiltrados.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-4 text-sm">
                                    <span className="block text-xs text-slate-400 font-mono">{p.sku || 'S/S'}</span>
                                    <span className="font-bold">{p.codigo_interno}</span>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <LuPackage size={16} className="text-slate-300" />
                                        <span className="text-sm font-medium line-clamp-1">{p.descripcion}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-sm font-bold">
                                    S/ {parseFloat(p.precio_unitario_con_igv).toFixed(2)}
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        {/* ✅ Alerta visual de stock bajo */}
                                        {p.stock_actual <= p.stock_minimo && <LuTriangleAlert className="text-red-500" size={14} />}
                                        <span className={`text-sm font-bold ${p.stock_actual <= p.stock_minimo ? 'text-red-500' : 'text-slate-700'}`}>
                                            {p.stock_actual}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    {renderBadge(p.estado_stock)}
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <Link to={`/productos/editar/${p.id}`} className="text-slate-400 hover:text-orange-600">
                                        <LuPencil size={18} />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const renderBadge = (estado) => {
    const styles = {
        'EN STOCK': 'bg-green-100 text-green-700',
        'BAJO STOCK': 'bg-amber-100 text-amber-700',
        'AGOTADO': 'bg-red-100 text-red-700'
    };
    return (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${styles[estado] || 'bg-slate-100 text-slate-600'}`}>
            {estado}
        </span>
    );
};

export default ProductosList;
/**
 * @deprecated Este componente ha sido reemplazado por ProductosPage.jsx 
 * para unificar la tabla y los modales en una sola vista.
 * (Fecha: Marzo 2026)
 */