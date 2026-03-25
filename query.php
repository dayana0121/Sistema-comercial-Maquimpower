<?php
$host = '127.0.0.1:3307';
$db   = 'u264219614_maquimpower';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     echo json_encode(['error' => $e->getMessage()]);
     exit;
}

$queries = [
    "SELECT id FROM clientes WHERE activo = 1 LIMIT 1",
    "SELECT id FROM proveedores WHERE activo = 1 LIMIT 1",
    "SELECT id FROM productos WHERE id = 'd478d2b9-1cd2-11f1-977b-d843aea88809'",
    "SELECT id, numero_completo FROM ventas LIMIT 5"
];

$results = [];
foreach ($queries as $index => $sql) {
    try {
        $stmt = $pdo->query($sql);
        $results[$index + 1] = $stmt->fetchAll();
    } catch (\Exception $e) {
        $results[$index + 1] = ['error' => $e->getMessage()];
    }
}

echo json_encode($results, JSON_PRETTY_PRINT);
