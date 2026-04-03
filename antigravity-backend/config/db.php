<?php
// config/db.php
require_once __DIR__ . '/env.php';

/**
 * Establece la conexión con la base de datos
 * Las credenciales se leen desde el archivo .env
 * @return PDO
 */
function getDB(): PDO
{
    $host    = env('DB_HOST', 'localhost');
    $db      = env('DB_NAME', '');
    $user    = env('DB_USER', 'root');
    $pass    = env('DB_PASS', '');
    $port    = env('DB_PORT', '3306');
    $charset = 'utf8mb4';

    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";

    try {
        return new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // Asegurar collation consistente en la conexión para evitar "Illegal mix of collations"
            // Esto fuerza la conexión a usar utf8mb4_general_ci que coincide con la mayoría de las tablas
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_general_ci"
        ]);
    } catch (PDOException $e) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error local: " . $e->getMessage()]);
        exit;
    }
}