import apiClient from './client';

export const reportesApi = {
  ventasPorDia:      (params) => apiClient.get('/api/reportes/ventas-por-dia?'      + new URLSearchParams(params)),
  topProductos:      (params) => apiClient.get('/api/reportes/top-productos?'        + new URLSearchParams(params)),
  movimientosStock:  (params) => apiClient.get('/api/reportes/movimientos-stock?'    + new URLSearchParams(params)),
  rentabilidad:      (params) => apiClient.get('/api/reportes/rentabilidad?'         + new URLSearchParams(params)),
};
