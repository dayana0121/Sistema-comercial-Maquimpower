// src/api/cotizaciones.js
import apiClient from './client';

export const cotizacionesApi = {
    listar: async (params = {}) => {
        try {
            const query = new URLSearchParams(params).toString();
            const url = query ? `/cotizaciones?${query}` : '/cotizaciones';
            return await apiClient.get(url);
        } catch (error) {
            console.error('Error listando cotizaciones:', error);
            throw error;
        }
    },

    crear: async (data) => {
        try {
            return await apiClient.post('/cotizaciones', data);
        } catch (error) {
            console.error('Error creando cotización:', error);
            throw error;
        }
    },

    obtener: async (id) => {
        try {
            return await apiClient.get(`/cotizaciones/${id}`);
        } catch (error) {
            console.error('Error obteniendo cotización:', error);
            throw error;
        }
    },

    generarPdf: async (id) => {
        try {
            const response = await fetch(`/api/cotizaciones/${id}/pdf`);
            if (!response.ok) throw new Error('Error descargando PDF');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `cotizacion-${id}.pdf`;
            document.body.appendChild(link);
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generando PDF:', error);
            throw error;
        }
    },

    convertirAVenta: async (id, tipoComprobante = '01', serie = 'F001') => {
        try {
            return await apiClient.post(`/cotizaciones/${id}/convertir`, {
                tipo_comprobante: tipoComprobante,
                serie: serie
            });
        } catch (error) {
            console.error('Error convirtiendo cotización:', error);
            throw error;
        }
    },

    eliminar: async (id) => {
        try {
            return await apiClient.delete(`/cotizaciones/${id}`);
        } catch (error) {
            console.error('Error eliminando cotización:', error);
            throw error;
        }
    }
};
