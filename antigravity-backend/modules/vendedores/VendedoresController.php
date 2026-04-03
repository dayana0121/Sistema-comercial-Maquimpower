<?php
/**
 * VendedoresController.php
 * Gestión de vendedores
 */

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

class VendedoresController
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
        $uriSegments = explode('/', trim(str_replace('/vendedores', '', $route), '/'));
        $paramId = $uriSegments[0] ?? null;

        try {
            if ($method === 'GET' && empty($paramId))
                $this->listar();
            elseif ($method === 'POST' && empty($paramId))
                $this->crear();
            elseif ($method === 'GET' && !empty($paramId))
                $this->obtener($paramId);
            elseif ($method === 'PUT' && !empty($paramId))
                $this->actualizar($paramId);
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
            $sql = "SELECT id, nombre, apellido, email, telefono, activo, created_at 
                    FROM vendedores 
                    WHERE activo = true
                    ORDER BY nombre, apellido";
            $stmt = $this->pdo->query($sql);
            $vendedores = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse(true, "Vendedores obtenidos.", ['vendedores' => $vendedores]);
        } catch (PDOException $e) {
            $this->sendResponse(false, "Error en la BD: " . $e->getMessage(), null, 500);
        }
    }

    private function crear()
    {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->nombre) || !isset($data->apellido)) {
            $this->sendResponse(false, "nombre y apellido son obligatorios", null, 422);
        }

        try {
            $sql = "INSERT INTO vendedores (nombre, apellido, email, telefono) 
                    VALUES (:nombre, :apellido, :email, :telefono)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':nombre' => $data->nombre,
                ':apellido' => $data->apellido,
                ':email' => $data->email ?? null,
                ':telefono' => $data->telefono ?? null
            ]);

            $vendedor_id = $this->pdo->lastInsertId();

            $this->sendResponse(true, "Vendedor registrado exitosamente", 
                ['id' => $vendedor_id], 201);
        } catch (PDOException $e) {
            $this->sendResponse(false, "Error al registrar vendedor: " . $e->getMessage(), null, 500);
        }
    }

    private function obtener($id)
    {
        try {
            $sql = "SELECT * FROM vendedores WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $id]);
            $vendedor = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$vendedor) {
                $this->sendResponse(false, "Vendedor no encontrado", null, 404);
            }

            $this->sendResponse(true, "Vendedor obtenido", ['vendedor' => $vendedor]);
        } catch (PDOException $e) {
            $this->sendResponse(false, "Error en la BD: " . $e->getMessage(), null, 500);
        }
    }

    private function actualizar($id)
    {
        $data = json_decode(file_get_contents("php://input"));

        try {
            $sql = "UPDATE vendedores SET 
                    nombre = :nombre,
                    apellido = :apellido,
                    email = :email,
                    telefono = :telefono,
                    activo = :activo
                    WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute([
                ':id' => $id,
                ':nombre' => $data->nombre ?? null,
                ':apellido' => $data->apellido ?? null,
                ':email' => $data->email ?? null,
                ':telefono' => $data->telefono ?? null,
                ':activo' => $data->activo ?? true
            ]);

            if ($stmt->rowCount() === 0) {
                $this->sendResponse(false, "Vendedor no encontrado", null, 404);
            }

            $this->sendResponse(true, "Vendedor actualizado");
        } catch (PDOException $e) {
            $this->sendResponse(false, "Error al actualizar: " . $e->getMessage(), null, 500);
        }
    }

    private function eliminar($id)
    {
        try {
            // Soft delete: marcar como inactivo
            $sql = "UPDATE vendedores SET activo = false WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() === 0) {
                $this->sendResponse(false, "Vendedor no encontrado", null, 404);
            }

            $this->sendResponse(true, "Vendedor eliminado correctamente");
        } catch (PDOException $e) {
            $this->sendResponse(false, "Error al eliminar: " . $e->getMessage(), null, 500);
        }
    }
}
