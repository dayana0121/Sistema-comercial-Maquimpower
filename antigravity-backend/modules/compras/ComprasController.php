<?php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/db.php';

class ComprasController {
    private $conn;
    public function __construct() { $this->conn = getDB(); }

    public function handle($route, $method) {
        $user = AuthMiddleware::verificar();
        header('Content-Type: application/json');

        $id = null;
        $parts = explode('/', trim($route, '/'));
        if (isset($parts[1]) && strlen($parts[1]) > 0) $id = $parts[1];

        switch ($method) {
            case 'GET':
                $id ? $this->obtener($id) : $this->listar();
                break;
            case 'POST':
                AuthMiddleware::requerirRol(['admin', 'administrador', 'almacen'], $user);
                $this->crear();
                break;
            case 'PUT':
                AuthMiddleware::requerirRol(['admin', 'administrador'], $user);
                $id ? $this->actualizar($id) : $this->error422("ID requerido");
                break;
            case 'DELETE':
                AuthMiddleware::requerirRol(['admin', 'administrador'], $user);
                $id ? $this->anular($id) : $this->error422("ID requerido");
                break;
            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Método no permitido"]);
        }
    }

    private function listar() {
        try {
            $estado = $_GET['estado'] ?? '';
            $desde  = $_GET['fecha_desde'] ?? '';
            $hasta  = $_GET['fecha_hasta'] ?? '';
            $where  = "WHERE 1=1";
            $params = [];
            if ($estado) { $where .= " AND c.estado = :estado"; $params[':estado'] = $estado; }
            if ($desde)  { $where .= " AND c.fecha_comprobante >= :desde"; $params[':desde'] = $desde; }
            if ($hasta)  { $where .= " AND c.fecha_comprobante <= :hasta"; $params[':hasta'] = $hasta; }

            $stmt = $this->conn->prepare("
                SELECT c.*, p.razon_social AS proveedor_nombre, p.numero_documento AS proveedor_ruc
                FROM compras c
                LEFT JOIN proveedores p ON c.proveedor_id = p.id
                $where
                ORDER BY c.created_at DESC
                LIMIT 100
            ");
            foreach ($params as $k => $v) $stmt->bindValue($k, $v);
            $stmt->execute();
            echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (PDOException $e) { $this->manejarError($e); }
    }

    private function obtener($id) {
        try {
            $stmt = $this->conn->prepare("
                SELECT c.*, p.razon_social AS proveedor_nombre, p.numero_documento AS proveedor_ruc,
                       p.email AS proveedor_email, p.telefono AS proveedor_telefono
                FROM compras c
                LEFT JOIN proveedores p ON c.proveedor_id = p.id
                WHERE c.id = :id
            ");
            $stmt->bindValue(':id', $id);
            $stmt->execute();
            $compra = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$compra) { http_response_code(404); echo json_encode(["success" => false, "message" => "Compra no encontrada"]); return; }

            $stmtDet = $this->conn->prepare("SELECT * FROM compras_detalle WHERE compra_id = :id ORDER BY item");
            $stmtDet->bindValue(':id', $id);
            $stmtDet->execute();
            $compra['detalles'] = $stmtDet->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["success" => true, "data" => $compra]);
        } catch (PDOException $e) { $this->manejarError($e); }
    }

    private function crear() {
        try {
            $data = json_decode(file_get_contents("php://input"));

            if (empty($data->proveedor_id) || empty($data->detalles) || count($data->detalles) === 0) {
                $this->error422("proveedor_id y detalles son obligatorios"); return;
            }

            $this->conn->beginTransaction();

            $id = $this->conn->query("SELECT UUID()")->fetchColumn();

            // Calcular totales desde detalles
            $opGravada = 0; $igvTotal = 0;
            foreach ($data->detalles as $d) {
                $subtotal = (float)$d->cantidad * (float)$d->costo_unitario;
                $igvItem  = $subtotal * 0.18;
                $opGravada += $subtotal;
                $igvTotal  += $igvItem;
            }
            $importeTotal = $opGravada + $igvTotal;

            $stmt = $this->conn->prepare("INSERT INTO compras
                (id, proveedor_id, tipo_comprobante, numero_comprobante, fecha_comprobante,
                 fecha_vencimiento, op_gravada, igv, importe_total, moneda, estado, observacion, usuario_id)
                VALUES (:id,:prov,:tipo,:ncomp,:fecha,:fvenc,:grav,:igv,:total,:mon,:est,:obs,:user)");
            $stmt->bindValue(':id', $id);
            $stmt->bindValue(':prov', $data->proveedor_id);
            $stmt->bindValue(':tipo', $data->tipo_comprobante ?? 'FACTURA');
            $stmt->bindValue(':ncomp', $data->numero_comprobante ?? null);
            $stmt->bindValue(':fecha', $data->fecha_comprobante ?? date('Y-m-d'));
            $stmt->bindValue(':fvenc', $data->fecha_vencimiento ?? null);
            $stmt->bindValue(':grav', round($opGravada, 2));
            $stmt->bindValue(':igv', round($igvTotal, 2));
            $stmt->bindValue(':total', round($importeTotal, 2));
            $stmt->bindValue(':mon', $data->moneda ?? 'PEN');
            $stmt->bindValue(':est', 'PENDIENTE');
            $stmt->bindValue(':obs', $data->observacion ?? null);
            $stmt->bindValue(':user', null);
            $stmt->execute();

            // Insertar detalles y actualizar stock
            foreach ($data->detalles as $i => $d) {
                $detId   = $this->conn->query("SELECT UUID()")->fetchColumn();
                $subtotal = round((float)$d->cantidad * (float)$d->costo_unitario, 2);
                $igvItem  = round($subtotal * 0.18, 2);

                $stmtDet = $this->conn->prepare("INSERT INTO compras_detalle
                    (id, compra_id, item, producto_id, descripcion, unidad_medida, cantidad, costo_unitario, igv_item, subtotal)
                    VALUES (:id,:cid,:item,:prod,:desc,:um,:cant,:costo,:igv,:sub)");
                $stmtDet->bindValue(':id', $detId);
                $stmtDet->bindValue(':cid', $id);
                $stmtDet->bindValue(':item', $i + 1);
                $stmtDet->bindValue(':prod', $d->producto_id ?? null);
                $stmtDet->bindValue(':desc', $d->descripcion);
                $stmtDet->bindValue(':um', $d->unidad_medida ?? 'NIU');
                $stmtDet->bindValue(':cant', $d->cantidad);
                $stmtDet->bindValue(':costo', $d->costo_unitario);
                $stmtDet->bindValue(':igv', $igvItem);
                $stmtDet->bindValue(':sub', $subtotal);
                $stmtDet->execute();

                // Actualizar stock si tiene producto_id
                if (!empty($d->producto_id)) {
                    // Obtener stock actual antes de insertar el movimiento (FIX sugerido por usuario)
                    $stmtCheck = $this->conn->prepare("SELECT stock_actual FROM productos WHERE id = :id");
                    $stmtCheck->bindValue(':id', $d->producto_id);
                    $stmtCheck->execute();
                    $stockAnterior = (float)($stmtCheck->fetchColumn() ?? 0);
                    $stockNuevo = $stockAnterior + (float)$d->cantidad;

                    $stmtStock = $this->conn->prepare("UPDATE productos SET stock_actual = stock_actual + :cant WHERE id = :id");
                    $stmtStock->bindValue(':cant', (float)$d->cantidad);
                    $stmtStock->bindValue(':id', $d->producto_id);
                    $stmtStock->execute();

                    // Registrar en kardex incluyendo stock_anterior y stock_nuevo
                    $movId = $this->conn->query("SELECT UUID()")->fetchColumn();
                    $stmtMov = $this->conn->prepare("INSERT INTO inventario_movimientos
                        (id, producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, referencia)
                        VALUES (:id,:prod,'ENTRADA',:cant,:stock_ant,:stock_nvo,:motivo,:ref)");
                    $stmtMov->bindValue(':id', $movId);
                    $stmtMov->bindValue(':prod', $d->producto_id);
                    $stmtMov->bindValue(':cant', (float)$d->cantidad);
                    $stmtMov->bindValue(':stock_ant', $stockAnterior);
                    $stmtMov->bindValue(':stock_nvo', $stockNuevo);
                    $stmtMov->bindValue(':motivo', 'Compra: ' . ($data->numero_comprobante ?? $id));
                    $stmtMov->bindValue(':ref', $id);
                    $stmtMov->execute();
                }
            }

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Compra registrada.", "data" => ["id" => $id, "importe_total" => round($importeTotal, 2)]]);

        } catch (PDOException $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            $this->manejarError($e);
        }
    }

    private function actualizar($id) {
        try {
            $data = json_decode(file_get_contents("php://input"));
            $stmt = $this->conn->prepare("UPDATE compras SET
                estado=:estado, estado_pago=:epago, monto_pagado=:mpago, observacion=:obs
                WHERE id=:id");
            $stmt->bindValue(':estado', $data->estado ?? 'PENDIENTE');
            $stmt->bindValue(':epago', $data->estado_pago ?? 'PENDIENTE');
            $stmt->bindValue(':mpago', $data->monto_pagado ?? 0);
            $stmt->bindValue(':obs', $data->observacion ?? null);
            $stmt->bindValue(':id', $id);
            $stmt->execute();
            echo json_encode(["success" => true, "message" => "Compra actualizada."]);
        } catch (PDOException $e) { $this->manejarError($e); }
    }

    private function anular($id) {
        try {
            $stmt = $this->conn->prepare("UPDATE compras SET estado = 'ANULADO' WHERE id = :id");
            $stmt->bindValue(':id', $id);
            $stmt->execute();
            echo json_encode(["success" => true, "message" => "Compra anulada."]);
        } catch (PDOException $e) { $this->manejarError($e); }
    }

    private function error422($msg) {
        http_response_code(422);
        echo json_encode(["success" => false, "message" => $msg]);
    }

    private function manejarError($e) {
        error_log("ComprasController Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error interno del servidor."]);
    }
}
