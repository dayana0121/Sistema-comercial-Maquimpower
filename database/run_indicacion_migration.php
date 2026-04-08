<?php
// Run migration for indicacion column
require_once '../antigravity-backend/config/db.php';

$pdo = getDB();

$sql = file_get_contents('11_add_indicacion_mysql.sql');

try {
    $pdo->exec($sql);
    echo "Migration 11_add_indicacion_mysql.sql executed successfully\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>