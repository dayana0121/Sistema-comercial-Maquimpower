<?php
require_once __DIR__ . '/../../config/db.php';

class SunatGreHelper {

    private $storage;
    private $certPath;
    private $modo;

    public function __construct() {
        $this->storage  = __DIR__ . '/../../storage/files/guias/';
        $this->certPath = __DIR__ . '/../../storage/cert/';
        $this->modo     = getenv('SUNAT_MODO') === 'produccion' ? 'produccion' : 'prueba';

        // Crear carpetas si no existen
        foreach (['XML','FIRMA','CDR','PDF','QR'] as $dir) {
            if (!is_dir($this->storage . $dir)) {
                mkdir($this->storage . $dir, 0777, true);
            }
        }
    }

    // ═══════════════════════════════════════════════════════
    // PASO 1 — Obtener token OAuth2 de SUNAT GRE
    // ═══════════════════════════════════════════════════════
    public function obtenerToken() {
        $client_id     = getenv('GRE_CLIENT_ID');
        $client_secret = getenv('GRE_CLIENT_SECRET');
        $ruc           = getenv('SUNAT_RUC');
        $usuario       = getenv('GRE_USUARIO_SOL');   // ej: SOLUSER
        $password      = getenv('GRE_PASSWORD_SOL');

        // En beta usar endpoint de nubefact test
        if ($this->modo === 'prueba') {
            $url = 'https://gre-test.nubefact.com/v1/clientessol/test-85e5b0ae-255c-4891-a595-0b98c65c9854/oauth2/token';
        } else {
            $url = 'https://api-seguridad.sunat.gob.pe/v1/clientessol/' . $client_id . '/oauth2/token/';
        }

        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_POSTFIELDS     => http_build_query([
                'grant_type'    => 'password',
                'scope'         => 'https://api-cpe.sunat.gob.pe',
                'client_id'     => $client_id,
                'client_secret' => $client_secret,
                'username'      => $ruc . $usuario,
                'password'      => $password,
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        ]);

        $result   = curl_exec($curl);
        curl_close($curl);
        $response = json_decode($result);

        if (!isset($response->access_token)) {
            error_log('SunatGreHelper::obtenerToken ERROR: ' . $result);
            throw new Exception('No se pudo obtener el token GRE de SUNAT.');
        }
        return $response->access_token;
    }

