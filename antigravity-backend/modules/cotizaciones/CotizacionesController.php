<?php
/**
 * CotizacionesController.php
 * Gestión de cotizaciones (pre-ventas)
 */

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/CotizacionesService.php';

class CotizacionesController
{
    private $pdo;
    private $service;

    public function __construct()
    {
        $this->pdo = getDB();
        $this->service = new CotizacionesService($this->pdo);
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
        $uriSegments = explode('/', trim(str_replace('/cotizaciones', '', $route), '/'));
        $paramId = $uriSegments[0] ?? null;
        $action = $uriSegments[1] ?? null;

        try {
            if ($method === 'GET' && empty($paramId))
                $this->listar();
            elseif ($method === 'POST' && empty($paramId))
                $this->crear();
            elseif ($method === 'GET' && !empty($paramId) && empty($action))
                $this->obtener($paramId);
            elseif ($method === 'GET' && !empty($paramId) && $action === 'pdf')
                $this->generarPdf($paramId);
            elseif ($method === 'POST' && !empty($paramId) && $action === 'convertir')
                $this->convertirAVenta($paramId);
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
            $estado = $_GET['estado'] ?? null;
            $cliente_id = $_GET['cliente_id'] ?? null;
            $indicacion = $_GET['indicacion'] ?? null;

            $sql = "SELECT c.*, 
                           cl.razon_social as cliente_nombre,
                           v.nombre as vendedor_nombre
                    FROM cotizaciones c
                    LEFT JOIN clientes cl ON c.cliente_id = cl.id
                    LEFT JOIN vendedores v ON c.vendedor_id = v.id
                    WHERE 1=1";

            $params = [];
            if ($estado) {
                // Forzar collation consistente al comparar texto para evitar errores de mix de collations
                $sql .= " AND c.estado COLLATE utf8mb4_general_ci = :estado";
                $params[':estado'] = $estado;
            }
            if ($cliente_id) {
                $sql .= " AND c.cliente_id = :cliente_id";
                $params[':cliente_id'] = $cliente_id;
            }
            if ($indicacion) {
                // Filtrar cotizaciones que tengan al menos un detalle con la indicación solicitada
                // Forzar collation en la comparación de indicacion
                $sql .= " AND EXISTS (SELECT 1 FROM cotizaciones_detalle cd WHERE cd.cotizacion_id = c.id AND cd.indicacion COLLATE utf8mb4_general_ci = :indicacion)";
                $params[':indicacion'] = $indicacion;
            }

            $sql .= " ORDER BY c.created_at DESC";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $cotizaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Obtener detalles para cada cotización
            $cotizacionesConDetalles = [];
            foreach ($cotizaciones as $cot) {
                // Forzar collation consistente en el JOIN con `productos` (productos usa utf8mb4_unicode_ci)
                $sql_detalles = "SELECT cd.*, p.descripcion, p.codigo_interno 
                                FROM cotizaciones_detalle cd
                                LEFT JOIN productos p ON cd.producto_id COLLATE utf8mb4_general_ci = p.id COLLATE utf8mb4_general_ci
                                WHERE cd.cotizacion_id = :id
                                ORDER BY cd.item";
                $stmt_det = $this->pdo->prepare($sql_detalles);
                $stmt_det->execute([':id' => $cot['id']]);
                $cot['detalles'] = $stmt_det->fetchAll(PDO::FETCH_ASSOC);
                $cotizacionesConDetalles[] = $cot;
            }

            $this->sendResponse(true, "Cotizaciones obtenidas", $cotizacionesConDetalles);
        } catch (PDOException $e) {
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }

    private function crear()
    {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->cliente_id) || empty($data->detalles)) {
            $this->sendResponse(false, "cliente_id y detalles son obligatorios", null, 422);
        }

