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
                    echo json_encode(['success' => false, 'message' => 'RUC no encontrado. Verifica el número o ingresa los datos manualmente.']);
                    return;
                }
            } elseif ($longitud === 8) {
                $data = $this->buscarDni($numero);
                if (empty($data['razon_social'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'DNI inválido o no encontrado']);
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
        // ==========================================
        // OPCIÓN A: APIs.net.pe (Confiable con token)
        // ==========================================
        $token = getenv('APIS_NET_PE_TOKEN') ?: 'apis-token-1.aTSI1U7KEuT-6bbbCguH-4Y8TI6KS73N';
        
        try {
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => 'https://api.apis.net.pe/v1/ruc?numero=' . $ruc,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 5,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $token,
                    'Accept: application/json'
                ],
            ]);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && $response) {
                $data = json_decode($response, true);
                if ($data['data']['razon_social'] ?? false) {
                    return [
                        'ruc' => $ruc,
                        'razon_social' => $data['data']['razon_social'] ?? '',
                        'direccion' => $data['data']['direccion'] ?? '',
                        'departamento' => $data['data']['departamento'] ?? '',
                        'provincia' => $data['data']['provincia'] ?? '',
                        'distrito' => $data['data']['distrito'] ?? ''
                    ];
                }
            }
            throw new Exception("APIs.net.pe falló");
        } catch (Exception $e) {
            // ==========================================
            // OPCIÓN B: Fallback - ConsultaRUC.win (Gratuito)
            // ==========================================
            try {
                $response = @file_get_contents('https://consultaruc.win/api/ruc/' . $ruc);
                if ($response) {
                    $data = json_decode($response, true);
                    if ($data['razonSocial'] ?? false) {
                        return [
                            'ruc' => $ruc,
                            'razon_social' => $data['razonSocial'] ?? '',
                            'direccion' => $data['direccion'] ?? '',
                            'departamento' => $data['departamento'] ?? '',
                            'provincia' => $data['provincia'] ?? '',
                            'distrito' => $data['distrito'] ?? ''
                        ];
                    }
                }
            } catch (Exception $e2) {
                // Continuar al siguiente fallback
            }

            // ==========================================
            // OPCIÓN C: Fallback - FactuacionIntegral.com
            // ==========================================
            try {
                $response = @file_get_contents('https://www.facturacionintegral.com/ws_entidades/?ruc=' . $ruc);
                if ($response) {
                    $data = json_decode($response, true);
                    if ($data['razon_social'] ?? false) {
                        return [
                            'ruc' => $ruc,
                            'razon_social' => $data['razon_social'] ?? '',
                            'direccion' => $data['direccion'] ?? '',
                        ];
                    }
                }
            } catch (Exception $e3) {
                // Continuar al siguiente fallback
            }

            // ==========================================
            // OPCIÓN D: Fallback LOCAL - Buscar en tabla clientes
            // ==========================================
            try {
                $stmt = $this->db->prepare("
                    SELECT 
                        numero_documento as ruc,
                        razon_social,
                        direccion_fiscal as direccion,
                        departamento,
                        provincia,
                        distrito
                    FROM clientes 
                    WHERE numero_documento = :ruc AND activo = 1
                    LIMIT 1
                ");
                $stmt->execute([':ruc' => $ruc]);
                $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($cliente) {
                    return [
                        'ruc' => $cliente['ruc'],
                        'razon_social' => $cliente['razon_social'] ?? '',
                        'direccion' => $cliente['direccion'] ?? '',
                        'departamento' => $cliente['departamento'] ?? '',
                        'provincia' => $cliente['provincia'] ?? '',
                        'distrito' => $cliente['distrito'] ?? '',
                        'fuente' => 'LOCAL'  // Indicar que vino de BD local
                    ];
                }
            } catch (Exception $e4) {
                // BD local tampoco tiene el RUC
            }

            // Si llegamos aquí, ninguno funcionó
            return ['ruc' => $ruc, 'razon_social' => '', 'direccion' => ''];
        }
    }

    private function buscarDni($dni)
    {
        $token = getenv('APIS_NET_PE_TOKEN');
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => 'https://api.apis.net.pe/v1/dni?numero=' . $dni,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
                'Referer: https://apis.net.pe/consulta-dni-api'
            ],
        ]);
        $response = json_decode(curl_exec($curl), true);
        return [
            'dni' => $dni,
            'razon_social' => $response['nombre'] ?? '',
            'direccion' => $response['direccion'] ?? '',
            'ubigeo' => $response['ubigeo'] ?? '',
        ];
    }
}