export async function abrirPdfVenta(ventaId, apiUrl) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${apiUrl}/api/ventas/${ventaId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Error al generar PDF');
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}
