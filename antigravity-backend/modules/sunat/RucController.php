<?php
// modules/sunat/RucController.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

class RucController
{
    private $db;
    private $token = 'apis-token-1.aTSI1U7KEuT-6bbbCguH-4Y8TI6KS73N';
    private $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    public function __construct()
    {
        $this->db = getDB();
    }

    public function buscar()
    {
        try { AuthMiddleware::verificar(); } catch (Exception $e) {
            http_response_code(401); echo json_encode(['success' => false, 'message' => 'No autorizado']); return;
        }

        $numero = trim($_GET['numero'] ?? '');
        $longitud = strlen($numero);

        // 1. LOCAL DB FIRST
        try {
            $stmt = $this->db->prepare("SELECT * FROM clientes WHERE numero_documento = :num AND activo = 1 LIMIT 1");
            $stmt->execute([':num' => $numero]);
            $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($cliente) {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'id' => $cliente['id'],
                        'ruc' => ($longitud === 11 ? $numero : null),
                        'dni' => ($longitud === 8 ? $numero : null),
                        'razon_social' => $cliente['razon_social'],
                        'direccion' => $cliente['direccion_fiscal'] ?? '',
                        'fuente' => 'BASE DE DATOS LOCAL'
                    ]
                ]);
                return;
            }
        } catch (Exception $e) {}

        // 2. EXTERNAL
        try {
            $res = ($longitud === 11) ? $this->buscarRucUniversal($numero) : $this->buscarDniUniversal($numero);
            if (empty($res['razon_social'])) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'No se encontró el documento.']);
            } else {
                echo json_encode(['success' => true, 'data' => $res]);
            }
        } catch (Exception $e) {
            http_response_code(500); echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        }
    }

    private function buscarRucUniversal($ruc)
    {
        $res = $this->curlRequest("https://api.apis.net.pe/v2/sunat/ruc?numero=$ruc", ['Authorization: Bearer ' . $this->token]);
        if ($res['status'] === 200 && !empty($res['data']['razonSocial'])) {
            return ['ruc' => $ruc, 'razon_social' => $res['data']['razonSocial'], 'direccion' => $res['data']['direccion'] ?? '', 'fuente' => 'API SUNAT'];
        }

        $res2 = $this->curlRequest("https://consultaruc.win/api/ruc/$ruc");
        $d = is_array($res2['data'] ?? null) ? ($res2['data']['result'] ?? $res2['data']) : [];
        if (!empty($d['razon_social'] ?? $d['razonSocial'])) {
            return ['ruc' => $ruc, 'razon_social' => $d['razon_social'] ?? $d['razonSocial'], 'direccion' => $d['direccion'] ?? '', 'fuente' => 'MOTOR SECUNDARIO'];
        }
        return ['razon_social' => ''];
    }

    private function buscarDniUniversal($dni)
    {
        // Intento 1: API APIS
        $res = $this->curlRequest("https://api.apis.net.pe/v2/reniec/dni?numero=$dni", ['Authorization: Bearer ' . $this->token]);
        if ($res['status'] === 200 && !empty($res['data']['nombres'])) {
            $d = $res['data'];
            return ['dni' => $dni, 'razon_social' => trim($d['nombres'] . ' ' . $d['apellidoPaterno'] . ' ' . $d['apellidoMaterno']), 'fuente' => 'API RENIEC'];
        }

        // Intento 2: Consultaruc
        $resC = $this->curlRequest("https://consultaruc.win/api/dni/$dni");
        $dC = is_array($resC['data'] ?? null) ? ($resC['data']['result'] ?? $resC['data']) : [];
        if (!empty($dC['nombre_completo'] ?? $dC['nombres'])) {
            return ['dni' => $dni, 'razon_social' => $dC['nombre_completo'] ?? $dC['nombres'], 'fuente' => 'MOTOR SECUNDARIO'];
        }

        // Intento 3: Eldni
        return $this->scrapeEldni($dni);
    }

    private function scrapeEldni($dni)
    {
        $ch = curl_init("https://eldni.com/pe/buscar-datos-por-dni");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => "dni=$dni",
            CURLOPT_HTTPHEADER => ["Content-Type: application/x-www-form-urlencoded"],
            CURLOPT_TIMEOUT => 10, CURLOPT_SSL_VERIFYPEER => false, CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_USERAGENT => $this->ua
        ]);
        $html = curl_exec($ch); curl_close($ch);
        if ($html) {
            $n = ""; $p = ""; $m = "";
            if (preg_match('/id="nombres"[^>]+value="([^"]+)"/i', $html, $matches)) $n = trim($matches[1]);
            if (preg_match('/id="apellido_paterno"[^>]+value="([^"]+)"/i', $html, $matches)) $p = trim($matches[1]);
            if (preg_match('/id="apellido_materno"[^>]+value="([^"]+)"/i', $html, $matches)) $m = trim($matches[1]);
            if ($n || $p) return ['dni' => $dni, 'razon_social' => trim("$n $p $m"), 'fuente' => 'MOTOR EMERGENCIA'];
        }
        return ['razon_social' => ''];
    }

    private function curlRequest($url, $headers = []) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6,
            CURLOPT_SSL_VERIFYPEER => false, CURLOPT_HTTPHEADER => $headers,
            CURLOPT_USERAGENT => $this->ua
        ]);
        $r = curl_exec($ch); $s = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        return ['status' => $s, 'data' => json_decode($r, true)];
    }
}