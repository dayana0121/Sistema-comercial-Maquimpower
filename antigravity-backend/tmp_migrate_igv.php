<?php
require_once 'config/db.php';
$db = getDB();
try {
    $db->exec("ALTER TABLE ventas ADD COLUMN op_exonerada DECIMAL(12,2) DEFAULT 0.00 AFTER igv");
    echo "Added op_exonerada\n";
} catch (Exception $e) { echo "op_exonerada might already exist: " . $e->getMessage() . "\n"; }

try {
    $db->exec("ALTER TABLE ventas ADD COLUMN op_inafecta DECIMAL(12,2) DEFAULT 0.00 AFTER op_exonerada");
    echo "Added op_inafecta\n";
} catch (Exception $e) { echo "op_inafecta might already exist: " . $e->getMessage() . "\n"; }

try {
    $db->exec("ALTER TABLE ventas ADD COLUMN op_gratuita DECIMAL(12,2) DEFAULT 0.00 AFTER op_inafecta");
    echo "Added op_gratuita\n";
} catch (Exception $e) { echo "op_gratuita might already exist: " . $e->getMessage() . "\n"; }

echo "Migration finished.\n";
