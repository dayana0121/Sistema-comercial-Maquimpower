import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import { Plus, Edit, Eye, UserX } from "lucide-react";

// Componentes UI Maquimpower
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";
import { useToast } from '../../hooks/useToast';
import ClienteForm from "./ClienteForm";

export default function ClientesPage() {
    const toast = useToast();

    // Estados de datos
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estados de Filtros y Paginación
    const [search, setSearch] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => { cargarClientes(); }, [currentPage, search, filtroTipo]);

    async function cargarClientes() {
        try {
            setLoading(true);
            const res = await apiClient.get(`/clientes?page=${currentPage}&limit=20&search=${search}&tipo_documento=${filtroTipo}`);
            if (res.success) {
                setData(res.data);
                if (res.pagination) {
                    setTotalPages(res.pagination.pages);
                }
            } else setError(res.message);
        } catch (e) {
            setError("Error de conexión con el servidor.");
        } finally {
            setLoading(false);
        }
    }

    // Estados del Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clienteToEdit, setClienteToEdit] = useState(null);
    const [isReadOnly, setIsReadOnly] = useState(false);

    // Handlers de Acciones
    const handleNew = () => {
        setClienteToEdit(null);
        setIsReadOnly(false);
        setIsModalOpen(true);
    };

    const handleEdit = (cliente) => {
        setClienteToEdit(cliente);
        setIsReadOnly(false);
        setIsModalOpen(true);
    };

    const handleView = (cliente) => {
        setClienteToEdit(cliente);
        setIsReadOnly(true);
        setIsModalOpen(true);
    };

    const handleDesactivar = async (id) => {
        if (!window.confirm("¿Estás seguro de desactivar este cliente? No aparecerá en nuevas ventas.")) return;
        try {
            const res = await apiClient.delete(`/clientes/${id}`);
            if (res.success) {
                toast.success("Cliente desactivado correctamente");
                cargarClientes();
            } else toast.error(res.message);
        } catch (e) { toast.error("Error al conectar con el servidor."); }
    };

    const columns = [
        {
            header: "Cliente / Documento",
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 leading-tight">{row.razon_social}</span>
                    <span className="text-[0.7rem] text-slate-500 font-medium uppercase">
                        {row.tipo_documento === '6' ? 'RUC' : 'DNI'}: {row.numero_documento}
                    </span>
                </div>
            )
        },
        {
            header: "Ubicación",
            render: (row) => (
                <div className="text-xs text-slate-600">
                    <p className="font-medium">{row.distrito || '---'}</p>
                    <p className="text-slate-400">{row.provincia}, {row.departamento}</p>
                </div>
            )
        },
        {
            header: "Contacto",
            render: (row) => (
                <div className="flex flex-col text-xs text-slate-500">
                    <span className="text-slate-700 font-medium">{row.telefono || "---"}</span>
                    <span className="truncate max-w-[150px]">{row.email || "---"}</span>
                </div>
            )
        },
        {
            header: "Estado",
            align: "center",
            render: (row) => (
                <span className={`px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase ${row.activo == 1 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                    }`}>
                    {row.activo == 1 ? "Activo" : "Inactivo"}
                </span>
            )
        },
        {
            header: "Acciones",
            align: "right",
            render: (row) => (
                <div className="flex justify-end gap-1">
                    <button onClick={() => handleView(row)} title="Ver detalles" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <Eye size={17} />
                    </button>
                    <button onClick={() => handleEdit(row)} title="Editar" className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors">
                        <Edit size={17} />
                    </button>
                    <button onClick={() => handleDesactivar(row.id)} title="Desactivar" className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                        <UserX size={17} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6 max-w-[1400px] mx-auto">
            {/* Header con Filtros */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Directorio de Clientes</h1>
                    <p className="text-sm text-slate-500 font-medium">Gestión de entidades para facturación</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={filtroTipo}
                        onChange={(e) => { setFiltroTipo(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 h-[42px]"
                    >
                        <option value="">Todos los Tipos</option>
                        <option value="6">RUC (Empresas)</option>
                        <option value="1">DNI (Personas)</option>
                    </select>

                    <SearchInput
                        onSearch={(val) => { setSearch(val); setCurrentPage(1); }}
                        placeholder="RUC, DNI o Nombre..."
                    />

                    <Button variant="primary" onClick={handleNew}>
                        <Plus size={18} /> Nuevo Cliente
                    </Button>
                </div>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-semibold">{error}</div>}

            {/* Tabla Principal */}
            <DataTable
                columns={columns}
                data={data}
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            {/* Modal de Formulario */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isReadOnly ? "Detalles del Cliente" : (clienteToEdit ? "Modificar Cliente" : "Nuevo Cliente")}
                size="lg"
            >
                <ClienteForm
                    clienteToEdit={clienteToEdit}
                    isReadOnly={isReadOnly}
                    onCancel={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        cargarClientes();
                    }}
                />
            </Modal>
        </div>
    );
}