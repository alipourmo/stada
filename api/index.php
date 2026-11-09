<?php
require_once __DIR__ . '/../lib/bootstrap.php';


// ── DB ─────────────────────────────────────────────────────────


// ── Session / Auth ──────────────────────────────────────────────
bt_session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: ' . APP_URL . '/login.php');
    exit;
}

// ── توابع کمکی ─────────────────────────────────────────────────

function fmtSecs($s) {
    $h = floor($s/3600); $m = floor(($s%3600)/60);
    return $h > 0 ? "{$h}h {$m}m" : "{$m}m";
}

$db   = getDB();
$uid  = (int)$_SESSION['user_id'];

// کاربر
$user = $db->prepare("SELECT * FROM users WHERE id=?");
$user->execute([$uid]);
$user = $user->fetch();
if (!$user) { session_destroy(); header('Location: '.APP_URL.'/login.php'); exit; }

// آمار مطالعه
$stmt = $db->prepare("SELECT subject, SUM(seconds) as t FROM study_sessions WHERE user_id=? GROUP BY subject");
$stmt->execute([$uid]);
$subTimes = [];
while ($r = $stmt->fetch()) $subTimes[$r['subject']] = (int)$r['t'];
$totalSecs = array_sum($subTimes);

// آمار تست
$stmt = $db->prepare("SELECT SUM(total) as t, SUM(wrong) as w FROM test_results WHERE user_id=?");
$stmt->execute([$uid]);
$tr = $stmt->fetch();
$totalTests = (int)($tr['t'] ?? 0);
$totalWrong = (int)($tr['w'] ?? 0);
$accuracy   = $totalTests > 0 ? round(($totalTests-$totalWrong)/$totalTests*100,1) : 0;

// streak — بررسی شکستن
$streak    = (int)$user['streak'];
$lastDate  = $user['last_study_date'];
$yesterday = date('Y-m-d', strtotime('-1 day'));
$today     = date('Y-m-d');
if ($lastDate && $lastDate !== $today && $lastDate !== $yesterday) {
    $streak = 0;
    $db->prepare("UPDATE users SET streak=0 WHERE id=?")->execute([$uid]);
}

// رتبه در گروه
$rank = '—';
if ($user['class_code']) {
    $stmt = $db->prepare("
        SELECT u.id, COALESCE(SUM(s.seconds),0) as ss,
               (SELECT COALESCE(SUM(total),0) FROM test_results WHERE user_id=u.id) as tt
        FROM users u LEFT JOIN study_sessions s ON s.user_id=u.id
        WHERE u.class_code=? GROUP BY u.id
    ");
    $stmt->execute([$user['class_code']]);
    $board = $stmt->fetchAll();
    usort($board, fn($a,$b) => ($b['ss']/3600*10 + $b['tt']*2) <=> ($a['ss']/3600*10 + $a['tt']*2));
    foreach ($board as $i => $u2) {
        if ($u2['id'] == $uid) { $rank = '#'.($i+1); break; }
    }
}

// داده هفتگی
$stmt = $db->prepare("SELECT session_date, SUM(seconds) as t FROM study_sessions WHERE user_id=? AND session_date >= DATE_SUB(CURDATE(),INTERVAL 7 DAY) GROUP BY session_date");
$stmt->execute([$uid]);
$wRows = []; foreach ($stmt->fetchAll() as $r) $wRows[$r['session_date']] = $r['t'];
$weekData = []; $weekLabels = [];
$daysFA = ['Mon'=>'دوش','Tue'=>'سه','Wed'=>'چهار','Thu'=>'پنج','Fri'=>'جمع','Sat'=>'شنب','Sun'=>'یکش'];
for ($i=6;$i>=0;$i--) {
    $d = date('Y-m-d', strtotime("-{$i} days"));
    $weekLabels[] = $daysFA[date('D',strtotime($d))] ?? date('D',strtotime($d));
    $weekData[]   = round(($wRows[$d] ?? 0)/60);
}

// تاریخچه تست
$stmt = $db->prepare("SELECT subject,total,wrong,accuracy,test_date FROM test_results WHERE user_id=? ORDER BY created_at DESC LIMIT 5");
$stmt->execute([$uid]);
$testHistory = $stmt->fetchAll();
$stmt2 = $db->prepare("SELECT accuracy FROM test_results WHERE user_id=? ORDER BY created_at ASC LIMIT 10");
$stmt2->execute([$uid]);
$testAccArr = array_column($stmt2->fetchAll(), 'accuracy');

$daysLeft  = getDaysLeft();
$firstName = explode(' ', $user['name'])[0];
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BioTrack — داشبورد</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#030712;--bg1:#0a0f1e;--bg2:#0f172a;--bd:rgba(255,255,255,.07);--tx:#e2e8f0;--mu:#475569;--mu2:#64748b;--gr:#00ffa3;--bl:#00d4ff;--pk:#ff6b9d;--or:#ffb347}
body{background:var(--bg);color:var(--tx);font-family:'Vazirmatn',sans-serif;min-height:100vh}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:var(--bg2)}::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}

