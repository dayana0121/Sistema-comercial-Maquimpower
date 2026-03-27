<?php
// /tmp/test_ruc_debug.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'c:/xampp/htdocs/REPO3/Sistema-comercial-Maquimpower/antigravity-backend/config/database.php';
require_once 'c:/xampp/htdocs/REPO3/Sistema-comercial-Maquimpower/antigravity-backend/modules/sunat/RucController.php';

// Mock getenv if needed or just use the token
putenv("APIS_NET_PE_TOKEN=apis-token-1.aTSI1U7KEuT-6bbbCguH-4Y8TI6KS73N");

function getDB() {
    return (new Database())->getConnection();
}

$controller = new RucController();
$_GET['numero'] = '20610750673';

echo "Testing RUC 20610750673...\n";
ob_start();
$controller->buscar();
$output = ob_get_clean();

echo "RESULT:\n";
echo $output . "\n";
