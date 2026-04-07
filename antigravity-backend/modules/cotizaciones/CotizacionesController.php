<?php
/**
 * CotizacionesController.php
 * Gestión de cotizaciones (pre-ventas)
 */

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/env.php';
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
            $cotizacion_id = $this->service->uuidV4();
            $sql = "INSERT INTO cotizaciones (id, cliente_id, vendedor_id, fecha_vigencia, numero_whatsapp, observaciones, moneda)
                    VALUES (:id, :cliente_id, :vendedor_id, :fecha_vigencia, :numero_whatsapp, :observaciones, :moneda)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':id' => $cotizacion_id,
                ':cliente_id' => $data->cliente_id,
                ':vendedor_id' => $data->vendedor_id ?? null,
                ':fecha_vigencia' => $data->fecha_vigencia ?? null,
                ':numero_whatsapp' => $data->numero_whatsapp ?? null,
                ':observaciones' => $data->observaciones ?? null,
                ':moneda' => $data->moneda ?? 'PEN'
            ]);

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

    private function actualizar($id)
    {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->cliente_id) || empty($data->detalles)) {
            $this->sendResponse(false, "cliente_id y detalles son obligatorios", null, 422);
        }

        try {
            $this->pdo->beginTransaction();

            // Verificar existencia
            $sql_check = "SELECT id FROM cotizaciones WHERE id = :id";
            $stmt = $this->pdo->prepare($sql_check);
            $stmt->execute([':id' => $id]);
            if (!$stmt->fetch()) {
                $this->sendResponse(false, "Cotización no encontrada", null, 404);
            }

            // Actualizar cabecera
            $sql = "UPDATE cotizaciones SET 
                        cliente_id = :cliente_id, 
                        vendedor_id = :vendedor_id, 
                        fecha_vigencia = :fecha_vigencia, 
                        numero_whatsapp = :numero_whatsapp, 
                        observaciones = :observaciones, 
                        moneda = :moneda
                    WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':id' => $id,
                ':cliente_id' => $data->cliente_id,
                ':vendedor_id' => $data->vendedor_id ?? null,
                ':fecha_vigencia' => $data->fecha_vigencia ?? null,
                ':numero_whatsapp' => $data->numero_whatsapp ?? null,
                ':observaciones' => $data->observaciones ?? null,
                ':moneda' => $data->moneda ?? 'PEN'
            ]);

            // Eliminar detalles anteriores
            $sql_del = "DELETE FROM cotizaciones_detalle WHERE cotizacion_id = :id";
            $stmt = $this->pdo->prepare($sql_del);
            $stmt->execute([':id' => $id]);

            // Agregar nuevos detalles
            $totales = $this->service->agregarDetalles($id, $data->detalles);

            // Actualizar totales finales en cabecera
            $sql_update = "UPDATE cotizaciones SET op_gravada = :gravada, igv = :igv, total = :total WHERE id = :id";
            $stmt = $this->pdo->prepare($sql_update);
            $stmt->execute([
                ':gravada' => $totales['gravada'],
                ':igv' => $totales['igv'],
                ':total' => $totales['total'],
                ':id' => $id
            ]);

            $this->pdo->commit();
            $this->sendResponse(true, "Cotización actualizada exitosamente");

        } catch (Exception $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            $this->sendResponse(false, "Error: " . $e->getMessage(), null, 500);
        }
    }

    private function generarPdf($id)
    {
        try {
            // Obtener cotización completa
            $sql = "SELECT c.*,
                           cl.razon_social      AS cliente_nombre,
                           cl.numero_documento  AS cliente_documento,
                           cl.tipo_documento    AS cliente_tipo_doc,
                           cl.direccion_fiscal  AS cliente_direccion,
                           CONCAT(v.nombre, ' ', COALESCE(v.apellido,'')) AS vendedor_nombre
                    FROM cotizaciones c
                    LEFT JOIN clientes  cl ON c.cliente_id  = cl.id
                    LEFT JOIN vendedores v  ON c.vendedor_id = v.id
                    WHERE c.id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $id]);
            $cot = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$cot) {
                $this->sendResponse(false, "Cotización no encontrada", null, 404);
            }

            $sql_det = "SELECT cd.*, p.unidad_medida
                        FROM cotizaciones_detalle cd
                        LEFT JOIN productos p ON cd.producto_id = p.id
                        WHERE cd.cotizacion_id = :id
                        ORDER BY cd.item";
            $stmt = $this->pdo->prepare($sql_det);
            $stmt->execute([':id' => $id]);
            $detalles = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Datos empresa
            $empresa = [
                'ruc'          => env('EMPRESA_RUC', '20000000001'),
                'razon_social' => env('EMPRESA_RAZON_SOCIAL', 'EMPRESA DEMO'),
                'direccion'    => env('EMPRESA_DOMICILIO_FISCAL', env('EMPRESA_DIRECCION', 'AV DEMO 123, LIMA')),
            ];

            $tipo_doc_cli = (strtoupper($cot['cliente_tipo_doc'] ?? '') === 'RUC' || ($cot['cliente_tipo_doc'] ?? '') === '6') ? 'RUC' : 'DNI';
            $numero_cot   = 'COT-' . str_pad($cot['numero_correlativo'] ?? $id, 6, '0', STR_PAD_LEFT);
            $vendedor     = utf8_decode(mb_strtoupper(trim($cot['vendedor_nombre'] ?? 'SISTEMA'), 'UTF-8'));

            require_once __DIR__ . '/../../libraries/fpdf/fpdf.php';

            $pdf = new FPDF('P', 'mm', 'A4');
            $pdf->SetMargins(13, 13, 13);
            $pdf->SetAutoPageBreak(false);
            $pdf->AddPage();

            // ============================================================
            // CABECERA
            // ============================================================
            $Y0   = 10;
            $logo = __DIR__ . '/../../storage/logo.png';
            if (file_exists($logo)) {
                $pdf->Image($logo, 13, $Y0, 38, 22);
            } else {
                $pdf->SetXY(13, $Y0);
                $pdf->SetFont('Helvetica', 'B', 12);
                $pdf->Cell(38, 22, utf8_decode($empresa['razon_social']), 1, 0, 'C');
            }

            // Centro: nombre + dirección empresa
            $pdf->SetXY(55, $Y0);
            $pdf->SetFont('Helvetica', 'B', 13);
            $pdf->Cell(95, 7, utf8_decode($empresa['razon_social']), 0, 2, 'C');
            $pdf->SetX(55);
            $pdf->SetFont('Helvetica', '', 7.5);
            $pdf->MultiCell(95, 4, utf8_decode($empresa['direccion']), 0, 'C');

            // Derecha: cuadro
            $bx = 154; $by = $Y0; $bw = 46;
            $pdf->SetXY($bx, $by);
            $pdf->SetFont('Helvetica', 'B', 9);
            $pdf->Cell($bw, 8, 'R.U.C. N' . chr(176) . ' ' . $empresa['ruc'], 'LTR', 2, 'C');
            $pdf->SetX($bx);
            $pdf->SetFont('Helvetica', 'B', 8);
            $pdf->Cell($bw, 7, 'COTIZACI' . chr(211) . 'N', 'LR', 2, 'C');
            $pdf->SetX($bx);
            $pdf->SetFont('Helvetica', 'B', 10);
            $pdf->Cell($bw, 8, 'N' . chr(176) . ' ' . $numero_cot, 'LBR', 0, 'C');

            // Separador
            $pdf->SetDrawColor(180, 180, 180);
            $pdf->Line(13, $Y0 + 26, 197, $Y0 + 26);
            $pdf->SetDrawColor(0, 0, 0);

            // ============================================================
            // DATOS DEL CLIENTE
            // ============================================================
            $pdf->SetXY(13, $Y0 + 29);
            $lbl = 27; $val = 157;

            $filas_cli = [
                [$tipo_doc_cli . ':',  $cot['cliente_documento']  ?? '-'],
                ['Nombres:',           utf8_decode($cot['cliente_nombre'] ?? 'VARIOS')],
                [utf8_decode('Dirección:'), utf8_decode($cot['cliente_direccion'] ?? '-')],
            ];

            foreach ($filas_cli as $i => $fila) {
                $bt = ($i === 0) ? 'LTR' : 'LR';
                $pdf->SetFont('Helvetica', 'B', 8);
                $pdf->Cell($lbl, 5.5, $fila[0], $bt, 0, 'L');
                $pdf->SetFont('Helvetica', '', 8);
                $pdf->Cell($val, 5.5, $fila[1], ($i === 0 ? 'TR' : 'R'), 1, 'L');
            }

            // Fila fecha / moneda / vendedor
            $pdf->SetFont('Helvetica', 'B', 8);
            $pdf->Cell(22, 5.5, 'Fecha:', 'LBR', 0, 'L');
            $pdf->SetFont('Helvetica', '', 8);
            $pdf->Cell(32, 5.5, $cot['fecha_emision'] ?? date('Y-m-d'), 'BR', 0, 'L');
            $pdf->SetFont('Helvetica', 'B', 8);
            $pdf->Cell(16, 5.5, 'Moneda:', 'BR', 0, 'L');
            $pdf->SetFont('Helvetica', '', 8);
            $pdf->Cell(18, 5.5, $cot['moneda'] ?? 'PEN', 'BR', 0, 'L');
            $pdf->SetFont('Helvetica', 'B', 8);
            $pdf->Cell(20, 5.5, 'Vendedor:', 'BR', 0, 'L');
            $pdf->SetFont('Helvetica', '', 8);
            $pdf->Cell(76, 5.5, utf8_decode($vendedor), 'BR', 1, 'L');

            $pdf->Ln(4);

            // ============================================================
            // LEYENDA DE COLORES
            // ============================================================
            $pdf->SetFont('Helvetica', 'B', 8);
            $pdf->Cell(30, 5, utf8_decode('Indicación:'), 0, 0, 'L');

            $leyenda = [
                ['Indispensable', [210, 255, 210]],
                ['Remplazable',   [255, 240, 210]],
                ['Prescindible',  [235, 235, 235]],
            ];
            foreach ($leyenda as $leg) {
                $pdf->SetFillColor($leg[1][0], $leg[1][1], $leg[1][2]);
                $pdf->Cell(32, 5, $leg[0], 1, 0, 'C', true);
                $pdf->Cell(3, 5, '', 0, 0);
            }
            $pdf->Ln(6);

            // ============================================================
            // TABLA DE PRODUCTOS
            // ITEM=8, PRODUCTO=80, UND=13, CANT=13, V.UNIT=21, P.UNIT=21, TOTAL=28 => 184
            // ============================================================
            $c = [8, 80, 13, 13, 21, 21, 28];
            $off = []; $acc = 0;
            foreach ($c as $w) { $off[] = $acc; $acc += $w; }

            $pdf->SetFillColor(210, 210, 210);
            $pdf->SetFont('Helvetica', 'B', 8);
            $h_hdr = 6;
            $hdrs = ['ITEM', 'PRODUCTO', 'UND.', 'CANT.', 'V. UNIT', 'P. UNIT', 'TOTAL'];
            foreach ($hdrs as $k => $h) {
                $align = in_array($k, [4,5,6]) ? 'R' : ($k === 1 ? 'L' : 'C');
                $pdf->Cell($c[$k], $h_hdr, $h, 1, 0, $align, true);
            }
            $pdf->Ln();

            $pdf->SetFont('Helvetica', '', 8);
            $total_descuentos = 0;
            $row_num = 0;

            foreach ($detalles as $det) {
                $row_num++;
                $desc  = utf8_decode($det['descripcion'] ?? 'Producto');
                $cant  = (float) ($det['cantidad'] ?? 0);
                $vu    = (float) ($det['valor_unitario'] ?? 0);
                $pu    = (float) ($det['precio_unitario'] ?? ($vu * 1.18));
                $dscto = (float) ($det['descuento_unitario'] ?? 0);
                $total = $cant * ($pu - $dscto);
                $total_descuentos += $dscto * $cant;

                // Color según indicación
                $ind = strtolower($det['indicacion'] ?? '');
                if ($ind === 'indispensable') {
                    $pdf->SetFillColor(210, 255, 210);
                } elseif ($ind === 'remplazable') {
                    $pdf->SetFillColor(255, 240, 210);
                } elseif ($ind === 'prescindible') {
                    $pdf->SetFillColor(235, 235, 235);
                } else {
                    $fill_alt = ($row_num % 2 === 0);
                    if ($fill_alt) $pdf->SetFillColor(245, 247, 250);
                    else           $pdf->SetFillColor(255, 255, 255);
                }

                $lineas = max(1, ceil(mb_strlen($det['descripcion'] ?? '') / 51));
                $rh = 5.5 * $lineas;

                $x = $pdf->GetX(); $y = $pdf->GetY();
                foreach ($c as $ci => $cw) {
                    $pdf->Rect($x + $off[$ci], $y, $cw, $rh, 'DF');
                }

                $pdf->SetXY($x, $y);
                $pdf->Cell($c[0], $rh, $row_num, 0, 0, 'C');

                $pdf->SetXY($x + $off[1], $y);
                $pdf->MultiCell($c[1], 5.5, $desc, 0, 'L');

                $pdf->SetXY($x + $off[2], $y);
                $pdf->Cell($c[2], $rh, utf8_decode($det['unidad_medida'] ?? 'NIU'), 0, 0, 'C');

                $pdf->SetXY($x + $off[3], $y);
                $pdf->Cell($c[3], $rh, number_format($cant, 2), 0, 0, 'C');

                $pdf->SetXY($x + $off[4], $y);
                $pdf->Cell($c[4], $rh, number_format($vu, 2), 0, 0, 'R');

                $pdf->SetXY($x + $off[5], $y);
                $pdf->Cell($c[5], $rh, number_format($pu, 2), 0, 0, 'R');

                $pdf->SetXY($x + $off[6], $y);
                $pdf->Cell($c[6], $rh, number_format($total, 2), 0, 1, 'R');

                $pdf->SetY($y + $rh);
            }

            $pdf->Ln(5);

            // ============================================================
            // TOTALES (siempre todos los campos)
            // ============================================================
            $lbl_w = 35; $val_w = 24;
            $x_tot = 184 - $lbl_w - $val_w + 13;

            $tots = [
                ['OP. Gravada',  number_format((float)($cot['op_gravada'] ?? 0), 2)],
                ['I.G.V.',       number_format((float)($cot['igv'] ?? 0),        2)],
                ['Op. Inafecta', '0.00'],
                ['Op.',          '0.00'],
                ['Op. Gratuita', '0.00'],
            ];

            $pdf->SetFont('Helvetica', '', 8.5);
            foreach ($tots as $t) {
                $pdf->Cell($x_tot - 13, 5.5, '', 0, 0);
                $pdf->SetX($x_tot);
                $pdf->Cell($lbl_w, 5.5, $t[0], 1, 0, 'R');
                $pdf->Cell($val_w, 5.5, $t[1] . ' S/', 1, 1, 'R');
            }

            if ($total_descuentos > 0) {
                $pdf->Cell($x_tot - 13, 5.5, '', 0, 0);
                $pdf->SetX($x_tot);
                $pdf->Cell($lbl_w, 5.5, 'Dsctos Totales', 1, 0, 'R');
                $pdf->Cell($val_w, 5.5, '-' . number_format($total_descuentos, 2) . ' S/', 1, 1, 'R');
            }

            $pdf->SetFont('Helvetica', 'B', 9.5);
            $pdf->Cell($x_tot - 13, 6, '', 0, 0);
            $pdf->SetX($x_tot);
            $pdf->Cell($lbl_w, 6, 'Importe', 1, 0, 'R');
            $pdf->Cell($val_w, 6, number_format((float)($cot['total'] ?? 0), 2) . ' S/', 1, 1, 'R');

            $pdf->Ln(5);

            // ============================================================
            // PIE: nota y usuario/fecha
            // ============================================================
            $pdf->SetFont('Helvetica', '', 7.5);
            $pdf->MultiCell(184, 4.5, utf8_decode(
                'Este documento es una cotización y no tiene valor tributario. ' .
                'Válida por 15 días a partir de la fecha de emisión.' . "\n" .
                'Estado: ' . strtoupper($cot['estado'] ?? 'PENDIENTE')
            ));
            $pdf->Ln(3);

            $pdf->SetFont('Helvetica', '', 7);
            $now = date('d/m/Y H:i A');
            $pdf->Cell(92, 5, utf8_decode('USUARIO: ' . mb_strtoupper(trim($cot['vendedor_nombre'] ?? 'SISTEMA'), 'UTF-8')), 0, 0, 'L');
            $pdf->Cell(92, 5, $now, 0, 1, 'R');

            // Servir PDF inline
            $pdfContent = $pdf->Output('', 'S');
            header('Content-Type: application/pdf');
            header('Content-Disposition: inline; filename="cotizacion_' . $numero_cot . '.pdf"');
            header('Content-Length: ' . strlen($pdfContent));
            echo $pdfContent;
            exit;

        } catch (Exception $e) {
            $this->sendResponse(false, "Error al generar PDF: " . $e->getMessage(), null, 500);
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
            $venta_id = $this->service->uuidV4();
            $sql_venta = "INSERT INTO ventas (id, cliente_id, vendedor_id, tipo_comprobante, serie, moneda, op_gravada, igv, total)
                         VALUES (:id, :cliente_id, :vendedor_id, :tipo_comprobante, :serie, :moneda, :op_gravada, :igv, :total)";
            $stmt = $this->pdo->prepare($sql_venta);
            $stmt->execute([
                ':id' => $venta_id,
                ':cliente_id' => $cotizacion['cliente_id'],
                ':vendedor_id' => $cotizacion['vendedor_id'],
                ':tipo_comprobante' => $data->tipo_comprobante ?? '01',
                ':serie' => $data->serie ?? 'F001',
                ':moneda' => $cotizacion['moneda'],
                ':op_gravada' => $cotizacion['op_gravada'],
                ':igv' => $cotizacion['igv'],
                ':total' => $cotizacion['total']
            ]);

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
