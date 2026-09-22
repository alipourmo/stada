const STORE = "stada.vercel.mvp";
const app = document.querySelector("#app");
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const h = (x) => String(x ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));

const seed = {
  subjects: [
    ["s1", "بیوشیمی", 5], ["s2", "زیست‌شناسی سلولی و مولکولی", 5], ["s3", "ژنتیک", 4],
    ["s4", "میکروبیولوژی", 4], ["s5", "بیوتکنولوژی", 5],
  ].map(([id, title, weight]) => ({ id, title, weight })),
  topics: [
    ["t1", "s1", "آنزیم‌ها و سینتیک آنزیمی"], ["t2", "s1", "متابولیسم کربوهیدرات‌ها"],
    ["t3", "s2", "همانندسازی و رونویسی"], ["t4", "s2", "ترجمه و تنظیم بیان ژن"],
    ["t5", "s3", "ژنتیک مندلی و جمعیت"], ["t6", "s4", "رشد و کنترل میکروارگانیسم‌ها"],
    ["t7", "s5", "کلونینگ و وکتورها"], ["t8", "s5", "PCR و روش‌های مولکولی"],
  ].map(([id, subjectId, title]) => ({ id, subjectId, title, priority: 5, mastery: 20 })),
  studies: [], plans: [], reviews: [], exams: [], errors: [], flashcards: [], checkins: [], pomodoros: [], chats: [],
  questions: [
    { id: "q1", subjectId: "s5", topicId: "t8", body: "در واکنش PCR، افزایش بیش از حد دمای annealing معمولاً چه اثری دارد؟", options: { A: "افزایش اتصال غیراختصاصی", B: "کاهش اتصال پرایمر", C: "افزایش طول محصول", D: "حذف نیاز به MgCl2" }, correct: "B", explanation: "دمای بالاتر اتصال پرایمر به قالب را دشوارتر می‌کند.", source: "نمونه اولیه", status: "approved", timesUsed: 0, correctCount: 0 },
    { id: "q2", subjectId: "s1", topicId: "t1", body: "در سینتیک میکائیلیس-منتن، Km کمتر معمولاً نشان‌دهنده چیست؟", options: { A: "میل ترکیبی بیشتر آنزیم به سوبسترا", B: "کاهش Vmax", C: "مهار غیررقابتی", D: "کاهش غلظت آنزیم" }, correct: "A", explanation: "Km کمتر یعنی برای رسیدن به نصف Vmax غلظت سوبسترای کمتری لازم است.", source: "نمونه اولیه", status: "approved", timesUsed: 0, correctCount: 0 },
  ],
};

let state = JSON.parse(localStorage.getItem(STORE) || "null") || structuredClone(seed);
let active = location.hash.slice(1) || "dashboard";
let examDraft = [];
let timer = 25 * 60;
let timerId = null;

function save() { localStorage.setItem(STORE, JSON.stringify(state)); }
function sTitle(id) { return state.subjects.find((x) => x.id === id)?.title || "بدون درس"; }
function tTitle(id) { return state.topics.find((x) => x.id === id)?.title || "بدون مبحث"; }
function subOpts(v = "") { return `<option value="">انتخاب نشده</option>${state.subjects.map((s) => `<option value="${s.id}" ${v === s.id ? "selected" : ""}>${h(s.title)}</option>`).join("")}`; }
function topOpts(v = "") { return `<option value="">انتخاب نشده</option>${state.topics.map((t) => `<option value="${t.id}" ${v === t.id ? "selected" : ""}>${h(sTitle(t.subjectId))} / ${h(t.title)}</option>`).join("")}`; }
function daysLeft() { return Math.ceil((new Date("2027-05-07T00:00:00+03:30") - new Date()) / 86400000); }
function dueReviews() { return state.reviews.filter((r) => r.status === "due" && r.dueOn <= today()); }
function addReview(type, itemId, dueOn) { state.reviews.push({ id: uid(), type, itemId, dueOn, status: "due", score: null }); }
function addTopicReviews(topicId, base) { [1, 3, 7, 14, 30].forEach((d) => { const x = new Date(`${base}T00:00:00`); x.setDate(x.getDate() + d); addReview("topic", topicId, x.toISOString().slice(0, 10)); }); }
function readiness() {
  const mastery = state.topics.reduce((a, t) => a + Number(t.mastery || 0), 0) / Math.max(1, state.topics.length);
  const week = new Date(); week.setDate(week.getDate() - 6);
  const min = state.studies.filter((x) => new Date(x.date) >= week).reduce((a, x) => a + Number(x.minutes || 0), 0);
  return Math.min(100, Math.round(mastery * .45 + Math.min(35, min / 30) + Math.max(0, 20 - dueReviews().length)));
}
function shell(title, sub, body) {
  app.innerHTML = `<div class="topbar"><div class="title"><h1>${title}</h1><p>${sub || ""}</p></div><span class="badge">نسخه قابل استفاده Vercel</span></div>${body}`;
}
function fields() { return `<label>درس<select name="subjectId">${subOpts()}</select></label><label>مبحث<select name="topicId">${topOpts()}</select></label>`; }
function formData(form) { return Object.fromEntries(new FormData(form).entries()); }
function list(items, empty = "چیزی ثبت نشده.") { return items.length ? items.join("") : `<p class="small">${empty}</p>`; }

