import { BASE_URL as DEFAULT_API_ROOT } from '../api/client';

/** Misma base que apiClient: ej. `/api` en prod o URL completa en local. */
function resolveApiRoot(explicit) {
  if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '') {
    return String(explicit).replace(/\/$/, '');
  }
  return String(DEFAULT_API_ROOT || '').replace(/\/$/, '');
}

export async function abrirPdfVenta(ventaId, apiUrl, formato = 'a4') {
  const token = localStorage.getItem('token');
  const root = resolveApiRoot(apiUrl);
  const url = `${root}/ventas/${encodeURIComponent(ventaId)}/pdf?formato=${encodeURIComponent(formato)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Error al generar PDF A4');
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

export async function abrirPdfCotizacion(cotizacionId, apiUrl) {
  const token = localStorage.getItem('token');
  const root = resolveApiRoot(apiUrl);
  const url = `${root}/cotizaciones/${encodeURIComponent(cotizacionId)}/pdf`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Error al generar PDF de cotización');
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

export async function abrirTicketVenta(ventaId, apiUrl) {
  const token = localStorage.getItem('token');
  const root = resolveApiRoot(apiUrl);
  const url = `${root}/ventas/${encodeURIComponent(ventaId)}/ticket`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Error al generar Ticket');
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank', 'width=400,height=600');
}

export async function abrirGuiaEnvio(ventaId, apiUrl) {
  const token = localStorage.getItem('token');
  const root = resolveApiRoot(apiUrl);
  const url = `${root}/ventas/${encodeURIComponent(ventaId)}/guia_envio`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Error al generar Guía de Envío');
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}
