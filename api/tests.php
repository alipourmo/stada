<?php
require_once __DIR__ . '/../lib/bootstrap.php';

bt_session_start();
if(!isset($_SESSION['user_id'])){header('Location: '.APP_URL.'/login.php');exit;}
$uid=(int)$_SESSION['user_id'];
$db=getDB();
$firstName=explode(' ',$_SESSION['user_name']??'')[0];
$daysLeft=bt_days_left();
$stmt=$db->prepare("SELECT streak FROM users WHERE id=?");$stmt->execute([$uid]);$urow=$stmt->fetch();$streak=(int)($urow['streak']??0);

$success=''; $error='';
if($_SERVER['REQUEST_METHOD']==='POST'){
    $subj=trim($_POST['subject']??'other');
    $total=(int)($_POST['total']??0);
    $wrong=(int)($_POST['wrong']??0);
    $note=trim($_POST['note']??'');
    if($total<1||$wrong<0||$wrong>$total){$error='لطفاً اعداد معتبر وارد کنید';}
    else{
        $acc=round(($total-$wrong)/$total*100,2);
        $db->prepare("INSERT INTO test_results(user_id,subject,total,wrong,accuracy,note,test_date)VALUES(?,?,?,?,?,?,?)")
           ->execute([$uid,$subj,$total,$wrong,$acc,$note,date('Y-m-d')]);
        $success='نتیجه با دقت '.$acc.'% ثبت شد ✓';
    }
}

$stmt=$db->prepare("SELECT SUM(total) as t,SUM(wrong) as w FROM test_results WHERE user_id=?");
$stmt->execute([$uid]);$tr=$stmt->fetch();
$tt=(int)($tr['t']??0);$tw=(int)($tr['w']??0);
$acc2=$tt>0?round(($tt-$tw)/$tt*100,1):0;

