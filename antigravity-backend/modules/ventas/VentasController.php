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
            }
            elseif ($method === 'GET' && !empty($paramId) && $action === 'ticket') {
                require_once __DIR__ . '/VentaPdfController.php';
                $_GET['formato'] = 'ticket'; // forzar formato ticket
                (new VentaPdfController())->generar($paramId);
            }
            elseif ($method === 'GET' && !empty($paramId) && $action === 'guia_envio') {
                require_once __DIR__ . '/VentaPdfController.php';
                (new VentaPdfController())->generarGuiaEnvio($paramId);
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

        $op_gravada = (float)($body['op_gravada'] ?? 0);
        $op_exonerada = (float)($body['op_exonerada'] ?? 0);
        $op_inafecta = (float)($body['op_inafecta'] ?? 0);
        $op_gratuita = (float)($body['op_gratuita'] ?? 0);
        $igv_total = (float)($body['igv'] ?? 0);
        $importe_total = (float)($body['importe_total'] ?? 0);

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

            $fecha_actual = date('Y-m-d');

            $stmtVenta = $this->pdo->prepare("INSERT INTO ventas (id, cliente_id, usuario_id, vendedor_id, canal_venta, tipo_comprobante, serie, correlativo, numero_completo, fecha_emision, moneda, op_gravada, op_exonerada, op_inafecta, op_gratuita, igv, importe_total, metodo_pago, estado_sunat, observacion, detraccion_codigo, detraccion_porcentaje, detraccion_monto, detraccion_cuenta, detraccion_medio_pago) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?, ?, ?, ?, ?, ?)");
            $stmtVenta->execute([
                $body['cliente_id'],
                $usuario['user_id'],
                $body['vendedor_id'] ?? null,
                $body['canal_venta'] ?? 'tienda',
                $body['tipo_comprobante'],
                $serie,
                $correlativo,
                $num_completo,
                $fecha_actual,
                $body['moneda'] ?? 'PEN',
                $op_gravada,
                $op_exonerada,
                $op_inafecta,
                $op_gratuita,
                $igv_total,
                $importe_total,
                $body['metodo_pago'] ?? 'EFECTIVO',
                $body['observacion'] ?? null,
                $body['detraccion_codigo'] ?? null,
                $detraccion_porcentaje,
                $detraccion_monto,
                $body['detraccion_cuenta'] ?? null,
                $body['detraccion_medio_pago'] ?? null
            ]);

            $venta_id = $this->pdo->query("SELECT id FROM ventas WHERE numero_completo = '$num_completo' LIMIT 1")->fetchColumn();

            $stmtDet = $this->pdo->prepare("INSERT INTO ventas_detalle (id, venta_id, item, producto_id, codigo_producto, descripcion, unidad_medida, cantidad, valor_unitario, precio_unitario, descuento_unitario, tipo_afectacion_igv, porcentaje_igv) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $i = 1;
            foreach ($body['detalles'] as $d) {
                $ta = $d['tipo_afectacion_igv'] ?? '10';
                $pct_igv = $ta === '10' ? 18 : 0;
                
                $stmtDet->execute([
                    $venta_id, 
                    $i++, 
                    $d['producto_id'], 
                    $d['codigo_producto'] ?? '000', 
                    $d['descripcion'], 
                    $d['unidad_medida'] ?? 'NIU', 
                    $d['cantidad'], 
                    $d['valor_unitario'], 
                    $d['precio_unitario'],
                    $d['descuento_unitario'] ?? 0,
                    $ta,
                    $pct_igv
                ]);
            }

            $this->pdo->commit();

            // DESACOPLADO: Ya no se envía automáticamente a SUNAT aquí.
            // El usuario lo hará desde el listado.

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
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
            $offset = ($page - 1) * $limit;

            $where = " WHERE 1=1 ";
            $params = [];

            if (!empty($_GET['estado_sunat'])) {
                $where .= " AND v.estado_sunat = ? ";
                $params[] = $_GET['estado_sunat'];
            }
            if (!empty($_GET['fecha_desde'])) {
                $where .= " AND v.fecha_emision >= ? ";
                $params[] = $_GET['fecha_desde'];
            }
            if (!empty($_GET['fecha_hasta'])) {
                $where .= " AND v.fecha_emision <= ? ";
                $params[] = $_GET['fecha_hasta'];
            }

            // Contar total
            $stmtCount = $this->pdo->prepare("SELECT COUNT(*) FROM ventas v $where");
            $stmtCount->execute($params);
            $total = (int)$stmtCount->fetchColumn();
            $pages = ceil($total / $limit);

            // Obtener datos
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
                        v.metodo_pago,
                        v.canal_venta,
                        c.razon_social as cliente_nombre,
                        c.numero_documento as cliente_documento,
                        c.telefono as cliente_telefono
                    FROM ventas v 
                    LEFT JOIN clientes c ON v.cliente_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci 
                    $where
                    ORDER BY v.created_at DESC 
                    LIMIT $limit OFFSET $offset";
                    
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            $this->sendResponse(true, "Lista obtenida", [
                'ventas' => $stmt->fetchAll(PDO::FETCH_ASSOC),
                'pagination' => [
                    'total' => $total,
                    'pages' => $pages,
                    'current' => $page,
                    'limit' => $limit
                ]
            ]);
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
                       v.metodo_pago,
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