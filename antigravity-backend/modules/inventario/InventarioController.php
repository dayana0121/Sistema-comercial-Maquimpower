<?php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/db.php';

class InventarioController {
    private $conn;

    public function __construct() {
        $this->conn = getDB();
    }

    public function handle($route, $method) {
        $user = AuthMiddleware::verificar();
        header('Content-Type: application/json');

        // GET /inventario/alertas
        if ($method === 'GET' && str_contains($route, '/alertas')) {
            $this->listarAlertas();
            return;
        }

        // GET /inventario/kardex
        if ($method === 'GET' && str_contains($route, '/kardex')) {
            $producto_id = $_GET['producto_id'] ?? null;
            $this->kardex($producto_id);
            return;
        }

        // GET /inventario/almacenes (Nuevo)
        if ($method === 'GET' && str_contains($route, '/almacenes')) {
            $this->listarAlmacenes();
            return;
        }

        // POST /inventario/movimiento
        if ($method === 'POST' && str_contains($route, '/movimiento')) {
            AuthMiddleware::requerirRol(['admin', 'administrador', 'almacen'], $user);
            $this->registrarMovimiento();
            return;
        }

        // GET /inventario — lista productos con stock
        if ($method === 'GET') {
            $this->listar();
            return;
        }

        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Método no permitido"]);
    }

