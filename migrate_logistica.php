<?php
require_once __DIR__ . '/antigravity-backend/config/db.php';

try {
    $db = getDB();
    
    // Deshabilitar temporalmente FK checks para evitar problemas si ya existen tablas parciales
    $db->exec("SET FOREIGN_KEY_CHECKS = 0;");

    $sql = "
    DROP TABLE IF EXISTS guias_envio_detalle;
    DROP TABLE IF EXISTS guias_envio;

    CREATE TABLE guias_envio (
        id CHAR(36) PRIMARY KEY,
        venta_id CHAR(36) NULL,
        cliente_documento VARCHAR(20) NOT NULL,
        cliente_nombre VARCHAR(255) NOT NULL,
        destino_shalom VARCHAR(255) NOT NULL,
        peso_total DECIMAL(10,2) DEFAULT 0,
        observaciones TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (venta_id),
        FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;

    CREATE TABLE guias_envio_detalle (
        id CHAR(36) PRIMARY KEY,
        guia_envio_id CHAR(36) NOT NULL,
        descripcion VARCHAR(255) NOT NULL,
        cantidad DECIMAL(10,2) NOT NULL,
        unidad_medida VARCHAR(10) DEFAULT 'NIU',
        INDEX (guia_envio_id),
        FOREIGN KEY (guia_envio_id) REFERENCES guias_envio(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
    ";

    $db->exec($sql);
    $db->exec("SET FOREIGN_KEY_CHECKS = 1;");
    
    echo "Tablas guias_envio y guias_envio_detalle creadas con éxito.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
