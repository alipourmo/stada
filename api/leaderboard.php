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

$filter=$_GET['filter']??'score';
$board=[];$classInfo=null;
if($classCode){
    $stmt=$db->prepare("SELECT * FROM classes WHERE code=?");$stmt->execute([$classCode]);$classInfo=$stmt->fetch();
    $stmt=$db->prepare("SELECT u.id,u.name,u.streak,COALESCE(SUM(s.seconds),0) as ss,(SELECT COALESCE(SUM(total),0) FROM test_results WHERE user_id=u.id) as tt FROM users u LEFT JOIN study_sessions s ON s.user_id=u.id WHERE u.class_code=? GROUP BY u.id");
    $stmt->execute([$classCode]);$board=$stmt->fetchAll();
    foreach($board as &$b){$b['study_hours']=round($b['ss']/3600,1);$b['score']=(int)($b['study_hours']*10+$b['streak']*5+$b['tt']*2);}
    $sk=match($filter){'study'=>'study_hours','tests'=>'tt','streak'=>'streak',default=>'score'};
    usort($board,fn($a,$b)=>$b[$sk]<=>$a[$sk]);
}
$medals=['🥇','🥈','🥉'];
$flabels=['score'=>'امتیاز کل','study'=>'ساعت مطالعه','tests'=>'تعداد تست','streak'=>'Streak'];
?>
<!DOCTYPE html><html lang="fa" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BioTrack — لیدربورد</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#030712;--bg2:#0f172a;--bd:rgba(255,255,255,.07);--tx:#e2e8f0;--mu:#475569;--gr:#00ffa3;--bl:#00d4ff;--or:#ffb347;--pk:#ff6b9d}
body{background:var(--bg);color:var(--tx);font-family:'Vazirmatn',sans-serif;min-height:100vh}
.hdr{position:sticky;top:0;z-index:99;background:rgba(3,7,18,.95);backdrop-filter:blur(20px);border-bottom:1px solid var(--bd);padding:0 24px}
.hdr-in{max-width:1200px;margin:0 auto;display:flex;align-items:center;height:58px;gap:16px}
.logo{display:flex;align-items:center;gap:8px;text-decoration:none}.logo-n{font-size:15px;font-weight:800;color:var(--gr)}.logo-s{font-size:10px;color:var(--mu)}
nav{display:flex;gap:4px;flex:1;justify-content:center}
.nl{display:flex;align-items:center;gap:5px;padding:7px 13px;border-radius:9px;text-decoration:none;font-size:13px;color:var(--mu);transition:.2s}
.nl:hover{background:rgba(255,255,255,.04);color:#94a3b8}.nl.on{background:rgba(0,255,163,.1);color:var(--gr)}
.bds{display:flex;align-items:center;gap:8px}
.bd{font-size:12px;padding:4px 11px;border-radius:20px}
.bd-f{background:rgba(255,179,71,.1);color:var(--or);border:1px solid rgba(255,179,71,.3)}
.bd-c{background:rgba(0,255,163,.08);color:var(--gr);border:1px solid rgba(0,255,163,.2)}
.usr{font-size:12px;color:#94a3b8}.out{color:var(--mu);text-decoration:none;font-size:12px;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,.04)}
.wrap{max-width:1200px;margin:0 auto;padding:28px 24px}
.ph{margin-bottom:22px;display:flex;justify-content:space-between;align-items:flex-start}
.ph h2{font-size:21px;font-weight:700}
.card{background:rgba(10,15,30,.8);border:1px solid var(--bd);border-radius:16px;padding:20px}
.ft{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
.fa{padding:9px 16px;border-radius:9px;text-decoration:none;font-size:13px;color:var(--mu);border:1px solid var(--bd);background:rgba(255,255,255,.02);transition:.2s}
.fa:hover{background:rgba(255,255,255,.05);color:#94a3b8}
.fa.on{background:rgba(0,212,255,.1);color:var(--bl);border-color:rgba(0,212,255,.3)}
.llist{display:flex;flex-direction:column;gap:12px}
.lc{background:rgba(10,15,30,.8);border:1px solid var(--bd);border-radius:16px;padding:18px;display:flex;align-items:center;gap:14px;transition:border .2s}
.lc-me{border-color:rgba(0,255,163,.3);background:rgba(0,255,163,.02)}
.lrk{font-size:26px;width:38px;text-align:center}
.rn{font-size:16px;font-weight:800;color:var(--mu)}
.lav{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#0f172a,#1e293b);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;border:2px solid var(--bd);flex-shrink:0}
.linf{flex:1}
.lbar{background:rgba(255,255,255,.05);border-radius:3px;height:3px;margin-top:9px}
.lbf{height:100%;border-radius:3px;transition:width .5s}
.ybdg{font-size:10px;background:rgba(0,255,163,.15);color:var(--gr);border-radius:20px;padding:2px 8px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:20px}
.ms{background:rgba(255,179,71,.05);border-radius:10px;padding:14px;text-align:center}
.mv{font-size:20px;font-weight:800;color:var(--or)}.ml{font-size:11px;color:var(--mu);margin-top:4px}
.empty{text-align:center;color:#334155;font-size:13px;padding:40px 0}
.code-badge{background:rgba(0,255,163,.1);color:var(--gr);border:1px solid rgba(0,255,163,.2);padding:3px 10px;border-radius:20px;font-size:12px}
.btn-a{display:inline-block;padding:12px 22px;background:linear-gradient(135deg,var(--gr),var(--bl));color:#030712;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px}
.btn-b{display:inline-block;padding:12px 22px;background:rgba(255,255,255,.05);color:#94a3b8;border:1px solid var(--bd);border-radius:10px;text-decoration:none;font-weight:600;font-size:14px}
@media(max-width:900px){nav{display:none}.g3{grid-template-columns:1fr 1fr}}
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
  <div class="ph">
    <div>
      <h2>🏆 لیدربورد رقابتی</h2>
      <?php if($classInfo):?>
      <div style="display:flex;align-items:center;gap:10px;margin-top:8px">
        <span style="font-size:13px;color:var(--mu)">کلاس: <strong style="color:var(--gr)"><?=htmlspecialchars($classInfo['name'])?></strong></span>
        <span class="code-badge">کد: <?=$classInfo['code']?></span>
      </div>
      <?php endif;?>
    </div>
  </div>

  <?php if(!$classCode):?>
  <div class="card" style="text-align:center;padding:50px 20px">
    <div style="font-size:48px;margin-bottom:16px">👥</div>
    <div style="font-size:18px;font-weight:600;margin-bottom:8px">عضو کلاسی نیستید</div>
    <div style="font-size:13px;color:var(--mu);margin-bottom:24px">برای رقابت با همکلاسی‌ها یک کلاس بسازید یا با کد بپیوندید</div>
    <div style="display:flex;gap:12px;justify-content:center">
      <a href="<?=APP_URL?>/class.php" class="btn-a">ساختن کلاس</a>
      <a href="<?=APP_URL?>/class.php" class="btn-b">پیوستن با کد</a>
    </div>
  </div>
  <?php else:?>

  <div class="ft">
    <?php foreach($flabels as $k=>$l):?>
    <a href="?filter=<?=$k?>" class="fa <?=$filter===$k?'on':''?>"><?=$l?></a>
    <?php endforeach;?>
  </div>

  <?php
  $sk=match($filter){'study'=>'study_hours','tests'=>'tt','streak'=>'streak',default=>'score'};
  $topVal=$board[0][$sk]??1;
  ?>
  <div class="llist">
    <?php foreach($board as $i=>$u):
      $isMe=$u['id']==$uid;
      $rawVal=$u[$sk];
      $dispVal=match($filter){'study'=>$u['study_hours'].'h','tests'=>$u['tt'],'streak'=>$u['streak'].' 🔥',default=>$u['score']};
      $pct=$topVal>0?round($rawVal/$topVal*100):0;
      $vcolor=$i===0?'#ffb347':($isMe?'#00ffa3':'#64748b');
      $initials=mb_substr($u['name'],0,1);
    ?>
    <div class="lc <?=$isMe?'lc-me':''?>">
      <div class="lrk"><?= $i<3 ? $medals[$i] : '<span class="rn">#'.($i+1).'</span>' ?></div>
      <div class="lav"><?=$initials?></div>
      <div class="linf">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:15px;font-weight:600;color:<?=$isMe?'#00ffa3':'#e2e8f0'?>"><?=htmlspecialchars($u['name'])?></span>
          <?php if($isMe):?><span class="ybdg">شما</span><?php endif;?>
        </div>
        <div style="display:flex;gap:16px;margin-top:5px">
          <span style="font-size:12px;color:var(--mu)">⏱️ <?=$u['study_hours']?>h</span>
          <span style="font-size:12px;color:var(--mu)">📝 <?=$u['tt']?> تست</span>
          <span style="font-size:12px;color:var(--mu)">🔥 <?=$u['streak']?> روز</span>
        </div>
        <div class="lbar"><div class="lbf" style="width:<?=$pct?>%;background:<?=$isMe?'#00ffa3':($i===0?'#ffb347':'#334155')?>"></div></div>
      </div>
      <div style="text-align:center;min-width:70px">
        <div style="font-size:28px;font-weight:800;color:<?=$vcolor?>"><?=$dispVal?></div>
        <div style="font-size:10px;color:var(--mu)"><?=$flabels[$filter]?></div>
      </div>
    </div>
    <?php endforeach;?>
  </div>

  <div class="card" style="margin-top:22px;border-color:rgba(255,179,71,.15)">
    <div style="font-size:13px;font-weight:600;color:var(--or);margin-bottom:12px">🏅 سیستم امتیازدهی</div>
    <div class="g3">
      <div class="ms"><div class="mv">+۱۰</div><div class="ml">هر ساعت مطالعه</div></div>
      <div class="ms"><div class="mv">+۵</div><div class="ml">هر روز streak</div></div>
      <div class="ms"><div class="mv">+۲</div><div class="ml">هر سوال تست</div></div>
    </div>
  </div>
  <?php endif;?>
</div>
</body></html>
