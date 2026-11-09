<?php
require_once __DIR__ . '/../lib/bootstrap.php';

bt_session_start();
if(!isset($_SESSION['user_id'])){header('Location: '.APP_URL.'/login.php');exit;}
$uid=(int)$_SESSION['user_id'];
$db=getDB();
$firstName=explode(' ',$_SESSION['user_name']??'')[0];
$daysLeft=bt_days_left();
$stmt=$db->prepare("SELECT streak FROM users WHERE id=?");$stmt->execute([$uid]);$urow=$stmt->fetch();$streak=(int)($urow['streak']??0);

$stmt=$db->prepare("SELECT subject,SUM(seconds) as t FROM study_sessions WHERE user_id=? GROUP BY subject");
$stmt->execute([$uid]);$subTimes=[];while($r=$stmt->fetch())$subTimes[$r['subject']]=(int)$r['t'];
$totalSecs=array_sum($subTimes);$totalHours=round($totalSecs/3600,1);

$stmt=$db->prepare("SELECT SUM(total) as t,SUM(wrong) as w FROM test_results WHERE user_id=?");
$stmt->execute([$uid]);$tr=$stmt->fetch();$tt=(int)($tr['t']??0);$tw=(int)($tr['w']??0);
$acc=$tt>0?round(($tt-$tw)/$tt*100,1):0;

// weekly data
$stmt=$db->prepare("SELECT session_date,SUM(seconds) as t FROM study_sessions WHERE user_id=? AND session_date>=DATE_SUB(CURDATE(),INTERVAL 7 DAY) GROUP BY session_date");
$stmt->execute([$uid]);$wRows=[];foreach($stmt->fetchAll() as $r)$wRows[$r['session_date']]=$r['t'];
$weekLabels=[];$weekData=[];
$daysFA=['Mon'=>'دوش','Tue'=>'سه','Wed'=>'چهار','Thu'=>'پنج','Fri'=>'جمع','Sat'=>'شنب','Sun'=>'یکش'];
for($i=6;$i>=0;$i--){$d=date('Y-m-d',strtotime("-{$i} days"));$weekLabels[]=$daysFA[date('D',strtotime($d))]??date('D',strtotime($d));$weekData[]=round(($wRows[$d]??0)/60);}

// test history for chart
$stmt=$db->prepare("SELECT accuracy FROM test_results WHERE user_id=? ORDER BY created_at ASC LIMIT 15");
$stmt->execute([$uid]);$accArr=array_column($stmt->fetchAll(),'accuracy');

// per-subject accuracy
$stmt=$db->prepare("SELECT subject,AVG(accuracy) as a,COUNT(*) as c FROM test_results WHERE user_id=? GROUP BY subject");
$stmt->execute([$uid]);$subAcc=[];foreach($stmt->fetchAll() as $r)$subAcc[$r['subject']]=['a'=>round($r['a'],1),'c'=>$r['c']];

// avg daily
$stmt=$db->prepare("SELECT AVG(dt) as avg FROM (SELECT session_date,SUM(seconds) as dt FROM study_sessions WHERE user_id=? AND session_date>=DATE_SUB(CURDATE(),INTERVAL 30 DAY) GROUP BY session_date) as d");
$stmt->execute([$uid]);$avgRow=$stmt->fetch();$avgDaily=round(($avgRow['avg']??0)/60);

