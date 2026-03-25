<?php
// modules/sunat/RucController.php
require_once __DIR__ . '/../../middleware/AuthMiddleware.php';

class RucController
{

    public function buscar()
    {
        AuthMiddleware::verificar();
        $numero = trim($_GET['numero'] ?? '');
        $longitud = strlen($numero);

        if ($longitud === 11) {
            $data = $this->buscarRuc($numero);
        } elseif ($longitud === 8) {
            $data = $this->buscarDni($numero);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ingresa 8 dígitos (DNI) u 11 dígitos (RUC)']);
            return;
        }

        echo json_encode(['success' => true, 'data' => $data]);
    }

    private function buscarRuc($ruc)
    {
        $token = "sk_13817.qpeDU0OYIKULKpblozGIqBWSL7zeehWJ";
        try {
            $url = "https://api.decolecta.com/v1/sunat/ruc?numero=" . $ruc;
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 7,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_HTTPHEADER => [
                    "Accept: application/json",
                    "Authorization: Bearer " . $token
                ],
            ]);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && $response) {
                $data = json_decode($response);
                return [
                    "razon_social" => $data->nombre ?? $data->razonSocial ?? $data->razon_social ?? '',
                    "direccion" => $data->direccion ?? '',
                    "departamento" => $data->departamento ?? '',
                    "provincia" => $data->provincia ?? '',
                    "distrito" => $data->distrito ?? ''
                ];
            }
            throw new Exception("Decolecta falló");
        } catch (Exception $e) {
            // fallback gratuito de monstruo7.0
            $url = 'https://www.facturacionintegral.com/ws_entidades/?ruc=' . $ruc;
            $data = @file_get_contents($url);
            if ($data) {
                $info = json_decode($data, true);
                return [
                    'ruc' => $ruc,
                    'razon_social' => $info['razon_social'] ?? '',
                    'direccion' => $info['direccion'] ?? '',
                ];
            }
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