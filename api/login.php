<?php
require_once __DIR__ . '/../lib/bootstrap.php';


// ── اتصال دیتابیس ──────────────────────────────────────────────


// ── Session ─────────────────────────────────────────────────────
bt_session_start();
if (isset($_SESSION['user_id'])) {
    header('Location: ' . APP_URL . '/index.php');
    exit;
}

$error = '';
$success = '';
$tab = $_GET['tab'] ?? 'login';

// ── پردازش فرم ──────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'login') {
        $email    = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        try {
            $db   = getDB();
            $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            if ($user && password_verify($password, $user['password'])) {
                $_SESSION['user_id']   = $user['id'];
                $_SESSION['user_name'] = $user['name'];
                header('Location: ' . APP_URL . '/index.php');
                exit;
            } else {
                $error = 'ایمیل یا رمز عبور اشتباه است';
            }
        } catch (Exception $e) {
            $error = 'خطای دیتابیس: ' . $e->getMessage();
        }

    } elseif ($action === 'register') {
        $name     = trim($_POST['name'] ?? '');
        $email    = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $code     = strtoupper(trim($_POST['class_code'] ?? ''));

        if (!$name || !$email || !$password) {
            $error = 'لطفاً تمام فیلدها را پر کنید';
        } elseif (strlen($password) < 6) {
            $error = 'رمز عبور باید حداقل ۶ کاراکتر باشد';
        } else {
            try {
                $db = getDB();
                // چک ایمیل تکراری
                $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
                $stmt->execute([$email]);
                if ($stmt->fetch()) {
                    $error = 'این ایمیل قبلاً ثبت شده است';
                } else {
                    // چک کد کلاس
                    if ($code) {
                        $stmt = $db->prepare("SELECT id FROM classes WHERE code = ?");
                        $stmt->execute([$code]);
                        if (!$stmt->fetch()) {
                            $error = 'کد کلاس نامعتبر است';
                            goto render;
                        }
                    }
                    $hash = password_hash($password, PASSWORD_DEFAULT);
                    $stmt = $db->prepare(
                        "INSERT INTO users (name, email, password, class_code) VALUES (?, ?, ?, ?)"
                    );
                    $stmt->execute([$name, $email, $hash, $code ?: null]);
                    $userId = $db->lastInsertId();
                    $_SESSION['user_id']   = $userId;
                    $_SESSION['user_name'] = $name;
                    header('Location: ' . APP_URL . '/index.php');
                    exit;
                }
            } catch (Exception $e) {
                $error = 'خطای دیتابیس: ' . $e->getMessage();
            }
        }
    }
}
render:
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BioTrack — ورود</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#030712;color:#e2e8f0;font-family:'Vazirmatn',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background-image:radial-gradient(ellipse at 50% 0%,rgba(0,255,163,.07) 0%,transparent 60%)}
.box{background:#0f172a;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:40px;width:100%;max-width:430px}
.logo{text-align:center;margin-bottom:28px}
.logo h1{font-size:26px;font-weight:800;color:#00ffa3;margin:10px 0 4px}
.logo p{font-size:13px;color:#475569}
.tabs{display:flex;background:rgba(255,255,255,.03);border-radius:10px;padding:4px;margin-bottom:22px}
.tab{flex:1;text-align:center;padding:10px;border-radius:8px;text-decoration:none;font-size:14px;color:#64748b;transition:.2s}
.tab.on{background:rgba(0,255,163,.1);color:#00ffa3;font-weight:700}
.g{margin-bottom:14px}
.g label{display:block;font-size:12px;color:#64748b;margin-bottom:5px;font-weight:500}
input{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:11px 13px;color:#e2e8f0;font-family:inherit;font-size:14px;outline:none;transition:.2s}
input:focus{border-color:rgba(0,255,163,.4)}
.btn{width:100%;padding:13px;background:linear-gradient(135deg,#00ffa3,#00d4ff);color:#030712;border:none;border-radius:12px;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;margin-top:6px;transition:.2s}
.btn:hover{opacity:.9;transform:translateY(-1px)}
.err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);color:#fca5a5;padding:11px 14px;border-radius:10px;font-size:13px;margin-bottom:16px}
.foot{margin-top:18px;text-align:center;font-size:12px;color:#475569}
.foot a{color:#00ffa3;text-decoration:none}
</style>
</head>
<body>
<div class="box">
  <div class="logo">
    <div style="font-size:44px">🧬</div>
    <h1>BioTrack</h1>
    <p>داشبورد کنکور زیست‌شناسی</p>
  </div>

  <div class="tabs">
    <a href="?tab=login"    class="tab <?= $tab==='login'    ? 'on' : '' ?>">ورود</a>
    <a href="?tab=register" class="tab <?= $tab==='register' ? 'on' : '' ?>">ثبت‌نام</a>
  </div>

  <?php if ($error): ?><div class="err"><?= htmlspecialchars($error) ?></div><?php endif; ?>

  <?php if ($tab === 'login'): ?>
  <form method="POST">
    <input type="hidden" name="action" value="login">
    <div class="g"><label>ایمیل</label>
      <input type="email" name="email" required placeholder="example@email.com"
             value="<?= htmlspecialchars($_POST['email'] ?? '') ?>">
    </div>
    <div class="g"><label>رمز عبور</label>
      <input type="password" name="password" required placeholder="••••••••">
    </div>
    <button class="btn">ورود به داشبورد</button>
  </form>

  <?php else: ?>
  <form method="POST">
    <input type="hidden" name="action" value="register">
    <div class="g"><label>نام کامل</label>
      <input type="text" name="name" required placeholder="مثلاً: علی رضایی"
             value="<?= htmlspecialchars($_POST['name'] ?? '') ?>">
    </div>
    <div class="g"><label>ایمیل</label>
      <input type="email" name="email" required placeholder="example@email.com"
             value="<?= htmlspecialchars($_POST['email'] ?? '') ?>">
    </div>
    <div class="g"><label>رمز عبور <span style="color:#475569;font-size:11px">(حداقل ۶ کاراکتر)</span></label>
      <input type="password" name="password" required minlength="6" placeholder="••••••••">
    </div>
    <div class="g"><label>کد کلاس <span style="color:#475569;font-size:11px">(اختیاری)</span></label>
      <input type="text" name="class_code" placeholder="مثلاً: ABC123" maxlength="10"
             style="text-transform:uppercase;letter-spacing:2px"
             value="<?= htmlspecialchars(strtoupper($_POST['class_code'] ?? '')) ?>">
    </div>
    <button class="btn">ثبت‌نام رایگان</button>
  </form>
  <?php endif; ?>

  <div class="foot">
    می‌خواهید کلاس بسازید؟ <a href="<?= APP_URL ?>/class.php">ایجاد کلاس جدید</a>
  </div>
</div>
</body>
</html>
