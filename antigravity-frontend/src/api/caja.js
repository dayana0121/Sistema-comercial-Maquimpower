import apiClient from './client';

export const cajaApi = {
  listar:   (params = {}) => apiClient.get('/api/caja?' + new URLSearchParams(params)),
  saldo:    ()            => apiClient.get('/api/caja/saldo'),
  resumen:  ()            => apiClient.get('/api/caja/resumen'),
  registrar:(data)        => apiClient.post('/api/caja', data),
};
