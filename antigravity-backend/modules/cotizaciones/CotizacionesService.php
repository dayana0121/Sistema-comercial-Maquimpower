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

            $sql = "INSERT INTO cotizaciones_detalle 
                    (cotizacion_id, item, producto_id, descripcion, cantidad, valor_unitario, precio_unitario, tipo_afectacion_igv)
                    VALUES (:cotizacion_id, :item, :producto_id, :descripcion, :cantidad, :valor_unitario, :precio_unitario, :tipo_afectacion_igv)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':cotizacion_id' => $cotizacion_id,
                ':item' => $item,
                ':producto_id' => $det->producto_id ?? null,
                ':descripcion' => $det->descripcion,
                ':cantidad' => $cantidad,
                ':valor_unitario' => $valor_unitario,
                ':precio_unitario' => $precio_unitario,
                ':tipo_afectacion_igv' => $det->tipo_afectacion_igv ?? '10'
            ]);

            $totales['gravada'] += $subtotal_gravado;
            $item++;
        }

        $totales['igv'] = $totales['gravada'] * 0.18;
        $totales['total'] = $totales['gravada'] + $totales['igv'];

        return $totales;
    }
}
