<?php
/**
 * env.php — Cargador de variables de entorno
 * Uso: require_once __DIR__ . '/env.php';
 *      $ruc = env('EMPRESA_RUC');
 */
function cargarEnv(string $rutaArchivo): void
{
    if (!file_exists($rutaArchivo))
        return;

    $lineas = file($rutaArchivo, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lineas as $linea) {
        if (str_starts_with(trim($linea), '#'))
            continue; // ignorar comentarios
        if (!str_contains($linea, '='))
            continue;
        [$clave, $valor] = explode('=', $linea, 2);
        $clave = trim($clave);
        $valor = trim($valor);
        putenv("$clave=$valor");
        $_ENV[$clave] = $valor;
    }
}

function env(string $clave, string $default = ''): string
{
    return getenv($clave) ?: $default;
}

// Cargar automáticamente
cargarEnv(__DIR__ . '/../.env');