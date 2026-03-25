<?php
// modules/clientes/ClientesController.php

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

class ClientesController
{
    private $conn;

    public function __construct()
    {
        $this->conn = getDB();
    }

    public function handle($route, $method)
    {
        // 1. Proteger el endpoint
        $user = AuthMiddleware::verificar();
        header('Content-Type: application/json');

        $id = null;
        $parts = explode('/', trim($route, '/'));
        if (isset($parts[1]) && strlen($parts[1]) > 0) {
            $id = $parts[1];
        }

        switch ($method) {
            case 'GET':
                // ✅ ESTÁNDAR: Enrutamiento inteligente
                $id ? $this->obtener($id) : $this->listar();
                break;

            case 'POST':
                // Permitimos a admin y vendedores crear clientes
                AuthMiddleware::requerirRol(['admin', 'administrador', 'vendedor'], $user);
                $this->crear();
                break;

            case 'PUT':
                if ($id) {
                    AuthMiddleware::requerirRol(['admin', 'administrador', 'vendedor'], $user);
                    $this->actualizar($id);
                } else {
                    echo json_encode(["success" => false, "message" => "ID no proporcionado"]);
                }
                break;

            case 'DELETE':
                if ($id) {
                    // Solo administradores borran clientes
                    AuthMiddleware::requerirRol(['admin', 'administrador'], $user);
                    $this->eliminar($id);
                } else {
                    echo json_encode(["success" => false, "message" => "ID no proporcionado"]);
                }
                break;

            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Método no permitido"]);
                break;
        }
    }

    private function listar()
    {
        try {
            $query = "SELECT * FROM clientes WHERE activo = 1 ORDER BY created_at DESC";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["success" => true, "data" => $clientes]);
        } catch (PDOException $e) {
            $this->manejarError($e);
        }
    }

    // ✅ ESTÁNDAR: Método obtener individual
    private function obtener($id)
    {
        try {
            $query = "SELECT * FROM clientes WHERE id = :id AND activo = 1";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(":id", $id);
            $stmt->execute();
            $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$cliente) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Cliente no encontrado"]);
                return;
            }

            echo json_encode(["success" => true, "data" => $cliente]);
        } catch (PDOException $e) {
            $this->manejarError($e);
        }
    }

    private function crear()
    {
        try {
            $data = json_decode(file_get_contents("php://input"));

            // ✅ ESTÁNDAR: Validación 422 para campos clave
            if (empty(trim($data->tipo_documento ?? '')) || empty(trim($data->numero_documento ?? '')) || empty(trim($data->razon_social ?? ''))) {
                http_response_code(422);
                echo json_encode(["success" => false, "message" => "Datos inválidos: Tipo de documento, número y razón social son obligatorios."]);
                return;
            }

            $nuevoId = $this->conn->query("SELECT UUID()")->fetchColumn();

            $query = "INSERT INTO clientes (
                id, tipo_documento, numero_documento, razon_social, nombre_comercial,
                direccion_fiscal, ubigeo, departamento, provincia, distrito,
                telefono, email, contacto_nombre, activo
            ) VALUES (
                :id, :tipo_doc, :num_doc, :razon, :nom_com,
                :dir, :ubigeo, :dep, :prov, :dist,
                :tel, :email, :cont_nom, :activo
            )";

            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(":id", $nuevoId);
            $this->bindAllValues($stmt, $data);
            $stmt->bindValue(":activo", 1); // Forzamos activo al crear

            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Cliente creado.", "data" => ["id" => $nuevoId]]);
            }
        } catch (PDOException $e) {
            $this->manejarError($e);
        }
    }

    private function actualizar($id)
    {
        try {
            $data = json_decode(file_get_contents("php://input"));

            // ✅ ESTÁNDAR: Validación 422
            if (empty(trim($data->tipo_documento ?? '')) || empty(trim($data->numero_documento ?? '')) || empty(trim($data->razon_social ?? ''))) {
                http_response_code(422);
                echo json_encode(["success" => false, "message" => "Datos inválidos: Tipo de documento, número y razón social son obligatorios."]);
                return;
            }

            $query = "UPDATE clientes SET 
                        tipo_documento = :tipo_doc, numero_documento = :num_doc, 
                        razon_social = :razon, nombre_comercial = :nom_com,
                        direccion_fiscal = :dir, ubigeo = :ubigeo, departamento = :dep,
                        provincia = :prov, distrito = :dist,
                        email = :email, telefono = :tel, 
                        contacto_nombre = :cont_nom, activo = :activo 
                      WHERE id = :id";

            $stmt = $this->conn->prepare($query);
            $this->bindAllValues($stmt, $data);

            // Bindeos específicos
            $stmt->bindValue(":activo", isset($data->activo) && $data->activo ? 1 : 0);
            $stmt->bindValue(":id", $id);

            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Cliente actualizado."]);
            }
        } catch (PDOException $e) {
            $this->manejarError($e);
        }
    }

    private function eliminar($id)
    {
        try {
            $query = "UPDATE clientes SET activo = 0 WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(":id", $id);

            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Cliente desactivado correctamente."]);
            } else {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "No se pudo desactivar."]);
            }
        } catch (PDOException $e) {
            $this->manejarError($e);
        }
    }

    // ✅ ESTÁNDAR: Helper para evitar repetir binds
    private function bindAllValues($stmt, $data)
    {
        $stmt->bindValue(":tipo_doc", $data->tipo_documento);
        $stmt->bindValue(":num_doc", $data->numero_documento);
        $stmt->bindValue(":razon", $data->razon_social);
        $stmt->bindValue(":nom_com", $data->nombre_comercial ?? null);
        $stmt->bindValue(":dir", $data->direccion_fiscal ?? null);
        $stmt->bindValue(":ubigeo", $data->ubigeo ?? null);
        $stmt->bindValue(":dep", $data->departamento ?? null);
        $stmt->bindValue(":prov", $data->provincia ?? null);
        $stmt->bindValue(":dist", $data->distrito ?? null);
        $stmt->bindValue(":tel", $data->telefono ?? null);
        $stmt->bindValue(":email", $data->email ?? null);
        $stmt->bindValue(":cont_nom", $data->contacto_nombre ?? null);
    }

    private function manejarError($e)
    {
        error_log("ClientesController Error: " . $e->getMessage());

        // Error de clave duplicada — documento ya existe
        if ($e->getCode() == 23000) {
            http_response_code(409);
            echo json_encode([
                "success" => false,
                "message" => "El documento ya está registrado en el sistema."
            ]);
            return;
        }

        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Error interno del servidor."
        ]);
    }
}