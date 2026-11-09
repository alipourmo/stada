<?php
// BioTrack bootstrap: all config comes from environment variables (never commit secrets).
error_reporting(E_ALL);
ini_set('display_errors', getenv('APP_DEBUG') ? '1' : '0');
date_default_timezone_set('Asia/Tehran');

function env_or(string $k, string $d = ''): string {
    $v = getenv($k);
    return ($v === false || $v === '') ? $d : $v;
}

define('DB_HOST', env_or('DB_HOST', 'localhost'));
define('DB_PORT', env_or('DB_PORT', '3306'));
define('DB_NAME', env_or('DB_NAME'));
define('DB_USER', env_or('DB_USER'));
define('DB_PASS', env_or('DB_PASS'));
define('APP_URL', rtrim(env_or('APP_URL'), '/'));
define('EXAM_DATE', env_or('EXAM_DATE', '2026-05-07'));
define('SUBJECTS', [
    'cell'      => ['name' => 'زیست سلولی',  'emoji' => '🔬', 'color' => '#00ffa3'],
    'molecular' => ['name' => 'زیست مولکولی', 'emoji' => '🧬', 'color' => '#00d4ff'],
    'genetics'  => ['name' => 'ژنتیک',        'emoji' => '🧫', 'color' => '#ff6b9d'],
    'biochem'   => ['name' => 'بیوشیمی',      'emoji' => '⚗️', 'color' => '#ffb347'],
    'lang'      => ['name' => 'زبان تخصصی',  'emoji' => '📖', 'color' => '#c084fc'],
    'other'     => ['name' => 'سایر',         'emoji' => '📚', 'color' => '#94a3b8'],
]);

function getDB(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $o = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
          PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4, time_zone = '+03:30'"];
    if (env_or('DB_SSL')) $o[PDO::MYSQL_ATTR_SSL_CA] = env_or('DB_SSL_CA', __DIR__ . '/cacert.pem');
    try {
        $pdo = new PDO('mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, $o);
    } catch (PDOException $e) {
        error_log('BioTrack DB connect failed: ' . $e->getMessage());
        http_response_code(500);
        exit('Database connection failed. Check the DB_* environment variables.');
    }
    return $pdo;
}

// Serverless filesystems are ephemeral, so sessions live in MySQL.
class BtSessions implements SessionHandlerInterface {
    const TTL = 2592000; // 30 days
    public function open(string $path, string $name): bool { return true; }
    public function close(): bool { return true; }
    public function read(string $id): string|false {
        $s = getDB()->prepare('SELECT data FROM sessions WHERE id = ? AND ts > ?');
        $s->execute([$id, time() - self::TTL]);
        $d = $s->fetchColumn();
        return $d === false ? '' : $d;
    }
    public function write(string $id, string $data): bool {
        return getDB()->prepare('REPLACE INTO sessions (id, data, ts) VALUES (?, ?, ?)')->execute([$id, $data, time()]);
    }
    public function destroy(string $id): bool {
        return getDB()->prepare('DELETE FROM sessions WHERE id = ?')->execute([$id]);
    }
    public function gc(int $max): int|false {
        $s = getDB()->prepare('DELETE FROM sessions WHERE ts < ?');
        $s->execute([time() - self::TTL]);
        return $s->rowCount();
    }
}

function bt_session_start(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_set_save_handler(new BtSessions(), true);
    $https = !empty($_SERVER['HTTPS']) || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    session_name('BTSESS');
    session_set_cookie_params(['lifetime' => BtSessions::TTL, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

function bt_days_left(): int {
    try {
        $d = (new DateTime('today'))->diff(new DateTime(EXAM_DATE));
        return $d->invert ? 0 : (int)$d->days;
    } catch (Exception $e) { return 0; }
}
function getDaysLeft(): int { return bt_days_left(); }
