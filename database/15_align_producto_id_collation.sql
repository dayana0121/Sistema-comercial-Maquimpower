-- Align producto_id collation to utf8mb4_general_ci to match productos.id
-- Backup already created: backup_u264219614_maquimpower_pre_alter.sql
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS=0;
START TRANSACTION;

-- Drop child foreign keys first to allow modifying parent PK collation
ALTER TABLE compras_detalle DROP FOREIGN KEY IF EXISTS compras_detalle_ibfk_2;
ALTER TABLE inventario_movimientos DROP FOREIGN KEY IF EXISTS inventario_movimientos_ibfk_1;
ALTER TABLE ventas_detalle DROP FOREIGN KEY IF EXISTS ventas_detalle_ibfk_2;

-- Ensure parent primary key uses target collation
ALTER TABLE productos
  MODIFY COLUMN id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL;

-- Modify child columns to match parent and recreate constraints
ALTER TABLE compras_detalle
  MODIFY COLUMN producto_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL;
ALTER TABLE compras_detalle
  ADD CONSTRAINT compras_detalle_ibfk_2 FOREIGN KEY (producto_id) REFERENCES productos(id) ON UPDATE RESTRICT ON DELETE SET NULL;

ALTER TABLE inventario_movimientos
  MODIFY COLUMN producto_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL;
ALTER TABLE inventario_movimientos
  ADD CONSTRAINT inventario_movimientos_ibfk_1 FOREIGN KEY (producto_id) REFERENCES productos(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ventas_detalle
  MODIFY COLUMN producto_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL;
ALTER TABLE ventas_detalle
  ADD CONSTRAINT ventas_detalle_ibfk_2 FOREIGN KEY (producto_id) REFERENCES productos(id) ON UPDATE RESTRICT ON DELETE SET NULL;

COMMIT;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
