<?php
$host = '127.0.0.1:3306';
$db = 'maquimpower_sistema_comercial';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

$sql = "INSERT INTO productos (id, codigo_interno, sku, descripcion, precio_unitario_sin_igv, stock_actual, stock_minimo, unidad_medida, tipo_afectacion_igv, activo)
VALUES (
  'd478d2b9-1cd2-11f1-977b-d843aea88809',
  'SEED-001', 'SEED-001',
  'Producto Seed Test',
  100.00, 50, 5, 'NIU', '10', 1
)";

try {
    $pdo->exec($sql);
    echo json_encode(['success' => true]);
} catch (\Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