    private function listar() {
        try {
            $search = $_GET['search'] ?? '';
            $estado = $_GET['estado'] ?? '';

            $where = "WHERE p.activo = 1";
            $params = [];

            if ($search) {
                $where .= " AND (p.descripcion LIKE :search OR p.sku LIKE :search2 OR p.codigo_interno LIKE :search3)";
                $params[':search'] = "%$search%";
                $params[':search2'] = "%$search%";
                $params[':search3'] = "%$search%";
            }

            if ($estado) {
                $where .= " AND p.estado_stock = :estado";
                $params[':estado'] = $estado;
            }

            $stmt = $this->conn->prepare("
                SELECT
                    p.id, p.codigo_interno, p.sku, p.descripcion,
                    p.categoria, p.stock_actual, p.stock_minimo,
                    p.unidad_medida, p.estado_stock
                FROM productos p
                $where
                ORDER BY p.descripcion ASC
            ");
            foreach ($params as $k => $v) $stmt->bindValue($k, $v);
            $stmt->execute();

            $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Stats para el dashboard de inventario
            $total    = count($productos);
            $enStock  = count(array_filter($productos, fn($p) => $p['estado_stock'] === 'EN STOCK'));
            $bajo     = count(array_filter($productos, fn($p) => $p['estado_stock'] === 'BAJO STOCK'));
            $agotado  = count(array_filter($productos, fn($p) => $p['estado_stock'] === 'AGOTADO'));

            echo json_encode([
                "success" => true,
                "data" => $productos,
                "stats" => [
                    "total" => $total,
                    "en_stock" => $enStock,
                    "bajo_stock" => $bajo,
                    "agotados" => $agotado,
                ]
            ]);
        } catch (PDOException $e) { $this->manejarError($e); }
    }

    private function registrarMovimiento() {
        try {
            $data = json_decode(file_get_contents("php://input"));

            if (empty($data->producto_id) || empty($data->tipo_movimiento) || !isset($data->cantidad) || $data->cantidad <= 0) {
                http_response_code(422);
                echo json_encode(["success" => false, "message" => "producto_id, tipo_movimiento y cantidad son obligatorios"]);
                return;
            }

            $tipos = ['ENTRADA', 'SALIDA', 'AJUSTE', 'DEVOLUCION', 'TRASLADO'];
            if (!in_array(strtoupper($data->tipo_movimiento), $tipos)) {
                http_response_code(422);
                echo json_encode(["success" => false, "message" => "tipo_movimiento debe ser: ENTRADA, SALIDA, AJUSTE, DEVOLUCION o TRASLADO"]);
                return;
            }

            $this->conn->beginTransaction();

            // Verificar que el producto existe y obtener stock actual
            $stmt = $this->conn->prepare("SELECT id, stock_actual, descripcion FROM productos WHERE id = :id AND activo = 1 FOR UPDATE");
            $stmt->bindValue(':id', $data->producto_id);
            $stmt->execute();
            $producto = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$producto) {
                $this->conn->rollBack();
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Producto no encontrado"]);
                return;
            }

            // Calcular nuevo stock global
            $tipo = strtoupper($data->tipo_movimiento);
            $stockAnterior = (float) $producto['stock_actual'];
            $cantidad = (float) $data->cantidad;

            // Almacenes
            $almOrigen = $data->almacen_origen_id ?? null;
            $almDestino = $data->almacen_destino_id ?? null;

            if ($tipo === 'TRASLADO') {
                if (!$almOrigen || !$almDestino || $almOrigen === $almDestino) {
                    $this->conn->rollBack();
                    $this->error422("Para traslado se requiere almacén origen y destino diferentes.");
                    return;
                }
                $stockNuevo = $stockAnterior; // El stock global no cambia, solo se mueven
            } else {
                $stockNuevo = match($tipo) {
                    'ENTRADA', 'DEVOLUCION' => $stockAnterior + $cantidad,
                    'SALIDA'  => $stockAnterior - $cantidad,
                    'AJUSTE'  => $cantidad, // ajuste directo al valor global (simplificado por ahora)
                };
            }

            if ($stockNuevo < 0 && $tipo !== 'TRASLADO') {
                $this->conn->rollBack();
                http_response_code(422);
                echo json_encode(["success" => false, "message" => "Stock insuficiente. Stock actual: $stockAnterior"]);
                return;
            }

            // Registrar en inventario_movimientos
            $movId = $this->conn->query("SELECT UUID()")->fetchColumn();
            $stmtMov = $this->conn->prepare("
                INSERT INTO inventario_movimientos
                    (id, producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, referencia, usuario_email, almacen_origen_id, almacen_destino_id)
                VALUES
                    (:id, :prod_id, :tipo, :cant, :stock_ant, :stock_nvo, :motivo, :referencia, :usuario_email, :alm_origen, :alm_destino)
            ");
            $stmtMov->bindValue(':id', $movId);
            $stmtMov->bindValue(':prod_id', $data->producto_id);
            $stmtMov->bindValue(':tipo', $tipo);
            $stmtMov->bindValue(':cant', $cantidad);
            $stmtMov->bindValue(':stock_ant', $stockAnterior);
            $stmtMov->bindValue(':stock_nvo', $stockNuevo);
            $stmtMov->bindValue(':motivo', $data->motivo ?? 'Sin motivo');
            $stmtMov->bindValue(':referencia', $data->documento_referencia ?? null);
            $stmtMov->bindValue(':usuario_email', null);
            $stmtMov->bindValue(':alm_origen', $almOrigen);
            $stmtMov->bindValue(':alm_destino', $almDestino);
            $stmtMov->execute();

            // Actualizar stock en productos (Global)
            if ($tipo !== 'TRASLADO') {
                $stmtUpd = $this->conn->prepare("UPDATE productos SET stock_actual = :stock WHERE id = :id");
                $stmtUpd->bindValue(':stock', $stockNuevo);
                $stmtUpd->bindValue(':id', $data->producto_id);
                $stmtUpd->execute();
            }

            // Actualizar stocks en inventario_stock por almacén
            if ($tipo === 'TRASLADO') {
                // Descuento en origen
                $stmtUpdOrig = $this->conn->prepare("UPDATE inventario_stock SET stock_actual = stock_actual - :cant WHERE producto_id = :id AND almacen_id = :almacen");
                $stmtUpdOrig->bindValue(':cant', $cantidad);
                $stmtUpdOrig->bindValue(':id', $data->producto_id);
                $stmtUpdOrig->bindValue(':almacen', $almOrigen);
                $stmtUpdOrig->execute();
                
                // Aumento en destino
                $stmtVerDest = $this->conn->prepare("SELECT 1 FROM inventario_stock WHERE producto_id = :id AND almacen_id = :almacen");
                $stmtVerDest->bindValue(':id', $data->producto_id);
                $stmtVerDest->bindValue(':almacen', $almDestino);
                $stmtVerDest->execute();
                if ($stmtVerDest->fetchColumn()) {
                    $stmtUpdDest = $this->conn->prepare("UPDATE inventario_stock SET stock_actual = stock_actual + :cant WHERE producto_id = :id AND almacen_id = :almacen");
                    $stmtUpdDest->bindValue(':cant', $cantidad);
                    $stmtUpdDest->bindValue(':id', $data->producto_id);
                    $stmtUpdDest->bindValue(':almacen', $almDestino);
                    $stmtUpdDest->execute();
                } else {
                    $stmtInsDest = $this->conn->prepare("INSERT INTO inventario_stock (producto_id, almacen_id, stock_actual) VALUES (:id, :almacen, :cant)");
                    $stmtInsDest->bindValue(':id', $data->producto_id);
                    $stmtInsDest->bindValue(':almacen', $almDestino);
                    $stmtInsDest->bindValue(':cant', $cantidad);
                    $stmtInsDest->execute();
                }
            } else {
                // Entrada/Salida regular afecta al almacén default / designado (por ahora almOrigen funciona como el pivot)
                $almEfectivo = $almOrigen ?? $almDestino;
                if ($almEfectivo && $tipo !== 'AJUSTE') { // Ajuste es global en esta fase sencilla o podemos obviar el por almacén si no se pasa ID
                    $op = ($tipo === 'ENTRADA' || $tipo === 'DEVOLUCION') ? '+' : '-';
                    $stmtVerDest = $this->conn->prepare("SELECT 1 FROM inventario_stock WHERE producto_id = :id AND almacen_id = :almacen");
                    $stmtVerDest->bindValue(':id', $data->producto_id);
                    $stmtVerDest->bindValue(':almacen', $almEfectivo);
                    $stmtVerDest->execute();
                    if ($stmtVerDest->fetchColumn()) {
                        $stmtUpdDest = $this->conn->prepare("UPDATE inventario_stock SET stock_actual = stock_actual $op :cant WHERE producto_id = :id AND almacen_id = :almacen");
                        $stmtUpdDest->bindValue(':cant', $cantidad);
                        $stmtUpdDest->bindValue(':id', $data->producto_id);
                        $stmtUpdDest->bindValue(':almacen', $almEfectivo);
                        $stmtUpdDest->execute();
                    } else if ($op === '+') {
                        $stmtInsDest = $this->conn->prepare("INSERT INTO inventario_stock (producto_id, almacen_id, stock_actual) VALUES (:id, :almacen, :cant)");
                        $stmtInsDest->bindValue(':id', $data->producto_id);
                        $stmtInsDest->bindValue(':almacen', $almEfectivo);
                        $stmtInsDest->bindValue(':cant', $cantidad);
                        $stmtInsDest->execute();
                    }
                }
            }

            $this->conn->commit();

            echo json_encode([
                "success" => true,
                "message" => "Movimiento registrado correctamente.",
                "data" => [
                    "id" => $movId,
                    "stock_anterior" => $stockAnterior,
                    "stock_nuevo" => $stockNuevo,
                    "tipo" => $tipo,
                ]
            ]);

        } catch (PDOException $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            $this->manejarError($e);
        }
    }

    private function listarAlertas() {
        try {
            $stmt = $this->conn->prepare("
                SELECT id, codigo_interno, sku, descripcion, stock_actual, stock_minimo, estado_stock
                FROM productos
                WHERE stock_actual <= stock_minimo AND activo = 1
                ORDER BY stock_actual ASC
            ");
            $stmt->execute();
            $alertas = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(["success" => true, "count" => count($alertas), "data" => $alertas]);
        } catch (PDOException $e) { $this->manejarError($e); }
    }

    private function kardex($producto_id) {
        if (!$producto_id) {
            http_response_code(422);
            echo json_encode(["success" => false, "message" => "Falta el ID del producto (producto_id)"]);
            return;
        }
        try {
            $stmt = $this->conn->prepare("
                SELECT id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo,
                       motivo, referencia, usuario_email, created_at
                FROM inventario_movimientos
                WHERE producto_id = :id
                ORDER BY created_at DESC
            ");
            $stmt->bindValue(':id', $producto_id);
            $stmt->execute();
            echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (PDOException $e) { $this->manejarError($e); }
    }

    private function listarAlmacenes() {
        try {
            $stmt = $this->conn->prepare("SELECT id, nombre, es_principal FROM almacenes WHERE activo = 1 ORDER BY es_principal DESC, nombre ASC");
            $stmt->execute();
            echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (PDOException $e) { $this->manejarError($e); }
    }

    private function error422($msg) {
        http_response_code(422);
        echo json_encode(["success" => false, "message" => $msg]);
    }

    private function manejarError($e) {
        error_log("InventarioController Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error interno del servidor."]);
    }
}
