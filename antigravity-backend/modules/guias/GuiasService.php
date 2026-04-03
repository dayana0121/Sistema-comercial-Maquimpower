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
        try {
            $this->db->beginTransaction();

            $guia_id = (string) $this->db->query("SELECT UUID()")->fetchColumn();
            
            // Obtener siguiente número correlativo interno
            $stmtCorr = $this->db->query("SELECT MAX(numero_correlativo) FROM guias");
            $correlativo = (int)($stmtCorr->fetchColumn() ?: 0) + 1;

            $stmt = $this->db->prepare("
                INSERT INTO guias (
                    id, numero_correlativo, serie, fecha_emision, 
                    ruc_remitente, nombre_remitente, domicilio_remitente,
                    ruc_destinatario, nombre_destinatario, domicilio_destinatario, 
                    agencia_destino, motivo_traslado, fecha_inicio_traslado, peso_total,
                    estado_sunat
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?,
                    'PENDIENTE'
                )
            ");

            $stmt->execute([
                $guia_id, $correlativo, $data['serie'] ?? 'T001', $data['fecha_emision'] ?? date('Y-m-d'),
                $data['ruc'] ?? '', 'MAQUIMPOWER SAC', $data['partida_direccion'] ?? '',
                $data['destinatario_ruc'] ?? '', $data['destinatario_nombre'] ?? '', $data['llegada_direccion'] ?? '',
                $data['agencia_destino'] ?? '', $data['motivo_traslado'] ?? '01', $data['fecha_traslado'] ?? date('Y-m-d'), $data['peso_total'] ?? 0
            ]);

            // Guardar ítems
            $stmtItem = $this->db->prepare("
                INSERT INTO guias_detalle (
                    id, guia_id, item, producto_id, descripcion, cantidad, unidad_medida
                ) VALUES (UUID(), ?, ?, ?, ?, ?, ?)
            ");

            foreach ($data['items'] as $index => $item) {
                $stmtItem->execute([
                    $guia_id,
                    $index + 1,
                    $item['id'] ?? null,
                    $item['descripcion'],
                    $item['cantidad'],
                    $item['unidad_medida'] ?? 'NIU'
                ]);
            }

            $this->db->commit();
            
            // Retornar la guía guardada para procesos posteriores (SUNAT)
            $stmtFull = $this->db->prepare("SELECT * FROM guias WHERE id = ?");
            $stmtFull->execute([$guia_id]);
            return $stmtFull->fetch(PDO::FETCH_ASSOC);

        } catch (Exception $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
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
            ':estado'  => $resultado['success'] ? 'ACEPTADO' : 'RECHAZADO',
            ':cdr'     => $resultado['cdr_xml'] ?? '',
            ':ticket'  => $resultado['ticket'] ?? '',
            ':id'      => $id,
        ]);
    }

    public function obtener($id)
    {
        $stmt = $this->db->prepare("SELECT * FROM guias WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function listarDetalles($guia_id)
    {
        $stmt = $this->db->prepare("SELECT * FROM guias_detalle WHERE guia_id = ? ORDER BY item");
        $stmt->execute([$guia_id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}