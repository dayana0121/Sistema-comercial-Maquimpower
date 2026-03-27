<?php
/**
 * Conexión a Supabase - Antigravity Backend
 * Maneja las peticiones cURL a la API REST de Supabase (PostgREST y Auth)
 */

// Credenciales (Idealmente deberían venir de variables de entorno o constants.php)
if (!defined('SUPABASE_URL')) {
    define('SUPABASE_URL', 'https://fymzawbqlkwvkzfxnjtb.supabase.co');
}
if (!defined('SUPABASE_SERVICE_ROLE_KEY')) {
    define('SUPABASE_SERVICE_ROLE_KEY', 'sb_publishable_XmPNmFJ0O2ftxUHsCEZ9gg_4pSQZFVU'); // Usar con precaución
}
if (!defined('SUPABASE_ANON_KEY')) {
    define('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5bXphd2JxbGt3dmt6ZnhuanRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDkxOTYsImV4cCI6MjA4NjQ4NTE5Nn0.VFMls3W2Wzfgc4nxJ57TEzQTsCA6WYrvvdT7XW8TvFM');
}

/**
 * Función helper para hacer peticiones a Supabase via cURL
 *
 * @param string $method Método HTTP (GET, POST, PATCH, DELETE)
 * @param string $endpoint Ruta del endpoint (ej. '/rest/v1/ventas' o '/auth/v1/user')
 * @param array|null $body Payload para POST/PATCH/PUT
 * @param array $extraHeaders Cabeceras adicionales (ej. para inyectar token de usuario)
 * @return array|false Respuesta decodificada de JSON
 */
function supabase_request(string $method, string $endpoint, ?array $body = null, array $extraHeaders = [])
{
    $url = rtrim(SUPABASE_URL, '/') . $endpoint;

    $ch = curl_init($url);

    // Headers base requeridos por Supabase
    $headers = [
        "apikey: " . SUPABASE_SERVICE_ROLE_KEY,
        "Authorization: Bearer " . SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type: application/json",
        "Prefer: return=representation" // Para que POST/PATCH devuelvan el registro modificado
    ];

    // Añadir headers extra. Si se pasa formato ["Key" => "Value"], transformarlo a "Key: Value"
    if (!empty($extraHeaders)) {
        $cleanExtraHeaders = [];
        foreach ($extraHeaders as $k => $v) {
            if (is_numeric($k))
                $cleanExtraHeaders[] = $v;
            else
                $cleanExtraHeaders[] = "$k: $v";
        }
        // Sobreescribir Authorization si viene en $extraHeaders
        $isAuthOverridden = false;
        foreach ($cleanExtraHeaders as $eh) {
            if (stripos($eh, 'Authorization:') === 0)
                $isAuthOverridden = true;
        }

        if ($isAuthOverridden) {
            // Eliminar el Authorization por defecto de Service Role
            $headers = array_filter($headers, function ($h) {
                return stripos($h, 'Authorization:') !== 0;
            });
        }
        $headers = array_merge($headers, $cleanExtraHeaders);
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    // Configurar método HTTP y cuerpo
    switch (strtoupper($method)) {
        case 'POST':
            curl_setopt($ch, CURLOPT_POST, true);
            if ($body)
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
            break;
        case 'PATCH':
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
            if ($body)
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
            break;
        case 'DELETE':
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
            break;
        case 'GET':
        default:
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
            break;
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        throw new Exception("cURL Error: " . $error);
    }

    $decodedResponse = json_decode($response, true);

    // Si el HTTP status no es 2xx, lanzar excepción o dejar que el llamador lo maneje
    // Lo retornamos como un array, pero adjuntando el código para evaluación
    if (!is_array($decodedResponse)) {
        $decodedResponse = ['error' => 'No JSON response', 'raw' => $response];
    }

    return $decodedResponse;
}

/*
 * EJEMPLOS DE USO:
 * 
 * 1. GET (Obtener un cliente)
 * $cliente = supabase_request('GET', '/rest/v1/clientes?id=eq.123&select=*');
 * 
 * 2. POST (Crear una venta)
 * $nuevaVenta = supabase_request('POST', '/rest/v1/ventas', [
 *     'tipo_comprobante' => '01',
 *     'serie' => 'F001',
 *     'cliente_id' => 'uuid-del-cliente',
 *     'op_gravada' => 100.00,
 *     'igv' => 18.00
 * ]);
 * 
 * 3. PATCH (Actualizar estado a ENVIADO)
 * $actualizada = supabase_request('PATCH', '/rest/v1/ventas?id=eq.uuid-de-venta', [
 *     'estado_sunat' => 'ACEPTADO',
 *     'cdr_sunat' => '...'
 * ]);
 */
