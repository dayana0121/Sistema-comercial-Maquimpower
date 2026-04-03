-- database/09_fase3_compras.sql
-- Fase 3: Mejoras al módulo de Compras

-- 1. Modificar tabla compras
ALTER TABLE compras
ADD COLUMN serie VARCHAR(4) NULL AFTER tipo_comprobante,
ADD COLUMN correlativo VARCHAR(20) NULL AFTER serie,
ADD COLUMN metodo_pago VARCHAR(50) DEFAULT 'CONTADO' AFTER moneda,
ADD COLUMN termino_pago_dias INTEGER DEFAULT 0 AFTER metodo_pago;

-- 2. Modificar tabla compras_detalle
ALTER TABLE compras_detalle
ADD COLUMN tipo_afectacion_igv VARCHAR(2) DEFAULT '10' AFTER descripcion,
ADD COLUMN almacen_destino_id VARCHAR(36) NULL AFTER igv_item;
