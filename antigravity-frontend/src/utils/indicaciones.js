export function setIndicacionOnDetalle(detalle, indicacion) {
    return { ...detalle, indicacion: indicacion || '' };
}

export function getIndicacion(detalle) {
    return detalle?.indicacion || '';
}