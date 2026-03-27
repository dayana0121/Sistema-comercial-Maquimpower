<?php
// modules/sunat/RucController.php
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
                    http_response_code(400);
                    echo json_encode([
                        'success' => false, 
                        'message' => 'RUC no encontrado o error en API externa (consultar debug).',
                        'debug' => $data['debug'] ?? null
                    ]);
                    return;
                }
            } elseif ($longitud === 8) {
                $data = $this->buscarDni($numero);
                if (empty($data['razon_social'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false, 
                        'message' => 'DNI no encontrado.',
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
        $token = getenv('APIS_NET_PE_TOKEN') ?: 'apis-token-1.aTSI1U7KEuT-6bbbCguH-4Y8TI6KS73N';
        
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
        $res = $this->curlRequest("https://api.apis.net.pe/v2/sunat/ruc?numero=$ruc", [
            'Authorization: Bearer ' . $token,
            'Accept: application/json'
        ]);
        $debug['apis_net_pe_v2'] = ['status' => $res['status'], 'raw' => substr($res['raw'], 0, 100)];
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
        $resV1 = $this->curlRequest("https://api.apis.net.pe/v1/ruc?numero=$ruc");
        $debug['apis_net_pe_v1'] = ['status' => $resV1['status'], 'raw' => substr($resV1['raw'], 0, 100)];
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
        $debug['consultaruc_win'] = ['status' => $res2['status'], 'raw' => substr($res2['raw'], 0, 100)];
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
        $token = getenv('APIS_NET_PE_TOKEN') ?: 'apis-token-1.aTSI1U7KEuT-6bbbCguH-4Y8TI6KS73N';
        $default_data = ['dni' => $dni, 'razon_social' => '', 'direccion' => '', 'ubigeo' => '', 'fuente' => ''];

        // 1. APIs.net.pe (V2 DNI)
        $res = $this->curlRequest("https://api.apis.net.pe/v2/reniec/dni?numero=$dni", [
            'Authorization: Bearer ' . $token, 'Accept: application/json'
        ]);
        $debug['apis_net_pe_v2_dni'] = ['status' => $res['status'], 'raw' => substr($res['raw'], 0, 100)];
        if ($res['status'] === 200 && !empty($res['data']['nombres'] ?? '')) {
            $data = $res['data'];
            $nombre_completo = trim($data['nombres'] . ' ' . $data['apellidoPaterno'] . ' ' . $data['apellidoMaterno']);
            return array_merge($default_data, [
                'razon_social' => $nombre_completo, 'direccion' => $data['direccion'] ?? '',
                'ubigeo' => $data['ubigeo'] ?? '', 'fuente' => 'apis.net.pe (V2)'
            ]);
        }

        // 2. APIs.net.pe (V1 DNI) - Fallback
        $resV1 = $this->curlRequest("https://api.apis.net.pe/v1/dni?numero=$dni");
        $debug['apis_net_pe_v1_dni'] = ['status' => $resV1['status'], 'raw' => substr($resV1['raw'], 0, 100)];
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
            CURLOPT_TIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_HTTPHEADER => $headers
        ]);
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode($response, true);
        return ['status' => $status, 'data' => $data, 'raw' => $response];
    }
}