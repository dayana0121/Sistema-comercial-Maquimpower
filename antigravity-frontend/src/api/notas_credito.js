import apiClient from './client';

export const notasCreditoApi = {
    listar: async (params) => {
        return await apiClient.get('/notas-credito', params);
    },
    obtener: async (id) => {
        return await apiClient.get(`/notas-credito/${id}`);
    },
    crear: async (data) => {
        return await apiClient.post('/notas-credito', data);
    }
};