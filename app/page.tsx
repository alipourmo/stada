"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Topic = { id: string; subjectId: string; title: string; mastery: number; priority: number };
type Question = { id: string; subjectId?: string; topicId?: string; body: string; options: Record<string, string>; correct?: string; explanation?: string; source?: string; status: string; timesUsed: number; correctCount: number };
type AppState = {
  subjects: { id: string; title: string; weight: number }[];
  topics: Topic[];
  studies: any[];
  plans: any[];
  reviews: any[];
  questions: Question[];
  exams: any[];
  errors: any[];
  flashcards: any[];
  checkins: any[];
  pomodoros: any[];
  chats: any[];
};

const STORE = "stada.next.mvp";
const tabs = [
  ["dashboard", "داشبورد"], ["study", "ثبت مطالعه"], ["plan", "برنامه"], ["reviews", "مرور"],
  ["pomodoro", "پومودورو"], ["questions", "بانک سوال"], ["exam", "آزمون"], ["errors", "دفترچه خطا"],
  ["flashcards", "فلش‌کارت"], ["chat", "دستیار AI"], ["reports", "گزارش"], ["settings", "تنظیمات"],
];

const seed: AppState = {
  subjects: [
    ["s1", "بیوشیمی", 5], ["s2", "زیست‌شناسی سلولی و مولکولی", 5], ["s3", "ژنتیک", 4],
    ["s4", "میکروبیولوژی", 4], ["s5", "بیوتکنولوژی", 5],
  ].map(([id, title, weight]) => ({ id: String(id), title: String(title), weight: Number(weight) })),
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

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const fd = (form: HTMLFormElement) => Object.fromEntries(new FormData(form).entries());

export default function StadaApp() {
  const [state, setState] = useState<AppState>(seed);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [examDraft, setExamDraft] = useState<Question[]>([]);
  const [timer, setTimer] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [aiDraft, setAiDraft] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(STORE);
    if (raw) setState(JSON.parse(raw));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORE, JSON.stringify(state));
  }, [state, ready]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTimer((x) => Math.max(0, x - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (timer === 0) setRunning(false);
  }, [timer]);

  const subjectTitle = (id?: string) => state.subjects.find((x) => x.id === id)?.title || "بدون درس";
  const topicTitle = (id?: string) => state.topics.find((x) => x.id === id)?.title || "بدون مبحث";
  const dueReviews = () => state.reviews.filter((x) => x.status === "due" && x.dueOn <= today());
  const daysLeft = () => Math.ceil((new Date("2027-05-07T00:00:00+03:30").getTime() - Date.now()) / 86400000);
  const save = (updater: (draft: AppState) => void) => setState((prev) => {
    const next = structuredClone(prev);
    updater(next);
    return next;
  });
  const addReview = (draft: AppState, type: string, itemId: string, dueOn: string) => draft.reviews.push({ id: uid(), type, itemId, dueOn, status: "due", score: null });
  const addTopicReviews = (draft: AppState, topicId: string, base: string) => [1, 3, 7, 14, 30].forEach((days) => {
    const date = new Date(`${base}T00:00:00`);
    date.setDate(date.getDate() + days);
    addReview(draft, "topic", topicId, date.toISOString().slice(0, 10));
  });

  const readiness = useMemo(() => {
    const mastery = state.topics.reduce((a, t) => a + Number(t.mastery || 0), 0) / Math.max(1, state.topics.length);
    const week = new Date(); week.setDate(week.getDate() - 6);
    const minutes = state.studies.filter((x) => new Date(x.date) >= week).reduce((a, x) => a + Number(x.minutes || 0), 0);
    return Math.min(100, Math.round(mastery * .45 + Math.min(35, minutes / 30) + Math.max(0, 20 - dueReviews().length)));
  }, [state]);

  const subjectSelect = (name = "subjectId") => <select name={name}><option value="">انتخاب نشده</option>{state.subjects.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>;
  const topicSelect = (name = "topicId") => <select name={name}><option value="">انتخاب نشده</option>{state.topics.map((t) => <option key={t.id} value={t.id}>{subjectTitle(t.subjectId)} / {t.title}</option>)}</select>;
  const title = tabs.find(([id]) => id === tab)?.[1] || "داشبورد";

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">استادا<br />مدیریت کنکور ارشد زیست/بیوتکنولوژی</div>
        <nav className="nav">{tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}</nav>
      </aside>
      <main className="main">
        <div className="topbar"><div className="title"><h1>{title}</h1><p>نسخه Vercel قابل استفاده، local-first و آماده اتصال به AI سمت سرور.</p></div><span className="badge">ذخیره در مرورگر</span></div>
        {tab === "dashboard" && <Dashboard />}
        {tab === "study" && <Study />}
        {tab === "plan" && <Plan />}
        {tab === "reviews" && <Reviews />}
        {tab === "pomodoro" && <Pomodoro />}
        {tab === "questions" && <Questions />}
        {tab === "exam" && <Exam />}
        {tab === "errors" && <Errors />}
        {tab === "flashcards" && <Flashcards />}
        {tab === "chat" && <Chat />}
        {tab === "reports" && <Reports />}
        {tab === "settings" && <Settings />}
      </main>
    </div>
  );

  function Dashboard() {
    const mins = state.studies.filter((x) => x.date === today()).reduce((a, x) => a + Number(x.minutes || 0), 0);
    const plans = state.plans.filter((x) => x.date === today() && x.status !== "done");
    return <section className="grid">
      <Metric label="روز باقی‌مانده" value={daysLeft().toLocaleString("fa-IR")} hint="تا ۱۷ اردیبهشت ۱۴۰۶" />
      <Metric label="مطالعه امروز" value={`${(mins / 60).toFixed(1)}h`} hint={`${mins} دقیقه`} />
      <Metric label="مرورهای باز" value={dueReviews().length} hint="امروز و عقب‌افتاده" />
      <div className="card span-3 metric"><span>آمادگی</span><b>{readiness}٪</b><div className="progress"><i style={{ width: `${readiness}%` }} /></div></div>
      <div className="card span-6"><h2>برنامه امروز</h2><div className="list">{plans.length ? plans.map((p) => <div className="item" key={p.id}><strong>{p.title}</strong><span className="small">{topicTitle(p.topicId)} / {p.minutes} دقیقه</span></div>) : <p className="small">برای امروز برنامه‌ای نداری.</p>}</div></div>
      <div className="card span-6"><h2>مرورهای فوری</h2><div className="list">{dueReviews().slice(0, 6).map((r) => <div className="item" key={r.id}><strong>{reviewName(r)}</strong><span className="small">سررسید: {r.dueOn}</span></div>)}</div></div>
      <form className="card span-12" onSubmit={submitCheckin}><h2>چک‌این روزانه</h2><div className="form-grid"><label>تاریخ<input name="date" type="date" defaultValue={today()} /></label><label>خواب<input name="sleep" type="number" step=".5" defaultValue="7" /></label><label>انرژی<input name="energy" type="number" min="1" max="5" defaultValue="3" /></label><label>تمرکز<input name="focus" type="number" min="1" max="5" defaultValue="3" /></label><label>استرس<input name="stress" type="number" min="1" max="5" defaultValue="3" /></label><label>یادداشت<textarea name="note" /></label></div><button className="btn">ثبت</button></form>
    </section>;
  }

  function Metric({ label, value, hint }: any) { return <div className="card span-3 metric"><span>{label}</span><b>{value}</b><small>{hint}</small></div>; }

  function submitCheckin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const row = { id: uid(), ...fd(e.currentTarget) };
    save((d) => { d.checkins = d.checkins.filter((x) => x.date !== row.date); d.checkins.push(row); });
  }

  function Study() {
    return <section className="grid"><form className="card span-5" onSubmit={submitStudy}><div className="form-grid"><label>درس{subjectSelect()}</label><label>مبحث{topicSelect()}</label><label>تاریخ<input name="date" type="date" defaultValue={today()} /></label><label>دقیقه<input name="minutes" type="number" defaultValue="60" /></label><label>فعالیت<select name="activity"><option value="study">مطالعه</option><option value="test">تست</option><option value="review">مرور</option><option value="analysis">تحلیل</option></select></label><label>تمرکز<input name="focus" type="number" min="1" max="5" defaultValue="3" /></label><label>یادداشت<textarea name="note" /></label></div><button className="btn">ثبت مطالعه</button></form><div className="card span-7"><h2>آخرین مطالعه‌ها</h2><div className="list">{state.studies.slice(-20).reverse().map((x) => <div className="item" key={x.id}><strong>{subjectTitle(x.subjectId)} / {topicTitle(x.topicId)}</strong><span className="small">{x.date}، {x.minutes} دقیقه، {x.activity}</span></div>)}</div></div></section>;
  }

  function submitStudy(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const row: any = { id: uid(), ...fd(e.currentTarget) };
    save((d) => { d.studies.push(row); const t = d.topics.find((x) => x.id === row.topicId); if (t) { t.mastery = Math.min(100, Number(t.mastery) + (row.activity === "test" ? 4 : 3)); addTopicReviews(d, row.topicId, row.date); } });
  }

  function Plan() {
    return <section className="grid"><form className="card span-5" onSubmit={submitPlan}><div className="form-grid"><label>تاریخ<input name="date" type="date" defaultValue={today()} /></label><label>نوع<select name="scope"><option value="daily">روزانه</option><option value="weekly">هفتگی</option><option value="long">بلندمدت</option></select></label><label>درس{subjectSelect()}</label><label>مبحث{topicSelect()}</label><label>عنوان<input name="title" required /></label><label>هدف دقیقه<input name="minutes" type="number" defaultValue="60" /></label></div><button className="btn">ثبت برنامه</button></form><div className="card span-7"><h2>برنامه‌ها</h2><div className="list">{state.plans.slice().reverse().map((p) => <div className="item" key={p.id}><strong>{p.title}</strong><span className="small">{p.date} / {p.scope} / {p.status}</span><div className="actions"><button className="btn secondary" onClick={() => save((d) => { const x = d.plans.find((i) => i.id === p.id); if (x) x.status = "done"; })}>انجام شد</button></div></div>)}</div></div></section>;
  }

  function submitPlan(e: FormEvent<HTMLFormElement>) { e.preventDefault(); save((d) => d.plans.push({ id: uid(), status: "todo", ...fd(e.currentTarget) })); }

  function reviewName(r: any) {
    if (r.type === "topic") return `مبحث: ${topicTitle(r.itemId)}`;
    if (r.type === "flashcard") return `فلش‌کارت: ${state.flashcards.find((x) => x.id === r.itemId)?.front || ""}`;
    return `خطا: ${state.errors.find((x) => x.id === r.itemId)?.title || ""}`;
  }

  function Reviews() {
    const rows = state.reviews.filter((r) => r.status === "due").sort((a, b) => a.dueOn.localeCompare(b.dueOn));
    return <div className="card"><div className="list">{rows.length ? rows.map((r) => <div className="item" key={r.id}><strong>{reviewName(r)}</strong><span className="small">سررسید: {r.dueOn}</span><div className="actions"><button className="btn" onClick={() => finishReview(r.id, 5)}>عالی</button><button className="btn secondary" onClick={() => finishReview(r.id, 3)}>متوسط</button><button className="btn secondary" onClick={() => finishReview(r.id, 1)}>ضعیف</button></div></div>) : <p className="small">مروری در صف نیست.</p>}</div></div>;
  }

  function finishReview(id: string, score: number) {
    save((d) => { const r = d.reviews.find((x) => x.id === id); if (!r) return; r.status = "done"; r.score = score; if (r.type === "topic") { const t = d.topics.find((x) => x.id === r.itemId); if (t) t.mastery = Math.max(0, Math.min(100, Number(t.mastery) + (score >= 4 ? 4 : -3))); } });
  }

  function Pomodoro() {
    const mm = String(Math.floor(timer / 60)).padStart(2, "0"), ss = String(timer % 60).padStart(2, "0");
    return <section className="grid"><div className="card span-6 timer"><div><div className="time">{mm}:{ss}</div><div className="actions"><button className="btn" onClick={() => setRunning(true)}>شروع</button><button className="btn secondary" onClick={() => setRunning(false)}>مکث</button><button className="btn secondary" onClick={() => { setRunning(false); setTimer(25 * 60); }}>ریست</button></div></div></div><form className="card span-6" onSubmit={submitPomodoro}><h2>ثبت پومودورو</h2><div className="form-grid"><label>درس{subjectSelect()}</label><label>مبحث{topicSelect()}</label><label>مدت<input name="minutes" type="number" defaultValue="25" /></label></div><button className="btn">ثبت و تبدیل به مطالعه</button></form></section>;
  }

  function submitPomodoro(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const row: any = { id: uid(), date: today(), ...fd(e.currentTarget) };
    save((d) => { d.pomodoros.push(row); d.studies.push({ id: uid(), date: today(), subjectId: row.subjectId, topicId: row.topicId, minutes: row.minutes, activity: "study", focus: 4, note: "ثبت‌شده از پومودورو" }); });
  }

  function Questions() {
    return <section className="grid"><form className="card span-6" onSubmit={submitQuestion}><h2>ثبت سوال</h2><div className="form-grid"><label>درس{subjectSelect()}</label><label>مبحث{topicSelect()}</label><label>صورت سوال<textarea name="body" required /></label>{["A", "B", "C", "D"].map((k) => <label key={k}>گزینه {k}<textarea name={k} /></label>)}<label>پاسخ<select name="correct"><option>A</option><option>B</option><option>C</option><option>D</option></select></label><label>منبع<input name="source" /></label><label>توضیح<textarea name="explanation" /></label></div><button className="btn">ذخیره سوال</button></form><form className="card span-6" onSubmit={submitBulk}><h2>ورود گروهی</h2><label>منبع<input name="source" /></label><label>متن<textarea name="bulk" placeholder="هر سوال را با یک خط خالی جدا کن" /></label><button className="btn">ورود به بانک</button></form><div className="card span-12"><h2>سوال‌ها</h2><div className="list">{state.questions.slice().reverse().map((q) => <div className="item" key={q.id}><strong>{q.body}</strong><span className="small">{subjectTitle(q.subjectId)} / {topicTitle(q.topicId)} / {q.source}</span></div>)}</div></div></section>;
  }

  function submitQuestion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f: any = fd(e.currentTarget);
    save((d) => d.questions.push({ id: uid(), subjectId: f.subjectId, topicId: f.topicId, body: f.body, options: { A: f.A, B: f.B, C: f.C, D: f.D }, correct: f.correct, explanation: f.explanation, source: f.source, status: "approved", timesUsed: 0, correctCount: 0 }));
  }

  function submitBulk(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f: any = fd(e.currentTarget);
    save((d) => f.bulk.split(/\n\s*\n/u).map((x: string) => x.trim()).filter(Boolean).forEach((body: string) => d.questions.push({ id: uid(), body, options: {}, correct: "", explanation: "", source: f.source || "ورود متنی", status: "review", timesUsed: 0, correctCount: 0 })));
  }

  function Exam() {
    return <section className="grid"><form className="card span-4" onSubmit={makeExam}><label>مبحث{topicSelect()}</label><label>تعداد<input name="count" type="number" defaultValue="10" /></label><button className="btn">ساخت آزمون</button></form><div className="card span-8">{examDraft.length ? <form onSubmit={finishExam}>{examDraft.map((q) => <div className="item" key={q.id}><strong>{q.body}</strong>{["A", "B", "C", "D"].map((k) => q.options?.[k] ? <label className="exam-option" key={k}><input type="radio" name={q.id} value={k} /> {k}) {q.options[k]}</label> : null)}</div>)}<button className="btn">پایان و تحلیل</button></form> : <p className="small">یک مبحث انتخاب کن.</p>}</div></section>;
  }

  function makeExam(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f: any = fd(e.currentTarget); setExamDraft(state.questions.filter((q) => q.topicId === f.topicId && q.status === "approved").slice(0, Number(f.count))); }

  function finishExam(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const answers = new FormData(e.currentTarget); let correct = 0;
    save((d) => {
      examDraft.forEach((q) => { const real = d.questions.find((x) => x.id === q.id); if (!real) return; const selected = answers.get(q.id); real.timesUsed += 1; if (selected === real.correct) { correct += 1; real.correctCount += 1; } else { const err = { id: uid(), date: today(), subjectId: real.subjectId, topicId: real.topicId, title: `اشتباه در آزمون: ${real.body.slice(0, 50)}`, body: real.explanation || real.body, errorType: "conceptual", status: "new" }; d.errors.push(err); addReview(d, "error", err.id, today()); } });
      d.exams.push({ id: uid(), date: today(), title: "آزمون مبحثی", total: examDraft.length, correct });
    });
    setExamDraft([]); setTab("reports");
  }

  function Errors() {
    return <section className="grid"><form className="card span-5" onSubmit={submitError}><div className="form-grid"><label>درس{subjectSelect()}</label><label>مبحث{topicSelect()}</label><label>تاریخ<input name="date" type="date" defaultValue={today()} /></label><label>عنوان<input name="title" required /></label><label>نوع<select name="errorType"><option value="conceptual">مفهومی</option><option value="memory">حفظی</option><option value="careless">بی‌دقتی</option><option value="time">زمان</option><option value="trap">دام تستی</option></select></label><label>شرح<textarea name="body" /></label></div><button className="btn">ثبت خطا</button></form><div className="card span-7"><h2>خطاها</h2><div className="list">{state.errors.slice().reverse().map((e) => <div className="item" key={e.id}><strong>{e.title}</strong><span className="small">{topicTitle(e.topicId)} / {e.errorType}</span><div className="actions"><button className="btn secondary" onClick={() => errorToCard(e.id)}>تبدیل به فلش‌کارت</button></div></div>)}</div></div></section>;
  }

  function submitError(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const row: any = { id: uid(), status: "new", ...fd(e.currentTarget) }; save((d) => { d.errors.push(row); addReview(d, "error", row.id, row.date); }); }
  function errorToCard(id: string) { save((d) => { const e = d.errors.find((x) => x.id === id); if (!e) return; const c = { id: uid(), subjectId: e.subjectId, topicId: e.topicId, front: e.title, back: e.body || "راه جلوگیری از این خطا را توضیح بده.", nextReviewOn: today(), createdBy: "manual" }; d.flashcards.push(c); addReview(d, "flashcard", c.id, today()); }); setTab("flashcards"); }

  function Flashcards() {
    return <section className="grid"><form className="card span-5" onSubmit={submitCard}><div className="form-grid"><label>درس{subjectSelect()}</label><label>مبحث{topicSelect()}</label><label>روی کارت<textarea name="front" required /></label><label>پشت کارت<textarea name="back" required /></label><label>مرور بعدی<input name="nextReviewOn" type="date" defaultValue={today()} /></label></div><button className="btn">ثبت کارت</button></form><form className="card span-7" onSubmit={aiCards}><h2>ساخت با AI</h2><label>متن<textarea name="source" /></label><button className="btn">ساخت پیش‌نویس</button>{aiDraft && <div className="item">{aiDraft}</div>}</form><div className="card span-12"><h2>کارت‌ها</h2><div className="list">{state.flashcards.slice().reverse().map((c) => <div className="item" key={c.id}><strong>{c.front}</strong><p>{c.back}</p><span className="small">{topicTitle(c.topicId)} / مرور: {c.nextReviewOn}</span></div>)}</div></div></section>;
  }
  function submitCard(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const c: any = { id: uid(), createdBy: "manual", ...fd(e.currentTarget) }; save((d) => { d.flashcards.push(c); addReview(d, "flashcard", c.id, c.nextReviewOn); }); }
  async function aiCards(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setAiDraft("در حال دریافت پاسخ..."); const f: any = fd(e.currentTarget); setAiDraft(await callAI(`از متن زیر ۵ فلش‌کارت کنکوری بساز:\n${f.source}`)); }

  async function callAI(message: string) { const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) }); const data = await res.json(); return data.answer || data.error || "پاسخی دریافت نشد."; }

  function Chat() {
    return <section className="grid"><div className="card span-8"><div className="chat-box">{state.chats.map((m) => <div className={`msg ${m.role}`} key={m.id}>{m.body}</div>)}</div><form onSubmit={sendChat}><label>پیام<textarea name="message" required /></label><button className="btn">ارسال</button></form></div><div className="card span-4"><h2>کاربردها</h2><div className="list"><div className="item">توضیح سوال غلط</div><div className="item">ساخت فلش‌کارت</div><div className="item">پیشنهاد برنامه جبران</div></div></div></section>;
  }
  async function sendChat(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f: any = fd(e.currentTarget); const user = { id: uid(), role: "user", body: f.message }; save((d) => d.chats.push(user)); const answer = await callAI(f.message); save((d) => d.chats.push({ id: uid(), role: "assistant", body: answer })); e.currentTarget.reset(); }

  function Reports() {
    const risky = [...state.topics].sort((a, b) => a.mastery - b.mastery).slice(0, 8);
    return <section className="grid"><div className="card span-6"><h2>مباحث پرریسک</h2><div className="list">{risky.map((t) => <div className="item" key={t.id}><strong>{subjectTitle(t.subjectId)} / {t.title}</strong><div className="progress"><i style={{ width: `${t.mastery}%` }} /></div><span className="small">تسلط: {t.mastery}٪</span></div>)}</div></div><div className="card span-6"><h2>آزمون‌های اخیر</h2><div className="list">{state.exams.slice().reverse().map((e) => <div className="item" key={e.id}><strong>{e.title}</strong><span className="small">{e.correct} از {e.total} / {e.date}</span></div>)}</div></div></section>;
  }

  function Settings() {
    return <section className="grid"><div className="card span-4"><h2>بکاپ</h2><button className="btn" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" })); a.download = `stada-${today()}.json`; a.click(); }}>دانلود JSON</button></div><div className="card span-4"><h2>ریست</h2><button className="btn danger" onClick={() => { if (confirm("همه داده‌ها پاک شود؟")) { localStorage.removeItem(STORE); setState(seed); } }}>پاک کردن داده‌ها</button></div><div className="card span-4 muted-card"><h2>AI</h2><p className="small">برای پاسخ واقعی، در Vercel متغیر `OPENAI_API_KEY` را تنظیم کن. کلید در مرورگر ذخیره نمی‌شود.</p></div></section>;
  }
}
