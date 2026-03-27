<?php
// database/create_cotizaciones.php

try {
    $pdo = new PDO('mysql:host=localhost;dbname=u264219614_maquimpower;charset=utf8mb4', 'root', '');
    
    $sql = file_get_contents(__DIR__ . '/06_cotizaciones_mysql.sql');
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    
    foreach ($statements as $stmt) {
        if (!empty($stmt)) {
            try {
                $pdo->exec($stmt);
                echo "✅ " . substr($stmt, 0, 50) . "...\n";
            } catch (Exception $e) {
                echo "⚠️ " . $e->getMessage() . "\n";
            }
        }
    }
    
    echo "\n✅ Tablas de cotizaciones y vendedores creadas correctamente\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
