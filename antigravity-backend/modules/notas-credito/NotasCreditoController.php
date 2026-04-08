<?php
/**
 * NotasCreditoController.php
 * Gestión de notas de crédito (tipo 07 SUNAT)
 */

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

class NotasCreditoController
{
    private $pdo;

    public function __construct()
    {
        $this->pdo = getDB();
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
        $uriSegments = explode('/', trim(str_replace('/notas-credito', '', $route), '/'));
        $paramId = $uriSegments[0] ?? null;

        try {
            if ($method === 'GET' && empty($paramId))
                $this->listar();
            elseif ($method === 'POST' && empty($paramId))
                $this->crear();
            elseif ($method === 'GET' && !empty($paramId))
                $this->obtener($paramId);
            else
                $this->sendResponse(false, "Ruta no permitida.", null, 405);
        } catch (Exception $e) {
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }

    private function listar()
    {
        try {
            $sql = "SELECT nc.*, 
                           cl.razon_social as cliente_nombre,
                           v.numero_completo as venta_numero
                    FROM notas_credito nc
                    LEFT JOIN clientes cl ON nc.cliente_id = cl.id
                    LEFT JOIN ventas v ON nc.venta_id = v.id
                    ORDER BY nc.created_at DESC";

            $stmt = $this->pdo->query($sql);
            $notas = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse(true, "Notas de crédito obtenidas", 
                ['notas' => $notas]);
        } catch (PDOException $e) {
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }

    private function crear()
    {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->venta_id) || !isset($data->motivo) || empty($data->detalles)) {
            $this->sendResponse(false, "venta_id, motivo y detalles son obligatorios", null, 422);
        }

        try {
            $this->pdo->beginTransaction();

            // Obtener datos de la venta original
            $sql_venta = "SELECT * FROM ventas WHERE id = :id";
            $stmt = $this->pdo->prepare($sql_venta);
            $stmt->execute([':id' => $data->venta_id]);
            $venta_original = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$venta_original) {
                $this->sendResponse(false, "Venta referenciada no encontrada", null, 404);
            }

            // Generar número de correlativo para nota de crédito
            $serie = substr($venta_original['serie'], 0, 1) === 'F' ? 'FC01' : 'BC01';
            $sql_correlativo = "SELECT MAX(correlativo) as max_corr FROM notas_credito WHERE serie = :serie";
            $stmt = $this->pdo->prepare($sql_correlativo);
            $stmt->execute([':serie' => $serie]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $correlativo = ($result['max_corr'] ?? 0) + 1;

            // Calcular totales
            $totales = ['gravada' => 0, 'igv' => 0, 'total' => 0];
            foreach ($data->detalles as $det) {
                $subtotal = $det->cantidad * ($det->valor_unitario ?? 0);
                $totales['gravada'] += $subtotal;
            }
            $totales['igv'] = $totales['gravada'] * 0.18;
            $totales['total'] = $totales['gravada'] + $totales['igv'];

            // Crear nota de crédito
            $sql_nota = "INSERT INTO notas_credito 
                        (venta_id, cliente_id, serie, correlativo, motivo, op_gravada, igv, total, moneda)
                        VALUES (:venta_id, :cliente_id, :serie, :correlativo, :motivo, :gravada, :igv, :total, :moneda)";
            $stmt = $this->pdo->prepare($sql_nota);
            $stmt->execute([
                ':venta_id' => $data->venta_id,
                ':cliente_id' => $venta_original['cliente_id'],
                ':serie' => $serie,
                ':correlativo' => $correlativo,
                ':motivo' => $data->motivo,
                ':gravada' => $totales['gravada'],
                ':igv' => $totales['igv'],
                ':total' => $totales['total'],
                ':moneda' => $venta_original['moneda']
            ]);

            $nota_id = $this->pdo->lastInsertId();

            // Agregar detalles
            $item = 1;
            foreach ($data->detalles as $det) {
                $sql_det = "INSERT INTO notas_credito_detalle 
                           (nota_id, item, producto_id, descripcion, cantidad, valor_unitario, precio_unitario, tipo_afectacion_igv)
                           VALUES (:nota_id, :item, :producto_id, :descripcion, :cantidad, :valor_unitario, :precio_unitario, :tipo_afectacion_igv)";
                $stmt = $this->pdo->prepare($sql_det);
                $stmt->execute([
                    ':nota_id' => $nota_id,
                    ':item' => $item,
                    ':producto_id' => $det->producto_id ?? null,
                    ':descripcion' => $det->descripcion,
                    ':cantidad' => $det->cantidad,
                    ':valor_unitario' => $det->valor_unitario ?? 0,
                    ':precio_unitario' => $det->precio_unitario ?? 0,
                    ':tipo_afectacion_igv' => $det->tipo_afectacion_igv ?? '10'
                ]);
                $item++;
            }

            $this->pdo->commit();

            $this->sendResponse(true, "Nota de crédito creada exitosamente. Ahora debe ser enviada a SUNAT.", 
                ['id' => $nota_id, 'numero' => $serie . '-' . str_pad($correlativo, 6, '0', STR_PAD_LEFT)], 201);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }

    private function obtener($id)
    {
        try {
            $sql = "SELECT nc.*, 
                           cl.razon_social as cliente_nombre,
                           v.numero_completo as venta_numero
                    FROM notas_credito nc
                    LEFT JOIN clientes cl ON nc.cliente_id = cl.id
                    LEFT JOIN ventas v ON nc.venta_id = v.id
                    WHERE nc.id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $id]);
            $nota = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$nota) {
                $this->sendResponse(false, "Nota de crédito no encontrada", null, 404);
            }

            // Obtener detalles
            $sql_detalles = "SELECT * FROM notas_credito_detalle WHERE nota_id = :id ORDER BY item";
            $stmt = $this->pdo->prepare($sql_detalles);
            $stmt->execute([':id' => $id]);
            $detalles = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse(true, "Nota obtenida", 
                ['nota' => $nota, 'detalles' => $detalles]);
        } catch (PDOException $e) {
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }
}
