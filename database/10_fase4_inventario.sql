-- database/10_fase4_inventario.sql

-- 1. Crear tabla de almacenes
CREATE TABLE IF NOT EXISTS almacenes (
    id VARCHAR(36) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(255) NULL,
    es_principal BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Crear tabla de stock por ubicación
CREATE TABLE IF NOT EXISTS inventario_stock (
    producto_id VARCHAR(36) NOT NULL,
    almacen_id VARCHAR(36) NOT NULL,
    stock_actual DECIMAL(10,2) DEFAULT 0,
    stock_minimo DECIMAL(10,2) DEFAULT 0,
    pasillo VARCHAR(50) NULL,
    anaquel VARCHAR(50) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (producto_id, almacen_id)
);

-- 3. Insertar Almacenes Base
INSERT INTO almacenes (id, nombre, direccion, es_principal) VALUES (UUID(), 'Almacén Principal', 'Sede Central', TRUE);
INSERT INTO almacenes (id, nombre, direccion, es_principal) VALUES (UUID(), 'Tienda 01', 'Mostrador', FALSE);

-- 4. Migrar el stock_actual actual de la tabla productos a la tabla inventario_stock usando el almacén principal
INSERT INTO inventario_stock (producto_id, almacen_id, stock_actual, stock_minimo)
SELECT p.id, (SELECT id FROM almacenes WHERE es_principal = TRUE LIMIT 1), p.stock_actual, p.stock_minimo
FROM productos p;

-- 5. Actualizar la tabla inventario_movimientos para reflejar el almacén (es el lugar donde ocurre el movimiento)
ALTER TABLE inventario_movimientos 
ADD COLUMN almacen_origen_id VARCHAR(36) NULL AFTER producto_id,
ADD COLUMN almacen_destino_id VARCHAR(36) NULL AFTER almacen_origen_id;
