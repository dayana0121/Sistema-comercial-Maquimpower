<?php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/db.php';

class CajaController {
    private $conn;
    public function __construct() { $this->conn = getDB(); }

    public function handle($route, $method) {
        $user = AuthMiddleware::verificar();
        header('Content-Type: application/json');

        if ($method === 'GET' && str_contains($route, '/resumen')) { $this->resumen(); return; }
        if ($method === 'GET' && str_contains($route, '/saldo'))   { $this->saldo();   return; }

        switch ($method) {
            case 'GET':  $this->listar();  break;
            case 'POST':
                AuthMiddleware::requerirRol(['admin', 'administrador', 'vendedor'], $user);
                $this->registrar();
                break;
            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Método no permitido"]);
        }
    }

    private function listar() {
        try {
            $fecha  = $_GET['fecha']       ?? date('Y-m-d');
            $tipo   = $_GET['tipo']        ?? '';
            $origen = $_GET['origen']      ?? '';
            $desde  = $_GET['fecha_desde'] ?? $fecha;
            $hasta  = $_GET['fecha_hasta'] ?? $fecha;

            $where = "WHERE fecha BETWEEN :desde AND :hasta";
            $params = [':desde' => $desde, ':hasta' => $hasta];
            if ($tipo)   { $where .= " AND tipo = :tipo";     $params[':tipo']   = $tipo; }
            if ($origen) { $where .= " AND origen = :origen"; $params[':origen'] = $origen; }

            $stmt = $this->conn->prepare("
                SELECT * FROM caja_movimientos
                $where
                ORDER BY created_at DESC
            ");
            foreach ($params as $k => $v) $stmt->bindValue($k, $v);
            $stmt->execute();
            $movs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Totales del periodo
            $ingresos = array_sum(array_map(fn($m) => $m['tipo'] === 'INGRESO' ? (float)$m['monto'] : 0, $movs));
            $egresos  = array_sum(array_map(fn($m) => $m['tipo'] === 'EGRESO'  ? (float)$m['monto'] : 0, $movs));

            echo json_encode([
                "success"   => true,
                "data"      => $movs,
                "resumen"   => [
                    "ingresos"  => round($ingresos, 2),
                    "egresos"   => round($egresos, 2),
                    "diferencia"=> round($ingresos - $egresos, 2),
                    "total_movimientos" => count($movs),
                ]
            ]);
        } catch (PDOException $e) { $this->manejarError($e); }
    }

    private function saldo() {
        try {
            $stmt = $this->conn->prepare("
                SELECT saldo_nuevo FROM caja_movimientos
                ORDER BY created_at DESC LIMIT 1
            ");
            $stmt->execute();
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(["success" => true, "data" => ["saldo_actual" => (float)($row['saldo_nuevo'] ?? 0)]]);
        } catch (PDOException $e) { $this->manejarError($e); }
    }

    private function resumen() {
        try {
            $hoy = date('Y-m-d');
            $stmt = $this->conn->prepare("
                SELECT
                    SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE 0 END) AS ingresos_hoy,
                    SUM(CASE WHEN tipo='EGRESO'  THEN monto ELSE 0 END) AS egresos_hoy,
                    COUNT(*) AS movimientos_hoy
                FROM caja_movimientos
                WHERE fecha = :hoy
            ");
            $stmt->bindValue(':hoy', $hoy);
            $stmt->execute();
            $hoyData = $stmt->fetch(PDO::FETCH_ASSOC);

            $stmtMes = $this->conn->prepare("
                SELECT
                    SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE 0 END) AS ingresos_mes,
                    SUM(CASE WHEN tipo='EGRESO'  THEN monto ELSE 0 END) AS egresos_mes
                FROM caja_movimientos
                WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())
            ");
            $stmtMes->execute();
            $mesData = $stmtMes->fetch(PDO::FETCH_ASSOC);

            $stmtSaldo = $this->conn->prepare("SELECT saldo_nuevo FROM caja_movimientos ORDER BY created_at DESC LIMIT 1");
            $stmtSaldo->execute();
            $saldoRow = $stmtSaldo->fetch(PDO::FETCH_ASSOC);

            echo json_encode(["success" => true, "data" => [
                "saldo_actual"     => (float)($saldoRow['saldo_nuevo'] ?? 0),
                "ingresos_hoy"     => (float)($hoyData['ingresos_hoy'] ?? 0),
                "egresos_hoy"      => (float)($hoyData['egresos_hoy'] ?? 0),
                "movimientos_hoy"  => (int)($hoyData['movimientos_hoy'] ?? 0),
                "ingresos_mes"     => (float)($mesData['ingresos_mes'] ?? 0),
                "egresos_mes"      => (float)($mesData['egresos_mes'] ?? 0),
            ]]);
        } catch (PDOException $e) { $this->manejarError($e); }
    }

    private function registrar() {
        try {
            $data = json_decode(file_get_contents("php://input"));

            if (empty($data->tipo) || !in_array($data->tipo, ['INGRESO', 'EGRESO'])) {
                http_response_code(422);
                echo json_encode(["success" => false, "message" => "tipo debe ser INGRESO o EGRESO"]);
                return;
            }
            if (!isset($data->monto) || !is_numeric($data->monto) || $data->monto <= 0) {
                http_response_code(422);
                echo json_encode(["success" => false, "message" => "monto debe ser un número positivo"]);
                return;
            }

            // Obtener saldo anterior
            $stmtSaldo = $this->conn->prepare("SELECT saldo_nuevo FROM caja_movimientos ORDER BY created_at DESC LIMIT 1");
            $stmtSaldo->execute();
            $saldoRow = $stmtSaldo->fetch(PDO::FETCH_ASSOC);
            $saldoAnterior = (float)($saldoRow['saldo_nuevo'] ?? 0);

            $monto = (float)$data->monto;
            $saldoNuevo = $data->tipo === 'INGRESO'
                ? $saldoAnterior + $monto
                : $saldoAnterior - $monto;

            if ($saldoNuevo < 0) {
                http_response_code(422);
                echo json_encode(["success" => false, "message" => "Saldo insuficiente. Saldo actual: S/ " . number_format($saldoAnterior, 2)]);
                return;
            }

            $id = $this->conn->query("SELECT UUID()")->fetchColumn();
            $stmt = $this->conn->prepare("INSERT INTO caja_movimientos
                (id, tipo, origen, referencia_id, referencia_numero, monto, forma_pago,
                 saldo_anterior, saldo_nuevo, descripcion, fecha, usuario_id)
                VALUES (:id,:tipo,:origen,:ref_id,:ref_num,:monto,:fpago,:sant,:snvo,:desc,:fecha,:user)");
            $stmt->bindValue(':id',      $id);
            $stmt->bindValue(':tipo',    $data->tipo);
            $stmt->bindValue(':origen',  $data->origen ?? 'MANUAL');
            $stmt->bindValue(':ref_id',  $data->referencia_id ?? null);
            $stmt->bindValue(':ref_num', $data->referencia_numero ?? null);
            $stmt->bindValue(':monto',   $monto);
            $stmt->bindValue(':fpago',   $data->forma_pago ?? 'EFECTIVO');
            $stmt->bindValue(':sant',    $saldoAnterior);
            $stmt->bindValue(':snvo',    $saldoNuevo);
            $stmt->bindValue(':desc',    $data->descripcion ?? null);
            $stmt->bindValue(':fecha',   $data->fecha ?? date('Y-m-d'));
            $stmt->bindValue(':user',    null);
            $stmt->execute();

            echo json_encode([
                "success" => true,
                "message" => "Movimiento registrado.",
                "data"    => ["id" => $id, "saldo_anterior" => $saldoAnterior, "saldo_nuevo" => $saldoNuevo]
            ]);
        } catch (PDOException $e) { $this->manejarError($e); }
    }

    private function manejarError($e) {
        error_log("CajaController Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error interno del servidor."]);
    }
}
