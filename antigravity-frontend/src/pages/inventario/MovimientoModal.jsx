import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LuX, LuTrendingDown, LuTrendingUp, LuPackage } from 'react-icons/lu';
import '../../styles/business.css';

const MovimientoModal = ({ isOpen, onClose, onSuccess, producto, tipoInicial }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [resultado, setResultado] = useState(null); // Para animación final { stockAnterior, stockNuevo, mov }
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        tipo: tipoInicial || 'ENTRADA',
        cantidad: '',
        motivo: '',
        referencia: ''
    });

    // Resetear form al abrir
    useEffect(() => {
        if (isOpen) {
            setForm({
                tipo: tipoInicial || 'ENTRADA',
                cantidad: '',
                motivo: '',
                referencia: ''
            });
            setResultado(null);
            setError('');
        }
    }, [isOpen, tipoInicial, producto]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!producto) {
            setError('Debe seleccionar un producto.');
            return;
        }

        const cant = parseFloat(form.cantidad);
        if (isNaN(cant) || cant <= 0) {
            setError('La cantidad debe ser mayor a 0.');
            return;
        }

        if (form.tipo === 'SALIDA' || form.tipo === 'DEVOLUCION') {
            if (cant > parseFloat(producto.stock_actual)) {
                setError(`Stock insuficiente. Stock actual: ${producto.stock_actual}`);
                return;
            }
        }

        if (!form.motivo.trim()) {
            setError('El motivo es obligatorio.');
            return;
        }

        try {
            setLoading(true);
            const payload = {
                producto_id: producto.id,
                tipo_movimiento: form.tipo,
                cantidad: cant,
                motivo: form.motivo,
                referencia: form.referencia,
                usuario_email: user?.email || 'Sistema'
            };

            const resp = await apiClient.post('/api/inventario/movimiento', payload);

            if (resp.success) {
                // Mostrar animación de resultado
                setResultado(resp.data.data);
                // Cerrar después de 2.5s y llamar onSuccess
                setTimeout(() => {
                    onSuccess();
                }, 2500);
            } else {
                throw new Error(resp.message || 'Error registrando movimiento');
            }

        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Error de conexión');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Colores por tipo
    const getTipoColor = (tipo) => {
        if (tipo === 'ENTRADA' || tipo === 'AJUSTE') return 'var(--color-exito)';
        return 'var(--color-error)';
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div className="modal-content" style={{
                backgroundColor: 'var(--color-bg-principal)',
                width: '100%', maxWidth: '500px',
                borderRadius: 'var(--radius-base)',
                boxShadow: 'var(--sombra-modal)',
                overflow: 'hidden'
            }}>
                {/* HEAD */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {form.tipo === 'ENTRADA' ? <LuTrendingUp color="var(--color-exito)" /> : <LuTrendingDown color="var(--color-error)" />}
                        Registrar {form.tipo}
                    </h2>
                    {!resultado && (
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-texto-suave)', cursor: 'pointer' }}>
                            <LuX size={24} />
                        </button>
                    )}
                </div>

                {/* BODY */}
                <div style={{ padding: '1.5rem' }}>
                    {resultado ? (
                        /* ESTADO: ÉXITO ANIMADO */
                        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                            <div style={{
                                display: 'inline-flex', justifyContent: 'center', alignItems: 'center',
                                width: '64px', height: '64px', borderRadius: '50%',
                                backgroundColor: 'var(--color-bg-secundario)',
                                color: getTipoColor(resultado.movimiento),
                                marginBottom: '1rem'
                            }}>
                                <LuPackage size={32} />
                            </div>
                            <h3 style={{ color: 'var(--color-texto-principal)', marginBottom: '0.5rem' }}>¡Movimiento Exitoso!</h3>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                                <span className="text-secundario">{resultado.stock_anterior}</span>
                                <span>{'→'}</span>
                                <span style={{ color: getTipoColor(resultado.movimiento) }}>{resultado.stock_nuevo}</span>
                            </div>
                            <p className="text-secundario" style={{ marginTop: '0.5rem' }}>Stock actualizado correctamente</p>
                        </div>
                    ) : (
                        /* ESTADO: FORMULARIO */
                        <form onSubmit={handleSubmit}>
                            {error && <div className="alert-error" style={{ padding: '1rem', backgroundColor: 'var(--color-error-suave)', color: 'var(--color-error)', borderRadius: 'var(--radius-base)', marginBottom: '1rem' }}>{error}</div>}

                            {/* Producto Info (Readonly por ahora) */}
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Producto Afectado</label>
                                <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-secundario)', borderRadius: 'var(--radius-base)', border: '1px solid var(--color-borde)' }}>
                                    <div style={{ fontWeight: 'bold' }}>{producto?.nombre || 'Ninguno seleccionado'}</div>
                                    <div className="text-secundario" style={{ fontSize: '0.8rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>SKU: {producto?.sku}</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--color-texto-principal)' }}>Stock actual: {producto?.stock_actual}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label" htmlFor="tipo_movimiento">Tipo Mov.</label>
                                    <select
                                        id="tipo_movimiento"
                                        className="form-input"
                                        value={form.tipo}
                                        onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                                        required
                                    >
                                        <option value="ENTRADA">Entrada (+)</option>
                                        <option value="SALIDA">Salida (-)</option>
                                        <option value="AJUSTE">Ajuste (+)</option>
                                        <option value="DEVOLUCION">Devolución (-)</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label" htmlFor="cantidad">Cantidad</label>
                                    <input
                                        type="number"
                                        id="cantidad"
                                        className="form-input"
                                        step="0.01"
                                        min="0.01"
                                        placeholder="0.00"
                                        value={form.cantidad}
                                        onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                                        required autoFocus
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label" htmlFor="motivo">Motivo / Descripción <span className="text-error">*</span></label>
                                <input
                                    type="text"
                                    id="motivo"
                                    className="form-input"
                                    placeholder="Ej: Ingreso por compra Fact. F001-234"
                                    value={form.motivo}
                                    onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label" htmlFor="referencia">Documento Ref. (Opcional)</label>
                                <input
                                    type="text"
                                    id="referencia"
                                    className="form-input"
                                    placeholder="Ej: Guía de Remisión T001-002"
                                    value={form.referencia}
                                    onChange={(e) => setForm({ ...form, referencia: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--color-borde)' }}>
                                <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary" disabled={loading || !producto} style={{ backgroundColor: getTipoColor(form.tipo), borderColor: getTipoColor(form.tipo), minWidth: '120px' }}>
                                    {loading ? 'Guardando...' : 'Confirmar'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MovimientoModal;
