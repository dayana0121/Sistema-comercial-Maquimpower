<?php
/**
 * CotizacionesController.php
 * Gestión de cotizaciones (pre-ventas)
 */

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/CotizacionesService.php';

class CotizacionesController
{
    private $pdo;
    private $service;

    public function __construct()
    {
        $this->pdo = getDB();
        $this->service = new CotizacionesService($this->pdo);
    }

    private function sendResponse($success, $message, $data = null, $statusCode = 200)
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
        exit;
    }

    public function handle($route, $method)
    {
        $uriSegments = explode('/', trim(str_replace('/cotizaciones', '', $route), '/'));
        $paramId = $uriSegments[0] ?? null;
        $action = $uriSegments[1] ?? null;

        try {
            if ($method === 'GET' && empty($paramId))
                $this->listar();
            elseif ($method === 'POST' && empty($paramId))
                $this->crear();
            elseif ($method === 'GET' && !empty($paramId) && empty($action))
                $this->obtener($paramId);
            elseif ($method === 'GET' && !empty($paramId) && $action === 'pdf')
                $this->generarPdf($paramId);
            elseif ($method === 'POST' && !empty($paramId) && $action === 'convertir')
                $this->convertirAVenta($paramId);
            elseif ($method === 'DELETE' && !empty($paramId))
                $this->eliminar($paramId);
            else
                $this->sendResponse(false, "Ruta no permitida.", null, 405);
        } catch (Exception $e) {
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }

    private function listar()
    {
        try {
            $estado = $_GET['estado'] ?? null;
            $cliente_id = $_GET['cliente_id'] ?? null;

            $sql = "SELECT c.*, 
                           cl.razon_social as cliente_nombre,
                           v.nombre as vendedor_nombre
                    FROM cotizaciones c
                    LEFT JOIN clientes cl ON c.cliente_id = cl.id
                    LEFT JOIN vendedores v ON c.vendedor_id = v.id
                    WHERE 1=1";

            $params = [];
            if ($estado) {
                $sql .= " AND c.estado = :estado";
                $params[':estado'] = $estado;
            }
            if ($cliente_id) {
                $sql .= " AND c.cliente_id = :cliente_id";
                $params[':cliente_id'] = $cliente_id;
            }

            $sql .= " ORDER BY c.created_at DESC";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $cotizaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Obtener detalles para cada cotización
            $cotizacionesConDetalles = [];
            foreach ($cotizaciones as $cot) {
                $sql_detalles = "SELECT cd.*, p.descripcion, p.codigo_interno 
                                FROM cotizaciones_detalle cd
                                LEFT JOIN productos p ON cd.producto_id = p.id
                                WHERE cd.cotizacion_id = :id
                                ORDER BY cd.item";
                $stmt_det = $this->pdo->prepare($sql_detalles);
                $stmt_det->execute([':id' => $cot['id']]);
                $cot['detalles'] = $stmt_det->fetchAll(PDO::FETCH_ASSOC);
                $cotizacionesConDetalles[] = $cot;
            }

            $this->sendResponse(true, "Cotizaciones obtenidas", $cotizacionesConDetalles);
        } catch (PDOException $e) {
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }

    private function crear()
    {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->cliente_id) || empty($data->detalles)) {
            $this->sendResponse(false, "cliente_id y detalles son obligatorios", null, 422);
        }

        try {
            $this->pdo->beginTransaction();

            // Crear cotización
            $sql = "INSERT INTO cotizaciones (cliente_id, vendedor_id, fecha_vigencia, numero_whatsapp, observaciones, moneda)
                    VALUES (:cliente_id, :vendedor_id, :fecha_vigencia, :numero_whatsapp, :observaciones, :moneda)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':cliente_id' => $data->cliente_id,
                ':vendedor_id' => $data->vendedor_id ?? null,
                ':fecha_vigencia' => $data->fecha_vigencia ?? null,
                ':numero_whatsapp' => $data->numero_whatsapp ?? null,
                ':observaciones' => $data->observaciones ?? null,
                ':moneda' => $data->moneda ?? 'PEN'
            ]);

            $cotizacion_id = $this->pdo->lastInsertId();

            // Crear detalles
            $totales = $this->service->agregarDetalles($cotizacion_id, $data->detalles);

            // Actualizar totales
            $sql_update = "UPDATE cotizaciones SET op_gravada = :gravada, igv = :igv, total = :total WHERE id = :id";
            $stmt = $this->pdo->prepare($sql_update);
            $stmt->execute([
                ':gravada' => $totales['gravada'],
                ':igv' => $totales['igv'],
                ':total' => $totales['total'],
                ':id' => $cotizacion_id
            ]);

            $this->pdo->commit();

            $this->sendResponse(true, "Cotización creada exitosamente", 
                ['id' => $cotizacion_id], 201);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }

    private function obtener($id)
    {
        try {
            $sql = "SELECT c.*, 
                           cl.razon_social as cliente_nombre, cl.email as cliente_email,
                           v.nombre as vendedor_nombre
                    FROM cotizaciones c
                    LEFT JOIN clientes cl ON c.cliente_id = cl.id
                    LEFT JOIN vendedores v ON c.vendedor_id = v.id
                    WHERE c.id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $id]);
            $cotizacion = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$cotizacion) {
                $this->sendResponse(false, "Cotización no encontrada", null, 404);
            }

            // Obtener detalles
            $sql_detalles = "SELECT cd.*, p.descripcion, p.codigo_interno 
                            FROM cotizaciones_detalle cd
                            LEFT JOIN productos p ON cd.producto_id = p.id
                            WHERE cd.cotizacion_id = :id
                            ORDER BY cd.item";
            $stmt = $this->pdo->prepare($sql_detalles);
            $stmt->execute([':id' => $id]);
            $detalles = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse(true, "Cotización obtenida", 
                ['cotizacion' => $cotizacion, 'detalles' => $detalles]);
        } catch (PDOException $e) {
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }

    private function generarPdf($id)
    {
        try {
            // TODO: Implementar generación de PDF similar a VentasPdfController
            // Usar FPDF library
            $this->sendResponse(false, "Función no implementada aún", null, 501);
        } catch (Exception $e) {
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }

    private function convertirAVenta($id)
    {
        $data = json_decode(file_get_contents("php://input"));

        try {
            $this->pdo->beginTransaction();

            // Obtener la cotización
            $sql = "SELECT * FROM cotizaciones WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $id]);
            $cotizacion = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$cotizacion) {
                $this->sendResponse(false, "Cotización no encontrada", null, 404);
            }

            // Crear venta basada en la cotización
            $sql_venta = "INSERT INTO ventas (cliente_id, vendedor_id, tipo_comprobante, serie, moneda, op_gravada, igv, total)
                         VALUES (:cliente_id, :vendedor_id, :tipo_comprobante, :serie, :moneda, :op_gravada, :igv, :total)";
            $stmt = $this->pdo->prepare($sql_venta);
            $stmt->execute([
                ':cliente_id' => $cotizacion['cliente_id'],
                ':vendedor_id' => $cotizacion['vendedor_id'],
                ':tipo_comprobante' => $data->tipo_comprobante ?? '01',
                ':serie' => $data->serie ?? 'F001',
                ':moneda' => $cotizacion['moneda'],
                ':op_gravada' => $cotizacion['op_gravada'],
                ':igv' => $cotizacion['igv'],
                ':total' => $cotizacion['total']
            ]);

            $venta_id = $this->pdo->lastInsertId();

            // Copiar detalles
            $sql_detalles = "INSERT INTO ventas_detalle (venta_id, item, producto_id, descripcion, cantidad, valor_unitario, precio_unitario, tipo_afectacion_igv)
                            SELECT :venta_id, item, producto_id, descripcion, cantidad, valor_unitario, precio_unitario, tipo_afectacion_igv
                            FROM cotizaciones_detalle
                            WHERE cotizacion_id = :cotizacion_id";
            $stmt = $this->pdo->prepare($sql_detalles);
            $stmt->execute([':venta_id' => $venta_id, ':cotizacion_id' => $id]);

            // Actualizar estado de cotización
            $sql_update = "UPDATE cotizaciones SET estado = 'CONVERTIDA' WHERE id = :id";
            $stmt = $this->pdo->prepare($sql_update);
            $stmt->execute([':id' => $id]);

            $this->pdo->commit();

            $this->sendResponse(true, "Cotización convertida a venta exitosamente", 
                ['venta_id' => $venta_id]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }

    private function eliminar($id)
    {
        try {
            $sql = "DELETE FROM cotizaciones WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() === 0) {
                $this->sendResponse(false, "Cotización no encontrada", null, 404);
            }

            $this->sendResponse(true, "Cotización eliminada correctamente");
        } catch (PDOException $e) {
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }
}
