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

        $pdf_path = $this->generarPDF($empresa, $venta, $detalles, $nombre_archivo);

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
        $tipo = ($venta['tipo_comprobante'] === '01') ? 'FACTURA' : 'BOLETA';
        $pdf->Cell(74, 6, utf8_decode($tipo . ' DE VENTA ELECTRONICA'), 0, 1, 'L');
        $pdf->Cell(74, 5, $venta['serie'] . '-' . str_pad($venta['correlativo'], 8, '0', STR_PAD_LEFT), 0, 1, 'L');
        $pdf->Cell(74, 5, 'Fecha: ' . $venta['fecha_emision'], 0, 1, 'L');
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

        foreach ($detalles as $det) {
            $desc = utf8_decode($det['descripcion'] ?? 'Producto');
            $cant = (float) ($det['cantidad'] ?? 0);
            $pu = (float) ($det['precio_unitario'] ?? 0);
            $total_linea = $cant * $pu;

            // Descripcion en MultiCell, luego valores en la misma línea
            $y_before = $pdf->GetY();
            $pdf->MultiCell(40, 4, $desc);
            $y_after = $pdf->GetY();
            $pdf->SetXY(42, $y_before);
            $pdf->Cell(8, 4, number_format($cant, 2), 0, 0, 'C');
            $pdf->Cell(12, 4, number_format($pu, 2), 0, 0, 'R');
            $pdf->Cell(12, 4, number_format($total_linea, 2), 0, 1, 'R');
            $pdf->SetY($y_after);
        }

        $pdf->Cell(74, 1, str_repeat('-', 77), 0, 1, 'C');
        $pdf->Ln(2);

        // Totales
        $pdf->SetFont('Arial', '', 10);
        $pdf->Cell(50, 5, 'Op. Gravada:', 0, 0, 'R');
        $pdf->Cell(22, 5, 'S/ ' . number_format((float) $venta['op_gravada'], 2), 0, 1, 'R');

        $pdf->Cell(50, 5, 'IGV (18%):', 0, 0, 'R');
        $pdf->Cell(22, 5, 'S/ ' . number_format((float) $venta['igv'], 2), 0, 1, 'R');

        $pdf->SetFont('Arial', 'B', 11);
        $pdf->Cell(50, 6, 'TOTAL A PAGAR:', 0, 0, 'R');
        $pdf->Cell(22, 6, 'S/ ' . number_format((float) $venta['importe_total'], 2), 0, 1, 'R');
        $pdf->Ln(2);

        $pdf->SetFont('Arial', 'I', 8);
        $pdf->MultiCell(74, 4, utf8_decode($totalLetras));
        $pdf->Ln(2);

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
}
