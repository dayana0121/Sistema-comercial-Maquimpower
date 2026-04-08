import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import { Plus, Edit, Eye, UserX, FileText, Package, AlertTriangle, CheckCircle, FileSpreadsheet } from "lucide-react";

// Componentes UI
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";
import { useToast } from '../../hooks/useToast';
import ProductoForm from "./ProductoForm";
import { exportToExcel } from "../../utils/exportar";
import "../../styles/modal-productos.css";
import "../../styles/productos-page.css";

export default function ProductosPage() {
    const toast = useToast();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filtroStock, setFiltroStock] = useState(""); // Filtro por estado de stock
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Estados Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productoToEdit, setProductoToEdit] = useState(null);
    const [isReadOnly, setIsReadOnly] = useState(false);

    useEffect(() => { cargarProductos(); }, []);

    const cargarProductos = async () => {
        try {
            const res = await apiClient.get("/api/productos");
            if (res.success) {
                setData(res.data);
            }
        } catch (error) {
            toast.error("Error al cargar el inventario");
        }
    };

    // --- LÓGICA REQUERIDA: GENERAR PDF ---
    const handleGenerarPDF = async () => {
        try {
            toast.success("Generando reporte...");
            const token = localStorage.getItem('token');

            const response = await fetch(`${import.meta.env.VITE_API_URL}/productos/reporte`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("Error al generar el documento");

            // Convertir la respuesta a un Blob (Archivo binario)
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            // Abrir en nueva pestaña
            window.open(url, '_blank');

            // Limpiar memoria
            setTimeout(() => window.URL.revokeObjectURL(url), 10000);

        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleDesactivar = async (id) => {
        try {
            const res = await apiClient.delete('/productos/' + id);
            if (res.success) {
                toast.success(res.message);
                cargarProductos(); // Recargar la tabla
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // --- FILTRADO INTELIGENTE ---
    const filtrados = data.filter(p => {
        const matchesSearch = p.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
            p.codigo_interno?.toLowerCase().includes(search.toLowerCase()) ||
            p.sku?.toLowerCase().includes(search.toLowerCase());

        const matchesStock = filtroStock === "" || p.estado_stock === filtroStock;
        return matchesSearch && matchesStock;
    });

    // Paginación
    const indexOfLastItem = currentPage * itemsPerPage;
    const currentItems = filtrados.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);

    const columns = [
        {
            header: "Producto",
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                        {row.imagen_url ? <img src={row.imagen_url} alt={row.descripcion} className="object-cover w-full h-full" /> : <Package className="text-slate-400" size={20} />}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-sm leading-tight line-clamp-1">{row.descripcion}</span>
                        <span className="text-[0.65rem] text-slate-500 font-mono uppercase">ID: {row.codigo_interno} | SKU: {row.sku || '---'}</span>
                    </div>
                </div>
            )
        },
        {
            header: "Precios (S/)",
            render: (row) => (
                <div className="flex flex-col text-xs">
                    <span className="text-slate-500">Base: {row.precio_unitario_sin_igv}</span>
                    <span className="font-bold text-slate-900 text-sm">Total: {row.precio_unitario_con_igv}</span>
                </div>
            )
        },
        {
            header: "Stock Actual",
            render: (row) => {
                // Lógica de Badges requerida
                let badgeClass = "bg-emerald-100 text-emerald-600";
                let Icon = CheckCircle;

                if (row.stock_actual <= 0) {
                    badgeClass = "bg-red-100 text-red-600";
                    Icon = AlertTriangle;
                } else if (row.stock_actual <= row.stock_minimo) {
                    badgeClass = "bg-amber-100 text-amber-600";
                    Icon = AlertTriangle;
                }

                return (
                    <div className="flex flex-col gap-1">
                        <span className="font-bold text-slate-700">{row.stock_actual} <small className="text-slate-400 font-normal">{row.unidad_medida}</small></span>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-bold w-fit uppercase ${badgeClass}`}>
                            <Icon size={10} /> {row.estado_stock}
                        </div>
                    </div>
                );
            }
        },
        {
            header: "Acciones",
            align: "right",
            render: (row) => (
                <div className="flex justify-end gap-1">
                    <button onClick={() => { setProductoToEdit(row); setIsReadOnly(true); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md"><Eye size={17} /></button>
                    <button onClick={() => { setProductoToEdit(row); setIsReadOnly(false); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-orange-500 rounded-md"><Edit size={17} /></button>
                    <button onClick={() => handleDesactivar(row.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md"><UserX size={17} /></button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6 max-w-[1400px] mx-auto productos-page">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Catálogo de Productos</h1>
                    <p className="text-sm text-slate-500">Gestión de inventario y precios SUNAT</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 productos-toolbar">
                    <select
                        value={filtroStock}
                        onChange={(e) => setFiltroStock(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white h-[42px] outline-none focus:ring-2 focus:ring-orange-100 productos-toolbar-select"
                    >
                        <option value="">Todos los niveles</option>
                        <option value="EN STOCK">En Stock</option>
                        <option value="BAJO STOCK">Stock Bajo</option>
                        <option value="AGOTADO">Agotados</option>
                    </select>

                    <SearchInput
                        onSearch={setSearch}
                        placeholder="Buscar por código, descripción..."
                        className="productos-toolbar-search"
                    />

                    <Button
                        variant="secondary"
                        onClick={() => exportToExcel(filtrados, 'catalogo_maquimpower', 'Productos')}
                        icon={FileSpreadsheet}
                        className="productos-toolbar-btn"
                    >
                        Exportar Excel
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={handleGenerarPDF}
                        icon={FileText}
                        className="productos-toolbar-btn"
                    >
                        Orden de Reposición
                    </Button>

                    <Button
                        variant="primary"
                        onClick={() => { setProductoToEdit(null); setIsReadOnly(false); setIsModalOpen(true); }}
                        icon={Plus}
                        className="productos-toolbar-btn"
                    >
                        Nuevo Producto
                    </Button>
                </div>
            </div>

            <DataTable columns={columns} data={currentItems} loading={loading} />

            {/* Modal de Formulario con Pestañas */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isReadOnly ? "Detalles de Producto" : (productoToEdit ? "Editar Producto" : "Nuevo Producto")}
                size="lg"
            >
                <div className="modal-productos-shell">
                    <ProductoForm
                        productoToEdit={productoToEdit}
                        isReadOnly={isReadOnly}
                        onCancel={() => setIsModalOpen(false)}
                        onSuccess={() => { setIsModalOpen(false); cargarProductos(); }}
                    />
                </div>
            </Modal>
        </div>
    );
}
