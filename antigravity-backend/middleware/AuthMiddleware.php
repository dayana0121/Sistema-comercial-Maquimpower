<?php
// middleware/AuthMiddleware.php

require_once __DIR__ . "/../helpers/JwtHelper.php";
require_once __DIR__ . "/../helpers/Response.php";

class AuthMiddleware
{
    /**
     * Valida el JWT y devuelve el payload del usuario
     */
    public static function verificar(): array
    {
        $headers = function_exists('getallheaders') ? getallheaders() : [];

        // Plan B para obtener el header si getallheaders falla
        $auth = $headers["Authorization"] ?? $headers["authorization"] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? "";

        if (!str_starts_with($auth, "Bearer ")) {
            Response::unauthorized("Token no proporcionado");
        }

        $token = substr($auth, 7);
        $payload = JwtHelper::verify($token);

        if (!$payload) {
            Response::unauthorized("Token inválido o expirado");
        }

        return $payload;
    }

    /**
     * Valida si el rol del usuario está dentro de los permitidos
     */
    public static function requerirRol(array $rolesPermitidos, array $userPayload): void
    {
        if (!isset($userPayload['rol']) || !in_array($userPayload['rol'], $rolesPermitidos)) {
            Response::forbidden("No tienes permisos suficientes para realizar esta acción.");
        }
    }

    /**
     * Valida permisos específicos en la tabla roles_permisos (Base de Datos)
     */
    public static function verificarPermiso(string $modulo, string $accion): array
    {
        $user = self::verificar();
        $db = getDB();

        $stmt = $db->prepare("SELECT puede_$accion FROM roles_permisos WHERE rol = ? AND modulo = ?");
        $stmt->execute([$user["rol"], $modulo]);
        $perm = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$perm || empty($perm["puede_$accion"])) {
            Response::forbidden("Acción '$accion' restringida en el módulo '$modulo'.");
        }

        return $user;
    }
}