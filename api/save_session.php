<?php
require_once __DIR__ . '/../lib/bootstrap.php';
header('Content-Type: application/json; charset=utf-8');
bt_session_start();
if (!isset($_SESSION['user_id'])) { http_response_code(401); echo json_encode(['error' => 'unauthorized']); exit; }
$b = json_decode(file_get_contents('php://input'), true) ?: [];
$sub = (is_string($b['subject'] ?? null) && isset(SUBJECTS[$b['subject']])) ? $b['subject'] : 'other';
$secs = (int)($b['seconds'] ?? 0);
if ($secs < 1 || $secs > 3600) { http_response_code(400); echo json_encode(['error' => 'invalid']); exit; }
$uid = (int)$_SESSION['user_id']; $db = getDB();
$today = date('Y-m-d'); $yest = date('Y-m-d', strtotime('-1 day'));
$db->prepare('INSERT INTO study_sessions (user_id, subject, seconds, session_date) VALUES (?,?,?,?)')->execute([$uid, $sub, $secs, $today]);
$st = $db->prepare('SELECT streak, last_study_date FROM users WHERE id = ?'); $st->execute([$uid]); $u = $st->fetch();
$streak = (int)($u['streak'] ?? 0); $last = $u['last_study_date'] ?? null;
if ($last === $yest) $streak++; elseif ($last !== $today) $streak = 1;
$db->prepare('UPDATE users SET streak = ?, last_study_date = ? WHERE id = ?')->execute([$streak, $today, $uid]);
echo json_encode(['success' => true, 'streak' => $streak]);
