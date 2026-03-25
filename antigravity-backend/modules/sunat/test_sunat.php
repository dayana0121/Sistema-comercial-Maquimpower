<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

$libBase = __DIR__ . '/lib/';
$base = $libBase . 'libraries/libraries/';

require_once $base . 'Variables_diversas_model.php';
require_once $base . 'efactura.php';
require_once $base . 'Numletras.php';
require_once __DIR__ . '/../../config/env.php';

$rucEmpresa = env('EMPRESA_RUC');
$rucUsuario = env('SUNAT_SOL_USER');
$clave = env('SUNAT_SOL_PASS');

// ── PASO 1: Generar XML ───────────────────────────────────────────────────────
echo "<h3>Paso 1 — Generando XML...</h3>";
chdir($libBase);
require_once $libBase . 'xml.php';

$empresa = [
    'ruc' => $rucEmpresa,
    'razon_social' => env('EMPRESA_RAZON_SOCIAL'),
    'nombre_comercial' => env('EMPRESA_RAZON_SOCIAL'),
    'ubigeo' => '150101',
    'provincia' => 'LIMA',
    'departamento' => 'LIMA',
    'distrito' => 'LIMA',
    'domicilio_fiscal' => env('EMPRESA_DIRECCION'),
    'modo' => 0,
];
$cliente = [
    'codigo_tipo_entidad' => '6',
    'numero_documento' => '20123456789',
    'razon_social_nombres' => 'CLIENTE PRUEBA SAC',
];
$venta = [
    'tipo_documento_codigo' => '01',
    'serie' => 'F001',
    'numero' => '1',
    'fecha_emision' => date('Y-m-d'),
    'hora_emision' => date('H:i:s'),
    'fecha_vencimiento' => null,
    'total_a_pagar' => 118.00,
    'total_gravada' => 100.00,
    'total_igv' => 18.00,
    'total_exonerada' => null,
    'total_inafecta' => null,
];
$detalle = [
    [
        'producto' => 'PRODUCTO DE PRUEBA',
        'cantidad' => 1,
        'precio' => 118.00,
        'precio_base' => 100.00,
        'tipo_igv_codigo' => 10,
        'codigo_producto' => 'P001',
        'codigo_sunat' => '-',
    ]
];

$NomArch = $rucEmpresa . '-01-F001-1';
$rutaXML = $libBase . 'files/facturacion_electronica/XML/';
$rutaFirma = $libBase . 'files/facturacion_electronica/FIRMA/';
$xmlSinFirma = $rutaXML . $NomArch . '.xml';
$xmlFirmado = $rutaFirma . $NomArch . '.xml';

crear_xml('files/facturacion_electronica/XML/' . $NomArch . '.xml', $empresa, $cliente, $venta, $detalle);
echo file_exists($xmlSinFirma) ? "✅ XML generado<br>" : "❌ XML no se generó<br>";

// ── PASO 2: Firmar XML ────────────────────────────────────────────────────────
echo "<h3>Paso 2 — Firmando XML...</h3>";
if (!is_dir($rutaFirma))
    mkdir($rutaFirma, 0755, true);

$dom = new DOMDocument();
$dom->load($xmlSinFirma);
$factura = new Factura();
$domFirmado = $factura->firmar($dom, $rucEmpresa, 0);
$domFirmado->save($xmlFirmado);
echo file_exists($xmlFirmado) ? "✅ XML firmado<br>" : "❌ Firma falló<br>";

// ── PASO 3: Enviar a SUNAT Beta ───────────────────────────────────────────────
echo "<h3>Paso 3 — Enviando a SUNAT Beta...</h3>";

$wsDir = $libBase . 'ws_sunat/ws_sunat/';
$zipPath = $rutaFirma . $NomArch . '.zip';
$wsdlURL = 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl';

require_once $wsDir . 'lib/pclzip.lib.php';

class feedSoap extends SoapClient
{
    private $XMLStr = "";
    public function setXMLStr($v)
    {
        $this->XMLStr = $v;
    }
    #[\ReturnTypeWillChange]
    public function __doRequest($request, $location, $action, $version, $one_way = 0)
    {
        $dom = new DOMDocument('1.0');
        $dom->loadXML($this->XMLStr);
        return parent::__doRequest($dom->saveXML(), $location, $action, $version, $one_way);
    }
}

try {
    if (file_exists($zipPath))
        unlink($zipPath);
    $zip = new PclZip($zipPath);
    $zip->add($xmlFirmado, PCLZIP_OPT_REMOVE_PATH, $rutaFirma);
    echo file_exists($zipPath) ? "✅ ZIP creado — " . filesize($zipPath) . " bytes<br>" : "❌ ZIP falló<br>";

    $XMLString = '<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
 <soapenv:Header><wsse:Security><wsse:UsernameToken>
     <wsse:Username>' . $rucUsuario . '</wsse:Username>
     <wsse:Password>' . $clave . '</wsse:Password>
 </wsse:UsernameToken></wsse:Security></soapenv:Header>
 <soapenv:Body><ser:sendBill>
    <fileName>' . $NomArch . '.zip</fileName>
    <contentFile>' . base64_encode(file_get_contents($zipPath)) . '</contentFile>
 </ser:sendBill></soapenv:Body>
</soapenv:Envelope>';

    $client = new feedSoap($wsdlURL, ['trace' => true, 'exceptions' => true]);
    $client->setXMLStr($XMLString);
    $result = $client->__call('sendBill', []);

    // Decodificar y leer el CDR
    $cdrZip = $result->applicationResponse;
    $cdrPath = $rutaFirma . 'R-' . $NomArch . '.zip';
    $cdrXml = $rutaFirma . 'R-' . $NomArch . '.xml';

    file_put_contents($cdrPath, $cdrZip);
    echo "✅ CDR ZIP guardado<br>";

    $archive = new PclZip($cdrPath);
    $archive->extract(PCLZIP_OPT_PATH, $rutaFirma);

    if (file_exists($cdrXml)) {
        $library = new SimpleXMLElement($cdrXml, null, true);
        $ns = $library->getDocNamespaces();
        $ext1 = $library->children($ns['cac']);
        $ext2 = $ext1->DocumentResponse;
        $ext3 = $ext2->children($ns['cac']);
        $ext4 = $ext3->children($ns['cbc']);

        $codigo = trim($ext4->ResponseCode);
        $descripcion = trim($ext4->Description);

        echo "<h2 style='color:" . ($codigo === '0' ? 'green' : 'red') . "'>";
        echo "SUNAT Código: $codigo — $descripcion</h2>";
    } else {
        echo "❌ No se pudo extraer el CDR XML<br>";
        // Ver qué hay en el ZIP
        $contents = $archive->listContent();
        echo "<pre>";
        print_r($contents);
        echo "</pre>";
    }

} catch (Throwable $e) {
    echo "❌ Error: " . $e->getMessage() . "<br>";
}