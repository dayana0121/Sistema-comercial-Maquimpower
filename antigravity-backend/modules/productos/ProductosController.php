<?php
// modules/productos/ProductosController.php

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

class ProductosController
{
    private $conn;

    public function __construct()
    {
        $this->conn = getDB();
    }

    public function handle($route, $method)
    {
        $user = AuthMiddleware::verificar();
        header('Content-Type: application/json');

        // 1. Detectar si es la ruta de alertas
        if ($method === 'GET' && str_contains($route, '/alertas')) {
            $this->listarAlertas();
            return;
        }

        // ✅ 2. NUEVO: Detectar si es la ruta del Kardex
        if ($method === 'GET' && str_contains($route, '/kardex')) {
            $this->obtenerKardex();
            return;
        }

        // 3. Si no es alerta ni kardex, seguimos con el flujo normal (ID y Switch)
        $id = null;
        $parts = explode('/', trim($route, '/'));
        if (isset($parts[1]) && strlen($parts[1]) > 0) {
            $id = $parts[1];
        }

        switch ($method) {
            case 'GET':
                // ✅ CORRECCIÓN 1: Enrutamiento para obtener un solo producto
                $id ? $this->obtener($id) : $this->listar();
                break;

            case 'POST':
                AuthMiddleware::requerirRol(['admin', 'administrador', 'almacen'], $user);
                $this->crear();
                break;

            case 'PUT':
                if ($id) {
                    AuthMiddleware::requerirRol(['admin', 'administrador', 'almacen'], $user);
                    $this->actualizar($id);
                } else {
                    echo json_encode(["success" => false, "message" => "ID no proporcionado"]);
                }
                break;

            case 'DELETE':
                if ($id) {
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
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
            $offset = ($page - 1) * $limit;

            $search = $_GET['search'] ?? '';
            $where = " WHERE activo = 1 ";
            $params = [];

            if (!empty($search)) {
                $where .= " AND (descripcion LIKE ? OR codigo_interno LIKE ? OR sku LIKE ?) ";
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }

            // Contar total
            $stmtCount = $this->conn->prepare("SELECT COUNT(*) FROM productos $where");
            $stmtCount->execute($params);
            $total = (int)$stmtCount->fetchColumn();
            $pages = ceil($total / $limit);

            // Obtener registros
            $query = "SELECT * FROM productos $where ORDER BY created_at DESC LIMIT $limit OFFSET $offset";
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Decodificar galería
            foreach ($productos as &$p) {
                $p['galeria'] = json_decode($p['galeria'] ?? '[]', true);
            }

            echo json_encode([
                "success" => true, 
                "data" => $productos,
                "pagination" => [
                    "total" => $total,
                    "pages" => $pages,
                    "current" => $page,
                    "limit" => $limit
                ]
            ]);
        } catch (PDOException $e) {
            $this->manejarError($e);
        }
    }

    // ✅ CORRECCIÓN 2: Implementación de obtener()
    private function obtener($id)
    {
        try {
            $query = "SELECT * FROM productos WHERE id = :id AND activo = 1";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(":id", $id);
            $stmt->execute();
            $producto = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$producto) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Producto no encontrado"]);
                return;
            }

            $producto['galeria'] = json_decode($producto['galeria'] ?? '[]', true);

            echo json_encode(["success" => true, "data" => $producto]);
        } catch (PDOException $e) {
            $this->manejarError($e);
        }
    }

    private function crear()
    {
        try {
            $data = json_decode(file_get_contents("php://input"));

            // ✅ CORRECCIÓN 5: Validación HTTP 422
            if (empty(trim($data->codigo_interno ?? '')) || empty(trim($data->descripcion ?? '')) || !isset($data->precio_unitario_sin_igv) || !is_numeric($data->precio_unitario_sin_igv) || $data->precio_unitario_sin_igv < 0) {
                http_response_code(422);
                echo json_encode(["success" => false, "message" => "Datos inválidos: el código y descripción son obligatorios, y el precio debe ser un número positivo."]);
                return;
            }

            // Generar el UUID antes del INSERT para poder devolverlo
            $nuevoId = $this->conn->query("SELECT UUID()")->fetchColumn();

            $query = "INSERT INTO productos (
                id, codigo_interno, codigo_sunat, sku, descripcion, categoria, linea, 
                tipo, unidad_medida, precio_unitario_sin_igv, precio_lista, precio_oferta, 
                costo_promedio, stock_actual, stock_minimo, tipo_afectacion_igv, 
                imagen_url, imagen_alt, galeria, video_url, pdf_url, slug, 
                es_destacado, etiqueta, peso_kg, maneja_lotes, categoria_id, activo, legacy_id
            ) VALUES (
                :id, :cod, :sunat, :sku, :desc, :cat, :lin, 
                :tipo, :um, :precio, :p_lista, :p_oferta, 
                :costo, :stock, :s_min, :afec, 
                :img, :alt, :gal, :vid, :pdf, :slug, 
                :dest, :etiq, :peso, :lotes, :cat_id, 1, :legacy
            )";

            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(":id", $nuevoId);
            $this->bindAllValues($stmt, $data);

            // En el INSERT el ID es pre-generado y activo es 1 fijo
            $stmt->bindValue(":legacy", $data->legacy_id ?? null);

            if ($stmt->execute()) {
                echo json_encode([
                    "success" => true,
                    "message" => "Producto guardado.",
                    "data" => ["id" => $nuevoId]
                ]);
            }
        } catch (PDOException $e) {
            $this->manejarError($e);
        }
    }

    private function actualizar($id)
    {
        try {
            $data = json_decode(file_get_contents("php://input"));

            // ✅ CORRECCIÓN 5: Validación HTTP 422
            if (empty(trim($data->codigo_interno ?? '')) || empty(trim($data->descripcion ?? '')) || !isset($data->precio_unitario_sin_igv) || !is_numeric($data->precio_unitario_sin_igv) || $data->precio_unitario_sin_igv < 0) {
                http_response_code(422);
                echo json_encode(["success" => false, "message" => "Datos inválidos: el código y descripción son obligatorios, y el precio debe ser un número positivo."]);
                return;
            }

            $query = "UPDATE productos SET 
                codigo_interno = :cod, codigo_sunat = :sunat, sku = :sku, 
                descripcion = :desc, categoria = :cat, linea = :lin, 
                tipo = :tipo, unidad_medida = :um, 
                precio_unitario_sin_igv = :precio, precio_lista = :p_lista, 
                precio_oferta = :p_oferta, costo_promedio = :costo, 
                stock_actual = :stock, stock_minimo = :s_min, 
                tipo_afectacion_igv = :afec, imagen_url = :img, 
                imagen_alt = :alt, galeria = :gal, video_url = :vid, 
                pdf_url = :pdf, slug = :slug, es_destacado = :dest, 
                etiqueta = :etiq, peso_kg = :peso, maneja_lotes = :lotes, 
                categoria_id = :cat_id, activo = :activo, legacy_id = :legacy
                WHERE id = :id";

            $stmt = $this->conn->prepare($query);
            $this->bindAllValues($stmt, $data);

            // Bindeos específicos del UPDATE
            $stmt->bindValue(":id", $id);
            $stmt->bindValue(":activo", isset($data->activo) && $data->activo ? 1 : 0);
            $stmt->bindValue(":legacy", $data->legacy_id ?? null);

            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Producto actualizado."]);
            }
        } catch (PDOException $e) {
            $this->manejarError($e);
        }
    }

    private function eliminar($id)
    {
        try {
            $query = "UPDATE productos SET activo = 0 WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(":id", $id);

            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Producto desactivado correctamente."]);
            }
        } catch (PDOException $e) {
            $this->manejarError($e);
        }
    }

    private function listarAlertas()
    {
        try {
            $query = "SELECT id, codigo_interno, descripcion, stock_actual, stock_minimo, estado_stock 
                      FROM productos 
                      WHERE stock_actual <= stock_minimo AND activo = 1";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $alertas = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "count" => count($alertas),
                "data" => $alertas
            ]);
        } catch (PDOException $e) {
            $this->manejarError($e);
        }
    }

    // Helper para evitar repetir binds en Crear y Actualizar
    private function bindAllValues($stmt, $data)
    {
        $stmt->bindValue(":cod", $data->codigo_interno);
        $stmt->bindValue(":sunat", $data->codigo_sunat ?? null);
        $stmt->bindValue(":sku", $data->sku ?? null);
        $stmt->bindValue(":desc", $data->descripcion);
        $stmt->bindValue(":cat", $data->categoria ?? null);
        $stmt->bindValue(":lin", $data->linea ?? null);
        $stmt->bindValue(":tipo", $data->tipo ?? 'PRODUCTO');
        $stmt->bindValue(":um", $data->unidad_medida ?? 'NIU');
        $stmt->bindValue(":precio", $data->precio_unitario_sin_igv);
        $stmt->bindValue(":p_lista", $data->precio_lista ?? null);
        $stmt->bindValue(":p_oferta", $data->precio_oferta ?? null);
        $stmt->bindValue(":costo", $data->costo_promedio ?? 0);
        $stmt->bindValue(":stock", $data->stock_actual ?? 0);
        $stmt->bindValue(":s_min", $data->stock_minimo ?? 0);
        $stmt->bindValue(":afec", $data->tipo_afectacion_igv ?? '10');
        $stmt->bindValue(":img", $data->imagen_url ?? null);
        $stmt->bindValue(":alt", $data->imagen_alt ?? null);
        $stmt->bindValue(":gal", json_encode($data->galeria ?? []));
        $stmt->bindValue(":vid", $data->video_url ?? null);
        $stmt->bindValue(":pdf", $data->pdf_url ?? null);
        $stmt->bindValue(":slug", $data->slug ?? $this->crearSlug($data->descripcion));
        $stmt->bindValue(":dest", $data->es_destacado ?? 0);
        $stmt->bindValue(":etiq", $data->etiqueta ?? null);
        $stmt->bindValue(":peso", $data->peso_kg ?? null);
        $stmt->bindValue(":lotes", $data->maneja_lotes ?? 0);
        $stmt->bindValue(":cat_id", $data->categoria_id ?? null);
        // ✅ CORRECCIÓN 3: Se eliminó el bindeo duplicado de legacy_id
    }

    private function crearSlug($texto)
    {
        $texto = strtolower(trim($texto));
        $texto = preg_replace('/[^a-z0-9-]+/', '-', $texto);
        return trim($texto, '-');
    }

    private function generarReporteStock()
    {
        // Lógica de FPDF se inyectará aquí
        echo json_encode(["success" => true, "message" => "Endpoint de reporte listo."]);
    }

    private function manejarError($e)
    {
        // ✅ CORRECCIÓN 4: Log de servidor y ocultamiento de debug
        error_log("ProductosController Error: " . $e->getMessage());

        $msg = "Error en la base de datos.";
        if ($e->getCode() == 23000) {
            $msg = "El código o SKU ya existe.";
        }

        http_response_code(500);
        echo json_encode(["success" => false, "message" => $msg]);
    }
    // ✅ NUEVO MÉTODO PARA EL KARDEX
    private function obtenerKardex()
    {
        try {
            $producto_id = $_GET['producto_id'] ?? null;

            if (!$producto_id) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Falta el ID del producto (producto_id)"]);
                return;
            }

            // 1. Verificamos que el producto realmente exista
            $stmt = $this->conn->prepare("SELECT id, descripcion, stock_actual, stock_minimo FROM productos WHERE id = :id AND activo = 1");
            $stmt->bindValue(":id", $producto_id);
            $stmt->execute();
            $producto = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$producto) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "El producto no existe o está inactivo."]);
                return;
            }

            // 2. Aquí iría la consulta a la tabla `movimientos_inventario`.
            // Por ahora, simulamos una respuesta vacía para que el frontend no colapse.
            $movimientos = [];

            /* // FUTURO CÓDIGO CUANDO CREEMOS LA TABLA DE MOVIMIENTOS:
            $stmtMov = $this->conn->prepare("SELECT * FROM movimientos_inventario WHERE producto_id = :id ORDER BY fecha_movimiento DESC");
            $stmtMov->bindValue(":id", $producto_id);
            $stmtMov->execute();
            $movimientos = $stmtMov->fetchAll(PDO::FETCH_ASSOC);
            */

            echo json_encode([
                "success" => true,
                "producto" => $producto,
                "data" => $movimientos // Array vacío por ahora
            ]);

        } catch (PDOException $e) {
            $this->manejarError($e);
        }
    }
}