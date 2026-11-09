"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ClipboardPen,
  Clock,
  FileCheck2,
  FileText,
  History,
  MessageSquare,
  Settings2,
  Trash2,
} from "lucide-react";
import {
  calcAccuracy,
  calcKonkurPercent,
  fmtSecsCompact,
  formatJalaliDate,
  shiftDateISO,
  toFaDigits,
} from "@/lib/constants";
import type { StadaStudyLog, StadaSubject } from "@/lib/db";
import SubjectIcon from "./SubjectIcon";

interface StudyLogClientProps {
  subjects: StadaSubject[];
  initialLogs: StadaStudyLog[];
  todayIso: string;
  prefill?: {
    subjectId?: number;
    topic?: string;
    mins?: number;
    date?: string;
    sourceNote?: string;
  };
}

export default function StudyLogClient({
  subjects,
  initialLogs,
  todayIso,
  prefill,
}: StudyLogClientProps) {
  const router = useRouter();
  const [logs, setLogs] = useState<StadaStudyLog[]>(initialLogs);

  const defaultSubId =
    prefill?.subjectId && subjects.some((s) => s.id === prefill.subjectId)
      ? prefill.subjectId
      : (subjects[0]?.id ?? 0);

  const defaultHours = prefill?.mins ? Math.floor(prefill.mins / 60) : 1;
  const defaultMins = prefill?.mins ? prefill.mins % 60 : 0;

  const [subjectId, setSubjectId] = useState<number>(defaultSubId);
  const [logDate, setLogDate] = useState<string>(prefill?.date || todayIso);
  const [topic, setTopic] = useState<string>(prefill?.topic || "");
  const [hoursStr, setHoursStr] = useState<string>(String(defaultHours));
  const [minsStr, setMinsStr] = useState<string>(String(defaultMins));

  const [sourceBook, setSourceBook] = useState<string>(
    prefill?.sourceNote || ""
  );
  const [pageFromStr, setPageFromStr] = useState<string>("");
  const [pageToStr, setPageToStr] = useState<string>("");
  const [manualPagesStr, setManualPagesStr] = useState<string>("");

  const [testsTotalStr, setTestsTotalStr] = useState<string>("");
  const [testsWrongStr, setTestsWrongStr] = useState<string>("");
  const [testsBlankStr, setTestsBlankStr] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [filterSubId, setFilterSubId] = useState<number | "all">("all");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const yesterdayIso = shiftDateISO(todayIso, -1);

  const computedPages = useMemo(() => {
    if (manualPagesStr.trim() !== "") {
      const m = parseInt(manualPagesStr, 10);
      return Number.isFinite(m) && m > 0 ? m : 0;
    }
    const pf = parseInt(pageFromStr, 10);
    const pt = parseInt(pageToStr, 10);
    if (Number.isFinite(pf) && Number.isFinite(pt) && pt >= pf && pf >= 0) {
      return pt - pf + 1;
    }
    return 0;
  }, [pageFromStr, pageToStr, manualPagesStr]);

  const testPreview = useMemo(() => {
    const t = parseInt(testsTotalStr, 10);
    if (!Number.isFinite(t) || t <= 0) return null;
    if (testsWrongStr.trim() === "") {
      return { total: t, graded: false as const };
    }
    const w = parseInt(testsWrongStr, 10);
    const b = parseInt(testsBlankStr || "0", 10);
    if (
      !Number.isFinite(w) ||
      w < 0 ||
      !Number.isFinite(b) ||
      b < 0 ||
      w + b > t
    ) {
      return null;
    }
    const correct = t - w - b;
    return {
      total: t,
      graded: true as const,
      wrong: w,
      blank: b,
      correct,
      acc: calcAccuracy(t, w, b),
      konkur: calcKonkurPercent(t, w, b),
    };
  }, [testsTotalStr, testsWrongStr, testsBlankStr]);

  const filteredLogs = useMemo(() => {
    if (filterSubId === "all") return logs;
    return logs.filter((l) => l.subject_id === filterSubId);
  }, [logs, filterSubId]);

  function applyQuickDuration(totalMinutes: number) {
    setHoursStr(String(Math.floor(totalMinutes / 60)));
    setMinsStr(String(totalMinutes % 60));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    const h = Math.max(0, parseInt(hoursStr || "0", 10) || 0);
    const m = Math.max(0, parseInt(minsStr || "0", 10) || 0);
    const durationSeconds = h * 3600 + m * 60;

    const pf = pageFromStr.trim() !== "" ? parseInt(pageFromStr, 10) : null;
    const pt = pageToStr.trim() !== "" ? parseInt(pageToStr, 10) : null;
    const testsTotal =
      testsTotalStr.trim() !== "" ? parseInt(testsTotalStr, 10) : 0;
    const testsWrong =
      testsWrongStr.trim() !== "" ? parseInt(testsWrongStr, 10) : null;
    const testsBlank =
      testsBlankStr.trim() !== "" ? parseInt(testsBlankStr, 10) : null;

    if (durationSeconds <= 0 && computedPages <= 0 && testsTotal <= 0) {
      setFeedback({
        type: "err",
        text: "لطفاً حداقل یکی از مقادیر زمان مطالعه، صفحات یا تعداد تست را وارد کنید",
      });
      return;
    }

    if (pf !== null && pt !== null && pt < pf) {
      setFeedback({
        type: "err",
        text: "شماره صفحه پایان نباید کمتر از صفحه شروع باشد",
      });
      return;
    }

    if (
      testsTotal > 0 &&
      testsWrong !== null &&
      (testsWrong < 0 || testsWrong + (testsBlank ?? 0) > testsTotal)
    ) {
      setFeedback({
        type: "err",
        text: "مجموع غلط و نزده نمی‌تواند بیشتر از کل سوالات تست باشد",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: subjectId,
          log_date: logDate,
          duration_seconds: durationSeconds,
          topic,
          source_book: sourceBook,
          page_from: pf,
          page_to: pt,
          pages_count: computedPages > 0 ? computedPages : null,
          tests_total: testsTotal,
          tests_wrong: testsWrong,
          tests_blank: testsBlank,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "err",
          text: data.error || "خطا در ثبت گزارش مطالعه",
        });
      } else {
        setLogs((prev) => [data.log, ...prev]);
        if (typeof data.streak === "number") {
          window.dispatchEvent(
            new CustomEvent("stada:meta", { detail: { streak: data.streak } })
          );
        }
        setTopic("");
        setPageFromStr("");
        setPageToStr("");
        setManualPagesStr("");
        setTestsTotalStr("");
        setTestsWrongStr("");
        setTestsBlankStr("");
        setNote("");
        setFeedback({
          type: "ok",
          text: `گزارش «${data.log.subject_name}» با موفقیت ثبت شد`,
        });
        router.refresh();
      }
    } catch {
      setFeedback({ type: "err", text: "خطا در ارتباط با سرور" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/logs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLogs((prev) => prev.filter((l) => l.id !== id));
        router.refresh();
      }
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-100 sm:text-[22px]">
            <ClipboardPen className="h-5 w-5 text-[#00ffa3]" />
            <span>ثبت گزارش مطالعه و تست</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-[13px]">
            ثبت یکپارچه ساعت مطالعه، مبحث، منبع، شماره صفحات و عملکرد تست‌زنی
          </p>
        </div>

        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 no-underline transition hover:bg-white/[0.08]"
        >
          <Settings2 className="h-3.5 w-3.5 text-[#00ffa3]" />
          <span>مدیریت دروس و رنگ‌ها</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Form Column (7 cols) */}
        <div className="bt-card p-4 sm:p-6 lg:col-span-7">
          {feedback && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs sm:text-[13px] ${
                feedback.type === "ok"
                  ? "border-[#00ffa3]/30 bg-[#00ffa3]/10 text-[#00ffa3]"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {feedback.type === "ok" && (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* 1. Subject Selector */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-300">
                ۱. انتخاب درس
              </label>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => {
                  const active = subjectId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSubjectId(s.id)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition sm:text-[13px]"
                      style={
                        active
                          ? {
                              backgroundColor: `${s.color}22`,
                              color: s.color,
                              borderColor: `${s.color}70`,
                              fontWeight: 800,
                            }
                          : {
                              backgroundColor: "rgba(255,255,255,0.03)",
                              color: "#94a3b8",
                              borderColor: "rgba(255,255,255,0.08)",
                            }
                      }
                    >
                      <SubjectIcon icon={s.icon} className="h-3.5 w-3.5" />
                      <span>{s.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Date & Topic */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    ۲. تاریخ مطالعه
                  </label>
                  <div className="flex gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setLogDate(todayIso)}
                      className={`cursor-pointer rounded px-2 py-0.5 ${
                        logDate === todayIso
                          ? "bg-[#00ffa3]/20 font-bold text-[#00ffa3]"
                          : "bg-white/[0.04] text-slate-400"
                      }`}
                    >
                      امروز
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogDate(yesterdayIso)}
                      className={`cursor-pointer rounded px-2 py-0.5 ${
                        logDate === yesterdayIso
                          ? "bg-[#00d4ff]/20 font-bold text-[#00d4ff]"
                          : "bg-white/[0.04] text-slate-400"
                      }`}
                    >
                      دیروز
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="bt-input text-xs"
                  dir="ltr"
                />
                <div className="mt-1 text-[11px] text-[#00ffa3]">
                  {formatJalaliDate(logDate)}
                </div>
              </div>

              <div className="sm:col-span-7">
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  ۳. مبحث مورد مطالعه
                </label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="مثلاً: فصل ۲ — ساختار غشا / مشتق توابع"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="bt-input"
                />
              </div>
            </div>

            {/* 3. Study Time */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Clock className="h-3.5 w-3.5 text-[#00ffa3]" />
                  <span>۴. میزان زمان مطالعه</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    [30, "۳۰د"],
                    [45, "۴۵د"],
                    [60, "۱س"],
                    [90, "۱.۵س"],
                    [120, "۲س"],
                  ].map(([mins, lbl]) => (
                    <button
                      key={String(mins)}
                      type="button"
                      onClick={() => applyQuickDuration(Number(mins))}
                      className="cursor-pointer rounded-lg border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300 transition hover:border-[#00ffa3]/40 hover:text-[#00ffa3]"
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">
                    ساعت
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    dir="ltr"
                    value={hoursStr}
                    onChange={(e) => setHoursStr(e.target.value)}
                    className="bt-input text-center font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">
                    دقیقه
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    dir="ltr"
                    value={minsStr}
                    onChange={(e) => setMinsStr(e.target.value)}
                    className="bt-input text-center font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 4. Source Book & Pages */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <BookOpen className="h-3.5 w-3.5 text-[#00d4ff]" />
                  <span>۵. منبع و صفحات مطالعه‌شده</span>
                </span>
                {computedPages > 0 && (
                  <span className="rounded-full bg-[#00d4ff]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#00d4ff]">
                    {toFaDigits(computedPages)} صفحه
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-12">
                <div className="col-span-3 sm:col-span-6">
                  <label className="mb-1 block text-[11px] text-slate-400">
                    نام منبع / کتاب / جزوه
                  </label>
                  <input
                    type="text"
                    maxLength={150}
                    placeholder="مثلاً: خیلی سبز / نشر الگو / کتاب درسی"
                    value={sourceBook}
                    onChange={(e) => setSourceBook(e.target.value)}
                    className="bt-input text-xs"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="mb-1 block text-[11px] text-slate-400">
                    از صفحه
                  </label>
                  <input
                    type="number"
                    min={1}
                    dir="ltr"
                    placeholder="45"
                    value={pageFromStr}
                    onChange={(e) => {
                      setPageFromStr(e.target.value);
                      setManualPagesStr("");
                    }}
                    className="bt-input text-center text-xs"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="mb-1 block text-[11px] text-slate-400">
                    تا صفحه
                  </label>
                  <input
                    type="number"
                    min={1}
                    dir="ltr"
                    placeholder="60"
                    value={pageToStr}
                    onChange={(e) => {
                      setPageToStr(e.target.value);
                      setManualPagesStr("");
                    }}
                    className="bt-input text-center text-xs"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="mb-1 block text-[11px] text-slate-400">
                    کل صفحات
                  </label>
                  <input
                    type="number"
                    min={0}
                    dir="ltr"
                    placeholder={
                      computedPages > 0 ? String(computedPages) : "0"
                    }
                    value={manualPagesStr}
                    onChange={(e) => setManualPagesStr(e.target.value)}
                    className="bt-input text-center text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 5. Unified Test Entry */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <FileText className="h-3.5 w-3.5 text-[#ff6b9d]" />
                  <span>
                    ۶. تست‌های حل‌شده{" "}
                    <span className="text-[10px] font-normal text-slate-500">
                      (اختیاری)
                    </span>
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">
                    تعداد کل تست
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    dir="ltr"
                    placeholder="40"
                    value={testsTotalStr}
                    onChange={(e) => setTestsTotalStr(e.target.value)}
                    className="bt-input text-center text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">
                    غلط
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    dir="ltr"
                    placeholder="4"
                    value={testsWrongStr}
                    onChange={(e) => setTestsWrongStr(e.target.value)}
                    className="bt-input text-center text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">
                    نزده
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    dir="ltr"
                    placeholder="0"
                    value={testsBlankStr}
                    onChange={(e) => setTestsBlankStr(e.target.value)}
                    className="bt-input text-center text-xs"
                  />
                </div>
              </div>

              {testPreview && testPreview.graded && (
                <div className="mt-3 rounded-xl border border-white/10 bg-[#0f172a]/70 p-3 text-center">
                  <div className="flex items-center justify-around gap-3">
                    <div>
                      <div
                        className="text-xl font-extrabold sm:text-2xl"
                        dir="ltr"
                        style={{
                          color:
                            testPreview.acc >= 70
                              ? "#00ffa3"
                              : testPreview.acc >= 50
                                ? "#ffb347"
                                : "#ef4444",
                        }}
                      >
                        {testPreview.acc}%
                      </div>
                      <div className="text-[10px] text-slate-400">
                        دقت پاسخگویی
                      </div>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div>
                      <div
                        className="text-xl font-extrabold text-[#00d4ff] sm:text-2xl"
                        dir="ltr"
                      >
                        {testPreview.konkur}%
                      </div>
                      <div className="text-[10px] text-slate-400">
                        درصد با نمره منفی
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-400">
                    {toFaDigits(testPreview.correct)} صحیح •{" "}
                    {toFaDigits(testPreview.wrong)} غلط •{" "}
                    {toFaDigits(testPreview.blank)} نزده
                  </div>
                </div>
              )}
            </div>

            {/* 6. Note */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                ۷. یادداشت و ارزیابی کیفیت مطالعه{" "}
                <span className="text-[10px] font-normal text-slate-500">
                  (اختیاری)
                </span>
              </label>
              <textarea
                rows={2}
                placeholder="مثلاً: نکات ترکیبی بخش دوم علامت‌گذاری شد..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bt-input resize-y text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="bt-btn-primary w-full py-3.5 text-sm sm:text-[15px]"
            >
              {saving ? "در حال ثبت گزارش..." : "ثبت نهایی گزارش مطالعه"}
            </button>
          </form>
        </div>

        {/* Recent Logs Column (5 cols) */}
        <div className="bt-card p-4 sm:p-6 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-100">
              <History className="h-4 w-4 text-[#00ffa3]" />
              <span>گزارش‌های اخیر ({toFaDigits(filteredLogs.length)})</span>
            </h2>
            <Link
              href="/reports"
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#00ffa3] no-underline hover:underline"
            >
              <span>نمودارها</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mb-3.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFilterSubId("all")}
              className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] transition ${
                filterSubId === "all"
                  ? "bg-[#00ffa3]/15 font-bold text-[#00ffa3]"
                  : "bg-white/[0.03] text-slate-400 hover:text-slate-200"
              }`}
            >
              همه دروس
            </button>
            {subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setFilterSubId(s.id)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] transition"
                style={
                  filterSubId === s.id
                    ? {
                        backgroundColor: `${s.color}20`,
                        borderColor: `${s.color}60`,
                        color: s.color,
                        fontWeight: 700,
                      }
                    : {
                        backgroundColor: "rgba(255,255,255,0.03)",
                        borderColor: "transparent",
                        color: "#94a3b8",
                      }
                }
              >
                <SubjectIcon icon={s.icon} className="h-3 w-3" />
                <span>{s.name}</span>
              </button>
            ))}
          </div>

          {filteredLogs.length > 0 ? (
            <div className="max-h-[680px] space-y-2.5 overflow-y-auto pl-1">
              {filteredLogs.map((l) => (
                <div
                  key={l.id}
                  className="rounded-xl border bg-white/[0.02] p-3.5"
                  style={{ borderColor: `${l.subject_color}30` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 text-[13px] font-bold"
                          style={{ color: l.subject_color }}
                        >
                          <SubjectIcon
                            icon={l.subject_icon}
                            className="h-3.5 w-3.5"
                          />
                          <span>{l.subject_name}</span>
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {formatJalaliDate(l.log_date)}
                        </span>
                      </div>

                      {l.topic && (
                        <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-200">
                          <Bookmark className="h-3 w-3 shrink-0 text-slate-400" />
                          <span>{l.topic}</span>
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
                        {l.duration_seconds > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.05] px-2 py-0.5">
                            <Clock className="h-3 w-3" />
                            <span dir="ltr">
                              {fmtSecsCompact(l.duration_seconds)}
                            </span>
                          </span>
                        )}

                        {(l.pages_count > 0 || l.source_book) && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#00d4ff]/10 px-2 py-0.5 text-[#00d4ff]">
                            <BookOpen className="h-3 w-3 shrink-0" />
                            <span>
                              {l.source_book ? `${l.source_book}: ` : ""}
                              {l.page_from !== null && l.page_to !== null
                                ? `ص ${toFaDigits(l.page_from)} تا ${toFaDigits(l.page_to)} (${toFaDigits(l.pages_count)} صفحه)`
                                : l.pages_count > 0
                                  ? `${toFaDigits(l.pages_count)} صفحه`
                                  : ""}
                            </span>
                          </span>
                        )}

                        {l.tests_total > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#ff6b9d]/12 px-2 py-0.5 text-[#ff6b9d]">
                            <FileCheck2 className="h-3 w-3 shrink-0" />
                            <span>
                              {toFaDigits(l.tests_total)} تست
                              {l.test_accuracy !== null
                                ? ` • دقت ${l.test_accuracy}%`
                                : ""}
                              {l.konkur_score !== null
                                ? ` (کنکوری ${l.konkur_score}%)`
                                : ""}
                            </span>
                          </span>
                        )}
                      </div>

                      {l.note && (
                        <div className="mt-1.5 inline-flex items-start gap-1 text-[11px] text-slate-400">
                          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                          <span>{l.note}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(l.id)}
                      title="حذف گزارش"
                      className="cursor-pointer rounded-md p-1.5 text-slate-500 transition hover:bg-red-500/15 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-slate-500">
              هنوز گزارشی ثبت نشده است
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
