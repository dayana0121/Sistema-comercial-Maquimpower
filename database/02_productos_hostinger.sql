-- Campos de catálogo
ALTER TABLE productos ADD COLUMN IF NOT EXISTS sku VARCHAR(50) UNIQUE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_lista DECIMAL(12,2);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_oferta DECIMAL(12,2);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS es_destacado BOOLEAN DEFAULT false;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS etiqueta VARCHAR(100);

-- Campos de stock
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_actual INTEGER DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_minimo INTEGER DEFAULT 5;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS estado_stock VARCHAR(20)
    DEFAULT 'automatico'
    CHECK (estado_stock IN ('automatico','en_stock','bajo_stock','agotado'));

-- Campos multimedia
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_alt VARCHAR(255);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS galeria JSONB DEFAULT '[]';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS pdf_url VARCHAR(255);

-- Categorías (tabla separada)
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias(id);

-- Trigger: calcular estado_stock automáticamente cuando cambia stock_actual
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

-- Tabla de log de sincronización con Hostinger
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