    // ═══════════════════════════════════════════════════════
    // PASO 2 — Generar XML UBL 2.1 DespatchAdvice
    // ═══════════════════════════════════════════════════════
    public function generarXML($empresa, $guia, $detalles) {
        $fecha = date('Y-m-d');
        $hora  = date('H:i:s');

        $xml = '<?xml version="1.0" encoding="UTF-8"?>
<DespatchAdvice xmlns="urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2"
    xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
    xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
    xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
    xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
    <ext:UBLExtensions>
        <ext:UBLExtension><ext:ExtensionContent></ext:ExtensionContent></ext:UBLExtension>
    </ext:UBLExtensions>
    <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
    <cbc:CustomizationID>2.0</cbc:CustomizationID>
    <cbc:ID>' . $guia['serie'] . '-' . $guia['numero'] . '</cbc:ID>
    <cbc:IssueDate>' . ($guia['fecha_emision'] ?? $fecha) . '</cbc:IssueDate>
    <cbc:IssueTime>' . $hora . '</cbc:IssueTime>
    <cbc:DespatchAdviceTypeCode>09</cbc:DespatchAdviceTypeCode>
    <cac:Signature>
        <cbc:ID>' . $empresa['ruc'] . '</cbc:ID>
        <cac:SignatoryParty>
            <cac:PartyIdentification><cbc:ID>' . $empresa['ruc'] . '</cbc:ID></cac:PartyIdentification>
        </cac:SignatoryParty>
        <cac:DigitalSignatureAttachment>
            <cac:ExternalReference><cbc:URI>' . $empresa['ruc'] . '</cbc:URI></cac:ExternalReference>
        </cac:DigitalSignatureAttachment>
    </cac:Signature>
    <cac:DespatchSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="6" schemeName="Documento de Identidad"
                    schemeAgencyName="PE:SUNAT"
                    schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">' . $empresa['ruc'] . '</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName><cbc:Name><![CDATA[' . $empresa['nombre_comercial'] . ']]></cbc:Name></cac:PartyName>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName><![CDATA[' . $empresa['razon_social'] . ']]></cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:DespatchSupplierParty>
    <cac:DeliveryCustomerParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="6" schemeName="Documento de Identidad"
                    schemeAgencyName="PE:SUNAT"
                    schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">' . $guia['destinatario_ruc'] . '</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName><![CDATA[' . $guia['destinatario_nombre'] . ']]></cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:DeliveryCustomerParty>
    <cac:Shipment>
        <cbc:ID>SUNAT_Envio</cbc:ID>
        <cbc:HandlingCode listAgencyName="PE:SUNAT" listName="Motivo de traslado"
            listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo20">' . $guia['motivo_traslado_codigo'] . '</cbc:HandlingCode>
        <cbc:GrossWeightMeasure unitCode="KGM">' . $guia['peso_total'] . '</cbc:GrossWeightMeasure>
        <cac:ShipmentStage>
            <cbc:ID>1</cbc:ID>
            <cbc:TransportModeCode listAgencyName="PE:SUNAT" listName="Modalidad de traslado"
                listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo18">' . $guia['modalidad_traslado_codigo'] . '</cbc:TransportModeCode>
            <cac:TransitPeriod>
                <cbc:StartDate>' . $guia['fecha_traslado'] . '</cbc:StartDate>
            </cac:TransitPeriod>';

        // Transporte público (modalidad 01)
        if ($guia['modalidad_traslado_codigo'] === '01') {
            $xml .= '<cac:CarrierParty>
                <cac:PartyIdentification>
                    <cbc:ID schemeID="6" schemeName="Documento de Identidad"
                        schemeAgencyName="PE:SUNAT"
                        schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">' . $guia['transportista_ruc'] . '</cbc:ID>
                </cac:PartyIdentification>
                <cac:PartyLegalEntity>
                    <cbc:RegistrationName><![CDATA[' . $guia['transportista_nombre'] . ']]></cbc:RegistrationName>';
            if (!empty($guia['transportista_mtc'])) {
                $xml .= '<cbc:CompanyID>' . $guia['transportista_mtc'] . '</cbc:CompanyID>';
            }
            $xml .= '</cac:PartyLegalEntity></cac:CarrierParty>';
        }

        // Transporte privado (modalidad 02) — chofer y placa
        if ($guia['modalidad_traslado_codigo'] === '02') {
            $xml .= '<cac:DriverPerson>
                <cbc:ID schemeID="1" schemeName="Documento de Identidad"
                    schemeAgencyName="PE:SUNAT"
                    schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">' . $guia['chofer_dni'] . '</cbc:ID>
                <cbc:FirstName>' . $guia['chofer_nombres'] . '</cbc:FirstName>
                <cbc:FamilyName>' . $guia['chofer_apellidos'] . '</cbc:FamilyName>
                <cbc:JobTitle>Principal</cbc:JobTitle>
                <cac:IdentityDocumentReference>
                    <cbc:ID>' . $guia['chofer_licencia'] . '</cbc:ID>
                </cac:IdentityDocumentReference>
            </cac:DriverPerson>';
        }

        $xml .= '</cac:ShipmentStage>
        <cac:Delivery>
            <cac:DeliveryAddress>
                <cbc:ID schemeName="Ubigeos" schemeAgencyName="PE:INEI">' . $guia['llegada_ubigeo'] . '</cbc:ID>
                <cac:AddressLine><cbc:Line>' . $guia['llegada_direccion'] . '</cbc:Line></cac:AddressLine>
            </cac:DeliveryAddress>
            <cac:Despatch>
                <cac:DespatchAddress>
                    <cbc:ID schemeName="Ubigeos" schemeAgencyName="PE:INEI">' . $guia['partida_ubigeo'] . '</cbc:ID>
                    <cac:AddressLine><cbc:Line>' . $guia['partida_direccion'] . '</cbc:Line></cac:AddressLine>
                </cac:DespatchAddress>
            </cac:Despatch>
        </cac:Delivery>';

        // Placa vehículo — solo transporte privado
        if ($guia['modalidad_traslado_codigo'] === '02' && !empty($guia['vehiculo_placa'])) {
            $xml .= '<cac:TransportHandlingUnit>
                <cac:TransportEquipment>
                    <cbc:ID>' . $guia['vehiculo_placa'] . '</cbc:ID>
                </cac:TransportEquipment>
            </cac:TransportHandlingUnit>';
        }

        $xml .= '</cac:Shipment>';

        // Ítems
        $i = 1;
        foreach ($detalles as $det) {
            $xml .= '<cac:DespatchLine>
                <cbc:ID>' . $i . '</cbc:ID>
                <cbc:DeliveredQuantity unitCode="' . ($det['unidad_medida'] ?? 'NIU') . '">' . $det['cantidad'] . '</cbc:DeliveredQuantity>
                <cac:OrderLineReference><cbc:LineID>1</cbc:LineID></cac:OrderLineReference>
                <cac:Item>
                    <cbc:Description>' . htmlspecialchars($det['descripcion']) . '</cbc:Description>
                    <cac:SellersItemIdentification>
                        <cbc:ID>' . ($det['codigo'] ?? '-') . '</cbc:ID>
                    </cac:SellersItemIdentification>
                </cac:Item>
            </cac:DespatchLine>';
            $i++;
        }

        $xml .= '</DespatchAdvice>';
        return $xml;
    }

