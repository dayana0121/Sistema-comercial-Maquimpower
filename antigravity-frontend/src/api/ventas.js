// src/api/ventas.js

import apiClient from './client';

export const ventasApi = {
    listar: (params) => apiClient.get('/ventas?' + new URLSearchParams(params)),
    obtener: (id) => apiClient.get(`/ventas/${id}`),
    crear: (data) => apiClient.post('/ventas', data),
    anular: (id) => apiClient.delete(`/ventas/${id}`),
    reintentar: (id) => apiClient.post(`/ventas/${id}/reintentar`, {}),
};