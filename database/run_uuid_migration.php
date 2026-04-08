<?php
// Run migration for UUID default and trigger
require_once '../antigravity-backend/config/db.php';

$pdo = getDB();

$sql = file_get_contents('12_set_uuid_default_and_trigger.sql');

try {
    $pdo->exec($sql);
    echo "Migration 12_set_uuid_default_and_trigger.sql executed successfully\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>