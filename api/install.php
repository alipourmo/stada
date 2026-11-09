<?php
// One-time schema setup: open /api/install.php?key=<INSTALL_KEY>, then delete INSTALL_KEY from the env.
require_once __DIR__ . '/../lib/bootstrap.php';
header('Content-Type: text/plain; charset=utf-8');
$key = env_or('INSTALL_KEY');
if ($key === '' || !hash_equals($key, (string)($_GET['key'] ?? ''))) { http_response_code(403); exit('Forbidden'); }
foreach (array_filter(array_map('trim', explode(';', file_get_contents(__DIR__ . '/../schema.sql')))) as $q) {
    getDB()->exec($q);
    echo 'OK: ' . substr(preg_replace('/\s+/', ' ', $q), 0, 70) . "...\n";
}
echo "Done.\n";
