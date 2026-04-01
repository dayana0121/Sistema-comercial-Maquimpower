-- 13_products_collation_to_general.sql
-- Convierte la collation de la tabla `productos` a utf8mb4_general_ci (idempotente)
-- Ejecuta en desarrollo primero. Esto modificará todas las columnas de texto de la tabla.

ALTER TABLE productos CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- Verificar: SHOW CREATE TABLE productos; SHOW FULL COLUMNS FROM productos;
