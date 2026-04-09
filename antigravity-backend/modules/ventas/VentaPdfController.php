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

        // Vendedor
        $vendedor_nombre = 'SISTEMA';
        if (!empty($venta['vendedor_id'])) {
            $stmtV = $this->conn->prepare("SELECT CONCAT(nombre, ' ', apellido) FROM vendedores WHERE id = ?");
            $stmtV->execute([$venta['vendedor_id']]);
            $vn = $stmtV->fetchColumn();
            if ($vn) $vendedor_nombre = mb_strtoupper($vn, 'UTF-8');
        }

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
            $pdf_path = $this->generarPDFA4($empresa, $venta, $detalles, $nombre_archivo, $vendedor_nombre);
        } else {
            $pdf_path = $this->generarPDF($empresa, $venta, $detalles, $nombre_archivo);
        }

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
        if (!extension_loaded('gd')) {
            error_log('VentaPdf: extensión PHP gd no disponible; PDF sin código QR.');
            return null;
        }

        try {
            $tipo = ($venta['tipo_comprobante'] === '01') ? 'FACTURA' : 'BOLETA';
            $tipo_doc_cliente = ($venta['cliente_tipo_doc'] === 'RUC' || $venta['cliente_tipo_doc'] === '6') ? '6' : '1';

            $textoQR = $empresa['ruc'] . '|' .
                $tipo . '|' .
                $venta['serie'] . '|' .
                str_pad((string) $venta['correlativo'], 8, '0', STR_PAD_LEFT) . '|' .
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
        } catch (Throwable $e) {
            error_log('VentaPdf QR: ' . $e->getMessage());
            return null;
        }
    }

    private function generarPDFA4($empresa, $venta, $detalles, $nombre, $vendedor_nombre = 'SISTEMA')
    {
        $totalLetras = 'SON ' . strtoupper(numeroALetras((float) $venta['importe_total']));

        // Tipo de comprobante
        $tipo = 'BOLETA';
        if ($venta['tipo_comprobante'] === '01') $tipo = 'FACTURA';
        if ($venta['tipo_comprobante'] === '07') $tipo = 'NOTA DE CREDITO';
        if ($venta['tipo_comprobante'] === '08') $tipo = 'NOTA DE DEBITO';
        if ($venta['tipo_comprobante'] === '00') $tipo = 'NOTA DE VENTA';
        $numero_doc = $venta['serie'] . '-' . str_pad($venta['correlativo'], 8, '0', STR_PAD_LEFT);
        $tipo_doc_cli = ($venta['cliente_tipo_doc'] === '6' || strtolower($venta['cliente_tipo_doc']) === 'ruc') ? 'RUC' : 'DNI';

        $pdf = new FPDF('P', 'mm', 'A4');
        $pdf->SetMargins(13, 13, 13);
        $pdf->SetAutoPageBreak(false);
        $pdf->AddPage();

        // ================================================================
        // CABECERA: Logo | Nombre empresa | Cuadro RUC/Tipo/Numero
        // ================================================================
        $Y_HEADER = 10;
        $logo = __DIR__ . '/../../storage/logo.png';
        if (file_exists($logo)) {
            $pdf->Image($logo, 13, $Y_HEADER, 38, 22);
        } else {
            $pdf->SetXY(13, $Y_HEADER);
            $pdf->SetFont('Helvetica', 'B', 12);
            $pdf->Cell(38, 22, utf8_decode($empresa['nombre_comercial']), 1, 0, 'C');
        }

        // Centro: razon social + direccion
        $pdf->SetXY(55, $Y_HEADER);
        $pdf->SetFont('Helvetica', 'B', 13);
        $pdf->Cell(95, 7, utf8_decode($empresa['razon_social']), 0, 2, 'C');
        $pdf->SetX(55);
        $pdf->SetFont('Helvetica', '', 7.5);
        $pdf->MultiCell(95, 4, utf8_decode($empresa['domicilio_fiscal']), 0, 'C');

        // Derecha: cuadro con RUC, tipo, numero
        $bx = 154; $by = $Y_HEADER; $bw = 46;
        $pdf->SetXY($bx, $by);
        $pdf->SetFont('Helvetica', 'B', 9);
        $pdf->Cell($bw, 8, 'R.U.C. N' . chr(176) . ' ' . $empresa['ruc'], 'LTR', 2, 'C');
        $pdf->SetX($bx);
        $pdf->SetFont('Helvetica', 'B', 8);
        $pdf->Cell($bw, 7, utf8_decode($tipo . ' ELECTRONICA'), 'LR', 2, 'C');
        $pdf->SetX($bx);
        $pdf->SetFont('Helvetica', 'B', 10);
        $pdf->Cell($bw, 8, 'N' . chr(176) . ' ' . $numero_doc, 'LBR', 0, 'C');

        // Separador horizontal
        $pdf->SetXY(13, $Y_HEADER + 26);
        $pdf->SetDrawColor(180, 180, 180);
        $pdf->Line(13, $Y_HEADER + 26, 197, $Y_HEADER + 26);
        $pdf->SetDrawColor(0, 0, 0);

        // ================================================================
        // DATOS DEL CLIENTE (tabla compacta)
        // ================================================================
        $pdf->SetXY(13, $Y_HEADER + 29);
        $lbl = 27; // ancho columna etiqueta
        $val_full = 157; // ancho valor (full width)

        $rows_cli = [
            [$tipo_doc_cli . ':', $venta['cliente_documento'] ?? '-'],
            ['Nombres:', utf8_decode($venta['cliente_nombre'] ?? 'VARIOS')],
            [utf8_decode('Dirección:'), utf8_decode($venta['cliente_direccion'] ?? '-')],
        ];

        $pdf->SetFont('Helvetica', '', 8);
        foreach ($rows_cli as $i => $row) {
            $border_top    = ($i === 0) ? 'LTR' : 'LR';
            $pdf->SetFont('Helvetica', 'B', 8);
            $pdf->Cell($lbl, 5.5, $row[0], $border_top, 0, 'L');
            $pdf->SetFont('Helvetica', '', 8);
            $pdf->Cell($val_full, 5.5, $row[1], ($i === 0 ? 'TR' : 'R'), 1, 'L');
        }

        // Fila fecha / moneda / pago / modo de pago
        $pdf->SetFont('Helvetica', 'B', 8);
        $pdf->Cell(25, 5.5, 'Fecha:', 'LBR', 0, 'L');
        $pdf->SetFont('Helvetica', '', 8);
        $pdf->Cell(27, 5.5, $venta['fecha_emision'] ?? '-', 'BR', 0, 'L');
        $pdf->SetFont('Helvetica', 'B', 8);
        $pdf->Cell(16, 5.5, 'Moneda:', 'BR', 0, 'L');
        $pdf->SetFont('Helvetica', '', 8);
        $pdf->Cell(15, 5.5, $venta['moneda'] ?? 'PEN', 'BR', 0, 'L');
        $pdf->SetFont('Helvetica', 'B', 8);
        $pdf->Cell(12, 5.5, 'Pago:', 'BR', 0, 'L');
        $pdf->SetFont('Helvetica', '', 8);
        $pdf->Cell(22, 5.5, utf8_decode($venta['condicion_pago'] ?? 'CONTADO'), 'BR', 0, 'L');
        $pdf->SetFont('Helvetica', 'B', 8);
        $pdf->Cell(20, 5.5, 'Modo de Pago:', 'BR', 0, 'L');
        $pdf->SetFont('Helvetica', '', 8);
        $pdf->Cell(47, 5.5, utf8_decode($venta['metodo_pago'] ?? 'EFECTIVO'), 'BR', 1, 'L');

        $pdf->Ln(4);

        // ================================================================
        // TABLA DE PRODUCTOS
        // Col widths: ITEM=8, DESCRIPCION=81, UND=13, CANT=14, V.UNIT=20, P.UNIT=20, VALOR=28
        // Total = 8+81+13+14+20+20+28 = 184 (redondeado al ancho real)
        // ================================================================
        $c = [8, 81, 13, 14, 20, 20, 28];
        $cols_offset = [];
        $acc = 0;
        foreach ($c as $w) { $cols_offset[] = $acc; $acc += $w; }

        $pdf->SetFillColor(210, 210, 210);
        $pdf->SetFont('Helvetica', 'B', 8);
        $h_header = 6;
        $pdf->Cell($c[0], $h_header, 'ITEM', 1, 0, 'C', true);
        $pdf->Cell($c[1], $h_header, 'PRODUCTO', 1, 0, 'C', true);
        $pdf->Cell($c[2], $h_header, 'UND.', 1, 0, 'C', true);
        $pdf->Cell($c[3], $h_header, 'CANT.', 1, 0, 'C', true);
        $pdf->Cell($c[4], $h_header, 'V. UNIT', 1, 0, 'C', true);
        $pdf->Cell($c[5], $h_header, 'P. UNIT', 1, 0, 'C', true);
        $pdf->Cell($c[6], $h_header, 'Valor Venta', 1, 1, 'C', true);

        $pdf->SetFont('Helvetica', '', 8);
        $total_descuentos = 0;
        $row_num = 0;

        foreach ($detalles as $det) {
            $row_num++;
            $desc    = utf8_decode($det['descripcion'] ?? 'Producto');
            $cant    = (float) ($det['cantidad'] ?? 0);
            $pu      = (float) ($det['precio_unitario'] ?? 0);
            $vu      = (float) ($det['valor_unitario'] ?? ($pu / 1.18));
            $dscto   = (float) ($det['descuento_unitario'] ?? 0);
            $total_l = $cant * ($pu - $dscto);
            $total_descuentos += $dscto * $cant;

            // Altura dinámica basada en longitud descripción
            $lineas = max(1, ceil(mb_strlen($det['descripcion'] ?? '') / 52));
            $rh = 5.5 * $lineas;

            // Color de fila alternado
            if ($row_num % 2 === 0) {
                $pdf->SetFillColor(245, 247, 250);
            } else {
                $pdf->SetFillColor(255, 255, 255);
            }

            $x = $pdf->GetX(); $y = $pdf->GetY();

            // Dibujar celdas con borde y fondo
            foreach ($c as $i => $w) {
                $pdf->Rect($x + $cols_offset[$i], $y, $w, $rh, 'DF');
            }

            // Contenido de cada celda
            $pdf->SetXY($x, $y);
            $pdf->Cell($c[0], $rh, $row_num, 0, 0, 'C');

            $pdf->SetXY($x + $cols_offset[1], $y);
            $pdf->MultiCell($c[1], 5.5, $desc, 0, 'L');

            $pdf->SetXY($x + $cols_offset[2], $y);
            $pdf->Cell($c[2], $rh, utf8_decode($det['unidad_medida'] ?? 'NIU'), 0, 0, 'C');

            $pdf->SetXY($x + $cols_offset[3], $y);
            $pdf->Cell($c[3], $rh, number_format($cant, 2), 0, 0, 'C');

            $pdf->SetXY($x + $cols_offset[4], $y);
            $pdf->Cell($c[4], $rh, number_format($vu, 2), 0, 0, 'R');

            $pdf->SetXY($x + $cols_offset[5], $y);
            $pdf->Cell($c[5], $rh, number_format($pu, 2), 0, 0, 'R');

            $pdf->SetXY($x + $cols_offset[6], $y);
            $pdf->Cell($c[6], $rh, number_format($total_l, 2), 0, 1, 'R');

            $pdf->SetY($y + $rh);
        }

        $pdf->Ln(5);

        // ================================================================
        // BLOQUE DE TOTALES (derecha) - siempre muestra los 5 campos
        // ================================================================
        $lbl_w = 35;
        $val_w = 24;
        $x_tot = 184 - $lbl_w - $val_w + 13; // empuja a la derecha

        $totales = [
            ['OP. Gravada',  number_format((float)($venta['op_gravada'] ?? 0),  2)],
            ['I.G.V.',       number_format((float)($venta['igv'] ?? 0),          2)],
            ['Op. Inafecta', number_format((float)($venta['op_inafecta'] ?? 0), 2)],
            ['Op.',          number_format((float)($venta['op_exonerada'] ?? 0),2)],
            ['Op. Gratuita', number_format((float)($venta['op_gratuita'] ?? 0), 2)],
        ];

        $pdf->SetFont('Helvetica', '', 8.5);
        foreach ($totales as $t) {
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
        $pdf->Cell($val_w, 6, number_format((float)$venta['importe_total'], 2) . ' S/', 1, 1, 'R');

        $pdf->Ln(4);

        // Monto en letras
        $pdf->SetFont('Helvetica', 'B', 8.5);
        $pdf->MultiCell(184, 5, utf8_decode($totalLetras));
        $pdf->Ln(5);

        // ================================================================
        // QR + REPRESENTACION IMPRESA + PIE
        // ================================================================
        $qr_path = $this->generarQR($venta, $empresa, $nombre);
        $y_pie = $pdf->GetY();

        if ($qr_path && file_exists($qr_path)) {
            $pdf->Image($qr_path, 13, $y_pie, 28, 28);
            $pdf->SetXY(45, $y_pie + 2);
            $pdf->SetFont('Helvetica', '', 7.5);
            $pdf->MultiCell(139, 4.2, utf8_decode(
                'Representacion impresa de la ' . $tipo . ' ELECTRONICA' . "\n" .
                'Autorizada mediante Resolucion de SUNAT' . "\n" .
                'Consulte el documento en nubefact.com/pe (o sitio oficial)' . "\n" .
                'Estado SUNAT: ' . ($venta['estado_sunat'] ?? 'PENDIENTE')
            ));
            $pdf->SetY($y_pie + 31);
        }

        // Pie: usuario | fecha/hora
        $pdf->SetFont('Helvetica', '', 7);
        $now = date('d/m/Y H:i A');
        $pdf->Cell(92, 5, utf8_decode('USUARIO: ' . $vendedor_nombre), 0, 0, 'L');
        $pdf->Cell(92, 5, $now, 0, 1, 'R');

        // Guardar
        $pdf_dir = __DIR__ . '/../../storage/files/pdf';
        if (!is_dir($pdf_dir)) mkdir($pdf_dir, 0777, true);
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
