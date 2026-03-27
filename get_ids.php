<?php
try {
    $p = new PDO('mysql:host=127.0.0.1;port=3306;dbname=u264219614_maquimpower;charset=utf8mb4', 'root', '');
    $c = $p->query("SELECT id FROM clientes LIMIT 1")->fetchColumn();
    $pr = $p->query("SELECT id FROM productos LIMIT 1")->fetchColumn();
    $v = $p->query("SELECT id FROM ventas LIMIT 1")->fetchColumn();
    echo "ID_CLIENTE:$c\nID_PRODUCTO:$pr\nID_VENTA:$v\n";
} catch (Exception $e) {
    echo "ERROR:" . $e->getMessage();
}
