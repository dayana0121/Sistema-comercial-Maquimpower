-- 14_products_columns_to_general.sql
-- Modifica columnas text/varchar/text-like de `productos` a utf8mb4_general_ci
-- Excluye `id` y `categoria_id` para evitar conflictos con FK.

ALTER TABLE productos
MODIFY codigo_interno varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
MODIFY codigo_sunat varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
MODIFY sku varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
MODIFY descripcion text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
MODIFY categoria varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
MODIFY linea varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
MODIFY tipo varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
MODIFY unidad_medida varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
MODIFY estado_stock varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
MODIFY tipo_afectacion_igv varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
MODIFY imagen_url varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
MODIFY imagen_alt varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
MODIFY video_url text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
MODIFY pdf_url varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
MODIFY slug varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
MODIFY etiqueta varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
MODIFY legacy_id varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL;

-- Verificar: SHOW FULL COLUMNS FROM productos;
