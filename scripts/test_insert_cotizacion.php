<?php
// scripts/test_insert_cotizacion.php
// Inserta una cotización de prueba con detalle usando UUID para evitar problemas de PK

require_once __DIR__ . '/../antigravity-backend/config/db.php';

try {
    $pdo = getDB();

    $logPath = __DIR__ . '/test_insert_cotizacion.log';
    file_put_contents($logPath, "Starting test_insert at " . date('c') . "\n", FILE_APPEND);

    $pdo->beginTransaction();

    // Obtener UUID desde MySQL, con fallback a UUID v4 en PHP si por alguna razón devuelve vacío
    $uuid = false;
    try {
        $uuid = $pdo->query("SELECT UUID() as u")->fetchColumn();
    } catch (Exception $e) {
        // queda false y usaremos fallback
    }

    // Generar UUID v4 en PHP si no se obtuvo uno desde MySQL
    if (empty($uuid)) {
        // RFC 4122 compliant v4 UUID generator
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        $uuid = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
        $warn = "Warning: UUID() from MySQL was empty; using PHP-generated UUID: $uuid\n";
        echo $warn;
        file_put_contents($logPath, $warn, FILE_APPEND);
    }

    // Log the final UUID value we will use
    file_put_contents($logPath, "Using UUID: [" . $uuid . "]\n", FILE_APPEND);

    // Log actual table create statements for diagnosis
    try {
        $row = $pdo->query("SHOW CREATE TABLE cotizaciones")->fetch(PDO::FETCH_ASSOC);
        if ($row) file_put_contents($logPath, "SHOW CREATE TABLE cotizaciones:\n" . print_r($row, true) . "\n", FILE_APPEND);
    } catch (Exception $e) {
        file_put_contents($logPath, "SHOW CREATE TABLE cotizaciones failed: " . $e->getMessage() . "\n", FILE_APPEND);
    }
    try {
        $row2 = $pdo->query("SHOW CREATE TABLE cotizaciones_detalle")->fetch(PDO::FETCH_ASSOC);
        if ($row2) file_put_contents($logPath, "SHOW CREATE TABLE cotizaciones_detalle:\n" . print_r($row2, true) . "\n", FILE_APPEND);
    } catch (Exception $e) {
        file_put_contents($logPath, "SHOW CREATE TABLE cotizaciones_detalle failed: " . $e->getMessage() . "\n", FILE_APPEND);
    }

    $sql = "INSERT INTO cotizaciones (id, cliente_id, vendedor_id, fecha_vigencia, moneda, observaciones, created_at, updated_at)
            VALUES (:id, :cliente_id, :vendedor_id, :fecha_vigencia, :moneda, :observaciones, NOW(), NOW())";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $uuid,
        ':cliente_id' => null,
        ':vendedor_id' => null,
        ':fecha_vigencia' => date('Y-m-d'),
        ':moneda' => 'PEN',
        ':observaciones' => 'PRUEBA_INDICACION_PHP'
    ]);

    // Generar id para el detalle (evita que MySQL use default '' y choque con PRIMARY)
    $detId = false;
    try {
        $detId = $pdo->query("SELECT UUID()")->fetchColumn();
    } catch (Exception $e) {
        $detId = null;
    }
    if (empty($detId)) {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        $detId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
        file_put_contents($logPath, "Generated detalle id via PHP: $detId\n", FILE_APPEND);
    }

    $sql_det = "INSERT INTO cotizaciones_detalle (id, cotizacion_id, item, producto_id, descripcion, cantidad, valor_unitario, precio_unitario, descuento_unitario, tipo_afectacion_igv, indicacion, created_at)
                VALUES (:id, :cotizacion_id, :item, :producto_id, :descripcion, :cantidad, :valor_unitario, :precio_unitario, :descuento_unitario, :tipo_afectacion_igv, :indicacion, NOW())";

    $stmtDet = $pdo->prepare($sql_det);
    $stmtDet->execute([
        ':id' => $detId,
        ':cotizacion_id' => $uuid,
        ':item' => 1,
        ':producto_id' => null,
        ':descripcion' => 'Producto prueba desde script',
        ':cantidad' => 1,
        ':valor_unitario' => 100.0000,
        ':precio_unitario' => 118.0000,
        ':descuento_unitario' => 0.00,
        ':tipo_afectacion_igv' => '10',
        ':indicacion' => 'indispensable'
    ]);

    $pdo->commit();

    $msg = "Inserción completada. cotizacion id = $uuid\n";
    echo $msg;
    file_put_contents($logPath, $msg, FILE_APPEND);

    // Mostrar filas insertadas
    $cot = $pdo->prepare("SELECT * FROM cotizaciones WHERE id = ?");
    $cot->execute([$uuid]);
    $cotRow = $cot->fetch(PDO::FETCH_ASSOC);
    print_r($cotRow);
    file_put_contents($logPath, "COTIZACION: " . print_r($cotRow, true) . "\n", FILE_APPEND);

    $det = $pdo->prepare("SELECT * FROM cotizaciones_detalle WHERE cotizacion_id = ?");
    $det->execute([$uuid]);
    $detRows = $det->fetchAll(PDO::FETCH_ASSOC);
    print_r($detRows);
    file_put_contents($logPath, "DETALLE: " . print_r($detRows, true) . "\n", FILE_APPEND);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    $err = "Error: " . $e->getMessage() . PHP_EOL;
    echo $err;
    file_put_contents($logPath, $err, FILE_APPEND);
}
