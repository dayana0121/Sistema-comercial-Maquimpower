<?php
// modules/dashboard/EstadisticasController.php

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

class EstadisticasController
{
    private $conn;

    public function __construct()
    {
        $this->conn = getDB();
    }

    public function handle($route, $method)
    {
        AuthMiddleware::verificar();
        header('Content-Type: application/json');

        if ($method !== 'GET') {
            http_response_code(405);
            echo json_encode(["success" => false, "message" => "Metodo no permitido"]);
            return;
        }

        if (str_contains($route, '/stats')) {
            $this->obtenerStats();
            return;
        }

        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Ruta no encontrada"]);
    }

    private function obtenerStats()
    {
        try {
            $stats = [
                "ventasHoy" => 0,
                "clientesActivos" => 0,
                "productosBajoStock" => 0,
                "totalVentasMes" => 0.00,
                "monto_hoy" => 0.00
            ];
            $lastVentas = [];

            // Yo cuento clientes activos reales.
            $stmt = $this->conn->query("SELECT COUNT(*) AS total FROM clientes WHERE activo = 1");
            $stats["clientesActivos"] = (int) ($stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);

            // Yo cuento productos con bajo stock segun stock_actual <= stock_minimo.
            $stmt = $this->conn->query("SELECT COUNT(*) AS total FROM productos WHERE stock_actual <= stock_minimo AND activo = 1");
            $stats["productosBajoStock"] = (int) ($stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);

            // Yo calculo ventas y monto del dia sumando todas las ventas de la fecha actual.
            $stmtHoy = $this->conn->query("
                SELECT
                    COUNT(*) AS cantidad,
                    COALESCE(SUM(importe_total), 0) AS monto
                FROM ventas
                WHERE DATE(fecha_emision) = CURDATE()
            ");
            $ventasHoy = $stmtHoy->fetch(PDO::FETCH_ASSOC);
            $stats["ventasHoy"] = (int) ($ventasHoy['cantidad'] ?? 0);
            $stats["monto_hoy"] = (float) ($ventasHoy['monto'] ?? 0.00);

            // Yo calculo ingresos del mes sumando todas las ventas del mes actual.
            $stmtMes = $this->conn->query("
                SELECT COALESCE(SUM(importe_total), 0) AS monto
                FROM ventas
                WHERE MONTH(fecha_emision) = MONTH(CURDATE())
                  AND YEAR(fecha_emision) = YEAR(CURDATE())
            ");
            $stats["totalVentasMes"] = (float) ($stmtMes->fetch(PDO::FETCH_ASSOC)['monto'] ?? 0.00);

            // Yo obtengo las ultimas 5 ventas para mostrarlas en la tabla del dashboard.
            $stmtLast = $this->conn->query("
                SELECT
                    v.id,
                    v.serie,
                    v.correlativo,
                    v.numero_completo,
                    v.fecha_emision,
                    v.importe_total AS total,
                    v.estado_sunat,
                    c.razon_social
                FROM ventas v
                LEFT JOIN clientes c ON v.cliente_id COLLATE utf8mb4_general_ci = c.id COLLATE utf8mb4_general_ci
                ORDER BY v.created_at DESC
                LIMIT 5
            ");
            $lastVentasRaw = $stmtLast->fetchAll(PDO::FETCH_ASSOC);

            foreach ($lastVentasRaw as $v) {
                $lastVentas[] = [
                    "id" => $v['id'],
                    "serie" => $v['serie'],
                    "correlativo" => $v['correlativo'],
                    "numero_completo" => $v['numero_completo'],
                    "fecha_emision" => $v['fecha_emision'],
                    "total" => $v['total'],
                    "estado_sunat" => $v['estado_sunat'],
                    "clientes" => ["razon_social" => $v['razon_social']]
                ];
            }

            echo json_encode([
                "success" => true,
                "data" => [
                    "stats" => $stats,
                    "lastVentas" => $lastVentas
                ]
            ]);
        } catch (PDOException $e) {
            $this->manejarError($e);
        }
    }

    private function manejarError($e)
    {
        error_log("EstadisticasController Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error interno del servidor"]);
    }
}
