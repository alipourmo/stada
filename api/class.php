<?php
require_once __DIR__ . '/../lib/bootstrap.php';

bt_session_start();
if(!isset($_SESSION['user_id'])){header('Location: '.APP_URL.'/login.php');exit;}
$uid=(int)$_SESSION['user_id'];
$db=getDB();
$firstName=explode(' ',$_SESSION['user_name']??'')[0];
$daysLeft=bt_days_left();
$stmt=$db->prepare("SELECT streak,class_code FROM users WHERE id=?");$stmt->execute([$uid]);$urow=$stmt->fetch();
$streak=(int)($urow['streak']??0);$classCode=$urow['class_code']??null;

$success='';$error='';
if($_SERVER['REQUEST_METHOD']==='POST'){
    $action=$_POST['action']??'';
    if($action==='create'){
        $name=trim($_POST['class_name']??'');
        if(!$name){$error='نام کلاس را وارد کنید';}
        else{
            $code=strtoupper(substr(md5(uniqid()),0,6));
            $db->prepare("INSERT INTO classes(code,name,created_by)VALUES(?,?,?)")->execute([$code,$name,$uid]);
            $db->prepare("UPDATE users SET class_code=? WHERE id=?")->execute([$code,$uid]);
            $classCode=$code;
            $success="کلاس ساخته شد! کد کلاس: <strong style='font-size:22px;letter-spacing:3px'>$code</strong><br><small>این کد را به همکلاسی‌هایتان بدهید</small>";
        }
    } elseif($action==='join'){
        $code=strtoupper(trim($_POST['code']??''));
        $stmt=$db->prepare("SELECT id FROM classes WHERE code=?");$stmt->execute([$code]);
        if(!$stmt->fetch()){$error='کد کلاس نامعتبر است';}
        else{$db->prepare("UPDATE users SET class_code=? WHERE id=?")->execute([$code,$uid]);header('Location: '.APP_URL.'/leaderboard.php');exit;}
    }
}
?>
<!DOCTYPE html><html lang="fa" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BioTrack — مدیریت کلاس</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#030712;--bg2:#0f172a;--bd:rgba(255,255,255,.07);--tx:#e2e8f0;--mu:#475569;--gr:#00ffa3;--bl:#00d4ff;--or:#ffb347}
body{background:var(--bg);color:var(--tx);font-family:'Vazirmatn',sans-serif;min-height:100vh}
.hdr{position:sticky;top:0;z-index:99;background:rgba(3,7,18,.95);backdrop-filter:blur(20px);border-bottom:1px solid var(--bd);padding:0 24px}
.hdr-in{max-width:1200px;margin:0 auto;display:flex;align-items:center;height:58px;gap:16px}
.logo{display:flex;align-items:center;gap:8px;text-decoration:none}.logo-n{font-size:15px;font-weight:800;color:var(--gr)}.logo-s{font-size:10px;color:var(--mu)}
nav{display:flex;gap:4px;flex:1;justify-content:center}.nl{display:flex;align-items:center;gap:5px;padding:7px 13px;border-radius:9px;text-decoration:none;font-size:13px;color:var(--mu);transition:.2s}.nl:hover{background:rgba(255,255,255,.04);color:#94a3b8}.nl.on{background:rgba(0,255,163,.1);color:var(--gr)}
.bds{display:flex;align-items:center;gap:8px}.bd{font-size:12px;padding:4px 11px;border-radius:20px}.bd-f{background:rgba(255,179,71,.1);color:var(--or);border:1px solid rgba(255,179,71,.3)}.bd-c{background:rgba(0,255,163,.08);color:var(--gr);border:1px solid rgba(0,255,163,.2)}
.usr{font-size:12px;color:#94a3b8}.out{color:var(--mu);text-decoration:none;font-size:12px;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,.04)}
.wrap{max-width:1200px;margin:0 auto;padding:28px 24px}
.ph{margin-bottom:22px}.ph h2{font-size:21px;font-weight:700}
.card{background:rgba(10,15,30,.8);border:1px solid var(--bd);border-radius:16px;padding:24px}
.ct{font-size:13px;font-weight:600;color:#94a3b8;margin-bottom:16px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.g{margin-bottom:14px}.g label{display:block;font-size:12px;color:var(--mu);margin-bottom:5px;font-weight:500}
input{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:11px 13px;color:var(--tx);font-family:inherit;font-size:14px;outline:none;transition:.2s}
input:focus{border-color:rgba(0,255,163,.4)}
.btn{width:100%;padding:12px;background:linear-gradient(135deg,var(--gr),var(--bl));color:#030712;border:none;border-radius:10px;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;transition:.2s;margin-top:4px}
.btn:hover{transform:translateY(-1px);box-shadow:0 8px 25px rgba(0,255,163,.25)}
.alert-ok{background:rgba(0,255,163,.08);border:1px solid rgba(0,255,163,.25);color:var(--gr);padding:14px 16px;border-radius:10px;font-size:14px;margin-bottom:16px;text-align:center;line-height:1.8}
.alert-err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);color:#fca5a5;padding:11px 14px;border-radius:10px;font-size:13px;margin-bottom:14px}
@media(max-width:900px){.g2{grid-template-columns:1fr}nav{display:none}}
</style>
</head>
<body>
<div class="hdr"><div class="hdr-in">
  <a class="logo" href="<?=APP_URL?>/index.php"><span style="font-size:22px">🧬</span><div><div class="logo-n">BioTrack</div><div class="logo-s">کنکور زیست</div></div></a>
  <nav>
    <?php foreach([['index.php','📊','داشبورد'],['pomodoro.php','⏱️','پومودورو'],['tests.php','📝','ثبت تست'],['leaderboard.php','🏆','لیدربورد'],['reports.php','📈','گزارش']] as [$pg,$ic,$lb]):$on=basename($_SERVER['PHP_SELF'])===$pg?'on':'';?>
    <a class="nl <?=$on?>" href="<?=APP_URL?>/<?=$pg?>"><?=$ic?> <?=$lb?></a>
    <?php endforeach;?>
  </nav>
  <div class="bds">
    <div class="bd bd-f">🔥 <?=$streak?> روز</div>
    <div class="bd bd-c">⏰ <?=$daysLeft?> روز</div>
    <span class="usr"><?=htmlspecialchars($firstName)?></span>
    <a class="out" href="<?=APP_URL?>/logout.php">خروج</a>
  </div>
</div></div>

<div class="wrap">
  <div class="ph"><h2>👥 مدیریت کلاس</h2></div>
  <?php if($success):?><div class="alert-ok"><?=$success?></div><?php endif;?>
  <?php if($error):?><div class="alert-err"><?=htmlspecialchars($error)?></div><?php endif;?>
  <div class="g2">
    <div class="card">
      <div class="ct">🏫 ساختن کلاس جدید</div>
      <form method="POST">
        <input type="hidden" name="action" value="create">
        <div class="g"><label>نام کلاس</label>
          <input type="text" name="class_name" required placeholder="مثلاً: گروه ارشد زیست ۱۴۰۳">
        </div>
        <button type="submit" class="btn">ساختن کلاس</button>
      </form>
    </div>
    <div class="card">
      <div class="ct">🔑 پیوستن با کد کلاس</div>
      <form method="POST">
        <input type="hidden" name="action" value="join">
        <div class="g"><label>کد کلاس</label>
          <input type="text" name="code" required placeholder="مثلاً: ABC123" maxlength="10" style="text-transform:uppercase;letter-spacing:3px">
        </div>
        <button type="submit" class="btn">پیوستن</button>
      </form>
      <?php if($classCode):?>
      <div style="margin-top:16px;padding:12px;background:rgba(0,255,163,.05);border:1px solid rgba(0,255,163,.2);border-radius:10px;font-size:13px;text-align:center">
        کد کلاس فعلی: <strong style="color:var(--gr);font-size:18px;letter-spacing:3px"><?=$classCode?></strong>
      </div>
      <?php endif;?>
    </div>
  </div>
</div>
</body></html>
