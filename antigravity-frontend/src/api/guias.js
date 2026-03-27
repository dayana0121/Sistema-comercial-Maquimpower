import apiClient from './client';

export const guiasApi = {
    /**
     * Lista las guías de remisión (soporta paginación/filtros si los envías)
     */
    listar: async (params = {}) => {
        try {
            const query = new URLSearchParams(params).toString();
            const url = query ? `/guias/listar?${query}` : '/guias/listar';
            return await apiClient.get(url);
        } catch (error) {
            console.error('❌ [guiasApi.listar] Error en la petición:', error);
            throw error; // Lanzamos para que el UI use toast.error()
        }
    },

    /**
     * Envía el payload completo para crear, firmar y enviar la GRE a SUNAT
     */
    crear: async (data) => {
        try {
            return await apiClient.post('/guias/crear', data);
        } catch (error) {
            console.error('❌ [guiasApi.crear] Error al emitir guía:', error);
            throw error;
        }
    },

    /**
     * Envía la guía a SUNAT
     */
    enviar: async (id) => {
        try {
            return await apiClient.post(`/guias/${id}/enviar`);
        } catch (error) {
            console.error(`❌ [guiasApi.enviar] Error enviando guía ID ${id}:`, error);
            throw error;
        }
    },

    /**
     * Consulta el estado del ticket en SUNAT para obtener el CDR
     */
    consultarEstado: async (id) => {
        try {
            return await apiClient.post(`/guias/${id}/consultar-estado`);
        } catch (error) {
            console.error(`❌ [guiasApi.consultarEstado] Error consultando ticket para guía ID ${id}:`, error);
            throw error;
        }
    },

    /**
     * Descarga el PDF. 
     * NOTA ESTRICTA: Como apiClient espera JSON por defecto, manejamos la descarga
     * creando una URL temporal en el navegador con el Blob del PDF.
     */
    descargarPdf: async (id) => {
        try {
            // Se asume que apiClient puede manejar responseType: 'blob'
            // Si tu apiClient no lo soporta, el backend lanzará un error de parseo JSON.
            const response = await apiClient.get(`/guias/${id}/descargar-pdf`, {
                responseType: 'blob'
            });

            // Si el backend devolvió un JSON con error (ej: 404), el blob se parseará mal
            // Verificamos si es un blob válido de PDF
            if (response.type === 'application/json') {
                const text = await response.text();
                const jsonError = JSON.parse(text);
                throw new Error(jsonError.message || 'Error al obtener el PDF');
            }

            // Crear enlace de descarga temporal
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `guia_remision_${id}.pdf`);
            document.body.appendChild(link);
            link.click();

            // Limpieza
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

            return { success: true, message: 'PDF descargado correctamente' };
        } catch (error) {
            console.error(`❌ [guiasApi.descargarPdf] Fallo al descargar PDF de guía ID ${id}:`, error);
            throw error;
        }
    }
};