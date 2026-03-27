<?php
/**
 * Controlador de Categorias - Antigravity
 */

require_once __DIR__ . '/../../config/supabase.php';
require_once __DIR__ . '/../../helpers/Response.php';

global $route, $method;
if (empty($route)) {
    $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $route = str_replace('/antigravity-backend', '', $requestUri);
    $method = $_SERVER['REQUEST_METHOD'];
}

$uriSegments = explode('/', trim(str_replace('/api/categorias', '', $route), '/'));
$paramId = $uriSegments[0] ?? null;

if ($method === 'GET' && empty($paramId))
    listarCategorias();
elseif ($method === 'POST' && empty($paramId))
    crearCategoria();
elseif ($method === 'DELETE' && !empty($paramId))
    eliminarCategoria($paramId);
else
    json_error("Método no permitido para Categorias.", 405);

function listarCategorias()
{
    $categorias = supabase_request('GET', '/rest/v1/categorias?order=nombre.asc');
    if (isset($categorias['error']))
        json_error("Error", 500, $categorias);
    json_response($categorias);
}

function crearCategoria()
{
    $body = json_decode(file_get_contents("php://input"), true);
    if (empty($body['nombre']))
        json_error("Nombre requerido.", 400);

    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $body['nombre'])));
    $body['slug'] = $slug;

    $resp = supabase_request('POST', '/rest/v1/categorias', $body, ['Prefer: return=representation']);
    if (isset($resp['error']))
        json_error("Error guardando categoría", 500, $resp);
    json_response($resp[0], 201);
}

function eliminarCategoria($id)
{
    $resp = supabase_request('DELETE', "/rest/v1/categorias?id=eq.{$id}");
    json_response(null, 200, "Eliminada");
}
