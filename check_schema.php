<?php
require_once __DIR__ . '/antigravity-backend/config/db.php';

try {
    $db = getDB();
    $stmt = $db->query("SHOW CREATE TABLE ventas");
    $row = $stmt->fetch();
    echo "CREATE TABLE VENTAS:\n";
    echo $row['Create Table'] . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
