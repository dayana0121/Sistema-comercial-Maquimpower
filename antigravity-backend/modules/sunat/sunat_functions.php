<?php
/**
 * sunat_functions.php — Maquimpower v1.0
 */

function crear_xml($nombre, $empresa, $cliente, $venta, $detalle)
{
    $xml = desarrollo_xml($empresa, $cliente, $venta, $detalle);
    $archivo = fopen($nombre, "w+");
    if (!$archivo)
        throw new Exception("No se pudo crear el archivo XML en: $nombre");
    // Eliminamos utf8_decode para mantener UTF-8 puro, que es lo que SUNAT prefiere hoy
    fwrite($archivo, $xml);
    fclose($archivo);
}

function desarrollo_xml($empresa, $cliente, $venta, $detalles)
{
    $num = new Numletras();
    $totalVenta = explode(".", number_format($venta['total_a_pagar'], 2, '.', ''));
    $totalLetras = $num->num2letras($totalVenta[0]);
    $venta['total_letras'] = $totalLetras . ' con ' . $totalVenta[1] . '/100 soles';

    $codigo_moneda = 'PEN';
    $linea_inicio = '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">';

    $xml = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' . $linea_inicio;
    $xml .= '<ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions>';
    $xml .= '<cbc:UBLVersionID>2.1</cbc:UBLVersionID>';
    $xml .= '<cbc:CustomizationID>2.0</cbc:CustomizationID>';
    $xml .= '<cbc:ID>' . $venta['serie'] . '-' . $venta['numero'] . '</cbc:ID>';
    $xml .= '<cbc:IssueDate>' . $venta['fecha_emision'] . '</cbc:IssueDate>';
    $xml .= '<cbc:IssueTime>' . $venta['hora_emision'] . '</cbc:IssueTime>';
    $tipo_operacion = ($venta['detraccion_monto'] > 0) ? '1001' : '0101';
    $xml .= '<cbc:InvoiceTypeCode listID="' . $tipo_operacion . '" listAgencyName="PE:SUNAT" listName="Tipo de Documento">' . $venta['tipo_documento_codigo'] . '</cbc:InvoiceTypeCode>';
    $xml .= '<cbc:Note languageLocaleID="1000"><![CDATA[' . $venta['total_letras'] . ']]></cbc:Note>';
    $xml .= '<cbc:DocumentCurrencyCode>' . $codigo_moneda . '</cbc:DocumentCurrencyCode>';

    // ✅ BLOQUE DE FIRMA (Indispensable para que la librería Factura() funcione)
    $xml .= '<cac:Signature>
                <cbc:ID>' . $empresa['ruc'] . '</cbc:ID>
                <cac:SignatoryParty>
                    <cac:PartyIdentification><cbc:ID>' . $empresa['ruc'] . '</cbc:ID></cac:PartyIdentification>
                    <cac:PartyName><cbc:Name><![CDATA[' . $empresa['razon_social'] . ']]></cbc:Name></cac:PartyName>
                </cac:SignatoryParty>
                <cac:DigitalSignatureAttachment>
                    <cac:ExternalReference><cbc:URI>#SIGN-' . $empresa['ruc'] . '</cbc:URI></cac:ExternalReference>
                </cac:DigitalSignatureAttachment>
            </cac:Signature>';

    // Emisor (Empresa)
    $xml .= '<cac:AccountingSupplierParty><cac:Party>';
    $xml .= '<cac:PartyIdentification><cbc:ID schemeID="6">' . $empresa['ruc'] . '</cbc:ID></cac:PartyIdentification>';
    $xml .= '<cac:PartyLegalEntity>';
    $xml .= '<cbc:RegistrationName><![CDATA[' . $empresa['razon_social'] . ']]></cbc:RegistrationName>';
    $xml .= '<cac:RegistrationAddress>';
    $xml .= '<cbc:ID>' . $empresa['ubigeo'] . '</cbc:ID>';
    $xml .= '<cbc:CityName>' . $empresa['provincia'] . '</cbc:CityName>';
    $xml .= '<cbc:CountrySubentity>' . $empresa['departamento'] . '</cbc:CountrySubentity>';
    $xml .= '<cbc:District>' . $empresa['distrito'] . '</cbc:District>';
    $xml .= '<cac:AddressLine><cbc:Line><![CDATA[' . $empresa['domicilio_fiscal'] . ']]></cbc:Line></cac:AddressLine>';
    $xml .= '<cac:Country><cbc:IdentificationCode>PE</cbc:IdentificationCode></cac:Country>';
    $xml .= '</cac:RegistrationAddress></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>';

    // Adquirente (Cliente)
    $xml .= '<cac:AccountingCustomerParty><cac:Party><cac:PartyIdentification>';
    $xml .= '<cbc:ID schemeID="' . $cliente['codigo_tipo_entidad'] . '">' . $cliente['numero_documento'] . '</cbc:ID>';
    $xml .= '</cac:PartyIdentification><cac:PartyLegalEntity>';
    $xml .= '<cbc:RegistrationName><![CDATA[' . $cliente['razon_social_nombres'] . ']]></cbc:RegistrationName>';
    $xml .= '</cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty>';

    if ($venta['detraccion_monto'] > 0) {
        $xml .= '<cac:PaymentMeans>
                    <cbc:ID>Detraccion</cbc:ID>
                    <cbc:PaymentMeansCode>003</cbc:PaymentMeansCode>
                    <cac:PayeeFinancialAccount>
                        <cbc:ID>' . $venta['detraccion_cuenta'] . '</cbc:ID>
                    </cac:PayeeFinancialAccount>
                </cac:PaymentMeans>';
        $xml .= '<cac:PaymentTerms>
                    <cbc:ID>Detraccion</cbc:ID>
                    <cbc:PaymentMeansID>' . $venta['detraccion_codigo'] . '</cbc:PaymentMeansID>
                    <cbc:Amount currencyID="PEN">' . number_format($venta['detraccion_monto'], 2, '.', '') . '</cbc:Amount>
                    <cbc:PaymentPercent>' . number_format($venta['detraccion_porcentaje'], 2, '.', '') . '</cbc:PaymentPercent>
                </cac:PaymentTerms>';
    }

    // Totales y Detalles (Se mantiene igual a tu versión funcional)
    $xml .= '<cac:TaxTotal><cbc:TaxAmount currencyID="PEN">' . number_format($venta['total_igv'], 2, '.', '') . '</cbc:TaxAmount>';
    $xml .= '<cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">' . number_format($venta['total_gravada'], 2, '.', '') . '</cbc:TaxableAmount><cbc:TaxAmount currencyID="PEN">' . number_format($venta['total_igv'], 2, '.', '') . '</cbc:TaxAmount><cac:TaxCategory><cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>';
    $xml .= '<cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="PEN">' . number_format($venta['total_gravada'], 2, '.', '') . '</cbc:LineExtensionAmount><cbc:TaxInclusiveAmount currencyID="PEN">' . number_format($venta['total_a_pagar'], 2, '.', '') . '</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="PEN">' . number_format($venta['total_a_pagar'], 2, '.', '') . '</cbc:PayableAmount></cac:LegalMonetaryTotal>';

    foreach ($detalles as $i => $item) {
        $xml .= '<cac:InvoiceLine>';
        $xml .= '<cbc:ID>' . ($i + 1) . '</cbc:ID>';
        $xml .= '<cbc:InvoicedQuantity unitCode="' . $item['codigo_sunat'] . '">' . number_format($item['cantidad'], 2, '.', '') . '</cbc:InvoicedQuantity>';
        $xml .= '<cbc:LineExtensionAmount currencyID="PEN">' . number_format($item['precio_base'] * $item['cantidad'], 2, '.', '') . '</cbc:LineExtensionAmount>';
        $xml .= '<cac:PricingReference><cac:AlternativeConditionPrice><cbc:PriceAmount currencyID="PEN">' . number_format($item['precio'], 2, '.', '') . '</cbc:PriceAmount><cbc:PriceTypeCode>01</cbc:PriceTypeCode></cac:AlternativeConditionPrice></cac:PricingReference>';
        $xml .= '<cac:TaxTotal><cbc:TaxAmount currencyID="PEN">' . number_format($item['precio'] * $item['cantidad'] - $item['precio_base'] * $item['cantidad'], 2, '.', '') . '</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">' . number_format($item['precio_base'] * $item['cantidad'], 2, '.', '') . '</cbc:TaxableAmount><cbc:TaxAmount currencyID="PEN">' . number_format($item['precio'] * $item['cantidad'] - $item['precio_base'] * $item['cantidad'], 2, '.', '') . '</cbc:TaxAmount><cac:TaxCategory><cbc:Percent>18.00</cbc:Percent><cbc:TaxExemptionReasonCode>' . $item['tipo_igv_codigo'] . '</cbc:TaxExemptionReasonCode><cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>';
        $xml .= '<cac:Item><cbc:Description><![CDATA[' . $item['producto'] . ']]></cbc:Description><cac:SellersItemIdentification><cbc:ID>' . $item['codigo_producto'] . '</cbc:ID></cac:SellersItemIdentification></cac:Item>';
        $xml .= '<cac:Price><cbc:PriceAmount currencyID="PEN">' . number_format($item['precio_base'], 6, '.', '') . '</cbc:PriceAmount></cac:Price>';
        $xml .= '</cac:InvoiceLine>';
    }

    $xml .= '</Invoice>';
    return $xml;
}

