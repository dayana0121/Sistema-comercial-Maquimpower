<?php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/db.php';

class ReportesController {
    private $conn;

    public function __construct() {
        $this->conn = getDB();
    }

    public function handle($route, $method) {
        AuthMiddleware::verificar();
        header('Content-Type: application/json');

        if ($method !== 'GET') {
            http_response_code(405);
            echo json_encode(["success" => false, "message" => "Método no permitido"]);
            return;
        }

        if (str_contains($route, '/ventas-por-dia'))      { $this->ventasPorDia();    return; }
        if (str_contains($route, '/top-productos'))        { $this->topProductos();    return; }
        if (str_contains($route, '/movimientos-stock'))    { $this->movimientosStock(); return; }

        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Reporte no encontrado"]);
    }

    private function getFechas() {
        $desde = $_GET['fecha_desde'] ?? date('Y-m-01');
        $hasta = $_GET['fecha_hasta'] ?? date('Y-m-d');
        return [$desde, $hasta];
    }

    private function ventasPorDia() {
        try {
            [$desde, $hasta] = $this->getFechas();
            $stmt = $this->conn->prepare("
                SELECT
                    DATE(fecha_emision) AS fecha,
                    COUNT(*) AS total_ventas,
                    SUM(op_gravada) AS op_gravada,
                    SUM(igv) AS igv,
                    SUM(importe_total) AS total
                FROM ventas
                WHERE DATE(fecha_emision) BETWEEN :desde AND :hasta
                  AND estado_sunat != 'ANULADO'
                GROUP BY DATE(fecha_emision)
                ORDER BY fecha ASC
            ");
            $stmt->bindValue(':desde', $desde);
            $stmt->bindValue(':hasta', $hasta);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Formatear para Recharts
            $data = array_map(fn($r) => [
                'fecha'        => $r['fecha'],
                'ventas'       => (int)$r['total_ventas'],
                'gravada'      => (float)$r['op_gravada'],
                'igv'          => (float)$r['igv'],
                'total'        => (float)$r['total'],
            ], $rows);

            // Totales resumen
            $totalVentas  = array_sum(array_column($data, 'ventas'));
            $totalIngresos = array_sum(array_column($data, 'total'));

            echo json_encode([
                "success" => true,
                "data"    => $data,
                "resumen" => [
                    "total_ventas"   => $totalVentas,
                    "total_ingresos" => round($totalIngresos, 2),
                    "fecha_desde"    => $desde,
                    "fecha_hasta"    => $hasta,
                ]
            ]);
        } catch (PDOException $e) { $this->error($e); }
    }

    private function topProductos() {
        try {
            [$desde, $hasta] = $this->getFechas();
            $limit = (int)($_GET['limit'] ?? 10);
            $stmt = $this->conn->prepare("
                SELECT
                    vd.descripcion AS producto,
                    vd.codigo_producto AS codigo,
                    SUM(vd.cantidad) AS cantidad_vendida,
                    SUM(vd.precio_total) AS total_vendido,
                    COUNT(DISTINCT vd.venta_id) AS num_ventas
                FROM ventas_detalle vd
                INNER JOIN ventas v ON vd.venta_id = v.id
                WHERE DATE(v.fecha_emision) BETWEEN :desde AND :hasta
                  AND v.estado_sunat != 'ANULADO'
                GROUP BY vd.codigo_producto, vd.descripcion
                ORDER BY total_vendido DESC
                LIMIT :limit
            ");
            $stmt->bindValue(':desde', $desde);
            $stmt->bindValue(':hasta', $hasta);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $data = array_map(fn($r) => [
                'producto'         => $r['producto'],
                'codigo'           => $r['codigo'],
                'cantidad'         => (float)$r['cantidad_vendida'],
                'total'            => (float)$r['total_vendido'],
                'num_ventas'       => (int)$r['num_ventas'],
            ], $rows);

            echo json_encode(["success" => true, "data" => $data]);
        } catch (PDOException $e) { $this->error($e); }
    }

    private function movimientosStock() {
        try {
            [$desde, $hasta] = $this->getFechas();
            $producto_id = $_GET['producto_id'] ?? null;

            $where = "WHERE DATE(im.created_at) BETWEEN :desde AND :hasta";
            if ($producto_id) $where .= " AND im.producto_id = :producto_id";

            $stmt = $this->conn->prepare("
                SELECT
                    DATE(im.created_at) AS fecha,
                    im.tipo_movimiento,
                    SUM(im.cantidad) AS cantidad,
                    p.descripcion AS producto,
                    p.codigo_interno AS codigo
                FROM inventario_movimientos im
                INNER JOIN productos p ON im.producto_id = p.id
                $where
                GROUP BY DATE(im.created_at), im.tipo_movimiento, im.producto_id
                ORDER BY fecha ASC
            ");
            $stmt->bindValue(':desde', $desde);
            $stmt->bindValue(':hasta', $hasta);
            if ($producto_id) $stmt->bindValue(':producto_id', $producto_id);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Agrupar por fecha para Recharts
            $porFecha = [];
            foreach ($rows as $r) {
                $f = $r['fecha'];
                if (!isset($porFecha[$f])) $porFecha[$f] = ['fecha' => $f, 'ENTRADA' => 0, 'SALIDA' => 0, 'AJUSTE' => 0];
                $porFecha[$f][$r['tipo_movimiento']] += (float)$r['cantidad'];
            }

            echo json_encode(["success" => true, "data" => array_values($porFecha), "raw" => $rows]);
        } catch (PDOException $e) { $this->error($e); }
    }

    private function error($e) {
        error_log("ReportesController Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            "success" => false, 
            "message" => "Error interno del servidor.",
            "debug_temp" => $e->getMessage()
        ]);
    }
}
