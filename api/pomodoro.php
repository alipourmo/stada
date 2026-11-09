<?php
require_once __DIR__ . '/../lib/bootstrap.php';

bt_session_start();
if(!isset($_SESSION['user_id'])){header('Location: '.APP_URL.'/login.php');exit;}
$uid=(int)$_SESSION['user_id'];
$db=getDB();
$stmt=$db->prepare("SELECT streak FROM users WHERE id=?");$stmt->execute([$uid]);$urow=$stmt->fetch();
$streak=(int)($urow['streak']??0);
$stmt=$db->prepare("SELECT subject,SUM(seconds) as t FROM study_sessions WHERE user_id=? AND session_date=CURDATE() GROUP BY subject");
$stmt->execute([$uid]);$todayRows=$stmt->fetchAll();
$todayTotal=array_sum(array_column($todayRows,'t'));
$firstName=explode(' ',$_SESSION['user_name']??'')[0];
$daysLeft=bt_days_left();
?>
<!DOCTYPE html><html lang="fa" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BioTrack — پومودورو</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#030712;--bg2:#0f172a;--bd:rgba(255,255,255,.07);--tx:#e2e8f0;--mu:#475569;--mu2:#64748b;--gr:#00ffa3;--bl:#00d4ff;--or:#ffb347}
body{background:var(--bg);color:var(--tx);font-family:'Vazirmatn',sans-serif;min-height:100vh}
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
.wrap{max-width:1200px;margin:0 auto;padding:28px 24px}
.ph{margin-bottom:22px}.ph h2{font-size:21px;font-weight:700}.ph p{font-size:13px;color:var(--mu);margin-top:3px}
.card{background:rgba(10,15,30,.8);border:1px solid var(--bd);border-radius:16px;padding:20px}
.ct{font-size:13px;font-weight:600;color:#94a3b8;margin-bottom:14px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.mode-lbl{display:inline-block;font-size:14px;font-weight:600;letter-spacing:1px;padding:6px 18px;border-radius:20px;margin-bottom:20px}
.mode-work{background:rgba(0,255,163,.1);color:var(--gr)}
.mode-break{background:rgba(0,212,255,.1);color:var(--bl)}
.timer-wrap{position:relative;width:220px;height:220px;margin:0 auto 20px}
.timer-inner{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center}
.timer-disp{font-size:44px;font-weight:800;font-family:'Courier New',monospace;color:var(--gr);line-height:1}
.mode-pill{padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer;border:1px solid var(--bd);background:rgba(255,255,255,.03);color:var(--mu);transition:.2s;font-family:inherit}
.mode-pill.on{background:rgba(0,255,163,.1);color:var(--gr);border-color:rgba(0,255,163,.3)}
.sp{display:flex;flex-wrap:wrap;gap:8px}
.spb{padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer;border:1px solid transparent;background:rgba(255,255,255,.03);color:var(--mu);transition:.2s;font-family:inherit}
.spb.on{border:1px solid;opacity:1}
.btn{border:none;cursor:pointer;border-radius:10px;font-family:inherit;font-weight:700;font-size:14px;transition:.2s;padding:11px 22px}
.btn-p{background:linear-gradient(135deg,var(--gr),var(--bl));color:#030712}
.btn-p:hover{transform:translateY(-1px);box-shadow:0 8px 25px rgba(0,255,163,.25)}
.btn-s{background:rgba(255,255,255,.05);color:#94a3b8;border:1px solid var(--bd)}
.mini-g{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ms{background:rgba(255,255,255,.03);border-radius:10px;padding:14px;text-align:center}
.mv{font-size:26px;font-weight:800;line-height:1}
.ml{font-size:11px;color:var(--mu);margin-top:4px}
.slog{display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto}
.si{display:flex;justify-content:space-between;align-items:center;background:rgba(0,255,163,.03);border:1px solid rgba(0,255,163,.1);border-radius:8px;padding:10px 14px;font-size:13px}
.empty{text-align:center;color:#334155;font-size:13px;padding:24px 0}
@media(max-width:900px){.g2{grid-template-columns:1fr}nav{display:none}}
</style>
</head>
<body>
<div class="hdr"><div class="hdr-in">
  <a class="logo" href="<?=APP_URL?>/index.php"><span style="font-size:22px">🧬</span><div><div class="logo-n">BioTrack</div><div class="logo-s">کنکور زیست</div></div></a>
  <nav>
    <?php foreach([['index.php','📊','داشبورد'],['pomodoro.php','⏱️','پومودورو'],['tests.php','📝','ثبت تست'],['leaderboard.php','🏆','لیدربورد'],['reports.php','📈','گزارش']] as [$pg,$ic,$lb]): $on=basename($_SERVER['PHP_SELF'])===$pg?'on':''; ?>
    <a class="nl <?=$on?>" href="<?=APP_URL?>/<?=$pg?>"><?=$ic?> <?=$lb?></a>
    <?php endforeach; ?>
  </nav>
  <div class="bds">
    <div class="bd bd-f">🔥 <?=$streak?> روز</div>
    <div class="bd bd-c">⏰ <?=$daysLeft?> روز</div>
    <span class="usr"><?=htmlspecialchars($firstName)?></span>
    <a class="out" href="<?=APP_URL?>/logout.php">خروج</a>
  </div>
</div></div>

<div class="wrap">
  <div class="ph"><h2>⏱️ تایمر پومودورو</h2><p>۲۵ دقیقه مطالعه + ۵ دقیقه استراحت</p></div>
  <div class="g2">
    <!-- timer -->
    <div class="card" style="text-align:center;padding:32px 24px">
      <div id="mode-lbl" class="mode-lbl mode-work">🧠 زمان مطالعه</div>
      <div class="timer-wrap">
        <svg width="220" height="220" viewBox="0 0 220 220">
          <circle cx="110" cy="110" r="95" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="10"/>
          <circle id="arc" cx="110" cy="110" r="95" fill="none" stroke="#00ffa3" stroke-width="10" stroke-linecap="round"
            stroke-dasharray="596.9" stroke-dashoffset="596.9" transform="rotate(-90 110 110)" style="transition:stroke-dashoffset .5s,stroke .3s"/>
        </svg>
        <div class="timer-inner">
          <div id="disp" class="timer-disp">25:00</div>
          <div id="round-lbl" style="font-size:12px;color:var(--mu)">دور ۱</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;margin-bottom:20px">
        <button id="btn-toggle" class="btn btn-p" onclick="toggleTimer()">▶ شروع</button>
        <button class="btn btn-s" onclick="resetTimer()">↩ ریست</button>
      </div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="mode-pill on" id="pill-w" onclick="switchMode('work')">مطالعه ۲۵ دقیقه</button>
        <button class="mode-pill" id="pill-b" onclick="switchMode('break')">استراحت ۵ دقیقه</button>
      </div>
    </div>

    <div>
      <!-- subject select -->
      <div class="card" style="margin-bottom:16px">
        <div class="ct">📚 درس فعلی</div>
        <div class="sp">
          <?php foreach(SUBJECTS as $k=>$s): ?>
          <button class="spb <?=$k==='cell'?'on':''?>" data-key="<?=$k?>" data-color="<?=$s['color']?>"
            onclick="selSub(this)"
            style="<?=$k==='cell'?"background:{$s['color']}20;color:{$s['color']};border-color:{$s['color']}55":''?>">
            <?=$s['emoji']?> <?=$s['name']?>
          </button>
          <?php endforeach; ?>
        </div>
      </div>

      <!-- stats -->
      <div class="card" style="margin-bottom:16px">
        <div class="ct">📊 آمار امروز</div>
        <div class="mini-g">
          <div class="ms"><div class="mv" id="rounds-disp" style="color:var(--gr)">0</div><div class="ml">دور تمام‌شده</div></div>
          <div class="ms"><div class="mv" style="color:var(--bl)"><?=gmdate('H:i',$todayTotal)?></div><div class="ml">کل مطالعه امروز</div></div>
        </div>
      </div>

      <!-- session log -->
      <div class="card">
        <div class="ct">🕐 سشن‌های امروز</div>
        <div id="slog" class="slog">
          <?php if($todayRows): foreach(array_reverse($todayRows) as $r): ?>
          <div class="si">
            <div>
              <div><?=SUBJECTS[$r['subject']]['emoji']??'📚'?> <?=SUBJECTS[$r['subject']]['name']??$r['subject']?></div>
              <div style="font-size:11px;color:var(--mu)"><?=gmdate('H:i',$r['t'])?> ساعت امروز</div>
            </div>
          </div>
          <?php endforeach; else: ?>
          <div class="empty">هنوز سشنی کامل نشده</div>
          <?php endif; ?>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
let mode='work', secs=25*60, running=false, iv=null, rounds=0, curSub='cell';
const WORK=25*60, BRK=5*60;
const SUBS=<?=json_encode(array_map(fn($k,$v)=>['key'=>$k,'name'=>$v['name'],'emoji'=>$v['emoji'],'color'=>$v['color']],array_keys(SUBJECTS),SUBJECTS))?>;

function toggleTimer(){
  running=!running;
  document.getElementById('btn-toggle').textContent=running?'⏸ توقف':'▶ شروع';
  if(running) iv=setInterval(tick,1000); else clearInterval(iv);
}
function tick(){
  if(secs<=0){
    clearInterval(iv); running=false;
    document.getElementById('btn-toggle').textContent='▶ شروع';
    if(mode==='work'){
      rounds++;
      document.getElementById('rounds-disp').textContent=rounds;
      fetch('<?=APP_URL?>/api/save_session.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject:curSub,seconds:WORK})})
        .then(r=>r.json()).then(d=>{
          if(d.streak) document.querySelectorAll('.bd-f').forEach(b=>b.textContent='🔥 '+d.streak+' روز');
          addLog(curSub,'۲۵ دقیقه');
        });
      switchMode('break');
    } else { switchMode('work'); }
    return;
  }
  secs--; updateDisp();
}
function updateDisp(){
  const total=mode==='work'?WORK:BRK;
  const m=Math.floor(secs/60), s=secs%60;
  document.getElementById('disp').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  const pct=(total-secs)/total, circ=2*Math.PI*95;
  document.getElementById('arc').style.strokeDashoffset=circ-(pct*circ);
  document.getElementById('round-lbl').textContent='دور '+(rounds+1);
}
function resetTimer(){clearInterval(iv);running=false;secs=mode==='work'?WORK:BRK;document.getElementById('btn-toggle').textContent='▶ شروع';updateDisp();}
function switchMode(m){
  clearInterval(iv);running=false;mode=m;secs=m==='work'?WORK:BRK;
  document.getElementById('btn-toggle').textContent='▶ شروع';
  document.getElementById('mode-lbl').textContent=m==='work'?'🧠 زمان مطالعه':'☕ استراحت';
  document.getElementById('mode-lbl').className='mode-lbl mode-'+m;
  const c=m==='work'?'#00ffa3':'#00d4ff';
  document.getElementById('arc').style.stroke=c;
  document.getElementById('disp').style.color=c;
  document.getElementById('pill-w').className='mode-pill'+(m==='work'?' on':'');
  document.getElementById('pill-b').className='mode-pill'+(m==='break'?' on':'');
  updateDisp();
}
function selSub(el){
  document.querySelectorAll('.spb').forEach(b=>{b.className='spb';b.style.cssText='';});
  el.className='spb on';
  el.style.background=el.dataset.color+'20';
  el.style.color=el.dataset.color;
  el.style.borderColor=el.dataset.color+'55';
  curSub=el.dataset.key;
  if(mode==='work') document.getElementById('arc').style.stroke=el.dataset.color;
}
function addLog(subKey, dur){
  const s=SUBS.find(x=>x.key===subKey);
  const log=document.getElementById('slog');
  const empty=log.querySelector('.empty');
  if(empty) empty.remove();
  const now=new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});
  const d=document.createElement('div');
  d.className='si';
  d.innerHTML=`<div><div>${s?.emoji||'📚'} ${s?.name||subKey}</div><div style="font-size:11px;color:var(--mu)">${dur} | ${now}</div></div>`;
  log.insertBefore(d,log.firstChild);
}
updateDisp();
</script>
</body></html>
