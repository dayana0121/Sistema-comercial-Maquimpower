<?php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/env.php';
require_once __DIR__ . '/../../helpers/NumLetras.php';
require_once __DIR__ . '/../../libraries/fpdf/fpdf.php';
require_once __DIR__ . '/../../libraries/qr/phpqrcode/qrlib.php';

class VentaPdfController
{
    private $conn;

    public function __construct()
    {
        $this->conn = getDB();
    }

    public function generar($venta_id)
    {
        AuthMiddleware::verificar();
        
        $formato = $_GET['formato'] ?? 'ticket';

        // Obtener venta completa con cliente
        $stmt = $this->conn->prepare("
            SELECT v.*, c.razon_social AS cliente_nombre,
                   c.numero_documento AS cliente_documento,
                   c.tipo_documento AS cliente_tipo_doc,
                   c.direccion_fiscal AS cliente_direccion
            FROM ventas v
            LEFT JOIN clientes c ON v.cliente_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
            WHERE v.id = :id
        ");
        $stmt->bindValue(':id', $venta_id);
        $stmt->execute();
        $venta = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$venta) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Venta no encontrada']);
            return;
        }

        // Obtener detalles
        $stmtDet = $this->conn->prepare("SELECT * FROM ventas_detalle WHERE venta_id = :id ORDER BY item");
        $stmtDet->bindValue(':id', $venta_id);
        $stmtDet->execute();
        $detalles = $stmtDet->fetchAll(PDO::FETCH_ASSOC);

        // Datos empresa desde .env
        $empresa = [
            'ruc'              => env('EMPRESA_RUC', '20000000001'),
            'razon_social'     => env('EMPRESA_RAZON_SOCIAL', 'EMPRESA DEMO SUNAT'),
            'nombre_comercial' => env('EMPRESA_RAZON_SOCIAL', 'EMPRESA DEMO SUNAT'),
            'domicilio_fiscal' => env('EMPRESA_DOMICILIO_FISCAL', env('EMPRESA_DIRECCION', 'AV DEMO 123 LIMA')),
            'ubigeo'           => env('EMPRESA_UBIGEO', '150101'),
            'departamento'     => env('EMPRESA_DEPARTAMENTO', 'LIMA'),
            'provincia'        => env('EMPRESA_PROVINCIA', 'LIMA'),
            'distrito'         => env('EMPRESA_DISTRITO', 'LIMA'),
        ];

        $tipo_codigo = ($venta['tipo_comprobante'] === '01') ? '01' : '03';
        $nombre_archivo = $empresa['ruc'] . '-' . $tipo_codigo . '-' .
            $venta['serie'] . '-' .
            str_pad($venta['correlativo'], 8, '0', STR_PAD_LEFT);

        if ($formato === 'a4') {
            $pdf_path = $this->generarPDFA4($empresa, $venta, $detalles, $nombre_archivo);
        } else {
            $pdf_path = $this->generarPDF($empresa, $venta, $detalles, $nombre_archivo);
        }

