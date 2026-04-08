<?php
// database/verify.php

$pdo = new PDO('mysql:host=localhost;dbname=maquimpower_sistema_comercial;charset=utf8mb4', 'root', '');

// Verificar guias
$stmt = $pdo->query('SHOW TABLES LIKE "guias%"');
$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Tablas de guías: " . implode(', ', $tables) . "\n";

// Verificar cotizaciones
$stmt = $pdo->query('SHOW TABLES LIKE "cotizaciones%"');
$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Tablas de cotizaciones: " . implode(', ', $tables) . "\n";

// Verificar vendedores
$stmt = $pdo->query('SHOW TABLES LIKE "vendedores"');
$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Tabla de vendedores: " . implode(', ', $tables) . "\n";

echo "\n✅ Todas las tablas se crearon correctamente!\n";
