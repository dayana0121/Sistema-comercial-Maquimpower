import { useState, useEffect } from "react";
import { Package, DollarSign, Truck, Globe, Info, Save, X } from "lucide-react";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { useToast } from "../../hooks/useToast";
// ✅ 1. Corrección: Importar apiClient correctamente
import { apiClient } from "../../api/client";

export default function ProductoForm({ productoToEdit, onCancel, onSuccess, isReadOnly }) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("general");

    // ✅ 2. Extraer el ID del producto que estamos editando (si existe)
    const id = productoToEdit?.id;

    const [formData, setFormData] = useState({
        codigo_interno: "", codigo_sunat: "", sku: "", descripcion: "",
        categoria: "", linea: "", tipo: "PRODUCTO", unidad_medida: "NIU",
        precio_unitario_sin_igv: 0, costo_promedio: 0, stock_actual: 0,
        stock_minimo: 0, tipo_afectacion_igv: "10", imagen_url: "",
        video_url: "", pdf_url: "", slug: "", es_destacado: 0,
        etiqueta: "", peso_kg: 0, maneja_lotes: 0, categoria_id: null
    });

    // Cálculos en tiempo real
    const [precioConIgv, setPrecioConIgv] = useState(0);

    useEffect(() => {
        if (productoToEdit) setFormData({ ...productoToEdit });
    }, [productoToEdit]);

    useEffect(() => {
        // Cálculo automático de IGV (Requerimiento)
        const calculo = (parseFloat(formData.precio_unitario_sin_igv || 0) * 1.18).toFixed(2);
        setPrecioConIgv(calculo);
    }, [formData.precio_unitario_sin_igv]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? (checked ? 1 : 0) : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); // ✅ 3. Activamos el estado de carga

        try {
            // ✅ 4. Ahora sí la variable 'id' existe y funciona
            const url = id ? `/productos/${id}` : '/productos';

            const res = id
                ? await apiClient.put(url, formData)
                : await apiClient.post(url, formData);

            if (res.success) {
                toast.success(res.message);
                onSuccess(); // ✅ 5. Cierra el modal y recarga la tabla en la página padre
            }
        } catch (error) {
            toast.error(error.message || "Error al guardar el producto");
        } finally {
            setLoading(false); // ✅ 6. Apagamos el estado de carga
        }
    };

    const TabButton = ({ idBtn, label, icon: Icon }) => (
        <button
            type="button"
            onClick={() => setActiveTab(idBtn)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === idBtn ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
        >
            <Icon size={16} /> {label}
        </button>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cabecera de Pestañas */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
                <TabButton idBtn="general" label="General" icon={Package} />
                <TabButton idBtn="precios" label="Precios/SUNAT" icon={DollarSign} />
                <TabButton idBtn="inventario" label="Inventario" icon={Truck} />
                <TabButton idBtn="web" label="Marketing/Web" icon={Globe} />
            </div>

            <div className="min-h-[400px]">
                {/* PESTAÑA: GENERAL */}
                {activeTab === "general" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                        <Input label="Código Interno *" name="codigo_interno" value={formData.codigo_interno} onChange={handleChange} required disabled={isReadOnly} />
                        <Input label="SKU / Código de Barras" name="sku" value={formData.sku} onChange={handleChange} disabled={isReadOnly} />
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Descripción del Producto *</label>
                            <textarea
                                name="descripcion" value={formData.descripcion} onChange={handleChange} required disabled={isReadOnly}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[80px] focus:ring-2 focus:ring-orange-100 outline-none"
                            />
                        </div>
                        <Input label="Categoría" name="categoria" value={formData.categoria} onChange={handleChange} disabled={isReadOnly} />
                        <Input label="Línea" name="linea" value={formData.linea} onChange={handleChange} disabled={isReadOnly} />
                    </div>
                )}

                {/* PESTAÑA: PRECIOS Y SUNAT */}
                {activeTab === "precios" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-right-4 duration-300">
                        <Input label="Precio Unitario SIN IGV *" type="number" step="0.01" name="precio_unitario_sin_igv" value={formData.precio_unitario_sin_igv} onChange={handleChange} required disabled={isReadOnly} />
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Precio CON IGV (Referencial)</label>
                            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700">
                                S/ {precioConIgv}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Unidad de Medida</label>
                            <select name="unidad_medida" value={formData.unidad_medida} onChange={handleChange} disabled={isReadOnly} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-100">
                                <option value="NIU">Unidades (NIU)</option>
                                <option value="ZZ">Servicios (ZZ)</option>
                                <option value="KGM">Kilogramos (KGM)</option>
                                <option value="MTR">Metros (MTR)</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Afectación IGV</label>
                            <select name="tipo_afectacion_igv" value={formData.tipo_afectacion_igv} onChange={handleChange} disabled={isReadOnly} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-100">
                                <option value="10">Gravado - Op. Onerosa (10)</option>
                                <option value="20">Exonerado - Op. Onerosa (20)</option>
                                <option value="30">Inafecto - Op. Onerosa (30)</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* PESTAÑA: INVENTARIO */}
                {activeTab === "inventario" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-right-4 duration-300">
                        <Input label="Stock Actual" type="number" name="stock_actual" value={formData.stock_actual} onChange={handleChange} disabled={isReadOnly} />
                        <Input label="Stock Mínimo (Alerta)" type="number" name="stock_minimo" value={formData.stock_minimo} onChange={handleChange} disabled={isReadOnly} />
                        <Input label="Peso (Kg)" type="number" step="0.001" name="peso_kg" value={formData.peso_kg} onChange={handleChange} disabled={isReadOnly} />
                        <div className="flex items-center gap-2 pt-6">
                            <input type="checkbox" name="maneja_lotes" checked={formData.maneja_lotes === 1} onChange={handleChange} disabled={isReadOnly} className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500" />
                            <label className="text-sm font-bold text-slate-700">Maneja Lotes / Vencimientos</label>
                        </div>
                    </div>
                )}

                {/* PESTAÑA: WEB / MARKETING */}
                {activeTab === "web" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-right-4 duration-300">
                        <Input label="URL Imagen Principal" name="imagen_url" value={formData.imagen_url} onChange={handleChange} placeholder="https://..." disabled={isReadOnly} />
                        <Input label="Slug (URL Amigable)" name="slug" value={formData.slug} onChange={handleChange} placeholder="nombre-del-producto" disabled={isReadOnly} />
                        <Input label="Video URL (YouTube/Vimeo)" name="video_url" value={formData.video_url} onChange={handleChange} disabled={isReadOnly} />
                        <div className="flex items-center gap-2 pt-6">
                            <input type="checkbox" name="es_destacado" checked={formData.es_destacado === 1} onChange={handleChange} disabled={isReadOnly} className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500" />
                            <label className="text-sm font-bold text-slate-700">Producto Destacado en Web</label>
                        </div>
                    </div>
                )}
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" onClick={onCancel} type="button">Cerrar</Button>
                {!isReadOnly && (
                    <Button type="submit" variant="primary" loading={loading} icon={Save}>
                        {id ? "Actualizar Producto" : "Guardar Producto"}
                    </Button>
                )}
            </div>
        </form>
    );
}