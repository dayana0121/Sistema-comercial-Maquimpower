import { joinApiBase, joinWithBase } from '../api/client';

function resolveUrl(path, explicitBase) {
  if (explicitBase !== undefined && explicitBase !== null && String(explicitBase).trim() !== '') {
    return joinWithBase(explicitBase, path);
  }
  return joinApiBase(path);
}

export async function abrirPdfVenta(ventaId, apiUrl, formato = 'a4') {
  const token = localStorage.getItem('token');
  const path = `/ventas/${encodeURIComponent(ventaId)}/pdf?formato=${encodeURIComponent(formato)}`;
  const url = resolveUrl(path, apiUrl);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(formato === 'a4' ? 'Error al generar PDF A4' : 'Error al generar PDF ticket');
  }
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

export async function abrirPdfCotizacion(cotizacionId, apiUrl) {
  const token = localStorage.getItem('token');
  const path = `/cotizaciones/${encodeURIComponent(cotizacionId)}/pdf`;
  const url = resolveUrl(path, apiUrl);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Error al generar PDF de cotización');
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

export async function abrirTicketVenta(ventaId, apiUrl) {
  const token = localStorage.getItem('token');
  const path = `/ventas/${encodeURIComponent(ventaId)}/ticket`;
  const url = resolveUrl(path, apiUrl);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Error al generar Ticket');
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank', 'width=400,height=600');
}

export async function abrirGuiaEnvio(ventaId, apiUrl) {
  const token = localStorage.getItem('token');
  const path = `/ventas/${encodeURIComponent(ventaId)}/guia_envio`;
  const url = resolveUrl(path, apiUrl);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Error al generar Guía de Envío');
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}
