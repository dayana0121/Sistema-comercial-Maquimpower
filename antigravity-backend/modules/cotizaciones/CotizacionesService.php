<?php
/**
 * CotizacionesService.php
 * Lógica de negocios para cotizaciones
 */

class CotizacionesService
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Agregar detalles a una cotización
     * Retorna los totales calculados
     */
    public function agregarDetalles($cotizacion_id, $detalles)
    {
        $totales = ['gravada' => 0, 'igv' => 0, 'total' => 0];

        if (empty($detalles)) {
            return $totales;
        }

        $item = 1;
        foreach ($detalles as $det) {
            $cantidad = $det->cantidad ?? 1;
            $valor_unitario = $det->valor_unitario ?? ($det->precio_unitario / 1.18);
            $precio_unitario = $det->precio_unitario ?? ($valor_unitario * 1.18);

            $subtotal_gravado = $cantidad * $valor_unitario;

            // Asegurar que cada detalle tenga un id (UUID). Evita que MySQL inserte cadena vacía como PRIMARY KEY.
            $detId = $det->id ?? $this->uuidV4();

            $sql = "INSERT INTO cotizaciones_detalle 
                    (id, cotizacion_id, item, producto_id, descripcion, cantidad, valor_unitario, precio_unitario, descuento_unitario, tipo_afectacion_igv, indicacion)
                    VALUES (:id, :cotizacion_id, :item, :producto_id, :descripcion, :cantidad, :valor_unitario, :precio_unitario, :descuento_unitario, :tipo_afectacion_igv, :indicacion)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':id' => $detId,
                ':cotizacion_id' => $cotizacion_id,
                ':item' => $item,
                ':producto_id' => $det->producto_id ?? null,
                ':descripcion' => $det->descripcion,
                ':cantidad' => $cantidad,
                ':valor_unitario' => $valor_unitario,
                ':precio_unitario' => $precio_unitario,
                ':descuento_unitario' => $det->descuento_unitario ?? 0,
                ':tipo_afectacion_igv' => $det->tipo_afectacion_igv ?? '10',
                ':indicacion' => $det->indicacion ?? ''
            ]);

            $totales['gravada'] += $subtotal_gravado;
            $item++;
        }

        $totales['igv'] = $totales['gravada'] * 0.18;
        $totales['total'] = $totales['gravada'] + $totales['igv'];

        return $totales;
    }

    // Genera un UUID v4 en PHP
    private function uuidV4()
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
