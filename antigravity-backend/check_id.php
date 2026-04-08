<?php
// Yo quito la ruta absoluta para que este script funcione en cualquier copia local del repo.
require __DIR__ . '/config/db.php';
$conn = getDB();
$stmt = $conn->query("SELECT * FROM ventas LIMIT 1");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
echo json_encode(array_keys($row));
