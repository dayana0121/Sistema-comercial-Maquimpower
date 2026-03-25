<?php
require_once __DIR__ . '/config/db.php';
$conn = getDB();

try {
    // 1. Ver si las columnas existen
    $stmt = $conn->query("SHOW COLUMNS FROM ventas LIKE 'detraccion%'");
    $columns = $stmt->fetchAll();
    
    if (count($columns) == 0) {
        $conn->exec("ALTER TABLE ventas
            ADD COLUMN detraccion_codigo      VARCHAR(10)   DEFAULT NULL COMMENT 'Catalogo 54 SUNAT',
            ADD COLUMN detraccion_porcentaje  DECIMAL(5,2)  DEFAULT 0.00,
            ADD COLUMN detraccion_monto       DECIMAL(12,2) DEFAULT 0.00,
            ADD COLUMN detraccion_cuenta      VARCHAR(30)   DEFAULT NULL,
            ADD COLUMN detraccion_medio_pago  VARCHAR(10)   DEFAULT NULL COMMENT 'Catalogo 59 SUNAT'");
        echo "Columnas detraccion agregadas.\n";
    } else {
        echo "Columnas detraccion ya existen.\n";
    }

    // 2. Insertar cliente si no existe
    $stmt = $conn->prepare("SELECT id FROM clientes WHERE id = 'b3d0e6c6-1ca5-11f1-977b-d843aea88809'");
    $stmt->execute();
    if (!$stmt->fetch()) {
        $conn->exec("INSERT INTO clientes (id, tipo_documento, numero_documento, razon_social, activo)
        VALUES ('b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'RUC', '20606853182', 'CORPORACION MAQUIMSA E.I.R.L.', 1)");
        echo "Cliente insertado.\n";
    } else {
        echo "Cliente ya existe.\n";
    }

    // 3. Obtener venta real
    $stmt = $conn->query("SELECT id FROM ventas ORDER BY created_at DESC LIMIT 1");
    $venta = $stmt->fetch();
    if ($venta) {
        echo "VENTA_ID:" . $venta['id'] . "\n";
    } else {
        echo "VENTA_ID:none\n";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