        try {
            $this->pdo->beginTransaction();

            // Crear cotización
            $sql = "INSERT INTO cotizaciones (cliente_id, vendedor_id, fecha_vigencia, numero_whatsapp, observaciones, moneda)
                    VALUES (:cliente_id, :vendedor_id, :fecha_vigencia, :numero_whatsapp, :observaciones, :moneda)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':cliente_id' => $data->cliente_id,
                ':vendedor_id' => $data->vendedor_id ?? null,
                ':fecha_vigencia' => $data->fecha_vigencia ?? null,
                ':numero_whatsapp' => $data->numero_whatsapp ?? null,
                ':observaciones' => $data->observaciones ?? null,
                ':moneda' => $data->moneda ?? 'PEN'
            ]);

            $cotizacion_id = $this->pdo->lastInsertId();

            // Crear detalles
            $totales = $this->service->agregarDetalles($cotizacion_id, $data->detalles);

            // Actualizar totales
            $sql_update = "UPDATE cotizaciones SET op_gravada = :gravada, igv = :igv, total = :total WHERE id = :id";
            $stmt = $this->pdo->prepare($sql_update);
            $stmt->execute([
                ':gravada' => $totales['gravada'],
                ':igv' => $totales['igv'],
                ':total' => $totales['total'],
                ':id' => $cotizacion_id
            ]);

            $this->pdo->commit();

            $this->sendResponse(true, "Cotización creada exitosamente", 
                ['id' => $cotizacion_id], 201);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }

    private function obtener($id)
    {
        try {
            $sql = "SELECT c.*, 
                           cl.razon_social as cliente_nombre, cl.email as cliente_email,
                           v.nombre as vendedor_nombre
                    FROM cotizaciones c
                    LEFT JOIN clientes cl ON c.cliente_id = cl.id
                    LEFT JOIN vendedores v ON c.vendedor_id = v.id
                    WHERE c.id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $id]);
            $cotizacion = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$cotizacion) {
                $this->sendResponse(false, "Cotización no encontrada", null, 404);
            }

            // Obtener detalles
            // Forzar collation consistente en el JOIN con `productos`
            $sql_detalles = "SELECT cd.*, p.descripcion, p.codigo_interno 
                            FROM cotizaciones_detalle cd
                            LEFT JOIN productos p ON cd.producto_id COLLATE utf8mb4_general_ci = p.id COLLATE utf8mb4_general_ci
                            WHERE cd.cotizacion_id = :id
                            ORDER BY cd.item";
            $stmt = $this->pdo->prepare($sql_detalles);
            $stmt->execute([':id' => $id]);
            $detalles = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse(true, "Cotización obtenida", 
                ['cotizacion' => $cotizacion, 'detalles' => $detalles]);
        } catch (PDOException $e) {
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }

    private function generarPdf($id)
    {
        try {
            // Obtener cotización y detalles (reutiliza lógica de obtener)
            $sql = "SELECT c.*, cl.razon_social as cliente_nombre, cl.email as cliente_email, v.nombre as vendedor_nombre
                    FROM cotizaciones c
                    LEFT JOIN clientes cl ON c.cliente_id = cl.id
                    LEFT JOIN vendedores v ON c.vendedor_id = v.id
                    WHERE c.id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $id]);
            $cotizacion = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$cotizacion) {
                $this->sendResponse(false, "Cotización no encontrada", null, 404);
            }

            $sql_detalles = "SELECT cd.*, p.descripcion, p.codigo_interno 
                            FROM cotizaciones_detalle cd
                            LEFT JOIN productos p ON cd.producto_id = p.id
                            WHERE cd.cotizacion_id = :id
                            ORDER BY cd.item";
            $stmt = $this->pdo->prepare($sql_detalles);
            $stmt->execute([':id' => $id]);
            $detalles = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Generar PDF con FPDF
            require_once __DIR__ . '/../../libraries/fpdf/fpdf.php';
            $pdf = new FPDF('P','mm','A4');
            $pdf->AddPage();
            $pdf->SetFont('Helvetica','B',14);
            $pdf->Cell(0,8,'Cotizacion: ' . ($cotizacion['numero_correlativo'] ?? $cotizacion['id']),0,1);
            $pdf->SetFont('Helvetica','',10);
            $pdf->Cell(0,6,'Cliente: ' . ($cotizacion['cliente_nombre'] ?? '---'),0,1);
            $pdf->Cell(0,6,'Vendedor: ' . ($cotizacion['vendedor_nombre'] ?? '---'),0,1);
            $pdf->Cell(0,6,'Fecha: ' . ($cotizacion['fecha_emision'] ?? ''),0,1);
            $pdf->Ln(4);

            // Tabla de detalles (simple)
            $pdf->SetFont('Helvetica','B',10);
            $pdf->Cell(10,7,'#',1,0,'C');
            $pdf->Cell(90,7,'Descripcion',1,0);
            $pdf->Cell(20,7,'Cant.',1,0,'C');
            $pdf->Cell(30,7,'P. Unit',1,0,'R');
            $pdf->Cell(30,7,'Total',1,1,'R');
            $pdf->SetFont('Helvetica','',10);
            foreach ($detalles as $d) {
                $totalLinea = number_format(($d['cantidad'] * ($d['valor_unitario'] ?? 0)),2);
                $pdf->Cell(10,6,$d['item'],1,0,'C');
                $desc = mb_substr($d['descripcion'] ?? '',0,60);
                $pdf->Cell(90,6,$desc,1,0);
                $pdf->Cell(20,6,number_format($d['cantidad'],3),1,0,'C');
                $pdf->Cell(30,6,number_format($d['valor_unitario'] ?? 0,2),1,0,'R');
                $pdf->Cell(30,6,$totalLinea,1,1,'R');
            }

            $pdf->Ln(6);
            $pdf->SetFont('Helvetica','B',11);
            $pdf->Cell(0,6,'Totales',0,1);
            $pdf->SetFont('Helvetica','',10);
            $pdf->Cell(0,6,'Op. Gravada: ' . number_format($cotizacion['op_gravada'] ?? 0,2),0,1,'R');
            $pdf->Cell(0,6,'IGV: ' . number_format($cotizacion['igv'] ?? 0,2),0,1,'R');
            $pdf->Cell(0,6,'Total: ' . number_format($cotizacion['total'] ?? 0,2),0,1,'R');

            // Enviar PDF al cliente
            $pdfContent = $pdf->Output('', 'S');
            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="cotizacion_' . $id . '.pdf"');
            echo $pdfContent;
            exit;

        } catch (Exception $e) {
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }

    private function convertirAVenta($id)
    {
        $data = json_decode(file_get_contents("php://input"));

        try {
            $this->pdo->beginTransaction();

            // Obtener la cotización
            $sql = "SELECT * FROM cotizaciones WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $id]);
            $cotizacion = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$cotizacion) {
                $this->sendResponse(false, "Cotización no encontrada", null, 404);
            }

            // Crear venta basada en la cotización
            $sql_venta = "INSERT INTO ventas (cliente_id, vendedor_id, tipo_comprobante, serie, moneda, op_gravada, igv, total)
                         VALUES (:cliente_id, :vendedor_id, :tipo_comprobante, :serie, :moneda, :op_gravada, :igv, :total)";
            $stmt = $this->pdo->prepare($sql_venta);
            $stmt->execute([
                ':cliente_id' => $cotizacion['cliente_id'],
                ':vendedor_id' => $cotizacion['vendedor_id'],
                ':tipo_comprobante' => $data->tipo_comprobante ?? '01',
                ':serie' => $data->serie ?? 'F001',
                ':moneda' => $cotizacion['moneda'],
                ':op_gravada' => $cotizacion['op_gravada'],
                ':igv' => $cotizacion['igv'],
                ':total' => $cotizacion['total']
            ]);

            $venta_id = $this->pdo->lastInsertId();

            // Copiar detalles
            $sql_detalles = "INSERT INTO ventas_detalle (venta_id, item, producto_id, descripcion, cantidad, valor_unitario, precio_unitario, tipo_afectacion_igv)
                            SELECT :venta_id, item, producto_id, descripcion, cantidad, valor_unitario, precio_unitario, tipo_afectacion_igv
                            FROM cotizaciones_detalle
                            WHERE cotizacion_id = :cotizacion_id";
            $stmt = $this->pdo->prepare($sql_detalles);
            $stmt->execute([':venta_id' => $venta_id, ':cotizacion_id' => $id]);

            // Actualizar estado de cotización
            $sql_update = "UPDATE cotizaciones SET estado = 'CONVERTIDA' WHERE id = :id";
            $stmt = $this->pdo->prepare($sql_update);
            $stmt->execute([':id' => $id]);

            $this->pdo->commit();

            $this->sendResponse(true, "Cotización convertida a venta exitosamente", 
                ['venta_id' => $venta_id]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }

    private function eliminar($id)
    {
        try {
            $sql = "DELETE FROM cotizaciones WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() === 0) {
                $this->sendResponse(false, "Cotización no encontrada", null, 404);
            }

            $this->sendResponse(true, "Cotización eliminada correctamente");
        } catch (PDOException $e) {
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }
}
