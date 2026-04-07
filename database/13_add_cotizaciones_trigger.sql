-- 13_add_cotizaciones_trigger.sql
-- Crea un trigger para la tabla cotizaciones que garantiza un UUID si no se proporciona id

DROP TRIGGER IF EXISTS trg_cotizaciones_bi;
DELIMITER $$
CREATE TRIGGER trg_cotizaciones_bi
BEFORE INSERT ON cotizaciones
FOR EACH ROW
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    SET NEW.id = UUID();
  END IF;
END$$
DELIMITER ;
