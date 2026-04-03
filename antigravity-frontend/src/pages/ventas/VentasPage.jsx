import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, RefreshCw, X, FileText, MessageCircle, Truck, Printer } from 'lucide-react';
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import SearchInput from "../../components/ui/SearchInput";
import Modal from "../../components/ui/Modal";
import { ventasApi } from "../../api/ventas";
import { notasCreditoApi } from "../../api/notas-credito";
import { useToast } from "../../hooks/useToast";
import VentaDetalle from "./VentaDetalle"; // Componente simple de visualización
import { exportToExcel } from "../../utils/exportar";
import { abrirPdfVenta, abrirTicketVenta, abrirGuiaEnvio } from "../../utils/pdf";
import { FileSpreadsheet } from "lucide-react";
import '../../styles/ventas.css';

const VentasPage = () => {
    const navigate = useNavigate();
    const toast = useToast();

    // Estado local
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
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
            'ACEPTADO': 'bg-emerald-500 text-white',
            'PENDIENTE': 'bg-amber-500 text-white',
            'RECHAZADO': 'bg-red-600 text-white',
            'ANULADO': 'bg-[#E74C3C] text-white shadow-sm',
        };
        return <span className={`px-6 py-6 rounded-[6px] text-[11px] gap-1 flex items-center w-fit font-bold uppercase tracking-wide ${map[estado] || 'bg-slate-500 text-white'}`}>{estado}</span>;
    };

    const badgePago = (estado) => {
        const isPagado = estado === 'PAGADO';
        return (
            <span className={`px-3 py-1 rounded-[6px] text-[11px] font-bold uppercase shadow-sm ${isPagado ? 'bg-emerald-50 text-emerald-600' : 'bg-[#FFF8E7] text-[#D97706]'}`}>
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

    const handleWhatsApp = (venta) => {
        if (!venta.cliente_telefono) {
            toast.error('El cliente de esta venta no tiene un teléfono celular registrado en su ficha.');            return;
        }
        
        const numero = venta.cliente_telefono.replace(/\D/g, '');
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost/REPO3/Sistema-comercial-Maquimpower/antigravity-backend';
        const linkPdf = `${baseUrl}/api/ventas/${venta.id}/pdf`;
        const mensaje = encodeURIComponent(
            `Estimado/a ${venta.cliente_nombre},\n\nAdjuntamos su ${venta.tipo_comprobante === '01' ? 'factura' : 'boleta'} ${venta.numero_completo} por el monto de S/ ${parseFloat(venta.importe_total).toFixed(2)}.\n\nPuede ver y descargar su comprobante aquí:\n${linkPdf}\n\n¡Gracias por su preferencia!`
        );
        const url = `https://wa.me/51${numero}?text=${mensaje}`;
        window.open(url, '_blank');
    };

    const handleNotaCredito = (venta) => {
        // Modal para crear nota de crédito
        alert(`Nota de Crédito para ${venta.numero_completo} - Implementar formulario modal`);
        // TODO: Implementar modal con formulario
    };

    const columns = [
        {
            header: "Comprobante",
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-700 text-[15px]">{row.numero_completo}</span>
                    <span className="text-[13px] text-slate-400">
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
                return <span className="text-[15px] text-slate-700 font-medium">{date.toLocaleDateString('es-PE')}</span>;
            }
        },
        {
            header: "Total",
            render: (row) => <span className="font-bold text-[#f2542d] text-[15px]">S/ {parseFloat(row.importe_total).toFixed(2)}</span>
        },
        { header: "SUNAT", render: (row) => badgeSunat(row.estado_sunat) },
        { header: "Canal", render: (row) => <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded capitalize">{row.canal_venta?.replace('_', ' ') || 'Tienda'}</span> },
        {
            header: "Acciones",
            render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            setVentaToView(row);
                        }}
                        className="w-10 h-8 flex justify-center items-center rounded-md bg-[#232733] text-white hover:bg-[#343a49] transition-colors"
                        title="Ver detalle"
                    >
                        <Eye size={18} className="opacity-80"/>
                    </button>

                    <button
                         onClick={() => abrirTicketVenta(row.id, import.meta.env.VITE_API_URL).catch(() => toast.error('Error al generar Ticket'))}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                        title="Imprimir Ticket Térmico"
                    >
                        <Printer size={16} />
                    </button>

                    <button
                        onClick={() => abrirPdfVenta(row.id, import.meta.env.VITE_API_URL).catch(() => toast.error('Error al generar PDF A4'))}
                        className="w-10 h-8 flex justify-center items-center rounded-md bg-[#232733] text-blue-300 hover:bg-[#343a49] hover:text-blue-200 transition-colors"
                        title="Ver PDF A4"
                    >
                        <FileText size={18} />
                    </button>

                    <button
                        onClick={() => handleWhatsApp(row)}
                        className="w-10 h-8 flex justify-center items-center rounded-md bg-[#232733] text-green-400 hover:bg-[#343a49] hover:text-green-300 transition-colors"
                        title="Enviar por WhatsApp"
                    >
                        <MessageCircle size={18} />
                    </button>
                    
                    {row.estado_sunat === 'ACEPTADO' && (
                        <button
                            onClick={() => handleNotaCredito(row)}
                            className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50 transition-colors"
                            title="Crear Nota de Crédito"
                        >
                            📋
                        </button>
                    )}

                    <button
                    onClick={() => abrirGuiaEnvio(row.id, import.meta.env.VITE_API_URL).catch(() => toast.error('Error al generar Guía de Envío'))}
                        className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        title="Generar Guía de Envío (Shalom/Agencia)"
                         >
                        <Truck size={16} />
                    </button>

                    {row.estado_sunat !== 'ANULADO' && (
                        <button
                            onClick={() => handleAnular(row.id)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors hidden"
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
        <div className="p-8 max-w-[1400px] mx-auto min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-[28px] font-extrabold text-[#1f2937] tracking-tight pb-1">Comprobantes de Venta</h1>
                    <p className="text-slate-400 text-[14px]">Facturación electrónica · SUNAT UBL 2.1</p>
                </div>
                <button 
                    onClick={() => navigate('/ventas/nueva')}
                    className="bg-[#f2542d] hover:bg-[#d84824] text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-colors flex items-center gap-2 text-sm"
                >
                    + Nueva Venta
                </button>
            </div>

            {/* Barra de Filtros */}
            <div className="flex flex-wrap items-center gap-3 mb-4 bg-transparent">
                <select
                    className="border border-slate-200 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-slate-300 bg-white min-w-[160px] shadow-sm font-medium text-slate-600"
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
                    className="border border-slate-200 rounded-md px-3 py-2.5 text-sm bg-white shadow-sm font-medium text-slate-600"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    title="Fecha Desde"
                />

                <button 
                    onClick={cargarVentas} 
                    className="bg-[#1f2937] hover:bg-slate-800 text-white px-6 py-2.5 rounded-md font-semibold text-sm shadow-sm transition-colors"
                >
                    Buscar
                </button>

                <button 
                    onClick={() => exportToExcel(filteredData, 'ventas_maquimpower', 'Ventas')} 
                    className="bg-[#fefaf0] border border-slate-200 hover:bg-orange-50 text-slate-700 px-4 py-2.5 rounded-md font-medium text-sm shadow-sm transition-colors flex items-center gap-2"
                >
                    <FileSpreadsheet size={16} /> Exportar Excel
                </button>

                <div className="ml-auto w-full md:w-auto md:min-w-[280px]">
                    <SearchInput onSearch={setSearch} placeholder="Cliente o número..." />
                </div>
            </div>

            {/* Tabla */}
            <DataTable
                columns={columns}
                data={filteredData}
                loading={loading}
            />

            {/* Modal de Detalle de Venta */}
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