$stmt=$db->prepare("SELECT subject,total,wrong,accuracy,note,test_date FROM test_results WHERE user_id=? ORDER BY created_at DESC LIMIT 20");
$stmt->execute([$uid]);$history=$stmt->fetchAll();
?>
<!DOCTYPE html><html lang="fa" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BioTrack — ثبت تست</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#030712;--bg2:#0f172a;--bd:rgba(255,255,255,.07);--tx:#e2e8f0;--mu:#475569;--gr:#00ffa3;--bl:#00d4ff;--or:#ffb347;--rd:#ef4444}
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
.ph{margin-bottom:22px}.ph h2{font-size:21px;font-weight:700}
.card{background:rgba(10,15,30,.8);border:1px solid var(--bd);border-radius:16px;padding:20px}
.ct{font-size:13px;font-weight:600;color:#94a3b8;margin-bottom:14px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.g{margin-bottom:14px}.g label{display:block;font-size:12px;color:var(--mu);margin-bottom:5px;font-weight:500}
input,textarea{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:11px 13px;color:var(--tx);font-family:inherit;font-size:14px;outline:none;transition:.2s}
input:focus,textarea:focus{border-color:rgba(0,255,163,.4)}
textarea{resize:vertical}
.btn{width:100%;padding:12px;background:linear-gradient(135deg,var(--gr),var(--bl));color:#030712;border:none;border-radius:10px;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;transition:.2s;margin-top:4px}
.btn:hover{transform:translateY(-1px);box-shadow:0 8px 25px rgba(0,255,163,.25)}
.alert-ok{background:rgba(0,255,163,.08);border:1px solid rgba(0,255,163,.25);color:var(--gr);padding:11px 14px;border-radius:10px;font-size:13px;margin-bottom:14px}
.alert-err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);color:#fca5a5;padding:11px 14px;border-radius:10px;font-size:13px;margin-bottom:14px}
.sp{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:2px}
.spb{padding:8px 13px;border-radius:8px;font-size:13px;cursor:pointer;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03);color:var(--mu);transition:.2s;font-family:inherit}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:2px}
.ms{background:rgba(255,255,255,.03);border-radius:10px;padding:14px;text-align:center}
.mv{font-size:26px;font-weight:800}.ml{font-size:11px;color:var(--mu);margin-top:4px}
.g2i{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.acc-prev{background:rgba(255,255,255,.03);border-radius:12px;padding:16px;text-align:center;margin-bottom:14px;display:none}
.acc-big{font-size:42px;font-weight:800;line-height:1}
.tl{display:flex;flex-direction:column;gap:8px;max-height:450px;overflow-y:auto}
.ti{display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.02);border:1px solid var(--bd);border-radius:8px;padding:10px 13px}
.empty{text-align:center;color:#334155;font-size:13px;padding:24px 0}
@media(max-width:900px){.g2{grid-template-columns:1fr}nav{display:none}.g3{grid-template-columns:1fr 1fr}}
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
  <div class="ph"><h2>📝 ثبت نتیجه تست</h2></div>
  <div class="g2">
    <div>
      <div class="card">
        <?php if($success):?><div class="alert-ok"><?=$success?></div><?php endif;?>
        <?php if($error):?><div class="alert-err"><?=htmlspecialchars($error)?></div><?php endif;?>
        <form method="POST">
          <div class="g"><label>درس</label>
            <div class="sp" id="subpills">
              <?php foreach(SUBJECTS as $k=>$s):?>
              <label>
                <input type="radio" name="subject" value="<?=$k?>" <?=$k==='cell'?'checked':''?> hidden onchange="activatePill(this)">
                <span class="spb" style="<?=$k==='cell'?"background:{$s['color']}20;color:{$s['color']};border-color:{$s['color']}55":''?>"
                  onclick="this.previousElementSibling.click()">
                  <?=$s['emoji']?> <?=$s['name']?>
                </span>
              </label>
              <?php endforeach;?>
            </div>
          </div>
          <div class="g2i" style="margin:14px 0">
            <div class="g" style="margin:0"><label>تعداد کل سوال</label>
              <input type="number" name="total" id="inp-t" min="1" required placeholder="مثلاً ۳۰" oninput="calcAcc()" value="<?=htmlspecialchars($_POST['total']??'')?>">
            </div>
            <div class="g" style="margin:0"><label>تعداد غلط</label>
              <input type="number" name="wrong" id="inp-w" min="0" required placeholder="مثلاً ۵" oninput="calcAcc()" value="<?=htmlspecialchars($_POST['wrong']??'')?>">
            </div>
          </div>
          <div id="acc-prev" class="acc-prev">
            <div id="acc-val" class="acc-big">—</div>
            <div style="font-size:12px;color:var(--mu)" id="acc-det"></div>
          </div>
          <div class="g"><label>یادداشت <span style="font-size:11px;color:var(--mu)">(اختیاری)</span></label>
            <textarea name="note" rows="3" placeholder="مثلاً: فصل ۳ ضعیف بودم..."><?=htmlspecialchars($_POST['note']??'')?></textarea>
          </div>
          <button type="submit" class="btn">ثبت نتیجه</button>
        </form>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="ct">📊 آمار کلی</div>
        <div class="g3">
          <div class="ms"><div class="mv" style="color:var(--bl)"><?=$tt?></div><div class="ml">کل تست</div></div>
          <div class="ms"><div class="mv" style="color:var(--rd)"><?=$tw?></div><div class="ml">کل غلط</div></div>
          <div class="ms"><div class="mv" style="color:var(--gr)"><?=$acc2?>%</div><div class="ml">دقت کلی</div></div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="ct">🕐 تاریخچه تست‌ها</div>
      <?php if($history):?>
      <div class="tl">
        <?php foreach($history as $t):$ac=(float)$t['accuracy'];$c=$ac>=70?'#00ffa3':($ac>=50?'#ffb347':'#ef4444');?>
        <div class="ti">
          <div>
            <div style="font-size:13px"><?=SUBJECTS[$t['subject']]['emoji']??'📚'?> <?=SUBJECTS[$t['subject']]['name']??$t['subject']?></div>
            <div style="font-size:11px;color:var(--mu)"><?=$t['test_date']?> | <?=$t['total']?> تست، <?=$t['wrong']?> غلط<?=$t['note']?' | '.htmlspecialchars(mb_substr($t['note'],0,25)):'';?></div>
          </div>
          <div style="font-size:20px;font-weight:800;color:<?=$c?>"><?=$ac?>%</div>
        </div>
        <?php endforeach;?>
      </div>
      <?php else:?><div class="empty">هنوز تستی ثبت نشده</div><?php endif;?>
    </div>
  </div>
</div>
<script>
const SUBS=<?=json_encode(SUBJECTS)?>;
function activatePill(radio){
  document.querySelectorAll('#subpills .spb').forEach(s=>{s.style.cssText='';});
  const span=radio.nextElementSibling;
  const key=radio.value;
  if(SUBS[key]){span.style.background=SUBS[key].color+'20';span.style.color=SUBS[key].color;span.style.borderColor=SUBS[key].color+'55';}
}
function calcAcc(){
  const t=parseInt(document.getElementById('inp-t').value);
  const w=parseInt(document.getElementById('inp-w').value);
  const prev=document.getElementById('acc-prev');
  if(t>0&&!isNaN(w)&&w>=0&&w<=t){
    const a=Math.round((t-w)/t*100);
    const v=document.getElementById('acc-val');
    v.textContent=a+'%';
    v.style.color=a>=70?'#00ffa3':a>=50?'#ffb347':'#ef4444';
    document.getElementById('acc-det').textContent=(t-w)+' صحیح از '+t+' سوال';
    prev.style.display='block';
  }else{prev.style.display='none';}
}
</script>
</body></html>
