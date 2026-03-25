<?php
// index.php — Router principal del backend
date_default_timezone_set("America/Lima");

require_once __DIR__ . "/config/env.php";
require_once __DIR__ . "/config/db.php";
require_once __DIR__ . "/config/cors.php";
require_once __DIR__ . "/helpers/Response.php";

$basePath = str_replace('/index.php', '', $_SERVER['SCRIPT_NAME']);
$uri = str_replace($basePath, '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$uri = rtrim($uri, '/') ?: '/';
$method = $_SERVER["REQUEST_METHOD"];

if ($method === "OPTIONS") {
    http_response_code(200);
    exit;
}

// ==========================================
// RUTEO POR MÓDULOS
// ==========================================

// 1. MÓDULO DE AUTENTICACIÓN Y USUARIOS
if (str_starts_with($uri, '/auth')) {
    require_once __DIR__ . "/modules/auth/AuthController.php";
    $ctrl = new AuthController();

    match (true) {
        // Públicas
        $uri === '/auth/login' && $method === 'POST' => $ctrl->login(),

        // Perfil personal (JWT requerido dentro del método)
        $uri === '/auth/me' && $method === 'GET' => $ctrl->me(),
        $uri === '/auth/cambiar-password' && $method === 'POST' => $ctrl->cambiarPassword(),

        // Gestión de Usuarios (Admin - JWT y Rol requerido dentro del método)
        str_starts_with($uri, '/auth/usuarios') => (function () use ($ctrl, $uri, $method) {
                $id = basename($uri) !== 'usuarios' ? basename($uri) : null;
                match (true) {
                    $method === 'GET' && !$id => $ctrl->listarUsuarios(),
                    $method === 'POST' => $ctrl->crearUsuario(),
                    $method === 'PUT' && $id => $ctrl->editarUsuario($id),
                    $method === 'DELETE' && $id => $ctrl->eliminarUsuario($id),
                    default => Response::error("Método no permitido para usuarios", 405)
                };
            })(),

        default => Response::error("Ruta de autenticación no encontrada", 404)
    };
}

// 2. OTROS MÓDULOS
elseif (str_starts_with($uri, '/clientes')) {
    require_once __DIR__ . "/modules/clientes/ClientesController.php";
    (new ClientesController())->handle($uri, $method);
} elseif (str_starts_with($uri, '/productos')) {
    require_once __DIR__ . "/modules/productos/ProductosController.php";
    (new ClientesController())->handle($uri, $method); // Nota: Cambiar a ProductosController
} elseif (str_starts_with($uri, '/ventas')) {
    require_once __DIR__ . "/modules/ventas/VentasController.php";
    (new VentasController())->handle($uri, $method);
}

// 3. FALLBACK
else {
    Response::error("Endpoint no encontrado: $method $uri", 404);
}