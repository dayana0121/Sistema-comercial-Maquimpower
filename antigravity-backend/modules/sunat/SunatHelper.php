<?php
/**
 * SunatHelper.php — Maquimpower v1.0
 */

class SunatHelper
{
    private string $basePath;
    private array $resultado = [];

    public function __construct()
    {
        $this->basePath = __DIR__ . '/lib/files/facturacion_electronica/';
        require_once __DIR__ . '/lib/libraries/libraries/efactura.php';
        require_once __DIR__ . '/lib/libraries/libraries/Variables_diversas_model.php';
        require_once __DIR__ . '/lib/libraries/libraries/Numletras.php';
        require_once __DIR__ . '/sunat_functions.php';
    }

    public function procesarFactura($venta, $detalles, $cliente)
    {
        $this->resultado = ['xml_firmado' => null, 'cdr_response' => null, 'codigo_sunat' => null, 'mensaje_sunat' => null];

        try {
            $datos = $this->_mapearDatosVenta($venta, $detalles, $cliente);
            $nombre_archivo = $datos['empresa']['ruc'] . '-' . $datos['venta']['tipo_documento_codigo'] . '-' . $datos['venta']['serie'] . '-' . $datos['venta']['numero'];

            // 1. Crear XML
            $rutaXML = $this->basePath . "XML/" . $nombre_archivo . ".xml";
            crear_xml($rutaXML, $datos['empresa'], $datos['cliente'], $datos['venta'], $datos['detalle']);

            // 2. Firmar XML
            $dom = new DOMDocument();
            if (!$dom->load($rutaXML))
                throw new Exception("Error al cargar XML generado para firmar.");

            $factura = new Factura();
            $domFirmado = $factura->firmar($dom, $datos['empresa']['ruc'], 0);

            $rutaFirma = $this->basePath . "FIRMA/" . $nombre_archivo . ".xml";
            $domFirmado->save($rutaFirma);
            $this->resultado['xml_firmado'] = $rutaFirma;

            // 3. Enviar a SUNAT
            $cdr_raw = ws_sunat($datos['empresa'], $nombre_archivo);
            $this->_parsearRespuesta($cdr_raw);

            return ['success' => $this->resultado['codigo_sunat'] == '0'];

        } catch (Exception $e) {
            $this->resultado['mensaje_sunat'] = $e->getMessage();
            return ['success' => false];
        }
    }

    private function _mapearDatosVenta($venta, $detalles, $cliente)
    {
        return [
            'empresa' => [
                'ruc' => getenv('EMPRESA_RUC'),
                'razon_social' => getenv('EMPRESA_RAZON_SOCIAL'),
                'ubigeo' => getenv('EMPRESA_UBIGEO'),
                'provincia' => getenv('EMPRESA_PROVINCIA'),
                'departamento' => getenv('EMPRESA_DEPARTAMENTO'),
                'distrito' => getenv('EMPRESA_DISTRITO'),
                'domicilio_fiscal' => getenv('EMPRESA_DIRECCION'),
                'nombre_comercial' => getenv('EMPRESA_RAZON_SOCIAL')
            ],
            'cliente' => [
                'codigo_tipo_entidad' => $cliente['tipo_documento'],
                'numero_documento' => $cliente['numero_documento'],
                'razon_social_nombres' => $cliente['nombre_razon_social']
            ],
            'venta' => [
                'tipo_documento_codigo' => $venta['tipo_comprobante'],
                'serie' => $venta['serie'],
                'numero' => $venta['correlativo'],
                'fecha_emision' => $venta['fecha_emision'],
                'hora_emision' => date('H:i:s'),
                'total_gravada' => (float) $venta['op_gravada'],
                'total_igv' => (float) $venta['igv'],
                'total_a_pagar' => (float) $venta['importe_total'],
                'detraccion_codigo' => $venta['detraccion_codigo'] ?? null,
                'detraccion_porcentaje' => (float) ($venta['detraccion_porcentaje'] ?? 0),
                'detraccion_monto' => (float) ($venta['detraccion_monto'] ?? 0),
                'detraccion_cuenta' => $venta['detraccion_cuenta'] ?? '',
                'detraccion_medio_pago' => $venta['detraccion_medio_pago'] ?? ''
            ],
            'detalle' => array_map(function ($d) {
                return [
                    'producto' => $d['producto_nombre'] ?? $d['descripcion'],
                    'cantidad' => (float) $d['cantidad'],
                    'precio' => (float) $d['precio_unitario'],
                    'precio_base' => (float) ($d['valor_unitario'] ?? ($d['precio_unitario'] / 1.18)),
                    'tipo_igv_codigo' => '10',
                    'codigo_producto' => $d['producto_codigo'] ?? $d['codigo_producto'] ?? '000',
                    'codigo_sunat' => $d['unidad_medida'] ?? 'NIU'
                ];
            }, $detalles)
        ];
    }

    private function _parsearRespuesta($raw)
    {
        $info = json_decode($raw, true);
        if ($info) {
            $this->resultado['codigo_sunat'] = ($info['error_existe'] == 0) ? '0' : '9999';
            $this->resultado['mensaje_sunat'] = $info['message'] ?? $info['error_mensaje'];
            $this->resultado['cdr_response'] = $raw;
        } else {
            $this->resultado['codigo_sunat'] = '9999';
            // ✅ Capturamos los primeros 100 caracteres de la respuesta cruda para ver el error real
            $error_limpio = strip_tags($raw);
            $this->resultado['mensaje_sunat'] = "Respuesta inválida: " . substr($error_limpio, 0, 150);
            $this->resultado['cdr_response'] = $raw;
        }
    }

    public function getUltimoResultado()
    {
        return $this->resultado;
    }
}