<?php
// database/create_guias.php

try {
    $pdo = new PDO('mysql:host=localhost;dbname=maquimpower_sistema_comercial;charset=utf8mb4', 'root', '');
    
    $sql = file_get_contents(__DIR__ . '/05_guias_table.sql');
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
    
    echo "\n✅ Tablas de guías creadas correctamente\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
