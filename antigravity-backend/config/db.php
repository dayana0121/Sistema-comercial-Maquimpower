<?php
// config/db.php

/**
 * Establece la conexión con la base de datos de Hostinger
 * @return PDO
 */
function getDB(): PDO
{
    $host = 'localhost';
    $db = 'u264219614_maquimpower';
    $user = 'root';
    $pass = '';
    $port = '3306';
    $charset = 'utf8mb4';

    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";

    try {
        return new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
    } catch (PDOException $e) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error local: " . $e->getMessage()]);
        exit;
    }
}