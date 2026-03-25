<?php
/**
 * Respuestas estandarizadas - Antigravity Backend
 * Devuelve un formato común { success, message, data/errors }
 */

class Response
{
    /**
     * Método base para emitir la respuesta JSON y terminar la ejecución.
     */
    public static function json(mixed $data, int $status = 200): void
    {
        http_response_code($status);
        header("Content-Type: application/json; charset=utf-8");

        // Incluimos tus flags para evitar problemas con caracteres especiales y URLs
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * Responde con éxito (200 OK por defecto).
     */
    public static function success(mixed $data = null, string $message = "Operación exitosa"): void
    {
        $response = [
            "success" => true,
            "message" => $message
        ];

        // Solo incluimos 'data' si se envían datos reales
        if ($data !== null) {
            $response["data"] = $data;
        }

        self::json($response);
    }

    /**
     * Responde con error genérico (400 Bad Request por defecto).
     */
    public static function error(string $message, int $status = 400, ?array $errors = null): void
    {
        $response = [
            "success" => false,
            "message" => $message
        ];

        // Útil para enviar un array de validaciones de formularios
        if ($errors !== null) {
            $response["errors"] = $errors;
        }

        self::json($response, $status);
    }

    /**
     * Error 401 - Falta de autenticación (Token faltante o inválido).
     */
    public static function unauthorized(string $msg = "Token inválido o expirado"): void
    {
        self::error($msg, 401);
    }

    /**
     * Error 403 - Falta de autorización (Rol insuficiente).
     */
    public static function forbidden(string $msg = "Sin permisos para esta acción"): void
    {
        self::error($msg, 403);
    }
}