    // ═══════════════════════════════════════════════════════
    // PASO 3 — Firmar XML con certificado digital
    // ═══════════════════════════════════════════════════════
    public function firmarXML($nombreArchivo) {
        require_once __DIR__ . '/../../../LO QUE COMPRE PARA SUNAT/API_SUNAT_GUIAS/libraries/efactura.php';

        $xmlPath = $this->storage . 'XML/' . $nombreArchivo . '.xml';
        $xmlStr  = file_get_contents($xmlPath);

        $dom = new DOMDocument();
        $dom->loadXML($xmlStr);

        $factura = new Factura();
        $signed  = $factura->firmar($dom, '', $this->modo === 'produccion' ? 1 : 0);
        $content = $signed->saveXML();

        $firmaPath = $this->storage . 'FIRMA/' . $nombreArchivo . '.xml';
        file_put_contents($firmaPath, $content);
        return $firmaPath;
    }

    // ═══════════════════════════════════════════════════════
    // PASO 4 — Comprimir en ZIP y enviar a SUNAT → recibir ticket
    // ═══════════════════════════════════════════════════════
    public function enviarGuia($nombreArchivo, $token) {
        $firmaPath = $this->storage . 'FIRMA/' . $nombreArchivo . '.xml';
        $zipPath   = $this->storage . 'FIRMA/' . $nombreArchivo . '.zip';

        // Crear ZIP
        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
            $zip->addFile($firmaPath, $nombreArchivo . '.xml');
            $zip->close();
        }

        $data = [
            'nomArchivo' => $nombreArchivo . '.zip',
            'arcGreZip'  => base64_encode(file_get_contents($zipPath)),
            'hashZip'    => hash_file('sha256', $zipPath),
        ];

