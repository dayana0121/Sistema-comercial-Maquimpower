import React, { useState } from 'react';
import { Search } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import apiClient from '../../api/client';

export default function BuscadorDocumento({ onFound, label = "Documento (DNI/RUC)", placeholder = "8 u 11 dígitos" }) {
    const [numero, setNumero] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleBuscar = async () => {
        // Remove any non-numeric characters
        const cleanNumero = numero.trim().replace(/\D/g, '');
        if (!cleanNumero || (cleanNumero.length !== 8 && cleanNumero.length !== 11)) {
            setError('Ingresa 8 (DNI) u 11 (RUC) dígitos (solo números)');
            return;
        }
        setError('');
        setLoading(true);
        try {
            // La ruta en el backend es /sunat/ruc (el api/ se quita en index.php)
            const res = await apiClient.get(`/sunat/ruc?numero=${cleanNumero}`);
            if (res.success && res.data) {
                onFound(res.data);
            } else {
                setError(res.message || 'No se encontraron resultados');
            }
        } catch (err) {
            setError('Error al consultar el documento');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-1 w-full">
            {label && <label className="text-sm font-semibold text-gray-700">{label}</label>}
            <div className="flex gap-2 items-start">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder={placeholder}
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg outline-none transition-shadow text-sm text-gray-800 ${error
                            ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                            : 'border-gray-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-500'
                        }`}
                    />
                    {error && <span className="text-xs text-red-500 font-medium mt-1 block">{error}</span>}
                </div>
                <Button 
                    onClick={handleBuscar} 
                    loading={loading}
                    variant="primary"
                    className="h-[38px] px-3 shrink-0"
                >
                    <Search className="w-4 h-4" />
                    <span className="hidden sm:inline">Buscar</span>
                </Button>
            </div>
        </div>
    );
}
