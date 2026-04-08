<?php
// config/db.php

require_once __DIR__ . '/env.php';

/**
 * Establece la conexión con la base de datos.
 * Las credenciales se leen desde .env — soporta local y producción.
 * @return PDO
 */
function getDB(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo; // Singleton: una sola conexión por request

    $host    = env('DB_HOST', '127.0.0.1');
    $db      = env('DB_NAME', 'u264219614_maquimpower');
    $user    = env('DB_USER', 'root');
    $pass    = env('DB_PASS', '');
    $port    = env('DB_PORT', '3306');
    $charset = 'utf8mb4';

    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";

    try {
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_PERSISTENT         => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_general_ci"
        ]);
        return $pdo;
    } catch (PDOException $e) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error de conexión: " . $e->getMessage()]);
        exit;
    }
}