        // Endpoint según modo
        if ($this->modo === 'prueba') {
            $url = 'https://gre-test.nubefact.com/v1/contribuyente/gem/comprobantes/' . $nombreArchivo;
        } else {
            $url = 'https://api-cpe.sunat.gob.pe/v1/contribuyente/gem/comprobantes/' . $nombreArchivo;
        }

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode(['archivo' => $data]),
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
            ],
        ]);

        $response = curl_exec($curl);
        curl_close($curl);
        $result = json_decode($response, true);

        error_log('SunatGreHelper::enviarGuia: ' . $response);
        return $result;
    }

    // ═══════════════════════════════════════════════════════
    // PASO 5 — Consultar ticket y obtener CDR
    // ═══════════════════════════════════════════════════════
    public function consultarTicket($ticket, $token, $ruc, $nombreArchivo) {
        if (empty($ticket)) {
            return ['cdr_ResponseCode' => '99', 'cdr_msj_sunat' => 'Ticket vacío'];
        }

        if ($this->modo === 'prueba') {
            $url = 'https://gre-test.nubefact.com/v1/contribuyente/gem/comprobantes/envios/' . $ticket;
        } else {
            $url = 'https://api-cpe.sunat.gob.pe/v1/contribuyente/gem/comprobantes/envios/' . $ticket;
        }

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'numRucEnvia: ' . $ruc,
                'numTicket: '   . $ticket,
                'Authorization: Bearer ' . $token,
            ],
        ]);

        $response     = curl_exec($curl);
        curl_close($curl);
        $resp         = json_decode($response, true);
        $codRespuesta = $resp['codRespuesta'] ?? '88';

        if ($codRespuesta === '99') {
            return [
                'cdr_ResponseCode' => '99',
                'cdr_msj_sunat'    => $resp['error']['desError'] ?? 'Error SUNAT',
                'numerror'         => $resp['error']['numError'] ?? '',
            ];
        }
        if ($codRespuesta === '98') {
            return ['cdr_ResponseCode' => '98', 'cdr_msj_sunat' => 'Envío en proceso'];
        }
        if ($codRespuesta === '0') {
            $cdrPath = $this->storage . 'CDR/R-' . $nombreArchivo . '.zip';
            file_put_contents($cdrPath, base64_decode($resp['arcCdr']));

            $zip = new ZipArchive();
            if ($zip->open($cdrPath) === true) {
                $zip->extractTo($this->storage . 'CDR/');
                $zip->close();
            }

            $cdrXmlPath = $this->storage . 'CDR/R-' . $nombreArchivo . '.xml';
            if (file_exists($cdrXmlPath)) {
                $doc = new DOMDocument();
                $doc->load($cdrXmlPath);
                return [
                    'cdr_ResponseCode' => $doc->getElementsByTagName('ResponseCode')->item(0)->nodeValue ?? '',
                    'cdr_msj_sunat'    => $doc->getElementsByTagName('Description')->item(0)->nodeValue ?? '',
                    'cdr_hash'         => $doc->getElementsByTagName('DigestValue')->item(0)->nodeValue ?? '',
                    'estado'           => 'ACEPTADO',
                ];
            }
        }
        return ['cdr_ResponseCode' => '88', 'cdr_msj_sunat' => 'SUNAT FUERA DE SERVICIO'];
    }

    // ═══════════════════════════════════════════════════════
    // ORQUESTADOR — Llama los 5 pasos en secuencia
    // ═══════════════════════════════════════════════════════
    public function procesarGuia($guia, $detalles) {
        $empresa = [
            'ruc'             => getenv('SUNAT_RUC'),
            'razon_social'    => getenv('SUNAT_RAZON_SOCIAL'),
            'nombre_comercial'=> getenv('SUNAT_NOMBRE_COMERCIAL'),
            'domicilio_fiscal'=> getenv('SUNAT_DIRECCION'),
        ];

        $nombreArchivo = $empresa['ruc'] . '-09-' . $guia['serie'] . '-' . $guia['numero'];

        try {
            // 1. Token
            $token = $this->obtenerToken();

            // 2. XML
            $xml = $this->generarXML($empresa, $guia, $detalles);
            file_put_contents($this->storage . 'XML/' . $nombreArchivo . '.xml', $xml);

            // 3. Firmar
            $this->firmarXML($nombreArchivo);

            // 4. Enviar → ticket
            $envioResult = $this->enviarGuia($nombreArchivo, $token);
            $ticket      = $envioResult['numTicket'] ?? null;

            if (!$ticket) {
                return [
                    'success'       => false,
                    'estado_sunat'  => 'RECHAZADO',
                    'mensaje_sunat' => $envioResult['error']['desError'] ?? 'Error al enviar a SUNAT',
                ];
            }

            // 5. Consultar CDR (esperar 2 segundos para que SUNAT procese)
            sleep(2);
            $cdr = $this->consultarTicket($ticket, $token, $empresa['ruc'], $nombreArchivo);

            return [
                'success'        => true,
                'estado_sunat'   => $cdr['cdr_ResponseCode'] === '0' ? 'ACEPTADO' : 'PENDIENTE',
                'mensaje_sunat'  => $cdr['cdr_msj_sunat'] ?? '',
                'ticket'         => $ticket,
                'cdr_hash'       => $cdr['cdr_hash'] ?? '',
                'nombre_archivo' => $nombreArchivo,
            ];

        } catch (Exception $e) {
            error_log('SunatGreHelper::procesarGuia ERROR: ' . $e->getMessage());
            return [
                'success'       => false,
                'estado_sunat'  => 'ERROR',
                'mensaje_sunat' => $e->getMessage(),
            ];
        }
    }

    public function getStoragePath($tipo, $nombre) {
        return $this->storage . $tipo . '/' . $nombre;
    }
}
