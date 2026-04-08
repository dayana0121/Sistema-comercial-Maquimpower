<?php
// modules/sunat/RucController.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

class RucController
{
    private $db;

    public function __construct()
    {
        $this->db = getDB();
    }

    public function buscar()
    {
        try {
            AuthMiddleware::verificar();
        } catch (Exception $e) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'No autorizado']);
            return;
        }

        $numero = trim($_GET['numero'] ?? '');
        $longitud = strlen($numero);

        try {
            if ($longitud === 11) {
                $data = $this->buscarRuc($numero);
                if (empty($data['razon_social'])) {
                    $mensaje = 'RUC no encontrado.';
                    // Yo explico mejor cuando el servidor no logra salir a internet para consultar APIs externas.
                    if (!empty($data['debug']) && $this->sinConexionExterna($data['debug'])) {
                        $mensaje = 'No se pudo conectar con servicios externos SUNAT desde el servidor.';
                    } elseif (!empty($data['debug'])) {
                        $mensaje = 'RUC no encontrado o error en API externa.';
                    }
                    http_response_code(400);
                    echo json_encode([
                        'success' => false, 
                        'message' => $mensaje,
                        'debug' => $data['debug'] ?? null
                    ]);
                    return;
                }
            } elseif ($longitud === 8) {
                $data = $this->buscarDni($numero);
                if (empty($data['razon_social'])) {
                    $mensaje = 'DNI no encontrado.';
                    if (!empty($data['debug']) && $this->sinConexionExterna($data['debug'])) {
                        $mensaje = 'No se pudo conectar con servicios externos RENIEC/SUNAT desde el servidor.';
                    }
                    http_response_code(400);
                    echo json_encode([
                        'success' => false, 
                        'message' => $mensaje,
                        'debug' => $data['debug'] ?? null
                    ]);
                    return;
                }
            } else {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Ingresa 8 dígitos (DNI) u 11 dígitos (RUC)']);
                return;
            }

            echo json_encode(['success' => true, 'data' => $data]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al consultar el documento: ' . $e->getMessage()]);
        }
    }

    private function buscarRuc($ruc)
    {
        $debug = [];
        // Yo quito token hardcodeado para evitar depender de un secreto expirado/ajeno al entorno.
        $token = getenv('APIS_NET_PE_TOKEN') ?: '';
        
        $default_data = [
            'ruc' => $ruc,
            'razon_social' => '',
            'direccion' => '',
            'departamento' => '',
            'provincia' => '',
            'distrito' => '',
            'fuente' => ''
        ];

        // 1. APIs.net.pe (V2) - Principal
        $headersV2 = ['Accept: application/json'];
        if (!empty($token)) {
            $headersV2[] = 'Authorization: Bearer ' . $token;
        }
        $res = $this->curlRequest("https://api.apis.net.pe/v2/sunat/ruc?numero=$ruc", $headersV2);
        if ($res['status'] === 0) {
            $res = $this->fallbackHttpRequest("https://api.apis.net.pe/v2/sunat/ruc?numero=$ruc", $headersV2);
        }
        $debug['apis_net_pe_v2'] = [
            'status' => $res['status'],
            'error' => $res['error'] ?? null,
            'raw' => substr($res['raw'] ?? '', 0, 140)
        ];
        if ($res['status'] === 200 && !empty($res['data']['razonSocial'] ?? '')) {
            $data = $res['data'];
            return array_merge($default_data, [
                'razon_social' => $data['razonSocial'] ?? '',
                'direccion' => $data['direccion'] ?? '',
                'departamento' => $data['departamento'] ?? '',
                'provincia' => $data['provincia'] ?? '',
                'distrito' => $data['distrito'] ?? '',
                'fuente' => 'apis.net.pe (V2)'
            ]);
        }

        // 2. APIs.net.pe (V1) - Fallback Potente (A veces funciona sin token)
        $headersV1 = ['Accept: application/json'];
        if (!empty($token)) {
            $headersV1[] = 'Authorization: Bearer ' . $token;
        }
        $resV1 = $this->curlRequest("https://api.apis.net.pe/v1/ruc?numero=$ruc", $headersV1);
        if ($resV1['status'] === 0) {
            $resV1 = $this->fallbackHttpRequest("https://api.apis.net.pe/v1/ruc?numero=$ruc", $headersV1);
        }
        $debug['apis_net_pe_v1'] = [
            'status' => $resV1['status'],
            'error' => $resV1['error'] ?? null,
            'raw' => substr($resV1['raw'] ?? '', 0, 140)
        ];
        if ($resV1['status'] === 200 && !empty($resV1['data']['nombre'] ?? '')) {
            $data = $resV1['data'];
            return array_merge($default_data, [
                'razon_social' => $data['nombre'] ?? '',
                'direccion' => $data['direccion'] ?? '',
                'departamento' => $data['departamento'] ?? '',
                'provincia' => $data['provincia'] ?? '',
                'distrito' => $data['distrito'] ?? '',
                'fuente' => 'apis.net.pe (V1)'
            ]);
        }

        // 3. ConsultaRUC.win
        $res2 = $this->curlRequest("https://consultaruc.win/api/ruc/$ruc");
        if ($res2['status'] === 0) {
            $res2 = $this->fallbackHttpRequest("https://consultaruc.win/api/ruc/$ruc");
        }
        $debug['consultaruc_win'] = [
            'status' => $res2['status'],
            'error' => $res2['error'] ?? null,
            'raw' => substr($res2['raw'] ?? '', 0, 140)
        ];
        $data2 = $res2['data']['result'] ?? $res2['data'] ?? [];
        if ($res2['status'] === 200 && !empty($data2['razon_social'] ?? $data2['razonSocial'] ?? '')) {
            return array_merge($default_data, [
                'razon_social' => $data2['razon_social'] ?? $data2['razonSocial'] ?? '',
                'direccion' => $data2['direccion'] ?? '',
                'departamento' => $data2['departamento'] ?? '',
                'provincia' => $data2['provincia'] ?? '',
                'distrito' => $data2['distrito'] ?? '',
                'fuente' => 'consultaruc.win'
            ]);
        }

        // 4. Local DB
        try {
            $stmt = $this->db->prepare("SELECT * FROM clientes WHERE numero_documento = :ruc AND activo = 1 LIMIT 1");
            $stmt->execute([':ruc' => $ruc]);
            $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($cliente) {
                return array_merge($default_data, [
                    'razon_social' => $cliente['razon_social'] ?? '',
                    'direccion' => $cliente['direccion_fiscal'] ?? '',
                    'departamento' => $cliente['departamento'] ?? '',
                    'provincia' => $cliente['provincia'] ?? '',
                    'distrito' => $cliente['distrito'] ?? '',
                    'fuente' => 'LOCAL_DB'
                ]);
            }
        } catch (Exception $e) { $debug['local_db_error'] = $e->getMessage(); }

        return array_merge($default_data, ['debug' => $debug]);
    }

    private function buscarDni($dni)
    {
        $debug = [];
        // Yo quito token hardcodeado para evitar depender de un secreto expirado/ajeno al entorno.
        $token = getenv('APIS_NET_PE_TOKEN') ?: '';
        $default_data = ['dni' => $dni, 'razon_social' => '', 'direccion' => '', 'ubigeo' => '', 'fuente' => ''];

        // 1. APIs.net.pe (V2 DNI)
        $headersV2 = ['Accept: application/json'];
        if (!empty($token)) {
            $headersV2[] = 'Authorization: Bearer ' . $token;
        }
        $res = $this->curlRequest("https://api.apis.net.pe/v2/reniec/dni?numero=$dni", $headersV2);
        if ($res['status'] === 0) {
            $res = $this->fallbackHttpRequest("https://api.apis.net.pe/v2/reniec/dni?numero=$dni", $headersV2);
        }
        $debug['apis_net_pe_v2_dni'] = [
            'status' => $res['status'],
            'error' => $res['error'] ?? null,
            'raw' => substr($res['raw'] ?? '', 0, 140)
        ];
        if ($res['status'] === 200 && !empty($res['data']['nombres'] ?? '')) {
            $data = $res['data'];
            $nombre_completo = trim($data['nombres'] . ' ' . $data['apellidoPaterno'] . ' ' . $data['apellidoMaterno']);
            return array_merge($default_data, [
                'razon_social' => $nombre_completo, 'direccion' => $data['direccion'] ?? '',
                'ubigeo' => $data['ubigeo'] ?? '', 'fuente' => 'apis.net.pe (V2)'
            ]);
        }

        // 2. APIs.net.pe (V1 DNI) - Fallback
        $headersV1 = ['Accept: application/json'];
        if (!empty($token)) {
            $headersV1[] = 'Authorization: Bearer ' . $token;
        }
        $resV1 = $this->curlRequest("https://api.apis.net.pe/v1/dni?numero=$dni", $headersV1);
        if ($resV1['status'] === 0) {
            $resV1 = $this->fallbackHttpRequest("https://api.apis.net.pe/v1/dni?numero=$dni", $headersV1);
        }
        $debug['apis_net_pe_v1_dni'] = [
            'status' => $resV1['status'],
            'error' => $resV1['error'] ?? null,
            'raw' => substr($resV1['raw'] ?? '', 0, 140)
        ];
        if ($resV1['status'] === 200 && !empty($resV1['data']['nombre'] ?? '')) {
            return array_merge($default_data, [
                'razon_social' => $resV1['data']['nombre'], 'ubigeo' => $resV1['data']['ubigeo'] ?? '',
                'fuente' => 'apis.net.pe (V1)'
            ]);
        }

        // 3. Eldni.com Fallback (Scraping)
        $resEldni = $this->buscarEldni($dni);
        if (!empty($resEldni['razon_social'])) {
            return $resEldni;
        }

        // 4. Local DB Fallback (Igual que RUC)
        try {
            $stmt = $this->db->prepare("SELECT razon_social, direccion_fiscal as direccion, ubigeo FROM clientes WHERE numero_documento = :dni AND activo = 1 LIMIT 1");
            $stmt->execute([':dni' => $dni]);
            $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($cliente) {
                return array_merge($default_data, [
                    'razon_social' => $cliente['razon_social'],
                    'direccion' => $cliente['direccion'] ?? '',
                    'ubigeo' => $cliente['ubigeo'] ?? '',
                    'fuente' => 'LOCAL_DB'
                ]);
            }
        } catch (Exception $e) { $debug['local_db_error'] = $e->getMessage(); }

        return array_merge($default_data, ['debug' => $debug]);
    }

    private function buscarEldni($dni)
    {
        $url = "https://eldni.com/pe/buscar-datos-por-dni";
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => "dni=$dni",
            CURLOPT_HTTPHEADER => ["Content-Type: application/x-www-form-urlencoded"],
            CURLOPT_TIMEOUT => 8,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_FOLLOWLOCATION => true
        ]);
        $html = curl_exec($ch);
        curl_close($ch);

        if (!$html) return ['razon_social' => ''];

        // Scrape simple usando Regex para Nombres y Apellidos
        // El sitio suele mostrar: <td>NOMBRES</td><td>APELLIDO PATERNO</td><td>APELLIDO MATERNO</td>
        // O en campos de "Copiar": <input value="NOMBRE COMPLETO" ...>
        
        $nombres = "";
        $paterno = "";
        $materno = "";

        if (preg_match('/<input[^>]+id="nombres"[^>]+value="([^"]+)"/i', $html, $m)) $nombres = trim($m[1]);
        if (preg_match('/<input[^>]+id="apellido_paterno"[^>]+value="([^"]+)"/i', $html, $m)) $paterno = trim($m[1]);
        if (preg_match('/<input[^>]+id="apellido_materno"[^>]+value="([^"]+)"/i', $html, $m)) $materno = trim($m[1]);

        if ($nombres || $paterno || $materno) {
            return [
                'dni' => $dni,
                'razon_social' => trim("$nombres $paterno $materno"),
                'fuente' => 'eldni.com (Scraping)'
            ];
        }

        return ['razon_social' => ''];
    }

    private function curlRequest($url, $headers = [])
    {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_USERAGENT => 'Maquimpower-RUC-Client/1.0',
            CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
            CURLOPT_HTTPHEADER => $headers
        ]);
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        $errno = curl_errno($ch);
        curl_close($ch);

        $data = json_decode($response, true);
        return [
            'status' => $status,
            'data' => $data,
            'raw' => $response,
            'error' => $error,
            'errno' => $errno
        ];
    }

    private function fallbackHttpRequest($url, $headers = [])
    {
        // Yo agrego fallback sin cURL porque en algunos servidores cURL falla pero stream HTTP sí funciona.
        $headersText = implode("\r\n", $headers);
        $ctx = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 12,
                'ignore_errors' => true,
                'header' => $headersText . "\r\nUser-Agent: Maquimpower-RUC-Client/1.0\r\n",
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
            ],
        ]);

        $raw = @file_get_contents($url, false, $ctx);
        $status = 0;
        $error = null;

        if (!empty($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
            $status = (int)$m[1];
        }
        if ($raw === false) {
            $error = error_get_last()['message'] ?? 'HTTP fallback failed';
            $raw = '';
        }

        return [
            'status' => $status,
            'data' => json_decode($raw, true),
            'raw' => $raw,
            'error' => $error,
            'errno' => null
        ];
    }

    private function sinConexionExterna(array $debug): bool
    {
        $intentos = 0;
        $sinConexion = 0;
        foreach ($debug as $item) {
            if (!is_array($item) || !array_key_exists('status', $item)) {
                continue;
            }
            $intentos++;
            if ((int)$item['status'] === 0) {
                $sinConexion++;
            }
        }
        return $intentos > 0 && $sinConexion === $intentos;
    }
}
