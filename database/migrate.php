<?php
/**
 * database/migrate.php - Script para ejecutar migraciones
 * Autodescubrimiento de archivos SQL y manejo de bloques ( triggers )
 */

require_once __DIR__ . '/../antigravity-backend/config/db.php';

$pdo = getDB();

// 1. Obtener todos los archivos .sql en la carpeta database
$files = glob(__DIR__ . '/*.sql');
sort($files); // Ordenar por nombre (01, 02, ...)

echo "--- Iniciando proceso de migraciones ---\n\n";

foreach ($files as $filePath) {
    $file = basename($filePath);
    echo "📝 Ejecutando: $file\n";
    
    $sqlContent = file_get_contents($filePath);
    
    try {
        // Limpiamos el SQL de comandos específicos de CLI como DELIMITER
        $sqlCleaned = preg_replace('/^DELIMITER\s+.+$/mi', '', $sqlContent);
        
        // Si el archivo contiene triggers o procedimientos, intentamos ejecutarlo como un bloque
        // O si no tiene ";", lo ejecutamos tal cual.
        // Un enfoque simple: si tiene "CREATE TRIGGER" o "CREATE PROCEDURE", enviamos todo.
        // Si no, dividimos por ";" para seguridad.
        
        if (stripos($sqlCleaned, 'CREATE TRIGGER') !== false || stripos($sqlCleaned, 'CREATE PROCEDURE') !== false) {
            // Ejecutar el bloque completo
            $pdo->exec($sqlCleaned);
            echo "✅ $file ejecutado como bloque (trigger/proc).\n";
        } else {
            // Dividir por puntos y coma para ejecutar cada statement (evitando fallos por multi-query)
            $statements = array_filter(array_map('trim', explode(';', $sqlCleaned)));
            foreach ($statements as $stmt) {
                if (!empty($stmt)) {
                    $pdo->exec($stmt);
                }
            }
            echo "✅ $file ejecutado por sentencias.\n";
        }
        
    } catch (Exception $e) {
        echo "⚠️ Error en $file: " . $e->getMessage() . "\n";
    }
}

echo "\n--- Migraciones completadas ---\n";
