<?php
// index.php — Router principal del backend de Maquimpower
date_default_timezone_set("America/Lima");

require_once __DIR__ . "/config/env.php";
require_once __DIR__ . "/config/db.php";
require_once __DIR__ . "/config/cors.php";
require_once __DIR__ . "/helpers/Response.php";

// 1. Calcular la ruta limpia
$basePath = str_replace('/index.php', '', $_SERVER['SCRIPT_NAME']);
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$route = str_replace($basePath, '', $requestUri);

// Nos aseguramos de que la ruta siempre empiece con /
if (!str_starts_with($route, '/')) {
    $route = '/' . $route;
}
$route = rtrim($route, '/') ?: '/';

// Eliminar el prefijo '/api' si el frontend lo envía
if (str_starts_with($route, '/api/')) {
    $route = substr($route, 4);
} elseif ($route === '/api') {
    $route = '/';
}
$method = $_SERVER["REQUEST_METHOD"];

// Manejo de pre-flight CORS
if ($method === "OPTIONS") {
    http_response_code(200);
    exit;
}

// ==========================================
// 2. RUTEO POR MÓDULOS
// ==========================================
try {
    // --- MÓDULO DE AUTENTICACIÓN ---
    if (str_starts_with($route, '/auth')) {
        require_once __DIR__ . "/modules/Auth/AuthController.php";
        $ctrl = new AuthController();

        match (true) {
            $route === '/auth/login' && $method === 'POST' => $ctrl->login(),
            $route === '/auth/me' && $method === 'GET' => $ctrl->me(),
            $route === '/auth/cambiar-password' && $method === 'POST' => $ctrl->cambiarPassword(),
            str_starts_with($route, '/auth/usuarios') => (function () use ($ctrl, $route, $method) {
                    $id = basename($route) !== 'usuarios' ? basename($route) : null;
                    match (true) {
                        $method === 'GET' && !$id => $ctrl->listarUsuarios(),
                        $method === 'POST' => $ctrl->crearUsuario(),
                        $method === 'PUT' && $id => $ctrl->editarUsuario($id),
                        $method === 'DELETE' && $id => $ctrl->eliminarUsuario($id),
                        default => Response::error("Método no permitido", 405)
                    };
                })(),
            default => Response::error("Ruta de auth no encontrada", 404)
        };
    }

    // --- OTROS MÓDULOS (Clientes, Productos, Ventas) ---
    elseif (str_starts_with($route, '/clientes')) {
        require_once __DIR__ . "/modules/clientes/ClientesController.php";
        (new ClientesController())->handle($route, $method);

    } elseif (str_starts_with($route, '/dashboard')) {
        require_once __DIR__ . "/modules/dashboard/EstadisticasController.php";
        (new EstadisticasController())->handle($route, $method);

    } elseif (str_starts_with($route, '/productos')) {
        require_once __DIR__ . "/modules/productos/ProductosController.php";
        (new ProductosController())->handle($route, $method);

    } elseif (str_starts_with($route, '/inventario')) {
        require_once __DIR__ . "/modules/inventario/InventarioController.php";
        (new InventarioController())->handle($route, $method);

    } elseif (str_starts_with($route, '/ventas')) {
        require_once __DIR__ . "/modules/ventas/VentasController.php";
        (new VentasController())->handle($route, $method);

    } elseif (str_starts_with($route, '/reportes')) {
        require_once __DIR__ . "/modules/reportes/ReportesController.php";
        (new ReportesController())->handle($route, $method);

    } elseif (str_starts_with($route, '/proveedores')) {
        require_once __DIR__ . "/modules/proveedores/ProveedoresController.php";
        (new ProveedoresController())->handle($route, $method);

    } elseif (str_starts_with($route, '/compras')) {
        require_once __DIR__ . "/modules/compras/ComprasController.php";
        (new ComprasController())->handle($route, $method);

    } elseif (str_starts_with($route, '/caja')) {
        require_once __DIR__ . "/modules/caja/CajaController.php";
        (new CajaController())->handle($route, $method);

    } elseif (str_starts_with($route, '/guias')) {
        require_once __DIR__ . "/modules/guias/GuiasController.php";
        (new GuiasController())->handle($route, $method);

    } elseif (str_starts_with($route, '/vendedores')) {
        require_once __DIR__ . "/modules/vendedores/VendedoresController.php";
        (new VendedoresController())->handle($route, $method);

    } elseif (str_starts_with($route, '/cotizaciones')) {
        require_once __DIR__ . "/modules/cotizaciones/CotizacionesController.php";
        (new CotizacionesController())->handle($route, $method);

    } elseif (str_starts_with($route, '/notas-credito')) {
        require_once __DIR__ . "/modules/notas-credito/NotasCreditoController.php";
        (new NotasCreditoController())->handle($route, $method);

    } elseif (str_starts_with($route, '/sunat/ruc')) {
        require_once __DIR__ . '/modules/sunat/RucController.php';
        (new RucController())->buscar();

    } elseif (str_starts_with($route, '/guias')) {
        require_once __DIR__ . "/modules/guias/GuiasController.php";
        (new GuiasController())->handle($route, $method);
    } else {
        Response::error("Ruta no encontrada: $method $route", 404);
    }

} catch (Exception $e) {
    // Captura general de errores no controlados para que no rompa el JSON
    Response::error("Error interno: " . $e->getMessage(), 500);
}