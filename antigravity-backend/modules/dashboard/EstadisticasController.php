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
        $user = AuthMiddleware::verificar();
        header('Content-Type: application/json');

        if ($method !== 'GET') {
            http_response_code(405);
            echo json_encode(["success" => false, "message" => "Método no permitido"]);
            return;
        }

        if (str_contains($route, '/stats')) {
            $this->obtenerStats();
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Ruta no encontrada"]);
        }
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

            // 1. Clientes Activos
            $stmt = $this->conn->query("SELECT COUNT(*) as total FROM clientes WHERE activo = 1");
            $stats["clientesActivos"] = (int) $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // 2. Stock Crítico
            $stmt = $this->conn->query("SELECT COUNT(*) as total FROM productos WHERE stock_actual <= stock_minimo AND activo = 1");
            $stats["productosBajoStock"] = (int) $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // 3. Ventas (Protegido por si la tabla aún no existe)
            try {
                // Ventas de Hoy
                $stmtHoy = $this->conn->query("SELECT COUNT(*) as cantidad, SUM(importe_total) as monto FROM ventas WHERE DATE(fecha_emision) = CURDATE() AND estado_sunat != 'ANULADO'");
                $ventasHoy = $stmtHoy->fetch(PDO::FETCH_ASSOC);
                $stats["ventasHoy"] = (int) ($ventasHoy['cantidad'] ?? 0);
                $stats["monto_hoy"] = (float) ($ventasHoy['monto'] ?? 0.00);

                // Ingresos del Mes
                $stmtMes = $this->conn->query("SELECT SUM(importe_total) as monto FROM ventas WHERE MONTH(fecha_emision) = MONTH(CURDATE()) AND YEAR(fecha_emision) = YEAR(CURDATE()) AND estado_sunat != 'ANULADO'");
                $stats["totalVentasMes"] = (float) ($stmtMes->fetch(PDO::FETCH_ASSOC)['monto'] ?? 0.00);

                // Últimas 5 Ventas (Con JOIN simulando la estructura que enviaste)
                $stmtLast = $this->conn->query("
                    SELECT v.id, v.serie, v.correlativo, v.importe_total as total, v.estado_sunat, c.razon_social 
                    FROM ventas v 
                    LEFT JOIN clientes c ON v.cliente_id = c.id 
                    ORDER BY v.created_at DESC 
                    LIMIT 5
                ");
                $lastVentasRaw = $stmtLast->fetchAll(PDO::FETCH_ASSOC);

                // Formateamos para que coincida con lo que espera tu frontend (v.clientes.razon_social)
                foreach ($lastVentasRaw as $v) {
                    $lastVentas[] = [
                        "id" => $v['id'],
                        "serie" => $v['serie'],
                        "correlativo" => $v['correlativo'],
                        "total" => $v['total'],
                        "estado_sunat" => $v['estado_sunat'],
                        "clientes" => ["razon_social" => $v['razon_social']]
                    ];
                }

            } catch (PDOException $e) {
                // Silencioso. Si la tabla no existe, devuelve 0 y array vacío.
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