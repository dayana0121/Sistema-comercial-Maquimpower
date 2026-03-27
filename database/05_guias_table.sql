-- ==========================================================
-- TABLA DE GUÍAS DE REMISIÓN ELECTRÓNICA (GRE) - MYSQL
-- ==========================================================

CREATE TABLE IF NOT EXISTS guias (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    numero_correlativo INT AUTO_INCREMENT UNIQUE,
    tipo_comprobante VARCHAR(2) DEFAULT '09',
    serie VARCHAR(4) NOT NULL,
    fecha_emision DATE DEFAULT CURRENT_DATE,
    
    ruc_remitente VARCHAR(11),
    nombre_remitente VARCHAR(255),
    domicilio_remitente VARCHAR(500),
    
    cliente_id VARCHAR(36),
    ruc_destinatario VARCHAR(11),
    nombre_destinatario VARCHAR(255),
    domicilio_destinatario VARCHAR(500),
    
    motivo_traslado VARCHAR(4),
    descripcion_motivo TEXT,
    fecha_inicio_traslado DATE,
    peso_total DECIMAL(12,3),
    
    estado_sunat VARCHAR(20) DEFAULT 'PENDIENTE',
    cdr_sunat LONGTEXT,
    numero_ticket VARCHAR(20),
    
    op_gravada DECIMAL(12,2) DEFAULT 0.00,
    igv DECIMAL(12,2) DEFAULT 0.00,
    total DECIMAL(12,2) DEFAULT 0.00,
    
    observaciones TEXT,
    json_xml LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_guia (tipo_comprobante, serie, numero_correlativo),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- Tabla de Detalle de Guías
CREATE TABLE IF NOT EXISTS guias_detalle (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    guia_id VARCHAR(36) NOT NULL,
    item INT NOT NULL,
    producto_id VARCHAR(36),
    descripcion TEXT NOT NULL,
    cantidad DECIMAL(12,3) NOT NULL,
    unidad_medida VARCHAR(10) DEFAULT 'NIU',
    valor_unitario DECIMAL(12,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_guias_detalle_guia FOREIGN KEY (guia_id) REFERENCES guias(id) ON DELETE CASCADE,
    INDEX idx_guia_id (guia_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_guias_estado ON guias(estado_sunat);
CREATE INDEX IF NOT EXISTS idx_guias_cliente ON guias(cliente_id);
CREATE INDEX IF NOT EXISTS idx_guias_fecha ON guias(fecha_emision);

