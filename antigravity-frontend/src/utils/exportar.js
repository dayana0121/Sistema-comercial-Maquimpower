import * as XLSX from 'xlsx';

/**
 * Exporta un array de objetos a Excel (.xlsx)
 * @param {Array} data - El array de objetos a exportar
 * @param {String} fileName - Nombre del archivo (sin extensión)
 * @param {String} sheetName - Nombre de la pestaña
 */
export const exportToExcel = (data, fileName = 'reporte', sheetName = 'Datos') => {
    if (!data || data.length === 0) {
        console.error("No hay datos para exportar");
        return;
    }

    // 1. Crear un nuevo libro de trabajo
    const workbook = XLSX.utils.book_new();

    // 2. Convertir JSON a Hoja de cálculo
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 3. Agregar la hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 4. Generar el archivo y disparar la descarga
    XLSX.writeFile(workbook, `${fileName}_${new Date().getTime()}.xlsx`);
};

/**
 * Exporta un array de objetos a CSV
 * @param {Array} data - El array de objetos a exportar
 * @param {String} fileName - Nombre del archivo
 */
export const exportToCSV = (data, fileName = 'reporte') => {
    if (!data || data.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
