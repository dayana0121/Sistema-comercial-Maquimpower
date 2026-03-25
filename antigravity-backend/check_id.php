<?php
require 'd:/xampp/htdocs/Maquimpower_Sistema_Comercial_1.0/antigravity-backend/config/db.php';
$conn = getDB();
$stmt = $conn->query("SELECT * FROM ventas LIMIT 1");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
echo json_encode(array_keys($row));
