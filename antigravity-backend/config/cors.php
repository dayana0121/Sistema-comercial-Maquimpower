<?php
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Permite cualquier puerto de localhost en desarrollo
$allowed = false;
if (preg_match('/^http:\/\/localhost(:\d+)?$/', $origin)) {
    $allowed = true;
}

// En produccion, agregar el dominio real aqui:
// if ($origin === 'https://maquimpower.com') $allowed = true;

if ($allowed) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}