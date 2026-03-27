<?php
/**
 * Clase Sincronizadora de Antigravity hacia Hostinger
 */

require_once __DIR__ . '/../../config/supabase.php';
require_once __DIR__ . '/../../config/constants.php';

class SyncHostinger
{

    private string $hostingerDbHost = '127.0.0.1'; // IP de BD Hostinger
    private string $hostingerDbUser = 'u264219614_root';
    private string $hostingerDbPass = 'km8W|06x0%b%';
    private string $hostingerDbName = 'u264219614_maquim';

    /**
     * Sincroniza un producto individual insertando o actualizando su estado en la BD de Hostinger
     */
    public function pushProductoAHostinger(string $productoId): array
    {
        // 1. Obtener producto de Supabase con todos sus datos y nombre de categoría
        $respProd = supabase_request('GET', "/rest/v1/productos?id=eq.{$productoId}&select=*,categorias(nombre)");
        if (isset($respProd['error']) || empty($respProd)) {
            return ['success' => false, 'mensaje' => "No se encontró el producto en Supabase."];
        }

        $prod = $respProd[0];
        $catNombre = $prod['categorias'] ? $prod['categorias']['nombre'] : '';

        // 2. Conectar a Hostinger (MySQLi remoto)
        $conn = new mysqli($this->hostingerDbHost, $this->hostingerDbUser, $this->hostingerDbPass, $this->hostingerDbName);
        if ($conn->connect_error) {
            return ['success' => false, 'mensaje' => "Conexión a Hostinger fallida: " . $conn->connect_error];
        }

        // 3. Preparar campos para Hostinger (Construcción del payload virtual y SQL de Update/Insert)
        $skuEscaped = $conn->real_escape_string($prod['sku'] ?? $prod['codigo_interno']);
        $nombreEscaped = $conn->real_escape_string($prod['descripcion']);
        $precioFinal = $prod['precio_oferta'] ?: ($prod['precio_unitario_sin_igv'] * 1.18);
        $precioLista = empty($prod['precio_lista']) ? "NULL" : (float) $prod['precio_lista'];
        $precioOferta = empty($prod['precio_oferta']) ? "NULL" : (float) $prod['precio_oferta'];
        $stock = (int) $prod['stock_actual'];
        $imgEscaped = $conn->real_escape_string($prod['imagen_url'] ?? '');
        $galeriaEscaped = $conn->real_escape_string(json_encode($prod['galeria'] ?? []));
        $slugEscaped = $conn->real_escape_string($prod['slug'] ?? '');
        $catEscaped = $conn->real_escape_string($catNombre);
        $activo = $prod['activo'] ? 1 : 0;
        $destacado = $prod['es_destacado'] ? 1 : 0;
        $etiqueta = $conn->real_escape_string($prod['etiqueta'] ?? '');
        $video = $conn->real_escape_string($prod['video_url'] ?? '');
        $pdf = $conn->real_escape_string($prod['pdf_url'] ?? '');

        // Validar si existe por SKU en Hostinger para decidir INSERT o UPDATE
        $check = $conn->query("SELECT id FROM productos WHERE sku = '{$skuEscaped}'");

        try {
            if ($check && $check->num_rows > 0) {
                // UPDATE
                $vId = $check->fetch_assoc()['id'];
                $sql = "UPDATE productos SET 
                            nombre = '{$nombreEscaped}',
                            precio = {$precioFinal},
                            precio_lista = {$precioLista},
                            precio_oferta = {$precioOferta},
                            stock_actual = {$stock},
                            imagen_url = '{$imgEscaped}',
                            galeria = '{$galeriaEscaped}',
                            categoria = '{$catEscaped}',
                            slug = '{$slugEscaped}',
                            activo = {$activo},
                            es_destacado = {$destacado},
                            etiqueta = '{$etiqueta}',
                            video_url = '{$video}',
                            pdf_url = '{$pdf}'
                        WHERE id = {$vId}";
                if (!$conn->query($sql))
                    throw new Exception($conn->error);
            } else {
                // INSERT
                $sql = "INSERT INTO productos (
                            sku, nombre, precio, precio_lista, precio_oferta, stock_actual, 
                            imagen_url, galeria, categoria, slug, activo, es_destacado, etiqueta, video_url, pdf_url
                        ) VALUES (
                            '{$skuEscaped}', '{$nombreEscaped}', {$precioFinal}, {$precioLista}, {$precioOferta}, {$stock},
                            '{$imgEscaped}', '{$galeriaEscaped}', '{$catEscaped}', '{$slugEscaped}', {$activo}, {$destacado}, '{$etiqueta}', '{$video}', '{$pdf}'
                        )";
                if (!$conn->query($sql))
                    throw new Exception($conn->error);
            }

            $conn->close();
            return ['success' => true, 'mensaje' => 'Sincronizado vía upsert Hostinger MySQL'];
        } catch (Exception $e) {
            $conn->close();
            return ['success' => false, 'mensaje' => "Error SQL en Hostinger: " . $e->getMessage()];
        }
    }

    /**
     * Procesado Batch asíncrono disparado por Cron
     */
    public function procesarPendientes(): void
    {
        echo "=== Iniciando Sync: " . date('Y-m-d H:i:s') . " ===\n";

        // Obtener pendientes (usamos limit para no saturar procesos, ej batch de 50)
        $pendientes = supabase_request('GET', '/rest/v1/sync_hostinger_log?estado=eq.PENDIENTE&limit=50');
        if (isset($pendientes['error'])) {
            echo "Error obteniendo logs de sincronización: " . print_r($pendientes, true);
            return;
        }

        if (empty($pendientes)) {
            echo "No hay productos pendientes por sincronizar.\n";
            return;
        }

        echo "Procesando " . count($pendientes) . " registros pendientes...\n";

        foreach ($pendientes as $logItem) {
            $prodId = $logItem['producto_id'];
            $syncResp = $this->pushProductoAHostinger($prodId);

            $patchData = [
                'enviado_at' => date('c'), // Formato ISO8601
            ];

            if ($syncResp['success']) {
                $patchData['estado'] = 'ENVIADO';
                $patchData['error_mensaje'] = null;
                echo " [OK] Sync completada para log ID {$logItem['id']} - Producto {$prodId}\n";
            } else {
                // En caso de error, podríamos marcarlo como ERROR o dejarlo en PENDIENTE si queremos retry infinito,
                // Pero es más sano pasarlo a ERROR para debugging manual si falla.
                $patchData['estado'] = 'ERROR';
                $patchData['error_mensaje'] = $syncResp['mensaje'];
                echo " [FAIL] Error en log ID {$logItem['id']}: {$syncResp['mensaje']}\n";
            }

            // Actualizar log en Supabase
            supabase_request('PATCH', "/rest/v1/sync_hostinger_log?id=eq.{$logItem['id']}", $patchData);
        }

        echo "=== Fin Sync ===\n";
    }
}
