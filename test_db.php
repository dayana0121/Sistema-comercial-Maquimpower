<?php
header('Content-Type: application/json');

require_once __DIR__ . '/antigravity-backend/config/db.php';

try {
    $conn = getDB();
    
    $result = $conn->query('SELECT DATABASE()');
    $db = $result->fetch();
    
    echo json_encode([
        'success' => true,
        'database' => $db['DATABASE()'] ?? 'NINGUNA',
        'cotizaciones' => $conn->query('SELECT COUNT(*) as total FROM cotizaciones')->fetch()['total']
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
