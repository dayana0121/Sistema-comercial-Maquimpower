import apiClient from './client';

export const proveedoresApi = {
  listar:   (params = {}) => apiClient.get('/api/proveedores?' + new URLSearchParams(params)),
  obtener:  (id) => apiClient.get(`/api/proveedores/${id}`),
  crear:    (data) => apiClient.post('/api/proveedores', data),
  actualizar: (id, data) => apiClient.put(`/api/proveedores/${id}`, data),
  eliminar: (id) => apiClient.delete(`/api/proveedores/${id}`),
};

export const comprasApi = {
  listar:    (params = {}) => apiClient.get('/api/compras?' + new URLSearchParams(params)),
  obtener:   (id) => apiClient.get(`/api/compras/${id}`),
  crear:     (data) => apiClient.post('/api/compras', data),
  actualizar:(id, data) => apiClient.put(`/api/compras/${id}`, data),
  anular:    (id) => apiClient.delete(`/api/compras/${id}`),
};
