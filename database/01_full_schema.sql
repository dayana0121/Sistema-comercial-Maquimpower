-- ==========================================================
-- SCRIPT DE BASE DE DATOS COMPLETO - ANTIGRAVITY (SUPABASE)
-- ==========================================================

-- 1. Tablas Maestras
-- ----------------------------------------------------------

-- Tabla de Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_documento VARCHAR(2) DEFAULT '6', -- 6: RUC, 1: DNI
    numero_documento VARCHAR(15) UNIQUE NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    direccion TEXT,
    email VARCHAR(255),
    telefono VARCHAR(50),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Productos (Versión Extendida)
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_interno VARCHAR(50) UNIQUE NOT NULL,
    sku VARCHAR(50) UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    descripcion TEXT,
    precio_lista DECIMAL(12,2) DEFAULT 0.00,
    precio_oferta DECIMAL(12,2),
    moneda VARCHAR(3) DEFAULT 'PEN',
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 5,
    estado_stock VARCHAR(20) DEFAULT 'automatico' 
        CHECK (estado_stock IN ('automatico','en_stock','bajo_stock','agotado')),
    categoria_id UUID REFERENCES categorias(id),
    imagen_url VARCHAR(500),
    imagen_alt VARCHAR(255),
    galeria JSONB DEFAULT '[]',
    video_url TEXT,
    pdf_url VARCHAR(255),
    es_destacado BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tablas de Ventas y Comprobantes
-- ----------------------------------------------------------

-- Control de Series y Correlativos
CREATE TABLE IF NOT EXISTS series_comprobantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_comprobante VARCHAR(2) NOT NULL, -- 01: Factura, 03: Boleta
    serie VARCHAR(4) NOT NULL,
    ultimo_correlativo INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    UNIQUE(tipo_comprobante, serie)
);

-- Tabla de Ventas (Cabecera)
CREATE TABLE IF NOT EXISTS ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_comprobante VARCHAR(2) NOT NULL,
    serie VARCHAR(4) NOT NULL,
    correlativo INTEGER NOT NULL,
    fecha_emision DATE DEFAULT CURRENT_DATE,
    cliente_id UUID REFERENCES clientes(id),
    moneda VARCHAR(3) DEFAULT 'PEN',
    op_gravada DECIMAL(12,2) DEFAULT 0.00,
    op_exonerada DECIMAL(12,2) DEFAULT 0.00,
    op_inafecta DECIMAL(12,2) DEFAULT 0.00,
    igv DECIMAL(12,2) DEFAULT 0.00,
    total DECIMAL(12,2) DEFAULT 0.00,
    estado_sunat VARCHAR(20) DEFAULT 'PENDIENTE' 
        CHECK (estado_sunat IN ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'ANULADO')),
    cdr_sunat TEXT, -- Contenido del CDR en base64 si se requiere
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tipo_comprobante, serie, correlativo)
);

-- Tabla de Detalle de Ventas
CREATE TABLE IF NOT EXISTS ventas_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    item INTEGER NOT NULL,
    producto_id UUID REFERENCES productos(id),
    descripcion TEXT NOT NULL,
    cantidad DECIMAL(12,3) NOT NULL,
    valor_unitario DECIMAL(12,4) NOT NULL, -- Sin IGV
    precio_unitario DECIMAL(12,4), -- Con IGV
    subtotal DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Logs y Sincronización
-- ----------------------------------------------------------

-- Log de Sincronización con Hostinger
CREATE TABLE IF NOT EXISTS sync_hostinger_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID REFERENCES productos(id),
    accion VARCHAR(20) CHECK (accion IN ('INSERT','UPDATE','DELETE')),
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','ENVIADO','ERROR')),
    payload JSONB,
    error_mensaje TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    enviado_at TIMESTAMPTZ
);

-- 4. Funciones y Triggers
-- ----------------------------------------------------------

-- Trigger para calcular estado_stock automáticamente
CREATE OR REPLACE FUNCTION actualizar_estado_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.estado_stock = 'automatico' THEN
        IF NEW.stock_actual = 0 THEN
            NEW.estado_stock := 'agotado';
        ELSIF NEW.stock_actual <= NEW.stock_minimo THEN
            NEW.estado_stock := 'bajo_stock';
        ELSE
            NEW.estado_stock := 'en_stock';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_estado_stock ON productos;
CREATE TRIGGER trigger_estado_stock
    BEFORE INSERT OR UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION actualizar_estado_stock();

-- RPC: Obtener siguiente correlativo y aumentar contador de serie
CREATE OR REPLACE FUNCTION obtener_siguiente_correlativo(p_tipo_comprobante VARCHAR, p_serie VARCHAR)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
    v_correlativo INTEGER;
BEGIN
    UPDATE series_comprobantes 
    SET ultimo_correlativo = ultimo_correlativo + 1
    WHERE tipo_comprobante = p_tipo_comprobante AND serie = p_serie
    RETURNING ultimo_correlativo INTO v_correlativo;

    -- Si no existe la serie, la creamos con correlativo 1
    IF v_correlativo IS NULL THEN
        INSERT INTO series_comprobantes (tipo_comprobante, serie, ultimo_correlativo)
        VALUES (p_tipo_comprobante, p_serie, 1)
        RETURNING ultimo_correlativo INTO v_correlativo;
    END IF;

    RETURN v_correlativo;
END;
$$;

-- 5. Data Inicial
-- ----------------------------------------------------------

INSERT INTO series_comprobantes (tipo_comprobante, serie, ultimo_correlativo)
VALUES 
    ('01', 'F001', 0),
    ('03', 'B001', 0)
ON CONFLICT (tipo_comprobante, serie) DO NOTHING;
