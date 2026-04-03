-- 12_set_uuid_default_and_trigger.sql
-- Intenta establecer DEFAULT (UUID()) en cotizaciones_detalle.id y crea un trigger
-- Seguro para ejecutar varias veces (idempotente): el procedimiento atrapa errores en el ALTER

-- 1) Intentar modificar la columna para poner DEFAULT (UUID()) (ignorando errores si el servidor no lo soporta)
DROP PROCEDURE IF EXISTS _add_default_uuid_cd;
DELIMITER $$
CREATE PROCEDURE _add_default_uuid_cd()
BEGIN
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
  SET @s = 'ALTER TABLE cotizaciones_detalle MODIFY id VARCHAR(36) NOT NULL DEFAULT (UUID())';
  PREPARE stmt FROM @s;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END$$
DELIMITER ;
CALL _add_default_uuid_cd();
DROP PROCEDURE IF EXISTS _add_default_uuid_cd;

-- 2) Crear o reemplazar un trigger BEFORE INSERT que garantice un UUID cuando no se proporcione id
DROP TRIGGER IF EXISTS trg_cotizaciones_detalle_bi;
DELIMITER $$
CREATE TRIGGER trg_cotizaciones_detalle_bi
BEFORE INSERT ON cotizaciones_detalle
FOR EACH ROW
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    SET NEW.id = UUID();
  END IF;
END$$
DELIMITER ;

-- Nota:
-- - Este script es seguro para volver a ejecutarse: el procedimiento captura errores y el trigger se reemplaza si ya existe.
-- - Ejecuta esto en tu entorno de desarrollo primero y verifica con:
--   SHOW CREATE TABLE cotizaciones_detalle;
--   SHOW TRIGGERS LIKE 'cotizaciones_detalle';
