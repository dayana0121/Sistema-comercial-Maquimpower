-- ==========================================================
-- TABLAS DE COTIZACIONES - MYSQL
-- ==========================================================

-- Tabla de Vendedores (si no existe)
CREATE TABLE IF NOT EXISTS vendedores (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(100),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de Cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    numero_correlativo INT AUTO_INCREMENT UNIQUE,
    cliente_id VARCHAR(36),
    vendedor_id VARCHAR(36),
    fecha_emisión DATE DEFAULT CURRENT_DATE,
    fecha_vigencia DATE,
    moneda VARCHAR(3) DEFAULT 'PEN',
    op_gravada DECIMAL(12,2) DEFAULT 0.00,
    igv DECIMAL(12,2) DEFAULT 0.00,
    total DECIMAL(12,2) DEFAULT 0.00,
    estado VARCHAR(20) DEFAULT 'PENDIENTE',
    numero_whatsapp VARCHAR(20),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (vendedor_id) REFERENCES vendedores(id),
    INDEX idx_estado (estado),
    INDEX idx_cliente (cliente_id),
    INDEX idx_vendedor (vendedor_id)
);

-- Detalle de Cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones_detalle (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    cotizacion_id VARCHAR(36) NOT NULL,
    item INT NOT NULL,
    producto_id VARCHAR(36),
    descripcion TEXT NOT NULL,
    cantidad DECIMAL(12,3) NOT NULL,
    valor_unitario DECIMAL(12,4) NOT NULL,
    precio_unitario DECIMAL(12,4),
    descuento_unitario DECIMAL(12,2) DEFAULT 0.00,
    tipo_afectacion_igv VARCHAR(2) DEFAULT '10',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_cotizaciones_detalle_cot FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
    INDEX idx_cotizacion (cotizacion_id)
);
