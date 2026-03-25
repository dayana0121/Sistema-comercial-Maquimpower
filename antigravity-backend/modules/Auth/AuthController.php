<?php
// modules/Auth/AuthController.php

require_once dirname(__DIR__, 2) . "/config/db.php";
require_once dirname(__DIR__, 2) . "/helpers/JwtHelper.php";
require_once dirname(__DIR__, 2) . "/helpers/Response.php";
require_once dirname(__DIR__, 2) . "/middleware/AuthMiddleware.php";

class AuthController
{
    // ==========================================
    // SECCIÓN: AUTENTICACIÓN (PÚBLICA / PRIVADA)
    // ==========================================

    public function login(): void
    {
        // 1. Capturar y limpiar datos
        $body = json_decode(file_get_contents("php://input"), true) ?? [];
        $email = trim($body["email"] ?? "");
        $pass = trim($body["password"] ?? "");

        if (!$email || !$pass) {
            Response::error("Email y password requeridos", 400);
        }

        // 2. Conexión y Consulta
        // Asegúrate de que getDB() use el puerto 3307 para tu MariaDB local
        $db = getDB();
        $stmt = $db->prepare("SELECT id, nombres, apellidos, email, password_hash, rol, activo FROM usuarios WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // --- BLOQUE DE DEPURACIÓN (Revisa el php_error_log en XAMPP) ---
        if (!$user) {
            error_log("LOGIN ERROR: El email '$email' no existe en la base de datos.");
        } else {
            if (!password_verify($pass, $user["password_hash"])) {
                error_log("LOGIN ERROR: Contraseña incorrecta para el usuario '$email'.");
            }
            if (!$user["activo"]) {
                error_log("LOGIN ERROR: El usuario '$email' existe pero está inactivo.");
            }
        }
        // --------------------------------------------------------------

        // 3. Validación Estricta
        if (!$user) {
            Response::error("DEBUG: El correo no existe en la BD local", 401);
        }

        if (!password_verify($pass, $user["password_hash"])) {
            // Esto nos dirá si la contraseña 'password' no coincide con el hash guardado
            Response::error("DEBUG: La contraseña no coincide con el hash", 401);
        }

        if (!$user["activo"]) {
            Response::error("DEBUG: El usuario existe pero activo es 0", 401);
        }

        // 4. Actualización de Acceso
        $db->prepare("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?")
            ->execute([$user["id"]]);

        // 5. Generación de JWT y Respuesta
        $token = JwtHelper::generate([
            "user_id" => $user["id"],
            "email" => $user["email"],
            "rol" => $user["rol"],
            "nombre" => trim($user["nombres"] . " " . $user["apellidos"]),
        ]);

        Response::success([
            "token" => $token,
            "user" => [
                "id" => $user["id"],
                "nombre" => trim($user["nombres"] . " " . $user["apellidos"]),
                "email" => $user["email"],
                "rol" => $user["rol"],
            ]
        ], "Login exitoso");
    }

    public function me(): void
    {
        $payload = AuthMiddleware::verificar();
        $db = getDB();
        $stmt = $db->prepare("SELECT id, nombres, apellidos, email, rol, activo, ultimo_acceso FROM usuarios WHERE id = ?");
        $stmt->execute([$payload["user_id"]]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user)
            Response::error("Usuario no encontrado", 404);
        Response::success($user);
    }

    public function cambiarPassword(): void
    {
        $payload = AuthMiddleware::verificar();
        $body = json_decode(file_get_contents("php://input"), true) ?? [];
        $actual = trim($body["password_actual"] ?? "");
        $nueva = trim($body["password_nueva"] ?? "");

        if (strlen($nueva) < 8)
            Response::error("Mínimo 8 caracteres", 400);

        $db = getDB();
        $stmt = $db->prepare("SELECT password_hash FROM usuarios WHERE id = ?");
        $stmt->execute([$payload["user_id"]]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !password_verify($actual, $user["password_hash"]))
            Response::error("Clave actual incorrecta", 401);

        $hash = password_hash($nueva, PASSWORD_BCRYPT);
        $db->prepare("UPDATE usuarios SET password_hash = ? WHERE id = ?")->execute([$hash, $payload["user_id"]]);

        Response::success(null, "Contraseña actualizada");
    }

    // ==========================================
    // SECCIÓN: GESTIÓN DE USUARIOS (SOLO ADMIN)
    // ==========================================

    public function listarUsuarios(): void
    {
        AuthMiddleware::verificarPermiso("usuarios", "ver");
        $db = getDB();
        $stmt = $db->query("SELECT id, nombres, apellidos, email, rol, activo, ultimo_acceso FROM usuarios ORDER BY nombres ASC");
        Response::success($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function crearUsuario(): void
    {
        AuthMiddleware::verificarPermiso("usuarios", "crear");
        $body = json_decode(file_get_contents("php://input"), true) ?? [];

        $db = getDB();
        $check = $db->prepare("SELECT id FROM usuarios WHERE email = ?");
        $check->execute([$body['email']]);
        if ($check->fetch())
            Response::error("El correo ya existe");

        $id = (string) $db->query("SELECT UUID()")->fetchColumn();
        $hash = password_hash($body['password'] ?? '12345678', PASSWORD_BCRYPT);

        $stmt = $db->prepare("INSERT INTO usuarios (id, nombres, apellidos, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, ?, ?, 1)");
        $stmt->execute([$id, $body['nombres'], $body['apellidos'], $body['email'], $hash, $body['rol']]);

        Response::success(["id" => $id], "Usuario creado");
    }

    public function editarUsuario(string $id): void
    {
        AuthMiddleware::verificarPermiso("usuarios", "editar");
        $body = json_decode(file_get_contents("php://input"), true) ?? [];

        $db = getDB();
        $stmt = $db->prepare("UPDATE usuarios SET nombres = ?, apellidos = ?, rol = ?, activo = ? WHERE id = ?");
        $stmt->execute([$body['nombres'], $body['apellidos'], $body['rol'], $body['activo'], $id]);

        Response::success(null, "Usuario actualizado");
    }

    public function eliminarUsuario(string $id): void
    {
        AuthMiddleware::verificarPermiso("usuarios", "eliminar");
        $db = getDB();
        // Borrado lógico para no romper integridad referencial
        $db->prepare("UPDATE usuarios SET activo = 0 WHERE id = ?")->execute([$id]);
        Response::success(null, "Usuario desactivado");
    }
}