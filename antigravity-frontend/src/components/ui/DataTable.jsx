// src/components/ui/DataTable.jsx
import Spinner from './Spinner';

export default function DataTable({ columns, data, loading = false, onRowClick, currentPage = 1, totalPages = 1, onPageChange }) {
    if (loading) {
        return (
            <div className="w-full bg-white border border-slate-200 rounded-lg p-10 flex flex-col items-center justify-center">
                <Spinner size="lg" />
                <p className="text-slate-500 font-medium mt-4 text-sm">Cargando registros...</p>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full bg-white border border-slate-200 rounded-lg p-10 text-center">
                <p className="text-slate-500 font-medium">No se encontraron registros.</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                    <thead className="bg-[#F4F6F9] border-b border-slate-200">
                        <tr>
                            {columns.map((col, index) => (
                                <th
                                    key={index}
                                    className={`px-6 py-4 text-[0.85rem] font-semibold text-slate-500 uppercase tracking-wide ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((row, rowIndex) => (
                            <tr
                                key={row.id || rowIndex}
                                onClick={() => onRowClick && onRowClick(row)}
                                className={`transition-colors hover:bg-[#F4F6F9] ${onRowClick ? 'cursor-pointer' : ''}`}
                            >
                                {columns.map((col, colIndex) => (
                                    <td
                                        key={colIndex}
                                        className={`px-6 py-4 text-[0.95rem] text-slate-800 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                                    >
                                        {/* Renderizamos el valor directo o ejecutamos la función render personalizada si existe */}
                                        {col.render ? col.render(row) : row[col.accessor]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center">
                    <span className="text-sm text-slate-500 font-medium">
                        Página {currentPage} de {totalPages}
                    </span>
                    
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => onPageChange && onPageChange(currentPage - 1)}
                            className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Anterior
                        </button>
                        
                        <div className="flex gap-1">
                            {[...Array(totalPages)].map((_, i) => {
                                const p = i + 1;
                                if (totalPages > 10) {
                                  if (p > 3 && p < totalPages - 2 && (p < currentPage - 1 || p > currentPage + 1)) {
                                    if (p === 4 || p === totalPages - 3) return <span key={p} className="px-2">...</span>;
                                    return null;
                                  }
                                }
                                return (
                                    <button
                                        key={p}
                                        onClick={() => onPageChange && onPageChange(p)}
                                        className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors ${currentPage === p ? 'bg-orange-500 text-white' : 'hover:bg-slate-100 text-slate-600 border border-transparent'}`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => onPageChange && onPageChange(currentPage + 1)}
                            className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}