document.querySelectorAll("[data-tab]").forEach((a) => a.onclick = (e) => { e.preventDefault(); active = a.dataset.tab; history.replaceState(null, "", `#${active}`); document.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("active", x.dataset.tab === active)); render(); });

function dashboard() {
  const mins = state.studies.filter((x) => x.date === today()).reduce((a, x) => a + Number(x.minutes || 0), 0);
  const plans = state.plans.filter((x) => x.date === today() && x.status !== "done");
  shell("داشبورد امروز", "همه چیز از داده‌هایی که همین‌جا ثبت می‌کنی ساخته می‌شود.", `<section class="grid">
    <div class="card span-3 metric"><span>روز باقی‌مانده</span><b>${daysLeft().toLocaleString("fa-IR")}</b><small>تا ۱۷ اردیبهشت ۱۴۰۶</small></div>
    <div class="card span-3 metric"><span>مطالعه امروز</span><b>${(mins / 60).toFixed(1)}h</b><small>${mins} دقیقه</small></div>
    <div class="card span-3 metric"><span>مرورهای باز</span><b>${dueReviews().length}</b><small>امروز و عقب‌افتاده</small></div>
    <div class="card span-3 metric"><span>آمادگی</span><b>${readiness()}٪</b><div class="progress"><i style="width:${readiness()}%"></i></div></div>
    <div class="card span-6"><h2>برنامه امروز</h2><div class="list">${list(plans.map((p) => `<div class="item"><strong>${h(p.title)}</strong><span class="small">${h(tTitle(p.topicId))} / ${h(p.minutes)} دقیقه</span></div>`), "برای امروز برنامه‌ای نداری.")}</div></div>
    <div class="card span-6"><h2>مرورهای فوری</h2><div class="list">${list(dueReviews().slice(0, 6).map((r) => `<div class="item"><strong>${reviewName(r)}</strong><span class="small">سررسید: ${h(r.dueOn)}</span></div>`), "مرور فوری نداری.")}</div></div>
    <form class="card span-12" id="checkin"><h2>چک‌این روزانه</h2><div class="form-grid"><label>تاریخ<input name="date" type="date" value="${today()}"></label><label>خواب<input name="sleep" type="number" step=".5" value="7"></label><label>انرژی<input name="energy" type="number" min="1" max="5" value="3"></label><label>تمرکز<input name="focus" type="number" min="1" max="5" value="3"></label><label>استرس<input name="stress" type="number" min="1" max="5" value="3"></label><label>یادداشت<textarea name="note"></textarea></label></div><button class="btn">ثبت</button></form>
  </section>`);
  $("#checkin").onsubmit = (e) => { e.preventDefault(); const row = { id: uid(), ...formData(e.target) }; state.checkins = state.checkins.filter((x) => x.date !== row.date); state.checkins.push(row); save(); render(); };
}
function study() {
  shell("ثبت مطالعه", "هر ثبت مطالعه مرورهای آینده و تسلط مبحث را تغییر می‌دهد.", `<section class="grid"><form class="card span-5" id="study">${fields()}<div class="form-grid"><label>تاریخ<input name="date" type="date" value="${today()}"></label><label>دقیقه<input name="minutes" type="number" value="60"></label><label>فعالیت<select name="activity"><option value="study">مطالعه</option><option value="test">تست</option><option value="review">مرور</option><option value="analysis">تحلیل</option></select></label><label>تمرکز<input name="focus" type="number" min="1" max="5" value="3"></label><label>یادداشت<textarea name="note"></textarea></label></div><button class="btn">ثبت مطالعه</button></form><div class="card span-7"><h2>آخرین مطالعه‌ها</h2><div class="list">${list(state.studies.slice(-20).reverse().map((x) => `<div class="item"><strong>${sTitle(x.subjectId)} / ${tTitle(x.topicId)}</strong><span class="small">${x.date}، ${x.minutes} دقیقه، ${x.activity}</span></div>`))}</div></div></section>`);
  $("#study").onsubmit = (e) => { e.preventDefault(); const row = { id: uid(), ...formData(e.target) }; state.studies.push(row); const t = state.topics.find((x) => x.id === row.topicId); if (t) { t.mastery = Math.min(100, Number(t.mastery) + (row.activity === "test" ? 4 : 3)); addTopicReviews(row.topicId, row.date); } save(); render(); };
}
function plan() {
  shell("برنامه‌ریزی", "برنامه روزانه، هفتگی و بلندمدت.", `<section class="grid"><form class="card span-5" id="plan"><div class="form-grid"><label>تاریخ<input name="date" type="date" value="${today()}"></label><label>نوع<select name="scope"><option value="daily">روزانه</option><option value="weekly">هفتگی</option><option value="long">بلندمدت</option></select></label>${fields()}<label>عنوان<input name="title" required></label><label>هدف دقیقه<input name="minutes" type="number" value="60"></label></div><button class="btn">ثبت برنامه</button></form><div class="card span-7"><h2>برنامه‌ها</h2><div class="list">${list(state.plans.slice().reverse().map((p) => `<div class="item"><strong>${h(p.title)}</strong><span class="small">${p.date} / ${p.scope} / ${p.status}</span><div class="actions"><button class="btn secondary" onclick="donePlan('${p.id}')">انجام شد</button></div></div>`))}</div></div></section>`);
  $("#plan").onsubmit = (e) => { e.preventDefault(); state.plans.push({ id: uid(), status: "todo", ...formData(e.target) }); save(); render(); };
}
window.donePlan = (id) => { const p = state.plans.find((x) => x.id === id); if (p) p.status = "done"; save(); render(); };
function reviewName(r) { if (r.type === "topic") return `مبحث: ${tTitle(r.itemId)}`; if (r.type === "flashcard") return `فلش‌کارت: ${h(state.flashcards.find((x) => x.id === r.itemId)?.front || "")}`; return `خطا: ${h(state.errors.find((x) => x.id === r.itemId)?.title || "")}`; }
function reviews() {
  const rows = state.reviews.filter((r) => r.status === "due").sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  shell("مرور فاصله‌دار", "مرور مبحث، خطا و فلش‌کارت.", `<div class="card"><div class="list">${list(rows.map((r) => `<div class="item"><strong>${reviewName(r)}</strong><span class="small">سررسید: ${r.dueOn}</span><div class="actions"><select id="score-${r.id}"><option value="1">ضعیف</option><option value="3">متوسط</option><option value="5">عالی</option></select><button class="btn" onclick="finishReview('${r.id}')">ثبت مرور</button></div></div>`), "مروری در صف نیست.")}</div></div>`);
}
window.finishReview = (id) => { const r = state.reviews.find((x) => x.id === id); r.status = "done"; r.score = Number($(`#score-${id}`).value); if (r.type === "topic") { const t = state.topics.find((x) => x.id === r.itemId); if (t) t.mastery = Math.max(0, Math.min(100, Number(t.mastery) + (r.score >= 4 ? 4 : -3))); } save(); render(); };
function pomodoro() {
  shell("تایمر پومودورو", "پس از پایان تایمر، آن را به مطالعه تبدیل کن.", `<section class="grid"><div class="card span-6 timer"><div><div class="time" data-timer>${fmtTimer()}</div><div class="actions"><button class="btn" onclick="startTimer()">شروع</button><button class="btn secondary" onclick="pauseTimer()">مکث</button><button class="btn secondary" onclick="resetTimer()">ریست</button></div></div></div><form class="card span-6" id="pomo"><h2>ثبت پومودورو</h2><div class="form-grid">${fields()}<label>مدت<input name="minutes" type="number" value="25"></label></div><button class="btn">ثبت و تبدیل به مطالعه</button></form></section>`);
  $("#pomo").onsubmit = (e) => { e.preventDefault(); const row = { id: uid(), date: today(), ...formData(e.target) }; state.pomodoros.push(row); state.studies.push({ id: uid(), date: today(), subjectId: row.subjectId, topicId: row.topicId, minutes: row.minutes, activity: "study", focus: 4, note: "ثبت‌شده از پومودورو" }); save(); render(); };
}
function fmtTimer() { return `${String(Math.floor(timer / 60)).padStart(2, "0")}:${String(timer % 60).padStart(2, "0")}`; }
window.startTimer = () => { if (timerId) return; timerId = setInterval(() => { timer = Math.max(0, timer - 1); const el = $("[data-timer]"); if (el) el.textContent = fmtTimer(); if (!timer) { pauseTimer(); alert("پومودورو تمام شد. حالا ثبتش کن."); } }, 1000); };
window.pauseTimer = () => { clearInterval(timerId); timerId = null; };
window.resetTimer = () => { pauseTimer(); timer = 25 * 60; render(); };
function questions() {
  shell("بانک سوال", "سوال‌های واقعی را وارد کن و در آزمون استفاده کن.", `<section class="grid"><form class="card span-6" id="qform"><h2>ثبت سوال</h2><div class="form-grid">${fields()}<label>صورت سوال<textarea name="body" required></textarea></label>${["A","B","C","D"].map((k) => `<label>گزینه ${k}<textarea name="${k}"></textarea></label>`).join("")}<label>پاسخ<select name="correct"><option>A</option><option>B</option><option>C</option><option>D</option></select></label><label>منبع<input name="source"></label><label>توضیح<textarea name="explanation"></textarea></label></div><button class="btn">ذخیره سوال</button></form><form class="card span-6" id="bulk"><h2>ورود گروهی</h2><label>منبع<input name="source"></label><label>متن<textarea name="bulk" placeholder="هر سوال را با یک خط خالی جدا کن"></textarea></label><button class="btn">ورود به بانک</button></form><div class="card span-12"><h2>سوال‌ها</h2><div class="list">${list(state.questions.slice().reverse().map((q) => `<div class="item"><strong>${h(q.body)}</strong><span class="small">${sTitle(q.subjectId)} / ${tTitle(q.topicId)} / ${h(q.source || "")}</span></div>`))}</div></div></section>`);
  $("#qform").onsubmit = (e) => { e.preventDefault(); const f = formData(e.target); state.questions.push({ id: uid(), subjectId: f.subjectId, topicId: f.topicId, body: f.body, options: { A: f.A, B: f.B, C: f.C, D: f.D }, correct: f.correct, explanation: f.explanation, source: f.source, status: "approved", timesUsed: 0, correctCount: 0 }); save(); render(); };
  $("#bulk").onsubmit = (e) => { e.preventDefault(); const f = formData(e.target); f.bulk.split(/\n\s*\n/u).map((x) => x.trim()).filter(Boolean).forEach((body) => state.questions.push({ id: uid(), body, options: {}, correct: "", explanation: "", source: f.source || "ورود متنی", status: "review", timesUsed: 0, correctCount: 0 })); save(); render(); };
}
function exam() {
  shell("آزمون مبحثی", "آزمون از بانک سؤال تاییدشده ساخته می‌شود.", `<section class="grid"><form class="card span-4" id="mkexam"><label>مبحث<select name="topicId">${topOpts()}</select></label><label>تعداد<input name="count" type="number" value="10"></label><button class="btn">ساخت آزمون</button></form><div class="card span-8">${examDraft.length ? `<form id="examform">${examDraft.map((q) => `<div class="item"><strong>${h(q.body)}</strong>${["A","B","C","D"].map((k) => q.options?.[k] ? `<label class="exam-option"><input type="radio" name="${q.id}" value="${k}"> ${k}) ${h(q.options[k])}</label>` : "").join("")}</div>`).join("")}<button class="btn">پایان و تحلیل</button></form>` : `<p class="small">یک مبحث انتخاب کن.</p>`}</div></section>`);
  $("#mkexam").onsubmit = (e) => { e.preventDefault(); const f = formData(e.target); examDraft = state.questions.filter((q) => q.topicId === f.topicId && q.status === "approved").slice(0, Number(f.count)); render(); };
  const ef = $("#examform"); if (ef) ef.onsubmit = (e) => { e.preventDefault(); const fd = new FormData(e.target); let correct = 0; examDraft.forEach((q) => { const sel = fd.get(q.id); q.timesUsed += 1; if (sel === q.correct) { correct += 1; q.correctCount += 1; } else { const err = { id: uid(), date: today(), subjectId: q.subjectId, topicId: q.topicId, title: `اشتباه در آزمون: ${q.body.slice(0, 50)}`, body: q.explanation || q.body, errorType: "conceptual", status: "new" }; state.errors.push(err); addReview("error", err.id, today()); } }); state.exams.push({ id: uid(), date: today(), title: "آزمون مبحثی", total: examDraft.length, correct }); examDraft = []; save(); active = "reports"; render(); };
}
function errors() {
  shell("دفترچه خطاها", "خطاهای دستی و آزمون‌ها اینجا جمع می‌شوند.", `<section class="grid"><form class="card span-5" id="err">${fields()}<div class="form-grid"><label>تاریخ<input name="date" type="date" value="${today()}"></label><label>عنوان<input name="title" required></label><label>نوع<select name="errorType"><option value="conceptual">مفهومی</option><option value="memory">حفظی</option><option value="careless">بی‌دقتی</option><option value="time">زمان</option><option value="trap">دام تستی</option></select></label><label>شرح<textarea name="body"></textarea></label></div><button class="btn">ثبت خطا</button></form><div class="card span-7"><h2>خطاها</h2><div class="list">${list(state.errors.slice().reverse().map((e) => `<div class="item"><strong>${h(e.title)}</strong><span class="small">${tTitle(e.topicId)} / ${h(e.errorType)}</span><div class="actions"><button class="btn secondary" onclick="errCard('${e.id}')">تبدیل به فلش‌کارت</button></div></div>`))}</div></div></section>`);
  $("#err").onsubmit = (e) => { e.preventDefault(); const row = { id: uid(), status: "new", ...formData(e.target) }; state.errors.push(row); addReview("error", row.id, row.date); save(); render(); };
}
window.errCard = (id) => { const e = state.errors.find((x) => x.id === id); const c = { id: uid(), subjectId: e.subjectId, topicId: e.topicId, front: e.title, back: e.body || "راه جلوگیری از این خطا را توضیح بده.", difficulty: "medium", nextReviewOn: today(), createdBy: "manual" }; state.flashcards.push(c); addReview("flashcard", c.id, today()); save(); active = "flashcards"; render(); };
function flashcards() {
  shell("فلش‌کارت", "فلش‌کارت دستی یا پیشنهادی با AI.", `<section class="grid"><form class="card span-5" id="card">${fields()}<div class="form-grid"><label>روی کارت<textarea name="front" required></textarea></label><label>پشت کارت<textarea name="back" required></textarea></label><label>مرور بعدی<input name="nextReviewOn" type="date" value="${today()}"></label></div><button class="btn">ثبت کارت</button></form><form class="card span-7" id="aicard"><h2>ساخت با AI</h2><label>متن<textarea name="source"></textarea></label><button class="btn">ساخت پیش‌نویس</button><div id="aiout"></div></form><div class="card span-12"><h2>کارت‌ها</h2><div class="list">${list(state.flashcards.slice().reverse().map((c) => `<div class="item"><strong>${h(c.front)}</strong><p>${h(c.back)}</p><span class="small">${tTitle(c.topicId)} / مرور: ${h(c.nextReviewOn)}</span></div>`))}</div></div></section>`);
  $("#card").onsubmit = (e) => { e.preventDefault(); const c = { id: uid(), createdBy: "manual", ...formData(e.target) }; state.flashcards.push(c); addReview("flashcard", c.id, c.nextReviewOn); save(); render(); };
  $("#aicard").onsubmit = async (e) => { e.preventDefault(); $("#aiout").innerHTML = `<p class="small">در حال دریافت پاسخ...</p>`; const ans = await ai(`از متن زیر ۵ فلش‌کارت کنکوری بساز:\n${formData(e.target).source}`); $("#aiout").innerHTML = `<div class="item">${h(ans).replace(/\n/g, "<br>")}</div>`; };
}
async function ai(message) { try { const r = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) }); const j = await r.json(); return j.answer || j.error || "پاسخی دریافت نشد."; } catch { return "AI در این دیپلوی فعال نیست یا API در دسترس نیست."; } }
function chat() {
  shell("دستیار AI", "اگر OPENAI_API_KEY روی Vercel تنظیم شود، پاسخ واقعی می‌دهد.", `<section class="grid"><div class="card span-8"><div class="chat-box">${state.chats.map((m) => `<div class="msg ${m.role}">${h(m.body).replace(/\n/g, "<br>")}</div>`).join("") || `<p class="small">هنوز پیامی نیست.</p>`}</div><form id="chat"><label>پیام<textarea name="message" required></textarea></label><button class="btn">ارسال</button></form></div><div class="card span-4"><h2>کاربردها</h2><div class="list"><div class="item">توضیح سوال غلط</div><div class="item">ساخت فلش‌کارت</div><div class="item">پیشنهاد برنامه جبران</div></div></div></section>`);
  $("#chat").onsubmit = async (e) => { e.preventDefault(); const msg = formData(e.target).message; state.chats.push({ id: uid(), role: "user", body: msg }); save(); render(); const ans = await ai(msg); state.chats.push({ id: uid(), role: "assistant", body: ans }); save(); render(); };
}
function reports() {
  const risky = [...state.topics].sort((a, b) => a.mastery - b.mastery).slice(0, 8);
  shell("گزارش", "مباحث پرریسک و آزمون‌ها.", `<section class="grid"><div class="card span-6"><h2>مباحث پرریسک</h2><div class="list">${risky.map((t) => `<div class="item"><strong>${sTitle(t.subjectId)} / ${h(t.title)}</strong><div class="progress"><i style="width:${t.mastery}%"></i></div><span class="small">تسلط: ${t.mastery}٪</span></div>`).join("")}</div></div><div class="card span-6"><h2>آزمون‌های اخیر</h2><div class="list">${list(state.exams.slice().reverse().map((e) => `<div class="item"><strong>${h(e.title)}</strong><span class="small">${e.correct} از ${e.total} / ${e.date}</span></div>`), "هنوز آزمونی ندادی.")}</div></div></section>`);
}
function settings() {
  shell("تنظیمات", "مدیریت داده‌های نسخه Vercel.", `<section class="grid"><div class="card span-4"><h2>بکاپ</h2><button class="btn" onclick="exportData()">دانلود JSON</button></div><div class="card span-4"><h2>ریست</h2><button class="btn danger" onclick="resetData()">پاک کردن داده‌ها</button></div><div class="card span-4"><h2>AI</h2><p class="small">در Vercel متغیر OPENAI_API_KEY را تنظیم کن.</p></div></section>`);
}
window.exportData = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" })); a.download = `stada-${today()}.json`; a.click(); };
window.resetData = () => { if (confirm("همه داده‌های تست پاک شود؟")) { localStorage.removeItem(STORE); state = structuredClone(seed); save(); render(); } };
function $(x) { return document.querySelector(x); }
function render() { document.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("active", x.dataset.tab === active)); ({ dashboard, study, plan, reviews, pomodoro, questions, exam, errors, flashcards, chat, reports, settings }[active] || dashboard)(); }
render();