function ws_sunat($empresa, $nombre_archivo)
{
    $basePath = __DIR__ . '/lib/files/facturacion_electronica/';
    $xmlFirmado = $basePath . "FIRMA/" . $nombre_archivo . ".xml";
    $zipPath = $basePath . "FIRMA/" . $nombre_archivo . ".zip";

    // 1. Crear el ZIP localmente
    if (file_exists($zipPath))
        unlink($zipPath);
    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::CREATE) === TRUE) {
        $zip->addFile($xmlFirmado, $nombre_archivo . ".xml");
        $zip->close();
    }

    // 2. Preparar el envío SOAP (Beta SUNAT)
    $wsdlURL = 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl';
    $rucUsuario = getenv('SUNAT_SOL_USER');
    $clave = getenv('SUNAT_SOL_PASS');

    $XMLString = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
     <soapenv:Header><wsse:Security><wsse:UsernameToken>
         <wsse:Username>' . $rucUsuario . '</wsse:Username>
         <wsse:Password>' . $clave . '</wsse:Password>
     </wsse:UsernameToken></wsse:Security></soapenv:Header>
     <soapenv:Body><ser:sendBill>
        <fileName>' . $nombre_archivo . '.zip</fileName>
        <contentFile>' . base64_encode(file_get_contents($zipPath)) . '</contentFile>
     </ser:sendBill></soapenv:Body>
    </soapenv:Envelope>';

    $ch = curl_init($wsdlURL);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $XMLString);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: text/xml; charset=utf-8"]);
    $response = curl_exec($ch);
    curl_close($ch);

    return $response;
}