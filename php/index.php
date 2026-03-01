<?php

declare(strict_types=1);

// Gunakan FrankenPHP atau php-fpm + nginx
// Untuk performa terbaik, pakai FrankenPHP

$host = $_ENV['DB_HOST'] ?? 'localhost';
$port = $_ENV['DB_PORT'] ?? '3306';
$dbname = $_ENV['DB_NAME'] ?? 'mydb';
$username = $_ENV['DB_USER'] ?? 'root';
$password = $_ENV['DB_PASS'] ?? '';

function getConnection(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        global $host, $port, $dbname, $username, $password;
        $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
        $pdo = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_PERSISTENT         => true, // persistent connection
        ]);
    }
    return $pdo;
}

function jsonResponse(int $code, string $status, mixed $data): void {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode([
        'code'   => $code,
        'status' => $status,
        'data'   => $data,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

// Router sederhana
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && $uri === '/workorders') {
    try {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 1000;
        $limit = max(1, min($limit, 10000)); // min 1, max 10000

        $pdo  = getConnection();
        $stmt = $pdo->prepare('SELECT
                                service_workorder.GrossJobSales, 
                                service_workorder.GrossPartSales, 
                                service_workorder.TotalPartDiscount, 
                                service_workorder.TotalPartProgram, 
                                service_workorder.TotalPartVAT, 
                                service_workorder.TotalPartWithholdingTax, 
                                service_workorder.TotalJobDiscount, 
                                service_workorder.TotalJobProgram, 
                                service_workorder.TotalJobVAT, 
                                service_workorder.TotalJobWithholdingTax, 
                                service_workorder.TotalJob, 
                                service_workorder.TotalPart, 
                                service_workorder.TotalInvoice, 
                                service_workorder.TotalPayment, 
                                service_workorder.DownPayment, 
                                service_workorder.Stamp, 
                                service_workorder.Tax, 
                                service_workorder.Oid, 
                                service_workorder.WorkOrderNo, 
                                service_workorder.WorkOrderDate, 
                                service_workorder.CancelDate, 
                                service_workorder.CancelReason, 
                                service_workorder.BookingNo, 
                                service_workorder.BookingStartOn, 
                                service_workorder.BookingDate, 
                                service_workorder.ProspectCategory, 
                                service_workorder.CustomerType, 
                                service_workorder.ServiceStartOn, 
                                service_workorder.ServiceEndOn, 
                                service_workorder.Remark, 
                                service_workorder.BookingStatus, 
                                service_workorder.WorkOrderStatus, 
                                service_workorder.PDI, 
                                service_workorder.IRC, 
                                service_workorder.JobTWC, 
                                service_workorder.OTH, 
                                service_workorder.RTJ, 
                                service_workorder.VehicleUnit, 
                                service_workorder.CurrentStall, 
                                service_workorder.ServiceAdvisor, 
                                service_workorder.Foreman, 
                                service_workorder.RepairType, 
                                service_workorder.ServiceInvoice, 
                                service_workorder.InvoiceDate, 
                                service_workorder.StartOn, 
                                service_workorder.IsApproved, 
                                service_workorder.WaitingApproval, 
                                service_workorder.ApprovalTo, 
                                service_workorder.StatusApproval, 
                                service_workorder.created_at
                            FROM
                                service_workorder LIMIT :limit');
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $data = $stmt->fetchAll();
        jsonResponse(200, 'success', $data);
    } catch (Throwable $e) {
        jsonResponse(500, 'error', $e->getMessage());
    }
} elseif ($uri === '/health') {
    jsonResponse(200, 'success', ['status' => 'ok']);
} else {
    jsonResponse(404, 'not_found', null);
}