/* header */
.hdr{position:sticky;top:0;z-index:99;background:rgba(3,7,18,.95);backdrop-filter:blur(20px);border-bottom:1px solid var(--bd);padding:0 24px}
.hdr-in{max-width:1200px;margin:0 auto;display:flex;align-items:center;height:58px;gap:16px}
.logo{display:flex;align-items:center;gap:8px;text-decoration:none}
.logo-n{font-size:15px;font-weight:800;color:var(--gr)}
.logo-s{font-size:10px;color:var(--mu)}
nav{display:flex;gap:4px;flex:1;justify-content:center}
.nl{display:flex;align-items:center;gap:5px;padding:7px 13px;border-radius:9px;text-decoration:none;font-size:13px;color:var(--mu);transition:.2s}
.nl:hover{background:rgba(255,255,255,.04);color:#94a3b8}
.nl.on{background:rgba(0,255,163,.1);color:var(--gr)}
.bds{display:flex;align-items:center;gap:8px}
.bd{font-size:12px;padding:4px 11px;border-radius:20px}
.bd-f{background:rgba(255,179,71,.1);color:var(--or);border:1px solid rgba(255,179,71,.3)}
.bd-c{background:rgba(0,255,163,.08);color:var(--gr);border:1px solid rgba(0,255,163,.2)}
.usr{font-size:12px;color:#94a3b8}
.out{color:var(--mu);text-decoration:none;font-size:12px;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,.04)}
.out:hover{color:#ef4444}

/* layout */
.wrap{max-width:1200px;margin:0 auto;padding:28px 24px}
.ph{margin-bottom:22px}
.ph h2{font-size:21px;font-weight:700}
.ph p{font-size:13px;color:var(--mu);margin-top:3px}

/* cards */
.card{background:rgba(10,15,30,.8);border:1px solid var(--bd);border-radius:16px;padding:20px}
.ct{font-size:13px;font-weight:600;color:#94a3b8;margin-bottom:14px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
.sc{background:rgba(10,15,30,.8);border:1px solid var(--bd);border-radius:14px;padding:18px;display:flex;justify-content:space-between;align-items:flex-start}
.sl{font-size:11px;color:var(--mu);margin-bottom:7px;font-weight:500}
.sv{font-size:30px;font-weight:800;line-height:1}
.ss{font-size:11px;color:var(--mu);margin-top:3px}
.si{font-size:25px}

/* countdown */
.cdb{display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,rgba(0,255,163,.04),rgba(0,212,255,.04));border:1px solid rgba(0,255,163,.18);border-radius:16px;padding:20px 24px;margin-bottom:20px}
.cdb-n{font-size:38px;font-weight:800;color:var(--gr);line-height:1}
.cdb-l{font-size:12px;color:var(--mu);margin-top:3px}
.pb{background:rgba(255,255,255,.05);border-radius:4px;height:6px;width:200px}
.pbf{background:linear-gradient(90deg,var(--gr),var(--bl));border-radius:4px;height:100%;transition:width .5s}

/* 2 cols */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}

/* subject grid */
.sg{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.sb{background:rgba(255,255,255,.02);border-radius:12px;padding:14px;border:1px solid}
.sv2{font-size:22px;font-weight:800;line-height:1;margin-top:4px}
.mp{background:rgba(255,255,255,.05);border-radius:3px;height:3px;margin-top:8px}
.mpf{height:100%;border-radius:3px}

/* test history */
.tl{display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto}
.ti{display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.02);border:1px solid var(--bd);border-radius:8px;padding:10px 13px}
.ti-name{font-size:13px}
.ti-sub{font-size:11px;color:var(--mu);margin-top:2px}
.ta{font-size:20px;font-weight:800}

.empty{text-align:center;color:#334155;font-size:13px;padding:24px 0}

@media(max-width:900px){
  .g4{grid-template-columns:1fr 1fr}
  .g2{grid-template-columns:1fr}
  nav{display:none}
  .sg{grid-template-columns:1fr 1fr}
}
</style>
</head>
<body>

<div class="hdr">
  <div class="hdr-in">
    <a class="logo" href="<?=APP_URL?>/">
      <span style="font-size:22px">🧬</span>
      <div><div class="logo-n">BioTrack</div><div class="logo-s">کنکور زیست</div></div>
    </a>
    <nav>
      <?php
      $nav=[
        ['index.php','📊','داشبورد'],
        ['pomodoro.php','⏱️','پومودورو'],
        ['tests.php','📝','ثبت تست'],
        ['leaderboard.php','🏆','لیدربورد'],
        ['reports.php','📈','گزارش'],
      ];
      foreach($nav as [$page,$ic,$lb]):
        $on = basename($_SERVER['PHP_SELF'])===$page ? 'on' : '';
      ?>
        <a class="nl <?=$on?>" href="<?=APP_URL?>/<?=$page?>"><?=$ic?> <?=$lb?></a>
      <?php endforeach; ?>
    </nav>
    <div class="bds">
      <div class="bd bd-f">🔥 <?=$streak?> روز</div>
      <div class="bd bd-c">⏰ <?=$daysLeft?> روز</div>
      <span class="usr"><?=htmlspecialchars($firstName)?></span>
      <a class="out" href="<?=APP_URL?>/logout.php">خروج</a>
    </div>
  </div>
</div>

<div class="wrap">
  <div class="ph">
    <h2>سلام <?=htmlspecialchars($firstName)?> 👋</h2>
    <p>امروز چه درسی می‌خوانی؟</p>
  </div>

  <!-- stat cards -->
  <div class="g4">
    <?php foreach([
      ['کل زمان مطالعه', fmtSecs($totalSecs), '', '⏱️', '#00ffa3'],
      ['دقت تست‌ها', $accuracy.'%', 'از '.$totalTests.' تست', '🎯', '#00d4ff'],
      ['روزهای پیوسته', $streak, 'streak 🔥', '🔥', '#ffb347'],
      ['رتبه در گروه', $rank, 'لیدربورد', '🏆', '#ff6b9d'],
    ] as [$l,$v,$s,$ic,$c]): ?>
    <div class="sc">
      <div>
        <div class="sl"><?=$l?></div>
        <div class="sv" style="color:<?=$c?>"><?=$v?></div>
        <?php if($s): ?><div class="ss"><?=$s?></div><?php endif; ?>
      </div>
      <span class="si"><?=$ic?></span>
    </div>
    <?php endforeach; ?>
  </div>

  <!-- countdown -->
  <div class="cdb">
    <div>
      <div style="font-size:12px;color:var(--mu);margin-bottom:12px">زمان باقی‌مانده تا کنکور</div>
      <div style="display:flex;gap:24px">
        <?php foreach([[$daysLeft,'روز'],[floor($daysLeft/7),'هفته'],[floor($daysLeft/30),'ماه']] as [$v,$l]): ?>
        <div style="text-align:center">
          <div class="cdb-n"><?=$v?></div>
          <div class="cdb-l"><?=$l?></div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
    <div style="text-align:left">
      <div style="font-size:12px;color:var(--mu);margin-bottom:6px">هدف: ۵۰۰ ساعت مطالعه</div>
      <div class="pb"><div class="pbf" style="width:<?=min(100,round($totalSecs/3600/500*100))?>%"></div></div>
      <div style="font-size:11px;color:var(--mu);margin-top:4px"><?=round($totalSecs/3600,1)?>h از ۵۰۰h</div>
    </div>
  </div>

  <!-- charts -->
  <div class="g2">
    <div class="card">
      <div class="ct">⏱️ مطالعه ۷ روز اخیر (دقیقه)</div>
      <div style="position:relative;height:200px"><canvas id="wChart"></canvas></div>
    </div>
    <div class="card">
      <div class="ct">📊 روند دقت تست‌ها</div>
      <?php if(count($testAccArr)>=2): ?>
        <div style="position:relative;height:200px"><canvas id="tChart"></canvas></div>
      <?php else: ?>
        <div class="empty">حداقل ۲ تست ثبت کنید</div>
      <?php endif; ?>
    </div>
  </div>

  <!-- subject times + test history -->
  <div class="g2">
    <div class="card">
      <div class="ct">📚 زمان مطالعه به تفکیک درس</div>
      <div class="sg">
        <?php foreach(SUBJECTS as $k=>$sub):
          $secs=$subTimes[$k]??0;
          $pct=min(100,round($secs/3600/5*100));
        ?>
        <div class="sb" style="border-color:<?=$sub['color']?>22">
          <div style="font-size:12px;color:#94a3b8"><?=$sub['emoji']?> <?=$sub['name']?></div>
          <div class="sv2" style="color:<?=$sub['color']?>"><?=fmtSecs($secs)?></div>
          <div class="mp"><div class="mpf" style="width:<?=$pct?>%;background:<?=$sub['color']?>"></div></div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
    <div class="card">
      <div class="ct">🕐 آخرین تست‌ها</div>
      <?php if($testHistory): ?>
      <div class="tl">
        <?php foreach($testHistory as $t):
          $acc=(float)$t['accuracy'];
          $c=$acc>=70?'#00ffa3':($acc>=50?'#ffb347':'#ef4444');
        ?>
        <div class="ti">
          <div>
            <div class="ti-name"><?=SUBJECTS[$t['subject']]['emoji']??'📚'?> <?=SUBJECTS[$t['subject']]['name']??$t['subject']?></div>
            <div class="ti-sub"><?=$t['test_date']?> | <?=$t['total']?> سوال، <?=$t['wrong']?> غلط</div>
          </div>
          <div class="ta" style="color:<?=$c?>"><?=$acc?>%</div>
        </div>
        <?php endforeach; ?>
      </div>
      <?php else: ?>
        <div class="empty">هنوز تستی ثبت نشده<br><a href="<?=APP_URL?>/tests.php" style="color:var(--gr);font-size:12px;text-decoration:none;margin-top:8px;display:inline-block">ثبت اولین تست ←</a></div>
      <?php endif; ?>
    </div>
  </div>
</div>

<script>
Chart.defaults.color='#475569';
Chart.defaults.font.family="'Vazirmatn',sans-serif";
Chart.defaults.font.size=11;
Chart.defaults.plugins.legend.display=false;
Chart.defaults.plugins.tooltip.backgroundColor='#0f172a';
Chart.defaults.plugins.tooltip.borderColor='rgba(255,255,255,.1)';
Chart.defaults.plugins.tooltip.borderWidth=1;
Chart.defaults.plugins.tooltip.titleColor='#e2e8f0';
Chart.defaults.plugins.tooltip.bodyColor='#94a3b8';
Chart.defaults.plugins.tooltip.cornerRadius=8;

const gc={responsive:true,maintainAspectRatio:false,scales:{x:{grid:{color:'rgba(255,255,255,.04)'}},y:{grid:{color:'rgba(255,255,255,.04)'}}}};

new Chart(document.getElementById('wChart'),{
  type:'bar',
  data:{
    labels:<?=json_encode($weekLabels)?>,
    datasets:[{data:<?=json_encode($weekData)?>,backgroundColor:'rgba(0,255,163,.55)',borderColor:'#00ffa3',borderWidth:1,borderRadius:5}]
  },
  options:gc
});

<?php if(count($testAccArr)>=2): ?>
new Chart(document.getElementById('tChart'),{
  type:'line',
  data:{
    labels:<?=json_encode(array_map(fn($i)=>'#'.($i+1),range(1,count($testAccArr))))?>,
    datasets:[{data:<?=json_encode(array_values($testAccArr))?>,borderColor:'#ff6b9d',backgroundColor:'rgba(255,107,157,.08)',borderWidth:2.5,pointBackgroundColor:'#ff6b9d',pointRadius:4,fill:true,tension:.4}]
  },
  options:{...gc,scales:{...gc.scales,y:{...gc.scales.y,min:0,max:100}}}
});
<?php endif; ?>
</script>
</body>
</html>
