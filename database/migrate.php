<?php
// database/migrate.php - Script para ejecutar migraciones

require_once __DIR__ . '/../antigravity-backend/config/db.php';

$files = [
    '01_full_schema.sql',
    '02_productos_hostinger.sql',
    '03_inventario_movimientos.sql',
    '04_nuevas_funcionalidades.sql',
    '05_guias_table.sql'
];

$pdo = getDB();

foreach ($files as $file) {
    $filePath = __DIR__ . '/' . $file;
    if (!file_exists($filePath)) {
        echo "❌ Archivo no encontrado: $file\n";
        continue;
    }

    echo "📝 Ejecutando: $file\n";
    
    $sql = file_get_contents($filePath);
    
    try {
        // Dividir por puntos y coma para ejecutar cada statement
        $statements = array_filter(array_map('trim', explode(';', $sql)));
        
        foreach ($statements as $stmt) {
            if (!empty($stmt)) {
                $pdo->exec($stmt);
            }
        }
        
        echo "✅ $file ejecutado correctamente\n";
    } catch (Exception $e) {
        echo "⚠️ Error en $file: " . $e->getMessage() . "\n";
    }
}

echo "\n✅ Migraciones completadas\n";
