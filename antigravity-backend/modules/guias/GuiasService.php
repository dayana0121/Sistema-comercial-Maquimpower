<?php
// modules/guias/GuiasService.php

class GuiasService
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function listar()
    {
        $stmt = $this->db->prepare("
            SELECT g.*, c.razon_social as cliente_nombre 
            FROM guias g
            LEFT JOIN clientes c ON g.cliente_id = c.id
            ORDER BY g.created_at DESC
        ");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function guardar($data)
    {
        // Aquí usas transacciones (BEGIN TRANSACTION) para guardar
        // la guía y luego sus ítems en 'guias_items'
        return ["success" => true, "message" => "Guía registrada en BD"];
    }

    public function actualizarEstado($id, $resultado)
    {
        $stmt = $this->db->prepare("
            UPDATE guias 
            SET estado_sunat  = :estado,
                cdr_sunat     = :cdr,
                numero_ticket = :ticket,
                updated_at    = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            ':estado'  => $resultado['estado_sunat'] ?? 'PENDIENTE',
            ':cdr'     => $resultado['cdr_sunat'] ?? '',
            ':ticket'  => $resultado['numero_ticket'] ?? '',
            ':id'      => $id,
        ]);
    }
}