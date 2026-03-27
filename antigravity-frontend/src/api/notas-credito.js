// src/api/notas-credito.js
import apiClient from './client';

export const notasCreditoApi = {
    listar: async (params = {}) => {
        try {
            const query = new URLSearchParams(params).toString();
            const url = query ? `/notas-credito?${query}` : '/notas-credito';
            return await apiClient.get(url);
        } catch (error) {
            console.error('Error listando notas de crédito:', error);
            throw error;
        }
    },

    crear: async (data) => {
        try {
            return await apiClient.post('/notas-credito', data);
        } catch (error) {
            console.error('Error creando nota de crédito:', error);
            throw error;
        }
    },

    obtener: async (id) => {
        try {
            return await apiClient.get(`/notas-credito/${id}`);
        } catch (error) {
            console.error('Error obteniendo nota de crédito:', error);
            throw error;
        }
    },

    eliminar: async (id) => {
        try {
            return await apiClient.delete(`/notas-credito/${id}`);
        } catch (error) {
            console.error('Error eliminando nota de crédito:', error);
            throw error;
        }
    }
};
