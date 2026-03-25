<?php
// helpers/JwtHelper.php

class JwtHelper
{
    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), "+/", "-_"), "=");
    }

    private static function base64UrlDecode(string $data): string
    {
        return base64_decode(strtr($data, "-_", "+/"));
    }

    public static function generate(array $payload): string
    {
        // Si no existe la variable, usamos una por defecto (Cámbiala en producción)
        $secret = getenv("JWT_SECRET") ?: 'maquimpower_secret_key_2026';
        $expiry = (int) (getenv("JWT_EXPIRY") ?: 43200);

        $header = self::base64UrlEncode(json_encode(["alg" => "HS256", "typ" => "JWT"]));

        $payload["iat"] = time();
        $payload["exp"] = time() + $expiry;
        $payloadEncoded = self::base64UrlEncode(json_encode($payload));

        $signature = self::base64UrlEncode(
            hash_hmac("sha256", "$header.$payloadEncoded", $secret, true)
        );

        return "$header.$payloadEncoded.$signature";
    }

    public static function verify(string $token): ?array
    {
        $secret = getenv("JWT_SECRET") ?: 'maquimpower_secret_key_2026';
        $parts = explode(".", $token);

        if (count($parts) !== 3)
            return null;

        [$header, $payload, $signature] = $parts;

        // Validar integridad de la firma
        $expected = self::base64UrlEncode(
            hash_hmac("sha256", "$header.$payload", $secret, true)
        );

        if (!hash_equals($expected, $signature)) {
            error_log("JWT ERROR: Firma inválida.");
            return null;
        }

        $data = json_decode(self::base64UrlDecode($payload), true);

        // Validar expiración
        if (!isset($data["exp"]) || $data["exp"] < time()) {
            error_log("JWT ERROR: Token expirado.");
            return null;
        }

        return $data;
    }
}