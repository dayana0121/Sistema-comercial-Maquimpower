<?php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/db.php';

class ProveedoresController {
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
                AuthMiddleware::requerirRol(['admin', 'administrador', 'almacen'], $user);
                $id ? $this->actualizar($id) : $this->error422("ID requerido");
                break;
            case 'DELETE':
                AuthMiddleware::requerirRol(['admin', 'administrador'], $user);
                $id ? $this->eliminar($id) : $this->error422("ID requerido");
                break;
            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Método no permitido"]);
        }
    }

    private function listar() {
        try {
            $search = $_GET['search'] ?? '';
            $where = "WHERE activo = 1";
            $params = [];
            if ($search) {
                $where .= " AND (razon_social LIKE :s1 OR numero_documento LIKE :s2 OR nombre_comercial LIKE :s3)";
                $params = [':s1' => "%$search%", ':s2' => "%$search%", ':s3' => "%$search%"];
            }
            $stmt = $this->conn->prepare("SELECT * FROM proveedores $where ORDER BY razon_social ASC");
            foreach ($params as $k => $v) $stmt->bindValue($k, $v);
            $stmt->execute();
            echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (PDOException $e) { $this->manejarError($e); }
    }

    private function obtener($id) {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM proveedores WHERE id = :id AND activo = 1");
            $stmt->bindValue(':id', $id);
            $stmt->execute();
            $p = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$p) { http_response_code(404); echo json_encode(["success" => false, "message" => "Proveedor no encontrado"]); return; }
            echo json_encode(["success" => true, "data" => $p]);
        } catch (PDOException $e) { $this->manejarError($e); }
    }

    private function crear() {
        try {
            $data = json_decode(file_get_contents("php://input"));
            if (empty(trim($data->razon_social ?? '')) || empty(trim($data->numero_documento ?? ''))) {
                $this->error422("Razón social y número de documento son obligatorios"); return;
            }
            $id = $this->conn->query("SELECT UUID()")->fetchColumn();
            $stmt = $this->conn->prepare("INSERT INTO proveedores
                (id, tipo_documento, numero_documento, razon_social, nombre_comercial, direccion, ubigeo,
                 telefono, email, contacto_nombre, cuenta_bancaria, banco, cci, condicion_pago, dias_credito)
                VALUES (:id,:tipo,:ndoc,:rs,:nc,:dir,:ubigeo,:tel,:email,:contacto,:cuenta,:banco,:cci,:cond,:dias)");
            $stmt->bindValue(':id', $id);
            $stmt->bindValue(':tipo', $data->tipo_documento ?? 'RUC');
            $stmt->bindValue(':ndoc', $data->numero_documento);
            $stmt->bindValue(':rs', $data->razon_social);
            $stmt->bindValue(':nc', $data->nombre_comercial ?? null);
            $stmt->bindValue(':dir', $data->direccion ?? null);
            $stmt->bindValue(':ubigeo', $data->ubigeo ?? null);
            $stmt->bindValue(':tel', $data->telefono ?? null);
            $stmt->bindValue(':email', $data->email ?? null);
            $stmt->bindValue(':contacto', $data->contacto_nombre ?? null);
            $stmt->bindValue(':cuenta', $data->cuenta_bancaria ?? null);
            $stmt->bindValue(':banco', $data->banco ?? null);
            $stmt->bindValue(':cci', $data->cci ?? null);
            $stmt->bindValue(':cond', $data->condicion_pago ?? 'CONTADO');
            $stmt->bindValue(':dias', $data->dias_credito ?? 0);
            $stmt->execute();
            echo json_encode(["success" => true, "message" => "Proveedor creado.", "data" => ["id" => $id]]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) { http_response_code(409); echo json_encode(["success" => false, "message" => "El RUC/documento ya está registrado."]); return; }
            $this->manejarError($e);
        }
    }

    private function actualizar($id) {
        try {
            $data = json_decode(file_get_contents("php://input"));
            $stmt = $this->conn->prepare("UPDATE proveedores SET
                tipo_documento=:tipo, numero_documento=:ndoc, razon_social=:rs,
                nombre_comercial=:nc, direccion=:dir, ubigeo=:ubigeo,
                telefono=:tel, email=:email, contacto_nombre=:contacto,
                cuenta_bancaria=:cuenta, banco=:banco, cci=:cci,
                condicion_pago=:cond, dias_credito=:dias
                WHERE id=:id");
            $stmt->bindValue(':id', $id);
            $stmt->bindValue(':tipo', $data->tipo_documento ?? 'RUC');
            $stmt->bindValue(':ndoc', $data->numero_documento);
            $stmt->bindValue(':rs', $data->razon_social);
            $stmt->bindValue(':nc', $data->nombre_comercial ?? null);
            $stmt->bindValue(':dir', $data->direccion ?? null);
            $stmt->bindValue(':ubigeo', $data->ubigeo ?? null);
            $stmt->bindValue(':tel', $data->telefono ?? null);
            $stmt->bindValue(':email', $data->email ?? null);
            $stmt->bindValue(':contacto', $data->contacto_nombre ?? null);
            $stmt->bindValue(':cuenta', $data->cuenta_bancaria ?? null);
            $stmt->bindValue(':banco', $data->banco ?? null);
            $stmt->bindValue(':cci', $data->cci ?? null);
            $stmt->bindValue(':cond', $data->condicion_pago ?? 'CONTADO');
            $stmt->bindValue(':dias', $data->dias_credito ?? 0);
            $stmt->execute();
            echo json_encode(["success" => true, "message" => "Proveedor actualizado."]);
        } catch (PDOException $e) { $this->manejarError($e); }
    }

    private function eliminar($id) {
        try {
            $stmt = $this->conn->prepare("UPDATE proveedores SET activo = 0 WHERE id = :id");
            $stmt->bindValue(':id', $id);
            $stmt->execute();
            echo json_encode(["success" => true, "message" => "Proveedor desactivado."]);
        } catch (PDOException $e) { $this->manejarError($e); }
    }

    private function error422($msg) {
        http_response_code(422);
        echo json_encode(["success" => false, "message" => $msg]);
    }

    private function manejarError($e) {
        error_log("ProveedoresController Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error interno del servidor."]);
    }
}
