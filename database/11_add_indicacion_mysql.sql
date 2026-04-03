-- Agregar columna indicacion a cotizaciones_detalle (MySQL)
-- Ejecutar en la base de datos MySQL si la columna no existe

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cotizaciones_detalle' AND COLUMN_NAME = 'indicacion');

-- Solo agregar si no existe
-- Nota: en algunas versiones de MySQL no existe ADD COLUMN IF NOT EXISTS
-- por eso comprobamos en information_schema
PREPARE stmt FROM 'ALTER TABLE cotizaciones_detalle ADD COLUMN indicacion VARCHAR(32) DEFAULT ""';
IF @exists = 0 THEN
    EXECUTE stmt;
END IF;
DEALLOCATE PREPARE stmt;