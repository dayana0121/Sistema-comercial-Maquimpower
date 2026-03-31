-- database/07_fase2_ventas_mejoras.sql
-- Fase 2: Mejoras en ventas (canal de venta, método de pago, etc.)

-- 1. Asegurar que las columnas existan en la tabla ventas
ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS canal_venta VARCHAR(50) DEFAULT 'tienda' CHECK (canal_venta IN ('tienda', 'envio_lima', 'web', 'envio_provincia'));

ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50) DEFAULT 'EFECTIVO';

ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS vendedor_id VARCHAR(36);

-- Opcional: Agregar FK (Si vendedores existe)
-- ALTER TABLE ventas ADD CONSTRAINT fk_ventas_vendedor FOREIGN KEY (vendedor_id) REFERENCES vendedores(id);
