<?php
// modules/guias/GuiasController.php

require_once __DIR__ . '/../../config/db.php';
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
                    AuthMiddleware::requerirRol(['admin', 'vendedor'], $user);
                    if ($action === 'crear') {
                        $this->crear();
                    } elseif (is_numeric($action) && $subAction === 'consultar-estado') {
                        $this->consultarEstado((int) $action);
                    } elseif (is_numeric($action) && $subAction === 'enviar') {
                        $this->enviar((int) $action);
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

        // 2. Procesar con SUNAT DESACOPLADO (ahora se hace por separado)
        // El usuario debe hacer clic en "Enviar a SUNAT" en el listado.

        echo json_encode(['success' => true, 'message' => 'Guía registrada.', 'data' => $guia]);
    }

    private function descargarPdf($id)
    {
        // Lógica para generar/descargar PDF usando el Helper
    }

    private function consultarEstado($id)
    {
        $guia = $this->service->obtener($id);
        if (!$guia) throw new Exception("Guía no encontrada");
        if (empty($guia['numero_ticket'])) throw new Exception("Esta guía no tiene un ticket asociado.");
        
        $ruc = getenv('SUNAT_RUC');
        $nombreArchivo = $ruc . '-09-' . $guia['serie'] . '-' . $guia['numero_correlativo'];
        
        $token = $this->sunat->obtenerToken();
        $res = $this->sunat->consultarTicket($guia['numero_ticket'], $token, $ruc, $nombreArchivo);
        
        $this->service->actualizarEstado($id, $res);
        echo json_encode(["success" => true, "data" => $res]);
    }

    private function enviar($id)
    {
        $guia = $this->service->obtener($id);
        if (!$guia) throw new Exception("Guía no encontrada");
        
        // Obtener detalles de la guía para el envío
        $detalles = $this->service->listarDetalles($id);
        
        $resultado = $this->sunat->procesarGuia($guia, $detalles);
        $this->service->actualizarEstado($id, $resultado);
        
        http_response_code($resultado['success'] ? 200 : 400);
        echo json_encode($resultado);
    }
}