// suggestions
$sugs=[];
foreach(SUBJECTS as $k=>$s){$secs=$subTimes[$k]??0;if($secs===0)$sugs[]=['danger',"درس «{$s['name']}» را هنوز مطالعه نکرده‌اید"];elseif($secs<3600)$sugs[]=['warn',"درس «{$s['name']}» کمتر از یک ساعت — نیاز به توجه بیشتر"];}
if(empty($sugs))$sugs[]=['ok','آفرین! تمام دروس را مطالعه کرده‌اید 🎉'];
if($acc>0&&$acc<60)$sugs[]=['warn','دقت تست‌ها پایین‌تر از ۶۰٪ — روی مرور مطالب تمرکز کنید'];
?>
<!DOCTYPE html><html lang="fa" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BioTrack — گزارش</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#030712;--bg2:#0f172a;--bd:rgba(255,255,255,.07);--tx:#e2e8f0;--mu:#475569;--gr:#00ffa3;--bl:#00d4ff;--or:#ffb347;--pk:#ff6b9d}
body{background:var(--bg);color:var(--tx);font-family:'Vazirmatn',sans-serif;min-height:100vh}
.hdr{position:sticky;top:0;z-index:99;background:rgba(3,7,18,.95);backdrop-filter:blur(20px);border-bottom:1px solid var(--bd);padding:0 24px}
.hdr-in{max-width:1200px;margin:0 auto;display:flex;align-items:center;height:58px;gap:16px}
.logo{display:flex;align-items:center;gap:8px;text-decoration:none}.logo-n{font-size:15px;font-weight:800;color:var(--gr)}.logo-s{font-size:10px;color:var(--mu)}
nav{display:flex;gap:4px;flex:1;justify-content:center}
.nl{display:flex;align-items:center;gap:5px;padding:7px 13px;border-radius:9px;text-decoration:none;font-size:13px;color:var(--mu);transition:.2s}.nl:hover{background:rgba(255,255,255,.04);color:#94a3b8}.nl.on{background:rgba(0,255,163,.1);color:var(--gr)}
.bds{display:flex;align-items:center;gap:8px}
.bd{font-size:12px;padding:4px 11px;border-radius:20px}.bd-f{background:rgba(255,179,71,.1);color:var(--or);border:1px solid rgba(255,179,71,.3)}.bd-c{background:rgba(0,255,163,.08);color:var(--gr);border:1px solid rgba(0,255,163,.2)}
.usr{font-size:12px;color:#94a3b8}.out{color:var(--mu);text-decoration:none;font-size:12px;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,.04)}
.wrap{max-width:1200px;margin:0 auto;padding:28px 24px}
.ph{margin-bottom:22px}.ph h2{font-size:21px;font-weight:700}
.card{background:rgba(10,15,30,.8);border:1px solid var(--bd);border-radius:16px;padding:20px}
.ct{font-size:13px;font-weight:600;color:#94a3b8;margin-bottom:14px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}
.sc{background:rgba(10,15,30,.8);border:1px solid var(--bd);border-radius:14px;padding:18px}
.sl{font-size:11px;color:var(--mu);margin-bottom:7px;font-weight:500}.sv{font-size:28px;font-weight:800;line-height:1}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}
.sg{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.sb{background:rgba(255,255,255,.02);border-radius:12px;padding:14px;border:1px solid}
.sug-item{border-radius:10px;padding:12px;font-size:13px;margin-bottom:8px;border:1px solid}
.empty{text-align:center;color:#334155;font-size:13px;padding:24px 0}
@media(max-width:900px){.g4{grid-template-columns:1fr 1fr}.g2{grid-template-columns:1fr}.sg{grid-template-columns:1fr 1fr}nav{display:none}}
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
  <div class="ph"><h2>📈 گزارش پیشرفت</h2></div>

  <div class="g4">
    <?php foreach([['کل ساعت مطالعه',$totalHours.'h','#00ffa3'],['میانگین روزانه',$avgDaily.'m','#00d4ff'],['دقت کلی تست',$acc.'%','#ff6b9d'],['streak فعلی',$streak.'🔥','#ffb347']] as [$l,$v,$c]):?>
    <div class="sc"><div class="sl"><?=$l?></div><div class="sv" style="color:<?=$c?>"><?=$v?></div></div>
    <?php endforeach;?>
  </div>

  <div class="g2">
    <div class="card"><div class="ct">📅 مطالعه ۷ روز اخیر (دقیقه)</div><div style="position:relative;height:200px"><canvas id="wc"></canvas></div></div>
    <div class="card"><div class="ct">🎯 روند دقت تست‌ها</div>
      <?php if(count($accArr)>=2):?><div style="position:relative;height:200px"><canvas id="ac"></canvas></div>
      <?php else:?><div class="empty">حداقل ۲ تست ثبت کنید</div><?php endif;?>
    </div>
  </div>

  <div class="g2">
    <div class="card"><div class="ct">🕸️ تسلط به دروس (دقیقه مطالعه)</div><div style="position:relative;height:240px"><canvas id="rc"></canvas></div></div>
    <div class="card"><div class="ct">💡 پیشنهاد هوشمند</div>
      <?php foreach($sugs as [$type,$txt]):
        $bg=['danger'=>'rgba(239,68,68,.07)','warn'=>'rgba(255,179,71,.07)','ok'=>'rgba(0,255,163,.07)'][$type]??'rgba(255,255,255,.03)';
        $bc=['danger'=>'rgba(239,68,68,.2)','warn'=>'rgba(255,179,71,.2)','ok'=>'rgba(0,255,163,.2)'][$type]??'var(--bd)';
        $tc=['danger'=>'#ef4444','warn'=>'#ffb347','ok'=>'#00ffa3'][$type]??'#94a3b8';
        $ic=['danger'=>'⚠️','warn'=>'💛','ok'=>'✅'][$type]??'ℹ️';
      ?>
      <div class="sug-item" style="background:<?=$bg?>;border-color:<?=$bc?>;color:<?=$tc?>"><?=$ic?> <?=$txt?></div>
      <?php endforeach;?>
      <div class="sug-item" style="background:rgba(0,212,255,.05);border-color:rgba(0,212,255,.2);color:var(--bl)">🎯 هدف: حداقل ۲ ساعت برای هر درس در هفته آینده</div>
    </div>
  </div>

  <div class="card">
    <div class="ct">📊 دقت تست‌ها به تفکیک درس</div>
    <div class="sg">
      <?php foreach(SUBJECTS as $k=>$s):$a=$subAcc[$k]['a']??null;$cnt=$subAcc[$k]['c']??0;$c=$a===null?'#334155':($a>=70?'#00ffa3':($a>=50?'#ffb347':'#ef4444'));?>
      <div class="sb" style="border-color:<?=$s['color']?>22">
        <div style="font-size:12px;color:#94a3b8;margin-bottom:8px"><?=$s['emoji']?> <?=$s['name']?></div>
        <div style="font-size:26px;font-weight:800;color:<?=$c?>"><?=$a!==null?$a.'%':'—'?></div>
        <div style="font-size:11px;color:var(--mu);margin-top:4px"><?=$cnt>0?$cnt.' سشن':'تست ثبت نشده'?></div>
      </div>
      <?php endforeach;?>
    </div>
  </div>
</div>

<script>
Chart.defaults.color='#475569';Chart.defaults.font.family="'Vazirmatn',sans-serif";Chart.defaults.font.size=11;
Chart.defaults.plugins.legend.display=false;
Chart.defaults.plugins.tooltip.backgroundColor='#0f172a';Chart.defaults.plugins.tooltip.borderColor='rgba(255,255,255,.1)';Chart.defaults.plugins.tooltip.borderWidth=1;Chart.defaults.plugins.tooltip.titleColor='#e2e8f0';Chart.defaults.plugins.tooltip.bodyColor='#94a3b8';Chart.defaults.plugins.tooltip.cornerRadius=8;
const gc={responsive:true,maintainAspectRatio:false,scales:{x:{grid:{color:'rgba(255,255,255,.04)'}},y:{grid:{color:'rgba(255,255,255,.04)'}}}};

new Chart(document.getElementById('wc'),{type:'bar',data:{labels:<?=json_encode($weekLabels)?>,datasets:[{data:<?=json_encode($weekData)?>,backgroundColor:'rgba(0,255,163,.55)',borderColor:'#00ffa3',borderWidth:1,borderRadius:5}]},options:gc});

<?php if(count($accArr)>=2):?>
new Chart(document.getElementById('ac'),{type:'line',data:{labels:<?=json_encode(array_map(fn($i)=>'#'.($i+1),range(1,count($accArr))))?>,datasets:[{data:<?=json_encode(array_values($accArr))?>,borderColor:'#ff6b9d',backgroundColor:'rgba(255,107,157,.08)',borderWidth:2.5,pointBackgroundColor:'#ff6b9d',pointRadius:4,fill:true,tension:.4}]},options:{...gc,scales:{...gc.scales,y:{...gc.scales.y,min:0,max:100}}}});
<?php endif;?>

new Chart(document.getElementById('rc'),{type:'radar',data:{labels:<?=json_encode(array_values(array_map(fn($s)=>$s['name'],SUBJECTS)))?>,datasets:[{data:<?=json_encode(array_values(array_map(fn($k)=>round(($subTimes[$k]??0)/60),array_keys(SUBJECTS))))?>,borderColor:'#00ffa3',backgroundColor:'rgba(0,255,163,.12)',borderWidth:2,pointBackgroundColor:'#00ffa3',pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,scales:{r:{grid:{color:'rgba(255,255,255,.06)'},angleLines:{color:'rgba(255,255,255,.06)'},ticks:{display:false}}}}});
</script>
</body></html>
