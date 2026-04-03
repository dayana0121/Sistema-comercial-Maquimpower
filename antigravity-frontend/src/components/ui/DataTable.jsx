// src/components/ui/DataTable.jsx
import Spinner from './Spinner';

export default function DataTable({ columns, data, loading = false, onRowClick }) {
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
        <div className="w-full bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                    <thead className="bg-[#F8F9FA] border-b border-slate-100">
                        <tr>
                            {columns.map((col, index) => (
                                <th
                                    key={index}
                                    className={`px-8 py-5 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="">
                        {data.map((row, rowIndex) => (
                            <tr
                                key={row.id || rowIndex}
                                onClick={() => onRowClick && onRowClick(row)}
                                className={`transition-colors hover:bg-[#FDEFE6] ${onRowClick ? 'cursor-pointer' : ''} ${rowIndex % 2 !== 0 ? 'bg-[#FFF9F0]' : 'bg-white'}`}
                            >
                                {columns.map((col, colIndex) => (
                                    <td
                                        key={colIndex}
                                        className={`px-8 py-5 text-[14.5px] text-slate-700 font-medium ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
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

            {/* Paginador Básico (Puedes expandirlo luego) */}
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center">
                <span className="text-sm text-slate-500 font-medium">
                    Mostrando {data.length} registros
                </span>
                {/* Aquí irían los controles de paginación en el futuro */}
            </div>
        </div>
    );
}