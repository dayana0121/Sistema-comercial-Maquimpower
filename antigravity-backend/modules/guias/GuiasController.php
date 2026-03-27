<?php
// modules/guias/GuiasController.php

require_once __DIR__ . '/../../middleware/AuthMiddleware.php';
require_once __DIR__ . '/GuiasService.php';
require_once __DIR__ . '/../sunat/SunatGreHelper.php';

class GuiasController
{
    private $service;
    private $sunat;

    public function __construct()
    {
        $this->service = new GuiasService(getDB());
        $this->sunat   = new SunatGreHelper();
    }

    public function handle($route, $method)
    {
        // 1. Protección y Headers
        $user = AuthMiddleware::verificar();
        header('Content-Type: application/json');

        // 2. Parsear la ruta (ej: /guias/15/descargar-pdf)
        $parts = explode('/', trim($route, '/'));
        $action = $parts[1] ?? null; // Puede ser 'listar', 'crear' o un ID numérico
        $subAction = $parts[2] ?? null; // Puede ser 'descargar-pdf' o 'consultar-estado'

        try {
            switch ($method) {
                case 'GET':
                    if ($action === 'listar' || $action === null) {
                        $this->listar();
                    } elseif (is_numeric($action) && $subAction === 'descargar-pdf') {
                        $this->descargarPdf((int) $action);
                    } else {
                        $this->obtener((int) $action);
                    }
                    break;

                case 'POST':
                    AuthMiddleware::requerirRol(['admin'], $user);
                    if ($action === 'crear') {
                        $this->crear();
                    } elseif (is_numeric($action) && $subAction === 'consultar-estado') {
                        $this->consultarEstado((int) $action);
                    }
                    break;

                default:
                    http_response_code(405);
                    echo json_encode(["success" => false, "message" => "Método no permitido"]);
                    break;
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

    private function listar()
    {
        $data = $this->service->listar();
        echo json_encode(["success" => true, "data" => $data]);
    }

    private function obtener($id)
    {
        // Lógica para obtener una guía por ID
        echo json_encode(["success" => true, "message" => "Guía #$id"]);
    }

    private function crear()
    {
        $data     = json_decode(file_get_contents("php://input"), true);
        $detalles = $data['detalles'] ?? [];

        // 1. Guardar en BD
        $guia = $this->service->guardar($data);

        // 2. Procesar con SUNAT si está habilitado
        if (getenv('SUNAT_HABILITADO') === 'true') {
            $resultado = $this->sunat->procesarGuia($guia, $detalles);
            $this->service->actualizarEstado($guia['id'], $resultado);
            $guia = array_merge($guia, $resultado);
        }

        echo json_encode(['success' => true, 'message' => 'Guía registrada.', 'data' => $guia]);
    }

    private function descargarPdf($id)
    {
        // Lógica para generar/descargar PDF usando el Helper
    }

    private function consultarEstado($id)
    {
        // Lógica para re-consultar el ticket en SUNAT
    }
}