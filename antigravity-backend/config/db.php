<?php
// config/db.php
require_once __DIR__ . '/env.php';

/**
 * Establece la conexion con la base de datos.
 * @return PDO
 */
function getDB(): PDO
{
    // Yo centralizo la conexion en .env para no apuntar a una base equivocada segun el entorno.
    $host = env('DB_HOST', 'localhost');
    $db = env('DB_NAME', 'maquimpower_sistema_comercial');
    $user = env('DB_USER', 'root');
    $pass = env('DB_PASS', '');
    $port = env('DB_PORT', '3306');
    $charset = env('DB_CHARSET', 'utf8mb4');
    $collation = env('DB_COLLATION', 'utf8mb4_general_ci');

    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";

    try {
        return new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // Yo agrego timeout para evitar que la UI quede en "Cargando..." si la conexion demora o falla.
            PDO::ATTR_TIMEOUT => 8,
            // Yo fuerzo una collation consistente para reducir errores por mezcla de collations.
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$charset} COLLATE {$collation}",
        ]);
    } catch (PDOException $e) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error DB: ' . $e->getMessage()]);
        exit;
    }
}
