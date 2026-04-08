export async function abrirPdfVenta(ventaId, apiUrl, formato = 'a4') {
  const token = localStorage.getItem('token');
  const res = await fetch(`${apiUrl}/api/ventas/${ventaId}/pdf?formato=${formato}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Error al generar PDF A4');
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

export async function abrirTicketVenta(ventaId, apiUrl) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${apiUrl}/api/ventas/${ventaId}/ticket`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Error al generar Ticket');
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank', 'width=400,height=600');
}

export async function abrirGuiaEnvio(ventaId, apiUrl) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${apiUrl}/api/ventas/${ventaId}/guia_envio`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Error al generar Guía de Envío');
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}