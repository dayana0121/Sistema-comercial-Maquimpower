// src/api/vendedores.js
import apiClient from './client';

export const vendedoresApi = {
    listar: async () => {
        try {
            return await apiClient.get('/vendedores');
        } catch (error) {
            console.error('Error listando vendedores:', error);
            throw error;
        }
    },

    crear: async (data) => {
        try {
            return await apiClient.post('/vendedores', data);
        } catch (error) {
            console.error('Error creando vendedor:', error);
            throw error;
        }
    },

    obtener: async (id) => {
        try {
            return await apiClient.get(`/vendedores/${id}`);
        } catch (error) {
            console.error('Error obteniendo vendedor:', error);
            throw error;
        }
    },

    actualizar: async (id, data) => {
        try {
            return await apiClient.put(`/vendedores/${id}`, data);
        } catch (error) {
            console.error('Error actualizando vendedor:', error);
            throw error;
        }
    },

    eliminar: async (id) => {
        try {
            return await apiClient.delete(`/vendedores/${id}`);
        } catch (error) {
            console.error('Error eliminando vendedor:', error);
            throw error;
        }
    }
};
