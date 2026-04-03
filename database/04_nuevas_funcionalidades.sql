-- ==========================================================
-- MIGRACIONES - NUEVAS FUNCIONALIDADES
-- Maquimpower v1.0 - Marzo 2026
-- ==========================================================

-- 1. TABLA VENDEDORES
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(100),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. COTIZACIONES (similar a ventas pero sin SUNAT)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS cotizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_correlativo INTEGER NOT NULL AUTO_INCREMENT UNIQUE,
    cliente_id UUID REFERENCES clientes(id),
    vendedor_id UUID REFERENCES vendedores(id),
    fecha_emisión DATE DEFAULT CURRENT_DATE,
    fecha_vigencia DATE, -- hasta cuándo es válida
    moneda VARCHAR(3) DEFAULT 'PEN',
    op_gravada DECIMAL(12,2) DEFAULT 0.00,
    igv DECIMAL(12,2) DEFAULT 0.00,
    total DECIMAL(12,2) DEFAULT 0.00,
    estado VARCHAR(20) DEFAULT 'PENDIENTE' 
        CHECK (estado IN ('PENDIENTE', 'CONVERTIDA', 'RECHAZADA', 'EXPIRADA')),
    numero_whatsapp VARCHAR(20), -- número del cliente para enviar
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DETALLE DE COTIZACIONES
CREATE TABLE IF NOT EXISTS cotizaciones_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotizacion_id UUID REFERENCES cotizaciones(id) ON DELETE CASCADE,
    item INTEGER NOT NULL,
    producto_id UUID REFERENCES productos(id),
    descripcion TEXT NOT NULL,
    cantidad DECIMAL(12,3) NOT NULL,
    valor_unitario DECIMAL(12,4) NOT NULL,
    precio_unitario DECIMAL(12,4),
    descuento_unitario DECIMAL(12,2) DEFAULT 0.00,
    tipo_afectacion_igv VARCHAR(2) DEFAULT '10',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. NOTAS DE CRÉDITO (tipo 07)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS notas_credito (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_comprobante VARCHAR(2) DEFAULT '07', -- tipo 07 = nota de crédito
    serie VARCHAR(4) NOT NULL,
    correlativo INTEGER NOT NULL,
    venta_id UUID REFERENCES ventas(id), -- referencia a comprobante original
    cliente_id UUID REFERENCES clientes(id),
    fecha_emision DATE DEFAULT CURRENT_DATE,
    motivo VARCHAR(255) NOT NULL, -- devolución, descuento, etc.
    moneda VARCHAR(3) DEFAULT 'PEN',
    op_gravada DECIMAL(12,2) DEFAULT 0.00,
    igv DECIMAL(12,2) DEFAULT 0.00,
    total DECIMAL(12,2) DEFAULT 0.00,
    estado_sunat VARCHAR(20) DEFAULT 'PENDIENTE',
    cdr_sunat TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(serie, correlativo)
);

-- DETALLE DE NOTAS DE CRÉDITO
CREATE TABLE IF NOT EXISTS notas_credito_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nota_id UUID REFERENCES notas_credito(id) ON DELETE CASCADE,
    item INTEGER NOT NULL,
    producto_id UUID REFERENCES productos(id),
    descripcion TEXT NOT NULL,
    cantidad DECIMAL(12,3) NOT NULL,
    valor_unitario DECIMAL(12,4) NOT NULL,
    precio_unitario DECIMAL(12,4),
    tipo_afectacion_igv VARCHAR(2) DEFAULT '10',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AGREGAR CAMPOS A TABLAS EXISTENTES
-- ----------------------------------------------------------

-- Agregar vendedor_id a ventas (si no existe)
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS vendedor_id UUID REFERENCES vendedores(id);

-- Agregar telefono a clientes (si no existe)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);

-- Agregar estado_pago a compras (si no existe)
ALTER TABLE compras ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) DEFAULT 'PENDIENTE'
    CHECK (estado_pago IN ('PENDIENTE', 'PAGADO', 'PARCIAL'));

-- Agregar fecha_vencimiento a compras (si no existe)
ALTER TABLE compras ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;

-- Agregar indicacion a cotizaciones_detalle (si no existe)
ALTER TABLE cotizaciones_detalle ADD COLUMN IF NOT EXISTS indicacion VARCHAR(32) DEFAULT '';

-- ==========================================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_vendedores_activo ON vendedores(activo);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente ON cotizaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_vendedor ON cotizaciones(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON cotizaciones(estado);
CREATE INDEX IF NOT EXISTS idx_notas_credito_venta ON notas_credito(venta_id);
CREATE INDEX IF NOT EXISTS idx_notas_credito_estado ON notas_credito(estado_sunat);
CREATE INDEX IF NOT EXISTS idx_compras_estado_pago ON compras(estado_pago);
CREATE INDEX IF NOT EXISTS idx_compras_fecha_vencimiento ON compras(fecha_vencimiento);

-- ==========================================================
-- INSERCIONES INICIALES (EJEMPLOS)
-- ==========================================================

-- Vendedores de ejemplo
INSERT INTO vendedores (nombre, apellido, email, telefono) VALUES
('Juan', 'Pérez', 'juan@maquimpower.com', '987654321'),
('María', 'García', 'maria@maquimpower.com', '987654322'),
('Carlos', 'López', 'carlos@maquimpower.com', '987654323')
ON CONFLICT DO NOTHING;
