<?php
declare(strict_types=1);

/**
 * Fixed Laravel gateway for the cPanel deployment.
 *
 * The browser talks to the HTTPS frontend origin only. This server-side
 * gateway forwards /backend-api/api/v1/* to the existing HTTP staging API,
 * avoiding browser Mixed Content and CORS failures without becoming an open
 * proxy.
 */

const UPSTREAM_ORIGIN = 'http://195.250.26.84';
const UPSTREAM_HOST = 'jstaging.system-11.net';
const LOCAL_PREFIX = '/backend-api';

function jsonError(int $status, string $message): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode([
        'success' => false,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (!extension_loaded('curl')) {
    jsonError(500, 'PHP cURL extension is required on this hosting account.');
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
if (!in_array($method, $allowedMethods, true)) {
    header('Allow: ' . implode(', ', $allowedMethods));
    jsonError(405, 'Method not allowed.');
}

$requestUri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
$requestPath = (string) (parse_url($requestUri, PHP_URL_PATH) ?? '/');
if (!str_starts_with($requestPath, LOCAL_PREFIX)) {
    jsonError(404, 'API route not found.');
}

$upstreamPath = substr($requestPath, strlen(LOCAL_PREFIX));
if (!preg_match('#^/api/v1(?:/|$)#', $upstreamPath)) {
    jsonError(404, 'Only Doctol API v1 routes are available.');
}

$query = (string) ($_SERVER['QUERY_STRING'] ?? '');
$upstreamUrl = UPSTREAM_ORIGIN . $upstreamPath . ($query !== '' ? '?' . $query : '');

$requestHeaders = [
    'Host: ' . UPSTREAM_HOST,
    'Accept: ' . ($_SERVER['HTTP_ACCEPT'] ?? 'application/json'),
    'Accept-Language: ' . ($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? 'ar'),
    'X-Forwarded-Proto: https',
];

$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if ($contentType !== '') {
    $requestHeaders[] = 'Content-Type: ' . $contentType;
}

$authorization = $_SERVER['HTTP_AUTHORIZATION']
    ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
    ?? '';
if ($authorization !== '') {
    $requestHeaders[] = 'Authorization: ' . $authorization;
}

$body = file_get_contents('php://input');
if ($body === false) {
    jsonError(400, 'Unable to read request body.');
}
if (strlen($body) > 10 * 1024 * 1024) {
    jsonError(413, 'Request body is too large.');
}

$responseHeaders = [];
$curl = curl_init($upstreamUrl);
if ($curl === false) {
    jsonError(500, 'Unable to initialize the API gateway.');
}

curl_setopt_array($curl, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $requestHeaders,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_TIMEOUT => 90,
    CURLOPT_ENCODING => '',
    CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$responseHeaders): int {
        $length = strlen($line);
        $parts = explode(':', $line, 2);
        if (count($parts) === 2) {
            $name = strtolower(trim($parts[0]));
            if (in_array($name, ['content-type', 'content-disposition', 'cache-control', 'etag', 'last-modified'], true)) {
                $responseHeaders[$name] = trim($parts[1]);
            }
        }
        return $length;
    },
]);

if (!in_array($method, ['GET', 'HEAD'], true) && $body !== '') {
    curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
}

$responseBody = curl_exec($curl);
if ($responseBody === false) {
    $detail = curl_error($curl);
    curl_close($curl);
    jsonError(502, 'Unable to reach Laravel API: ' . $detail);
}

$status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
$responseContentType = (string) curl_getinfo($curl, CURLINFO_CONTENT_TYPE);
curl_close($curl);

http_response_code($status > 0 ? $status : 502);
foreach ($responseHeaders as $name => $value) {
    header($name . ': ' . $value);
}
if (!isset($responseHeaders['content-type']) && $responseContentType !== '') {
    header('Content-Type: ' . $responseContentType);
}
header('X-Content-Type-Options: nosniff');

if ($method !== 'HEAD') {
    echo $responseBody;
}
