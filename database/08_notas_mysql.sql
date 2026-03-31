-- database/08_notas_mysql.sql
-- Tabla MYSQL Notas de Credito / Debito

CREATE TABLE IF NOT EXISTS notas_credito (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tipo_comprobante VARCHAR(2) DEFAULT '07', -- 07 = NC, 08 = ND
    serie VARCHAR(4) NOT NULL,
    correlativo INTEGER NOT NULL,
    venta_id VARCHAR(36), -- referencia a ventas(id)
    cliente_id VARCHAR(36), -- referencia a clientes(id)
    fecha_emision DATE DEFAULT CURRENT_DATE,
    motivo VARCHAR(255) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'PEN',
    op_gravada DECIMAL(12,2) DEFAULT 0.00,
    igv DECIMAL(12,2) DEFAULT 0.00,
    total DECIMAL(12,2) DEFAULT 0.00,
    estado_sunat VARCHAR(20) DEFAULT 'PENDIENTE',
    cdr_sunat TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (serie, correlativo)
);

CREATE TABLE IF NOT EXISTS notas_credito_detalle (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    nota_id VARCHAR(36) NOT NULL,
    item INTEGER NOT NULL,
    producto_id VARCHAR(36),
    descripcion TEXT NOT NULL,
    cantidad DECIMAL(12,3) NOT NULL,
    valor_unitario DECIMAL(12,4) NOT NULL,
    precio_unitario DECIMAL(12,4),
    tipo_afectacion_igv VARCHAR(2) DEFAULT '10',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notas_credito_det FOREIGN KEY (nota_id) REFERENCES notas_credito(id) ON DELETE CASCADE
);
