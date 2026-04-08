<?php
// index.php — ROUTER Maquimpower (v5.2) — INMUNE A DOBLE /API/
date_default_timezone_set('America/Lima');

// Captura de errores fatales para JSON
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE)) {
        header('Content-Type: application/json', true, 500);
        echo json_encode([
            'success' => false,
            'message' => 'ERROR FATAL: ' . $error['message'] . ' en ' . $error['file'] . ' linea ' . $error['line']
        ]);
    }
});

require_once __DIR__ . '/config/env.php';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/helpers/Response.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$base = str_replace('/index.php', '', $_SERVER['SCRIPT_NAME']);
$route = str_replace($base, '', $uri);

// Lógica de limpieza agresiva para evitar /api/api/
$route = str_replace('/api/api/', '/api/', $route);
if (str_starts_with($route, '/api/')) $route = substr($route, 4);
$route = '/' . ltrim($route, '/');
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') { http_response_code(200); exit; }

try {
    $map = [
        'auth'         => ['Auth/AuthController.php', 'AuthController'],
        'clientes'     => ['clientes/ClientesController.php', 'ClientesController'],
        'ventas'       => ['ventas/VentasController.php', 'VentasController'],
        'productos'    => ['productos/ProductosController.php', 'ProductosController'],
        'compras'      => ['compras/ComprasController.php', 'ComprasController'],
        'dashboard'    => ['dashboard/EstadisticasController.php', 'EstadisticasController'],
        'caja'         => ['caja/CajaController.php', 'CajaController'],
        'inventario'   => ['inventario/InventarioController.php', 'InventarioController'],
        'cotizaciones' => ['cotizaciones/CotizacionesController.php', 'CotizacionesController'],
        'notas-credito'=> ['notas-credito/NotasCreditoController.php', 'NotasCreditoController'],
        'proveedores'  => ['proveedores/ProveedoresController.php', 'ProveedoresController'],
        'reportes'     => ['reportes/ReportesController.php', 'ReportesController'],
        'vendedores'   => ['vendedores/VendedoresController.php', 'VendedoresController'],
        'guias'        => ['guias/GuiasController.php', 'GuiasController'],
        'sunat/ruc'    => ['sunat/RucController.php', 'RucController', 'buscar']
    ];

    foreach ($map as $prefix => $cfg) {
        if (str_starts_with($route, '/' . $prefix)) {
            $file = __DIR__ . '/modules/' . $cfg[0];
            if (!file_exists($file)) throw new Exception("No se encuentra modulo: $file");
            require_once $file;
            $ctrl = new $cfg[1]();
            $action = $cfg[2] ?? 'handle';
            $ctrl->$action($route, $method);
            exit;
        }
    }
    Response::error("Ruta no encontrada: $method $route", 404);

} catch (Throwable $t) {
    Response::error("Error Servidor: " . $t->getMessage(), 500);
}