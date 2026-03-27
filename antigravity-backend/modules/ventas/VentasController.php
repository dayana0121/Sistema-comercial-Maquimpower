<?php
/**
 * VentasController.php — Maquimpower v1.0
 * Corregido: Collation Match & Sunat Mapping
 */

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../sunat/SunatHelper.php';

class VentasController
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
        $uriSegments = explode('/', trim(str_replace('/ventas', '', $route), '/'));
        $paramId = $uriSegments[0] ?? null;
        $action = $uriSegments[1] ?? null;

        try {
            if ($method === 'POST' && empty($paramId))
                $this->crearVenta();
            elseif ($method === 'GET' && empty($paramId))
                $this->listarVentas();
            elseif ($method === 'GET' && $paramId === 'pendientes-count')
                $this->obtenerPendientesCount();
            elseif ($method === 'GET' && !empty($paramId) && empty($action))
                $this->obtenerVenta($paramId);
            elseif ($method === 'POST' && !empty($paramId) && $action === 'reintentar')
                $this->reintentarSunat($paramId);
            elseif ($method === 'DELETE' && !empty($paramId))
                $this->anularVenta($paramId);
            elseif ($method === 'GET' && !empty($paramId) && $action === 'pdf') {
                require_once __DIR__ . '/VentaPdfController.php';
                (new VentaPdfController())->generar($paramId);
            } else
                $this->sendResponse(false, "Ruta no permitida.", null, 405);
        } catch (Exception $e) {
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }

    private function crearVenta()
    {
        $usuario = AuthMiddleware::verificar();
        AuthMiddleware::requerirRol(['admin', 'vendedor'], $usuario);
        $body = json_decode(file_get_contents("php://input"), true);

        if (empty($body['cliente_id']) || empty($body['detalles'])) {
            $this->sendResponse(false, "Datos incompletos.", null, 422);
        }

        $op_gravada = 0;
        $igv_total = 0;
        $importe_total = 0;
        $detallesProcesados = [];

        foreach ($body['detalles'] as $linea) {
            $precio = (float) $linea['precio_unitario'];
            $cantidad = (float) $linea['cantidad'];
            $sub = ($precio / 1.18) * $cantidad;
            $igv = ($precio * $cantidad) - $sub;

            $op_gravada += $sub;
            $igv_total += $igv;
            $importe_total += ($precio * $cantidad);

            $detallesProcesados[] = [
                'producto_id' => $linea['producto_id'],
                'producto_nombre' => $linea['producto_nombre'] ?? 'Producto',
                'producto_codigo' => $linea['codigo_producto'] ?? '000',
                'cantidad' => $cantidad,
                'unidad_medida' => $linea['unidad_medida'] ?? 'NIU',
                'precio_unitario' => $precio,
                'igv_linea' => $igv,
                'subtotal' => $sub,
                'total_linea' => ($precio * $cantidad)
            ];
        }

        $serie = $body['serie'] ?? ($body['tipo_comprobante'] === '01' ? 'F001' : 'B001');

        try {
            $this->pdo->beginTransaction();

            $stmtCorr = $this->pdo->prepare("SELECT MAX(correlativo) as max_corr FROM ventas WHERE tipo_comprobante = ? AND serie = ? FOR UPDATE");
            $stmtCorr->execute([$body['tipo_comprobante'], $serie]);
            $correlativo = (int) ($stmtCorr->fetchColumn() ?: 0) + 1;
            $num_completo = $serie . '-' . str_pad($correlativo, 8, '0', STR_PAD_LEFT);

            $detraccion_porcentaje = (float) ($body['detraccion_porcentaje'] ?? 0);
            $detraccion_monto = $detraccion_porcentaje > 0
                ? round($importe_total * ($detraccion_porcentaje / 100), 2)
                : 0;

            $stmtVenta = $this->pdo->prepare("INSERT INTO ventas (id, cliente_id, usuario_id, vendedor_id, tipo_comprobante, serie, correlativo, numero_completo, fecha_emision, moneda, op_gravada, igv, importe_total, estado_sunat, detraccion_codigo, detraccion_porcentaje, detraccion_monto, detraccion_cuenta, detraccion_medio_pago) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, 'PENDIENTE', ?, ?, ?, ?, ?)");
            $stmtVenta->execute([
                $body['cliente_id'],
                $usuario['user_id'],
                $body['vendedor_id'] ?? null,
                $body['tipo_comprobante'],
                $serie,
                $correlativo,
                $num_completo,
                $body['moneda'] ?? 'PEN',
                $op_gravada,
                $igv_total,
                $importe_total,
                $body['detraccion_codigo'] ?? null,
                $detraccion_porcentaje,
                $detraccion_monto,
                $body['detraccion_cuenta'] ?? null,
                $body['detraccion_medio_pago'] ?? null
            ]);

            $venta_id = $this->pdo->query("SELECT id FROM ventas WHERE numero_completo = '$num_completo' LIMIT 1")->fetchColumn();

            $stmtDet = $this->pdo->prepare("INSERT INTO ventas_detalle (id, venta_id, item, producto_id, codigo_producto, descripcion, unidad_medida, cantidad, valor_unitario, precio_unitario, descuento_unitario, tipo_afectacion_igv, porcentaje_igv) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '10', 18)");
            $i = 1;
            foreach ($detallesProcesados as $d) {
                $stmtDet->execute([$venta_id, $i++, $d['producto_id'], $d['producto_codigo'], $d['producto_nombre'], $d['unidad_medida'], $d['cantidad'], round($d['precio_unitario'] / 1.18, 4), $d['precio_unitario']]);
            }

            $this->pdo->commit();

            if (getenv('SUNAT_HABILITADO') === 'true') {
                $this->procesarEnvioSunat($venta_id, $body['cliente_id']);
            }

            $this->sendResponse(true, "Venta registrada.", ['id' => $venta_id, 'numero_completo' => $num_completo], 201);
        } catch (Exception $e) {
            if ($this->pdo->inTransaction())
                $this->pdo->rollBack();
            $this->sendResponse(false, "DB Error: " . $e->getMessage(), null, 500);
        }
    }

    private function listarVentas()
    {
        AuthMiddleware::verificar();
        try {
            // ✅ SOLUCIÓN COLLATION: Agregamos COLLATE al JOIN
            $sql = "SELECT 
                        v.id, 
                        v.tipo_comprobante, 
                        v.serie, 
                        v.correlativo, 
                        v.numero_completo, 
                        v.fecha_emision, 
                        v.importe_total, 
                        v.estado_sunat, 
                        v.estado_pago,
                        v.moneda,
                        v.condicion_pago,
                        c.razon_social as cliente_nombre,
                        c.numero_documento as cliente_documento,
                        c.telefono as cliente_telefono
                    FROM ventas v 
                    LEFT JOIN clientes c ON v.cliente_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci 
                    ORDER BY v.created_at DESC LIMIT 100";
            $stmt = $this->pdo->query($sql);
            $this->sendResponse(true, "Lista obtenida", ['ventas' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            $this->sendResponse(false, "Error listar: " . $e->getMessage(), null, 500);
        }
    }

    private function obtenerVenta($id)
    {
        AuthMiddleware::verificar();
        try {
            $stmt = $this->pdo->prepare("
                SELECT v.*, 
                       c.razon_social AS cliente_nombre, 
                       c.numero_documento AS cliente_documento, 
                       c.email AS cliente_email,
                       c.telefono AS cliente_telefono,
                       c.direccion_fiscal as direccion 
                FROM ventas v 
                LEFT JOIN clientes c ON v.cliente_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci 
                WHERE v.id = ?
            ");
            $stmt->execute([$id]);
            $venta = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$venta)
                $this->sendResponse(false, "No existe", null, 404);
            $det = $this->pdo->prepare("
                SELECT vd.*, (vd.cantidad * vd.precio_unitario) AS precio_total 
                FROM ventas_detalle vd 
                WHERE vd.venta_id = ? 
                ORDER BY vd.item
            ");
            $det->execute([$id]);
            $venta['detalles'] = $det->fetchAll(PDO::FETCH_ASSOC);

            require_once __DIR__ . '/../../helpers/NumLetras.php';
            $venta['importe_en_letras'] = numeroALetras((float) $venta['importe_total']);

            $this->sendResponse(true, "Venta", $venta);
        } catch (Exception $e) {
            $this->sendResponse(false, "Error obtener: " . $e->getMessage(), null, 500);
        }
    }

    private function reintentarSunat($id)
    {
        AuthMiddleware::requerirRol(['admin'], AuthMiddleware::verificar());
        $this->procesarEnvioSunat($id);
        $this->sendResponse(true, "Procesado");
    }

    private function anularVenta($id)
    {
        AuthMiddleware::requerirRol(['admin'], AuthMiddleware::verificar());
        $this->pdo->prepare("UPDATE ventas SET estado_sunat = 'ANULADO' WHERE id = ?")->execute([$id]);
        $this->sendResponse(true, "Anulada");
    }

    private function procesarEnvioSunat($venta_id, $cliente_id = null)
    {
        try {
            $stmtV = $this->pdo->prepare("SELECT * FROM ventas WHERE id = ?");
            $stmtV->execute([$venta_id]);
            $v = $stmtV->fetch(PDO::FETCH_ASSOC);

            $stmtC = $this->pdo->prepare("SELECT tipo_documento, numero_documento, razon_social as nombre_razon_social, direccion_fiscal as direccion FROM clientes WHERE id = ?");
            $stmtC->execute([$v['cliente_id']]);
            $c = $stmtC->fetch(PDO::FETCH_ASSOC);

            $stmtD = $this->pdo->prepare("SELECT * FROM ventas_detalle WHERE venta_id = ?");
            $stmtD->execute([$venta_id]);
            $detallesBD = $stmtD->fetchAll(PDO::FETCH_ASSOC);

            $ventaData = [
                'serie' => $v['serie'],
                'correlativo' => $v['correlativo'],
                'fecha_emision' => $v['fecha_emision'],
                'tipo_comprobante' => $v['tipo_comprobante'],
                'op_gravada' => $v['op_gravada'],
                'igv' => $v['igv'],
                'importe_total' => $v['importe_total'],
                'detraccion_codigo' => $v['detraccion_codigo'] ?? null,
                'detraccion_porcentaje' => $v['detraccion_porcentaje'] ?? 0,
                'detraccion_monto' => $v['detraccion_monto'] ?? 0,
                'detraccion_cuenta' => $v['detraccion_cuenta'] ?? '',
                'detraccion_medio_pago' => $v['detraccion_medio_pago'] ?? ''
            ];

            $detallesMapeados = array_map(function ($d) {
                return [
                    'descripcion' => $d['descripcion'],
                    'cantidad' => $d['cantidad'],
                    'precio_unitario' => $d['precio_unitario'],
                    'valor_unitario' => $d['valor_unitario'],
                    'codigo_producto' => $d['codigo_producto'],
                    'unidad_medida' => $d['unidad_medida']
                ];
            }, $detallesBD);

            $helper = new SunatHelper();
            $res = $helper->procesarFactura($ventaData, $detallesMapeados, $c);
            $datos = $helper->getUltimoResultado();

            $this->pdo->prepare("UPDATE ventas SET estado_sunat=?, cdr_sunat=?, codigo_sunat=?, mensaje_sunat=?, fecha_envio_sunat=NOW() WHERE id=?")
                ->execute([$res['success'] ? 'ACEPTADO' : 'RECHAZADO', $datos['cdr_response'], $datos['codigo_sunat'], $datos['mensaje_sunat'], $venta_id]);

        } catch (Exception $e) {
            error_log("SUNAT CRITICAL ERR: " . $e->getMessage());
        }
    }

    private function obtenerPendientesCount()
    {
        AuthMiddleware::verificar();
        try {
            $stmt = $this->pdo->query("SELECT COUNT(*) as total FROM ventas WHERE estado_sunat IN ('PENDIENTE', 'RECHAZADO')");
            $count = $stmt->fetchColumn();
            $this->sendResponse(true, "Conteo obtenido", ['pendientes' => (int) $count]);
        } catch (Exception $e) {
            $this->sendResponse(false, "Error conteo: " . $e->getMessage(), null, 500);
        }
    }
}