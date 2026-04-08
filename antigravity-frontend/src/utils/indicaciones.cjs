function setIndicacionOnDetalle(detalle, indicacion) {
  return Object.assign({}, detalle, { indicacion: indicacion || '' });
}

function getIndicacion(detalle) {
  return (detalle && detalle.indicacion) || '';
}

module.exports = { setIndicacionOnDetalle, getIndicacion };