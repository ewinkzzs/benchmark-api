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
        $pdo  = getConnection();
        $stmt = $pdo->query('SELECT * FROM service_workorder');
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