        // Servir el PDF como descarga
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="' . $nombre_archivo . '.pdf"');
        header('Content-Length: ' . filesize($pdf_path));
        readfile($pdf_path);
        exit;
    }

    private function generarPDF($empresa, $venta, $detalles, $nombre)
    {
        $totalLetras = numeroALetras((float) $venta['importe_total']);
        $totalLetras = 'Son: ' . $totalLetras;

        $fijo = 233 + 10;
        $ancho = 8.4;
        $total_y = $fijo + $ancho * count($detalles);

        $pdf = new FPDF('P', 'mm', [80, $total_y]);
        $pdf->SetMargins(2, 2, 2);
        $pdf->AddPage();

        // Logo — si existe
        $logo = __DIR__ . '/../../storage/logo.png';
        if (file_exists($logo)) {
            $pdf->Image($logo, 10, 0, 60, 40);
            $pdf->Ln(40);
        }

        // Datos empresa
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(74, 6, $empresa['nombre_comercial'], 'B', 1, 'C');
        $pdf->SetFont('Arial', '', 9);
        $pdf->Cell(74, 6, $empresa['razon_social'], 0, 1, 'C');
        $pdf->Cell(74, 6, 'RUC: ' . $empresa['ruc'], 0, 1, 'C');
        $pdf->MultiCell(74, 5, utf8_decode($empresa['domicilio_fiscal']));
        $pdf->Cell(74, 1, str_repeat('-', 77), 0, 1, 'C');
        $pdf->Ln(2);

        // Tipo de comprobante
        $tipo = 'BOLETA';
        if ($venta['tipo_comprobante'] === '01') $tipo = 'FACTURA';
        if ($venta['tipo_comprobante'] === '00') $tipo = 'NOTA DE VENTA';

        $pdf->Cell(74, 6, utf8_decode($tipo . ' ELECTRONICA'), 0, 1, 'L');
        $pdf->Cell(74, 5, $venta['serie'] . '-' . str_pad($venta['correlativo'], 8, '0', STR_PAD_LEFT), 0, 1, 'L');
        $pdf->Cell(74, 5, 'Fecha: ' . $venta['fecha_emision'], 0, 1, 'L');
        $pdf->Cell(74, 5, utf8_decode('Método: ' . ($venta['metodo_pago'] ?? 'EFECTIVO')), 0, 1, 'L');
        $pdf->Cell(74, 1, str_repeat('-', 77), 0, 1, 'C');
        $pdf->Ln(2);

        // Datos cliente
        $tipo_doc_cliente = ($venta['cliente_tipo_doc'] === 'RUC' || $venta['cliente_tipo_doc'] === '6') ? 'RUC' : 'DNI';
        $pdf->MultiCell(74, 5, utf8_decode('Cliente: ' . ($venta['cliente_nombre'] ?? 'VARIOS')));
        $pdf->Cell(74, 5, utf8_decode($tipo_doc_cliente . ': ' . ($venta['cliente_documento'] ?? '-')), 0, 1, 'L');
        $pdf->Cell(74, 1, str_repeat('-', 77), 0, 1, 'C');
        $pdf->Ln(2);

        // Detalle de productos
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(40, 5, 'DESCRIPCION', 0, 0, 'L');
        $pdf->Cell(8, 5, 'CANT', 0, 0, 'C');
        $pdf->Cell(12, 5, 'P.UNIT', 0, 0, 'R');
        $pdf->Cell(12, 5, 'TOTAL', 0, 1, 'R');
        $pdf->SetFont('Arial', '', 8);

        $total_descuentos = 0;
        foreach ($detalles as $det) {
            $desc = utf8_decode($det['descripcion'] ?? 'Producto');
            $cant = (float) ($det['cantidad'] ?? 0);
            $pu = (float) ($det['precio_unitario'] ?? 0);
            $dscto = (float) ($det['descuento_unitario'] ?? 0);
            $pu_neto = $pu - $dscto;
            $total_linea = $cant * $pu_neto;
            $total_descuentos += ($dscto * $cant);

            // Descripcion en MultiCell, luego valores en la misma línea
            $y_before = $pdf->GetY();
            $pdf->MultiCell(40, 4, $desc);
            $y_after = $pdf->GetY();
            
            $pdf->SetXY(42, $y_before);
            $pdf->Cell(8, 4, number_format($cant, 2), 0, 0, 'C');
            $pdf->Cell(12, 4, number_format($pu, 2), 0, 0, 'R');
            $pdf->Cell(12, 4, number_format($total_linea, 2), 0, 1, 'R');
            
            $pdf->SetY($y_after);
            
            // Si hay descuento, mostrarlo debajito
            if ($dscto > 0) {
                $pdf->SetFont('Arial', 'I', 7);
                $pdf->Cell(40, 3, "   Dscto. Unit: -S/ " . number_format($dscto, 2), 0, 1, 'L');
                $pdf->SetFont('Arial', '', 7);
            }
        }

        $pdf->Cell(74, 1, str_repeat('-', 77), 0, 1, 'C');
        $pdf->Ln(2);

        // Totales
        $pdf->SetFont('Arial', '', 10);
        
        if ($total_descuentos > 0) {
            $pdf->Cell(50, 5, 'Dsctos Totales:', 0, 0, 'R');
            $pdf->Cell(22, 5, '-S/ ' . number_format($total_descuentos, 2), 0, 1, 'R');
        }

        if ((float)$venta['op_gravada'] > 0) {
            $pdf->Cell(50, 5, 'Op. Gravada:', 0, 0, 'R');
            $pdf->Cell(22, 5, 'S/ ' . number_format((float) $venta['op_gravada'], 2), 0, 1, 'R');
        }
        if ((float)$venta['op_exonerada'] > 0) {
            $pdf->Cell(50, 5, 'Op. Exonerada:', 0, 0, 'R');
            $pdf->Cell(22, 5, 'S/ ' . number_format((float) $venta['op_exonerada'], 2), 0, 1, 'R');
        }
        if ((float)$venta['op_inafecta'] > 0) {
            $pdf->Cell(50, 5, 'Op. Inafecta:', 0, 0, 'R');
            $pdf->Cell(22, 5, 'S/ ' . number_format((float) $venta['op_inafecta'], 2), 0, 1, 'R');
        }
        if ((float)$venta['op_gratuita'] > 0) {
            $pdf->Cell(50, 5, 'Op. Gratuita:', 0, 0, 'R');
            $pdf->Cell(22, 5, 'S/ ' . number_format((float) $venta['op_gratuita'], 2), 0, 1, 'R');
        }

        $pdf->Cell(50, 5, 'IGV (18%):', 0, 0, 'R');
        $pdf->Cell(22, 5, 'S/ ' . number_format((float) $venta['igv'], 2), 0, 1, 'R');

        $pdf->SetFont('Arial', 'B', 11);
        $pdf->Cell(50, 6, 'TOTAL A PAGAR:', 0, 0, 'R');
        $pdf->Cell(22, 6, 'S/ ' . number_format((float) $venta['importe_total'], 2), 0, 1, 'R');
        $pdf->Ln(2);

        $pdf->SetFont('Arial', 'I', 8);
        $pdf->MultiCell(74, 4, utf8_decode($totalLetras));
        $pdf->Ln(2);

        if ($venta['tipo_comprobante'] === '00') {
            $pdf->SetFont('Arial', 'B', 8);
            $pdf->Cell(74, 5, utf8_decode('DOCUMENTO INTERNO SIN VALOR TRIBUTARIO'), 0, 1, 'C');
            $pdf->Ln(2);
        }

        // QR SUNAT
        $qr_path = $this->generarQR($venta, $empresa, $nombre);
        if ($qr_path && file_exists($qr_path)) {
            $pdf->Image($qr_path, 20, $pdf->GetY(), 38, 38);
            $pdf->Ln(40);
        }

        // Estado SUNAT
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(74, 4, utf8_decode('Estado SUNAT: ' . ($venta['estado_sunat'] ?? 'N/A')), 0, 1, 'C');

        // Guardar PDF
        $pdf_dir = __DIR__ . '/../../storage/files/pdf';
        if (!is_dir($pdf_dir)) {
            mkdir($pdf_dir, 0777, true);
        }
        $pdf_path = $pdf_dir . '/' . $nombre . '.pdf';
        $pdf->Output($pdf_path, 'F');
        return $pdf_path;
    }

    private function generarQR($venta, $empresa, $nombre)
    {
        $tipo = ($venta['tipo_comprobante'] === '01') ? 'FACTURA' : 'BOLETA';
        $tipo_doc_cliente = ($venta['cliente_tipo_doc'] === 'RUC' || $venta['cliente_tipo_doc'] === '6') ? '6' : '1';

        $textoQR = $empresa['ruc'] . '|' .
            $tipo . '|' .
            $venta['serie'] . '|' .
            str_pad($venta['correlativo'], 8, '0', STR_PAD_LEFT) . '|' .
            number_format((float) $venta['igv'], 2) . '|' .
            number_format((float) $venta['importe_total'], 2) . '|' .
            $venta['fecha_emision'] . '|' .
            $tipo_doc_cliente . '|' .
            ($venta['cliente_documento'] ?? '') . '|';

        $qr_dir = __DIR__ . '/../../storage/files/qr';
        if (!is_dir($qr_dir)) {
            mkdir($qr_dir, 0777, true);
        }
        $qr_path = $qr_dir . '/' . $nombre . '.png';
        QRcode::png($textoQR, $qr_path, QR_ECLEVEL_L, 5, 2);
        return $qr_path;
    }

    private function generarPDFA4($empresa, $venta, $detalles, $nombre)
    {
        $totalLetras = numeroALetras((float) $venta['importe_total']);
        $totalLetras = 'Son: ' . $totalLetras;

        $pdf = new FPDF('P', 'mm', 'A4');
        $pdf->SetMargins(15, 15, 15);
        $pdf->AddPage();

        // 1. Cabecera
        $logo = __DIR__ . '/../../storage/logo.png';
        if (file_exists($logo)) {
            $pdf->Image($logo, 15, 15, 60);
        }

        // Tipo de comprobante
        $tipo = 'BOLETA';
        if ($venta['tipo_comprobante'] === '01') $tipo = 'FACTURA';
        if ($venta['tipo_comprobante'] === '00') $tipo = 'NOTA DE VENTA';

        // Cuadro RUC SUNAT (Derecha)
        $pdf->SetXY(130, 15);
        $pdf->SetFont('Arial', 'B', 14);
        $pdf->Cell(65, 8, 'RUC: ' . $empresa['ruc'], 'LTR', 2, 'C');
        $pdf->Cell(65, 8, utf8_decode($tipo . ' ELECTRONICA'), 'LR', 2, 'C');
        $pdf->Cell(65, 8, $venta['serie'] . '-' . str_pad($venta['correlativo'], 8, '0', STR_PAD_LEFT), 'LBR', 0, 'C');

        // Datos de la empresa (Izquierda)
        $pdf->SetXY(15, 40);
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(100, 6, $empresa['nombre_comercial'], 0, 1, 'L');
        $pdf->SetFont('Arial', '', 9);
        $pdf->Cell(100, 5, $empresa['razon_social'], 0, 1, 'L');
        $pdf->MultiCell(100, 5, utf8_decode($empresa['domicilio_fiscal']));

        $pdf->Ln(10);

        // 2. Datos del Cliente
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell(25, 6, 'Cliente:', 1, 0, 'L', false);
        $pdf->SetFont('Arial', '', 9);
        $pdf->Cell(160, 6, utf8_decode($venta['cliente_nombre'] ?? 'VARIOS'), 1, 1, 'L');
        
        $tipo_doc_cliente = ($venta['cliente_tipo_doc'] === 'RUC' || $venta['cliente_tipo_doc'] === '6') ? 'RUC' : 'DNI';
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell(25, 6, $tipo_doc_cliente . ':', 1, 0, 'L');
        $pdf->SetFont('Arial', '', 9);
        $pdf->Cell(65, 6, $venta['cliente_documento'] ?? '-', 1, 0, 'L');
        
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell(30, 6, 'Fecha de Emision:', 1, 0, 'L');
        $pdf->SetFont('Arial', '', 9);
        $pdf->Cell(65, 6, $venta['fecha_emision'], 1, 1, 'L');

        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell(25, 6, 'Direccion:', 1, 0, 'L');
        $pdf->SetFont('Arial', '', 9);
        $pdf->Cell(160, 6, utf8_decode($venta['cliente_direccion'] ?? '-'), 1, 1, 'L');
        
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell(25, 6, 'Metodo Pago:', 1, 0, 'L');
        $pdf->SetFont('Arial', '', 9);
        $pdf->Cell(160, 6, utf8_decode($venta['metodo_pago'] ?? 'EFECTIVO'), 1, 1, 'L');

        $pdf->Ln(5);

        // 3. Tabla de Productos
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->SetFillColor(230, 230, 230);
        $pdf->Cell(15, 7, 'CANT.', 1, 0, 'C', true);
        $pdf->Cell(12, 7, 'U.M.', 1, 0, 'C', true);
        $pdf->Cell(103, 7, 'DESCRIPCION', 1, 0, 'C', true);
        $pdf->Cell(20, 7, 'P. UNIT', 1, 0, 'C', true);
        $pdf->Cell(15, 7, 'DSCTO', 1, 0, 'C', true);
        $pdf->Cell(20, 7, 'TOTAL', 1, 1, 'C', true);

        $pdf->SetFont('Arial', '', 9);
        $total_descuentos_a4 = 0;
        foreach ($detalles as $det) {
            $desc = utf8_decode($det['descripcion'] ?? 'Producto');
            $cant = (float) ($det['cantidad'] ?? 0);
            $pu = (float) ($det['precio_unitario'] ?? 0);
            $dscto = (float) ($det['descuento_unitario'] ?? 0);
            $pu_neto = $pu - $dscto;
            $total_linea = $cant * $pu_neto;
            $total_descuentos_a4 += ($dscto * $cant);
            
            // Calculamos altura
            $caracteresPorLinea = 60; 
            $lineas = ceil(strlen($desc) / $caracteresPorLinea);
            $alto = 6 * $lineas;

            $x = $pdf->GetX();
            $y = $pdf->GetY();

            $pdf->Rect($x, $y, 15, $alto);           // CANT.
            $pdf->Rect($x + 15, $y, 12, $alto);      // U.M.
            $pdf->Rect($x + 27, $y, 103, $alto);     // DESCRIPCION
            $pdf->Rect($x + 130, $y, 20, $alto);     // P. UNIT
            $pdf->Rect($x + 150, $y, 15, $alto);     // DSCTO
            $pdf->Rect($x + 165, $y, 20, $alto);     // TOTAL
            
            $pdf->SetXY($x, $y);
            $pdf->Cell(15, $alto, number_format($cant, 2), 0, 0, 'C');
            
            $pdf->SetXY($x + 15, $y);
            $pdf->Cell(12, $alto, utf8_decode($det['unidad_medida'] ?? 'NIU'), 0, 0, 'C');
            
            $pdf->SetXY($x + 27, $y);
            $pdf->MultiCell(103, 6, $desc, 0, 'L');
            
            $pdf->SetXY($x + 130, $y);
            $pdf->Cell(20, $alto, number_format($pu, 2), 0, 0, 'R');
            
            $pdf->SetXY($x + 150, $y);
            $pdf->Cell(15, $alto, $dscto > 0 ? "-".number_format($dscto, 2) : '0.00', 0, 0, 'R');
            
            $pdf->SetXY($x + 165, $y);
            $pdf->Cell(20, $alto, number_format($total_linea, 2), 0, 1, 'R');
        }

        $pdf->Ln(5);

        // 4. Totales
        $pdf->SetFont('Arial', '', 9);
        
        if ($total_descuentos_a4 > 0) {
            $pdf->Cell(135, 5, '', 0, 0); 
            $pdf->Cell(25, 5, 'Dsctos Totales:', 1, 0, 'R');
            $pdf->Cell(25, 5, '-S/ ' . number_format($total_descuentos_a4, 2), 1, 1, 'R');
        }

        if ((float)$venta['op_gravada'] > 0 || (float)$venta['igv'] > 0) {
            $pdf->Cell(135, 5, '', 0, 0);
            $pdf->Cell(25, 5, 'Op. Gravada:', 1, 0, 'R');
            $pdf->Cell(25, 5, 'S/ ' . number_format((float) $venta['op_gravada'], 2), 1, 1, 'R');
        }
        if ((float)$venta['op_exonerada'] > 0) {
            $pdf->Cell(135, 5, '', 0, 0);
            $pdf->Cell(25, 5, 'Op. Exonerada:', 1, 0, 'R');
            $pdf->Cell(25, 5, 'S/ ' . number_format((float) $venta['op_exonerada'], 2), 1, 1, 'R');
        }
        if ((float)$venta['op_inafecta'] > 0) {
            $pdf->Cell(135, 5, '', 0, 0);
            $pdf->Cell(25, 5, 'Op. Inafecta:', 1, 0, 'R');
            $pdf->Cell(25, 5, 'S/ ' . number_format((float) $venta['op_inafecta'], 2), 1, 1, 'R');
        }
        if ((float)$venta['op_gratuita'] > 0) {
            $pdf->Cell(135, 5, '', 0, 0);
            $pdf->Cell(25, 5, 'Op. Gratuita:', 1, 0, 'R');
            $pdf->Cell(25, 5, 'S/ ' . number_format((float) $venta['op_gratuita'], 2), 1, 1, 'R');
        }

        if ((float)$venta['igv'] > 0) {
            $pdf->Cell(135, 5, '', 0, 0);
            $pdf->Cell(25, 5, 'IGV (18%):', 1, 0, 'R');
            $pdf->Cell(25, 5, 'S/ ' . number_format((float) $venta['igv'], 2), 1, 1, 'R');
        }

        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(135, 6, '', 0, 0);
        $pdf->Cell(25, 6, 'TOTAL:', 1, 0, 'R');
        $pdf->Cell(25, 6, 'S/ ' . number_format((float) $venta['importe_total'], 2), 1, 1, 'R');

        // Total letras
        $pdf->Ln(2);
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->MultiCell(185, 5, utf8_decode($totalLetras));

        // 5. QR y Estado SUNAT
        $qr_path = $this->generarQR($venta, $empresa, $nombre);
        if ($qr_path && file_exists($qr_path)) {
            $y_qr = $pdf->GetY() + 5;
            $pdf->Image($qr_path, 15, $y_qr, 30, 30);
            $pdf->SetXY(50, $y_qr + 5);
            $pdf->SetFont('Arial', '', 8);
            $pdf->MultiCell(100, 4, utf8_decode("Representacion impresa de la $tipo ELECTRONICA\nAutorizada mediante Resolución de SUNAT\nConsulte el documento en nubefact.com/pe (o sitio oficial)\nEstado SUNAT: " . ($venta['estado_sunat'] ?? 'PENDIENTE')));
        }

        // Guardar PDF
        $pdf_dir = __DIR__ . '/../../storage/files/pdf';
        if (!is_dir($pdf_dir)) {
            mkdir($pdf_dir, 0777, true);
        }
        $pdf_path = $pdf_dir . '/' . $nombre . '_A4.pdf';
        $pdf->Output($pdf_path, 'F');
        return $pdf_path;
    }

    public function generarGuiaEnvio($venta_id)
    {
        AuthMiddleware::verificar();
        
        $stmt = $this->conn->prepare("
            SELECT v.*, c.razon_social AS cliente_nombre,
                   c.numero_documento AS cliente_documento,
                   c.tipo_documento AS cliente_tipo_doc,
                   c.direccion_fiscal AS cliente_direccion
            FROM ventas v
            LEFT JOIN clientes c ON v.cliente_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
            WHERE v.id = :id
        ");
        $stmt->bindValue(':id', $venta_id);
        $stmt->execute();
        $venta = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$venta) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Venta no encontrada']);
            return;
        }

        $stmtDet = $this->conn->prepare("SELECT * FROM ventas_detalle WHERE venta_id = :id ORDER BY item");
        $stmtDet->bindValue(':id', $venta_id);
        $stmtDet->execute();
        $detalles = $stmtDet->fetchAll(PDO::FETCH_ASSOC);

        $pdf = new FPDF('P', 'mm', 'A4');
        $pdf->SetMargins(15, 15, 15);
        $pdf->AddPage();

        // 1. Cabecera
        $logo = __DIR__ . '/../../storage/logo.png';
        if (file_exists($logo)) {
            $pdf->Image($logo, 15, 15, 50);
        }

        $pdf->SetFont('Arial', 'B', 18);
        $pdf->SetY(25);
        $pdf->Cell(180, 10, utf8_decode('GUIA DE ENVIO / DESPACHO'), 0, 1, 'R');
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(180, 10, 'VENTA REF: ' . $venta['numero_completo'], 0, 1, 'R');
        $pdf->Ln(5);
        
        // 2. Datos
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(40, 6, 'Fecha de Emision:', 0, 0);
        $pdf->SetFont('Arial', '', 10);
        $pdf->Cell(140, 6, $venta['fecha_emision'], 0, 1);

        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(40, 6, 'Cliente:', 0, 0);
        $pdf->SetFont('Arial', '', 10);
        $pdf->Cell(140, 6, utf8_decode($venta['cliente_nombre']), 0, 1);

        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(40, 6, 'Documento:', 0, 0);
        $pdf->SetFont('Arial', '', 10);
        $pdf->Cell(140, 6, utf8_decode($venta['cliente_documento']), 0, 1);

        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(40, 6, 'Telefono:', 0, 0);
        $pdf->SetFont('Arial', '', 10);
        // Extract from JSON or DB if joined, for now handle if available.
        $stmtC = $this->conn->prepare("SELECT telefono FROM clientes WHERE id = ?");
        $stmtC->execute([$venta['cliente_id']]);
        $cel = $stmtC->fetchColumn();
        $pdf->Cell(140, 6, $cel ?: '-', 0, 1);

        // Agencia
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(40, 7, 'Agencia / Destino:', 0, 0);
        $pdf->SetFont('Arial', 'B', 11);
        
        // Cargar agencia manual desde 'observacion'
        $agencia = $venta['observacion'] ?: 'SHALOM HASTA AGENCIA (POR DEFINIR)';
        if ($venta['canal_venta'] === 'tienda') $agencia = 'RETIRO EN TIENDA (PRESENCIAL)';
        
        $pdf->Cell(140, 7, utf8_decode($agencia), 0, 1);
        $pdf->Ln(5);

        // 3. Tabla
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->SetFillColor(220, 220, 220);
        $pdf->Cell(25, 8, 'CANTIDAD', 1, 0, 'C', true);
        $pdf->Cell(155, 8, 'DESCRIPCION DEL PRODUCTO', 1, 1, 'C', true);
        
        $pdf->SetFont('Arial', '', 10);
        foreach ($detalles as $det) {
            $pdf->Cell(25, 8, (float)$det['cantidad'] . ' ' . utf8_decode($det['unidad_medida']), 1, 0, 'C');
            $pdf->Cell(155, 8, utf8_decode($det['descripcion']), 1, 1, 'L');
        }

        $pdf->Ln(25);
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(180, 10, 'Firma / Confirmacion de Recepcion', 0, 1, 'C');
        $pdf->Cell(180, 20, '________________________________________', 0, 1, 'C');

        header('Content-Type: application/pdf');
        $pdf->Output('I', 'Guia_Envio_' . $venta['numero_completo'] . '.pdf');
        exit;
    }
}
