<?php
/**
 * Script de migración único Hostinger -> Supabase
 * IMPORTANTE: No exponer al público, ejecutar vía CLI o temporalmente en entorno seguro.
 */

require_once __DIR__ . '/../antigravity-backend/config/supabase.php';

// Credenciales temporales Hostinger (Reemplazar con reales antes de ejecutar)
$dbHost = '127.0.0.1'; // ej: mysql.hostinger.com
$dbUser = 'usuario_hostinger';
$dbPass = 'password_hostinger';
$dbName = 'db_hostinger';

echo "Iniciando migración de Hostinger...\n";

$conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);

if ($conn->connect_error) {
    die("Error de conexión a MySQL Hostinger: " . $conn->connect_error . "\n");
}

// 1. Obtener productos de Hostinger
$sql = "SELECT * FROM productos WHERE activo = 1";
$result = $conn->query($sql);

if (!$result) {
    die("Error en la consulta: " . $conn->error . "\n");
}

$productosHostinger = [];
while ($row = $result->fetch_assoc()) {
    $productosHostinger[] = $row;
}
$conn->close();

echo "Se encontraron " . count($productosHostinger) . " productos activos en Hostinger.\n";

// 2. Caché de Categorías en Supabase para evitar múltiples peticiones
$respCategorias = supabase_request('GET', '/rest/v1/categorias?select=id,nombre');
$categoriasCache = []; // ['nombre_categoria' => 'uuid']
if (!isset($respCategorias['error']) && is_array($respCategorias)) {
    foreach ($respCategorias as $cat) {
        $categoriasCache[$cat['nombre']] = $cat['id'];
    }
}

$loteSize = 50;
$loteActual = [];
$stats = [
    'migrados' => 0,
    'errores' => 0,
    'saltados' => 0 // En realidad el upsert sobreescribirá o insertará
];

foreach ($productosHostinger as $prod) {
    // 3. Mapeo de Categoría
    $catNombre = $prod['categoria'] ?? 'Sin Categoría';
    $catId = null;

    if (isset($categoriasCache[$catNombre])) {
        $catId = $categoriasCache[$catNombre];
    } else {
        // Crear categoría on the fly
        $nuevaCat = supabase_request('POST', '/rest/v1/categorias', [
            'nombre' => $catNombre,
            'slug' => strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $catNombre))),
        ], ['Prefer: return=representation']);

        if (isset($nuevaCat[0]['id'])) {
            $catId = $nuevaCat[0]['id'];
            $categoriasCache[$catNombre] = $catId;
        }
    }

    // 4. Mapeo de Producto
    $sku = $prod['sku'] ?? 'GEN-' . uniqid();

    // Parsear galería
    $galeriaStr = $prod['galeria'] ?? '[]';
    $galeriaObj = json_decode($galeriaStr, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $galeriaObj = [];
    }

    // Precio original asumiendo que incluye IGV
    $precioConIgv = (float) ($prod['precio'] ?? 0);
    $precioSinIgv = round($precioConIgv / 1.18, 2);

    $mappedProduct = [
        'codigo_interno' => $sku,
        'sku' => $sku,
        'descripcion' => $prod['nombre'] ?? 'Producto Desconocido',
        'precio_unitario_sin_igv' => $precioSinIgv,
        'precio_lista' => isset($prod['precio_lista']) ? (float) $prod['precio_lista'] : null,
        'precio_oferta' => isset($prod['precio_oferta']) ? (float) $prod['precio_oferta'] : null,
        'stock_actual' => isset($prod['stock_actual']) ? (int) $prod['stock_actual'] : 0,
        'imagen_url' => $prod['imagen_url'] ?? null,
        'galeria' => $galeriaObj,
        'categoria_id' => $catId,
        'slug' => $prod['slug'] ?? strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $prod['nombre']))),
        'etiqueta' => $prod['etiqueta'] ?? null,
        'video_url' => $prod['video_url'] ?? null,
        'pdf_url' => $prod['pdf_url'] ?? null,
        'es_destacado' => isset($prod['es_destacado']) ? (bool) $prod['es_destacado'] : false,
        'activo' => true
    ];

    $loteActual[] = $mappedProduct;

    // 5. Inserción por lotes
    if (count($loteActual) >= $loteSize) {
        // En Supabase PostgREST, usamos POST con el header ON CONFLICT para hacer Upsert basado en un unique constraint (ej. sku)
        // NOTA: Para que Upsert funcione con "on_conflict", debemos especificar los campos únicos (pueden requerir config adicional en Supabase URL config)
        // Para simplificar y usar la API de forma directa:
        $resp = supabase_request('POST', '/rest/v1/productos', $loteActual, [
            'Prefer: resolution=merge-duplicates' // Requiere Primary Key o UNIQUE constraint en postgres
        ]);

        if (isset($resp['error'])) {
            echo "Error empujando lote: " . print_r($resp, true) . "\n";
            $stats['errores'] += count($loteActual);
        } else {
            $stats['migrados'] += count($loteActual);
        }

        $loteActual = [];
    }
}

// Último lote remanente
if (count($loteActual) > 0) {
    $resp = supabase_request('POST', '/rest/v1/productos', $loteActual, [
        'Prefer: resolution=merge-duplicates'
    ]);
    if (isset($resp['error'])) {
        echo "Error empujando último lote: " . print_r($resp, true) . "\n";
        $stats['errores'] += count($loteActual);
    } else {
        $stats['migrados'] += count($loteActual);
    }
}

echo "Migración Finalizada.\n";
echo "Migrados/Actualizados: {$stats['migrados']}\n";
echo "Errores: {$stats['errores']}\n";
