import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from 'react-router-dom';
import { Eye, RefreshCw, X, FileText } from 'lucide-react';
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import SearchInput from "../../components/ui/SearchInput";
import Modal from "../../components/ui/Modal";
import { ventasApi } from "../../api/ventas";
import { useToast } from "../../hooks/useToast";
import VentaForm from "./VentaForm"; // El formulario de creación
import VentaDetalle from "./VentaDetalle"; // Componente simple de visualización
import { exportToExcel } from "../../utils/exportar";
import { abrirPdfVenta } from "../../utils/pdf";
import { FileSpreadsheet } from "lucide-react";

const VentasPage = () => {
    const toast = useToast();

    // Estado local
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [ventaToView, setVentaToView] = useState(null);

    const cargarVentas = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filtroEstado) params.estado_sunat = filtroEstado;
            if (fechaDesde) params.fecha_desde = fechaDesde;
            if (fechaHasta) params.fecha_hasta = fechaHasta;

            const res = await ventasApi.listar(params);
            if (res.success) {
                setData(res.data.ventas || res.data);
            }
        } catch (err) {
            toast.error(err.message || "Error al cargar los comprobantes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarVentas();
    }, [filtroEstado]); // Recargar automáticamente al cambiar el estado

    const [searchParams] = useSearchParams();
    useEffect(() => {
        if (searchParams.get('nueva') === 'true') {
            setIsModalOpen(true);
        }
    }, [searchParams]);

    // Filtrado local por búsqueda (Número o Cliente)
    const filteredData = useMemo(() => {
        return data.filter((v) =>
            v.numero_completo?.toLowerCase().includes(search.toLowerCase()) ||
            v.cliente_nombre?.toLowerCase().includes(search.toLowerCase())
        );
    }, [data, search]);

    // Helpers de UI
    const badgeSunat = (estado) => {
        const map = {
            'ACEPTADO': 'bg-emerald-100 text-emerald-700',
            'PENDIENTE': 'bg-amber-100 text-amber-700',
            'RECHAZADO': 'bg-red-100 text-red-700',
            'ANULADO': 'bg-slate-100 text-slate-500',
        };
        return <span className={`px-2 py-1 rounded-full text-[10px] gap-1 flex items-center w-fit font-bold uppercase ${map[estado] || 'bg-slate-100'}`}>{estado}</span>;
    };

    const badgePago = (estado) => {
        const isPagado = estado === 'PAGADO';
        return (
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${isPagado ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {estado || 'PENDIENTE'}
            </span>
        );
    };

    const handleReintentar = async (id) => {
        try {
            const res = await ventasApi.reintentar(id);
            if (res.success) toast.success(res.message);
            else toast.error(res.message);
            cargarVentas();
        } catch (err) {
            toast.error("Error en la conexión con SUNAT");
        }
    };

    const handleAnular = async (id) => {
        if (window.confirm("¿Está seguro de anular este comprobante? Esta acción es irreversible.")) {
            try {
                const res = await ventasApi.anular(id);
                if (res.success) {
                    toast.success("Comprobante anulado correctamente");
                    cargarVentas();
                }
            } catch (err) {
                toast.error("No se pudo anular el comprobante");
            }
        }
    };

    const columns = [
        {
            header: "Comprobante",
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">{row.numero_completo}</span>
                    <span className="text-xs text-slate-400 capitalize">
                        {row.tipo_comprobante === '01' ? 'Factura' : 'Boleta'}
                    </span>
                </div>
            ),
        },
        { header: "Cliente", key: "cliente_nombre" },
        {
            header: "Fecha",
            render: (row) => {
                const date = new Date(row.fecha_emision);
                return date.toLocaleDateString('es-PE');
            }
        },
        {
            header: "Total",
            render: (row) => <span className="font-bold text-orange-600">S/ {row.importe_total}</span>
        },
        { header: "SUNAT", render: (row) => badgeSunat(row.estado_sunat) },
        { header: "Pago", render: (row) => badgePago(row.estado_pago) },
        {
            header: "Acciones",
            render: (row) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => {
                            console.log('Venta seleccionada:', row);
                            setVentaToView(row);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="Ver detalle"
                    >
                        <Eye size={16} />
                    </button>

                    <button
                        onClick={() => abrirPdfVenta(row.id, import.meta.env.VITE_API_URL).catch(() => toast.error('Error al generar PDF'))}
                        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        title="Ver PDF"
                    >
                        <FileText size={16} />
                    </button>

                    {(row.estado_sunat === 'PENDIENTE' || row.estado_sunat === 'RECHAZADO') && (
                        <button
                            onClick={() => handleReintentar(row.id)}
                            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                            title="Reintentar SUNAT"
                        >
                            <RefreshCw size={16} />
                        </button>
                    )}

                    {row.estado_sunat !== 'ANULADO' && (
                        <button
                            onClick={() => handleAnular(row.id)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Anular"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Comprobantes de Venta</h1>
                    <p className="text-slate-500 text-sm">Facturación electrónica · SUNAT UBL 2.1</p>
                </div>
                <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                    + Nueva Venta
                </Button>
            </div>

            {/* Barra de Filtros */}
            <div className="grid grid-cols-1 md:flex items-center gap-3 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <select
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                >
                    <option value="">Todos los estados</option>
                    <option value="ACEPTADO">ACEPTADO</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="RECHAZADO">RECHAZADO</option>
                    <option value="ANULADO">ANULADO</option>
                </select>

                <input
                    type="date"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                />
                <input
                    type="date"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                />

                <Button onClick={cargarVentas} className="px-6">Buscar</Button>

                <Button variant="secondary" onClick={() => exportToExcel(filteredData, 'ventas_maquimpower', 'Ventas')} className="flex items-center gap-2">
                    <FileSpreadsheet size={16} /> Exportar Excel
                </Button>

                <div className="ml-auto min-w-[250px]">
                    <SearchInput onSearch={setSearch} placeholder="Cliente o número..." />
                </div>
            </div>

            {/* Tabla */}
            <DataTable
                columns={columns}
                data={filteredData}
                loading={loading}
            />

            {/* Modales */}
            <VentaForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={cargarVentas}
            />

            <Modal
                isOpen={!!ventaToView}
                onClose={() => setVentaToView(null)}
                title={`Detalle de Comprobante: ${ventaToView?.numero_completo}`}
                size="xl"
            >
                {ventaToView && <VentaDetalle id={ventaToView.id} />}
            </Modal>
        </div>
    );
};

export default VentasPage;