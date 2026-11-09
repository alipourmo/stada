"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Coffee,
  History,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Save,
  Settings2,
  Timer,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { fmtClockHM, fmtSecsCompact, toFaDigits } from "@/lib/constants";
import type { StadaStudyLog, StadaSubject } from "@/lib/db";
import SubjectIcon from "./SubjectIcon";

interface PomodoroClientProps {
  subjects: StadaSubject[];
  initialTodayLogs: StadaStudyLog[];
  initialTodayTotal: number;
}

const WORK_PRESETS = [
  { mins: 25, label: "۲۵ دقیقه" },
  { mins: 45, label: "۴۵ دقیقه" },
  { mins: 90, label: "۹۰ دقیقه" },
];

const BREAK_PRESETS = [
  { mins: 5, label: "۵ دقیقه" },
  { mins: 15, label: "۱۵ دقیقه" },
  { mins: 30, label: "۳۰ دقیقه" },
];

export default function PomodoroClient({
  subjects,
  initialTodayLogs,
  initialTodayTotal,
}: PomodoroClientProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"work" | "break">("work");
  const [workDuration, setWorkDuration] = useState(25 * 60);
  const [breakDuration, setBreakDuration] = useState(5 * 60);
  const [secsLeft, setSecsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [rounds, setRounds] = useState(0);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(
    subjects[0]?.id ?? 0
  );
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [topic, setTopic] = useState("");
  const [sourceBook, setSourceBook] = useState("");
  const [pageFrom, setPageFrom] = useState("");
  const [pageTo, setPageTo] = useState("");
  const [testsTotal, setTestsTotal] = useState("");

  const [todayLogs, setTodayLogs] =
    useState<StadaStudyLog[]>(initialTodayLogs);
  const [todayTotal, setTodayTotal] = useState(initialTodayTotal);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const targetEndRef = useRef<number | null>(null);
  const completingRef = useRef(false);

  const activeSub =
    subjects.find((s) => s.id === selectedSubjectId) ??
    subjects[0] ?? {
      id: 0,
      name: "عمومی",
      color: "#00ffa3",
      icon: "book",
    };

  const totalCurrentDuration = mode === "work" ? workDuration : breakDuration;
  const elapsedSecs = Math.max(0, totalCurrentDuration - secsLeft);
  const ringColor = mode === "work" ? activeSub.color : "#00d4ff";

  function showNotification(type: "ok" | "err", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }

  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(
          0.16,
          ctx.currentTime + idx * 0.14 + 0.04
        );
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + idx * 0.14 + 0.45
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.14);
        osc.stop(ctx.currentTime + idx * 0.14 + 0.5);
      });
    } catch {
      // ignore audio errors
    }
  }, [soundEnabled]);

  const persistSession = useCallback(
    async (secondsToSave: number) => {
      setSaving(true);
      try {
        const pf = pageFrom.trim() !== "" ? Number(pageFrom) : null;
        const pt = pageTo.trim() !== "" ? Number(pageTo) : null;
        const tt = testsTotal.trim() !== "" ? Number(testsTotal) : 0;

        const res = await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject_id: selectedSubjectId,
            duration_seconds: secondsToSave,
            topic: topic.trim() || null,
            source_book: sourceBook.trim() || null,
            page_from: pf,
            page_to: pt,
            tests_total: tt,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showNotification("err", data.error || "خطا در ثبت گزارش پومودورو");
          return false;
        }
        if (typeof data.streak === "number") {
          window.dispatchEvent(
            new CustomEvent("stada:meta", {
              detail: { streak: data.streak },
            })
          );
        }
        if (typeof data.todayTotalSeconds === "number") {
          setTodayTotal(data.todayTotalSeconds);
        }
        if (data.log) {
          setTodayLogs((prev) => [data.log, ...prev]);
        }
        setPageFrom("");
        setPageTo("");
        setTestsTotal("");
        showNotification(
          "ok",
          `پومودوروی «${activeSub.name}» (${fmtSecsCompact(secondsToSave)}) در گزارش امروز ثبت شد`
        );
        router.refresh();
        return true;
      } catch {
        showNotification("err", "خطا در ارتباط با سرور");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [
      selectedSubjectId,
      topic,
      sourceBook,
      pageFrom,
      pageTo,
      testsTotal,
      activeSub.name,
      router,
    ]
  );

  useEffect(() => {
    if (!running) return;

    targetEndRef.current = Date.now() + secsLeft * 1000;
    const id = window.setInterval(() => {
      if (!targetEndRef.current) return;
      const diffMs = targetEndRef.current - Date.now();
      const remaining = Math.max(0, Math.ceil(diffMs / 1000));
      setSecsLeft(remaining);

      if (remaining <= 0 && !completingRef.current) {
        completingRef.current = true;
        setRunning(false);
        targetEndRef.current = null;
        playChime();

        if (mode === "work") {
          setRounds((r) => r + 1);
          void persistSession(workDuration).finally(() => {
            completingRef.current = false;
          });
          setMode("break");
          setSecsLeft(breakDuration);
        } else {
          completingRef.current = false;
          setMode("work");
          setSecsLeft(workDuration);
        }
      }
    }, 300);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, workDuration, breakDuration, playChime, persistSession]);

  useEffect(() => {
    const m = String(Math.floor(secsLeft / 60)).padStart(2, "0");
    const s = String(secsLeft % 60).padStart(2, "0");
    if (running) {
      document.title = `${m}:${s} • ${mode === "work" ? activeSub.name : "استراحت"} | stada`;
    } else {
      document.title = "پومودورو | stada";
    }
    return () => {
      document.title = "stada — پلتفرم هوشمند برنامه‌ریزی و گزارش مطالعه";
    };
  }, [secsLeft, running, mode, activeSub.name]);

  function toggleTimer() {
    setRunning((r) => !r);
  }

  function resetTimer() {
    setRunning(false);
    targetEndRef.current = null;
    setSecsLeft(mode === "work" ? workDuration : breakDuration);
  }

  function selectWorkPreset(mins: number) {
    setRunning(false);
    targetEndRef.current = null;
    const dur = mins * 60;
    setWorkDuration(dur);
    setMode("work");
    setSecsLeft(dur);
  }

  function selectBreakPreset(mins: number) {
    setRunning(false);
    targetEndRef.current = null;
    const dur = mins * 60;
    setBreakDuration(dur);
    setMode("break");
    setSecsLeft(dur);
  }

  async function handleSavePartial() {
    if (mode !== "work" || elapsedSecs < 60) return;
    setRunning(false);
    targetEndRef.current = null;
    const ok = await persistSession(elapsedSecs);
    if (ok) {
      setSecsLeft(workDuration);
    }
  }

  async function handleDeleteLog(id: number, seconds: number) {
    try {
      const res = await fetch(`/api/logs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTodayLogs((prev) => prev.filter((l) => l.id !== id));
        setTodayTotal((prev) => Math.max(0, prev - seconds));
        router.refresh();
      }
    } catch {
      // ignore
    }
  }

  const mm = String(Math.floor(secsLeft / 60)).padStart(2, "0");
  const ss = String(secsLeft % 60).padStart(2, "0");
  const circumference = 2 * Math.PI * 95;
  const progressRatio =
    totalCurrentDuration > 0
      ? (totalCurrentDuration - secsLeft) / totalCurrentDuration
      : 0;
  const dashOffset = circumference - progressRatio * circumference;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-100 sm:text-[22px]">
            <Timer className="h-5 w-5 text-[#00ffa3]" />
            <span>تایمر پومودورو</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-[13px]">
            بلاک‌های مطالعه ۲۵، ۴۵ و ۹۰ دقیقه‌ای با استراحت‌های ۵، ۱۵ و ۳۰ دقیقه‌ای
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSoundEnabled((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.08]"
        >
          {soundEnabled ? (
            <>
              <Volume2 className="h-4 w-4 text-[#00ffa3]" />
              <span>زنگ پایان فعال</span>
            </>
          ) : (
            <>
              <VolumeX className="h-4 w-4 text-slate-500" />
              <span>بی‌صدا</span>
            </>
          )}
        </button>
      </div>

      {toast && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-medium ${
            toast.type === "ok"
              ? "border-[#00ffa3]/30 bg-[#00ffa3]/10 text-[#00ffa3]"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {toast.type === "ok" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{toast.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Timer Column (6 cols) */}
        <div className="bt-card flex flex-col items-center justify-center p-5 text-center sm:p-8 lg:col-span-6">
          <div
            className="mb-5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold sm:text-sm"
            style={
              mode === "work"
                ? {
                    backgroundColor: `${activeSub.color}20`,
                    color: activeSub.color,
                  }
                : {
                    backgroundColor: "rgba(0,212,255,0.14)",
                    color: "#00d4ff",
                  }
            }
          >
            {mode === "work" ? (
              <>
                <SubjectIcon icon={activeSub.icon} className="h-4 w-4" />
                <span>مطالعه: {activeSub.name}</span>
              </>
            ) : (
              <>
                <Coffee className="h-4 w-4" />
                <span>زمان استراحت</span>
              </>
            )}
          </div>

          <div className="relative mx-auto mb-6 h-[210px] w-[210px] sm:h-[225px] sm:w-[225px]">
            <svg className="h-full w-full" viewBox="0 0 220 220">
              <circle
                cx="110"
                cy="110"
                r="95"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="10"
              />
              <circle
                cx="110"
                cy="110"
                r="95"
                fill="none"
                stroke={ringColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 110 110)"
                style={{
                  transition: "stroke-dashoffset 0.35s linear, stroke 0.3s ease",
                  filter: `drop-shadow(0 0 8px ${ringColor}55)`,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div
                className="font-mono text-[42px] leading-none font-extrabold tracking-tight sm:text-[46px]"
                style={{ color: ringColor }}
                dir="ltr"
              >
                {mm}:{ss}
              </div>
              <div className="mt-2 text-xs text-slate-400">
                دور {toFaDigits(rounds + 1)}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={toggleTimer}
              disabled={saving}
              className="bt-btn-primary inline-flex items-center gap-1.5 px-6 py-2.5 text-sm"
            >
              {running ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>توقف</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>شروع</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={resetTimer}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.1]"
            >
              <RotateCcw className="h-4 w-4" />
              <span>ریست</span>
            </button>
            {!running && mode === "work" && elapsedSecs >= 60 && (
              <button
                type="button"
                onClick={handleSavePartial}
                disabled={saving}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#00ffa3]/30 bg-[#00ffa3]/12 px-4 py-2.5 text-xs font-bold text-[#00ffa3] transition hover:bg-[#00ffa3]/20"
              >
                <Save className="h-4 w-4" />
                <span>ثبت {fmtSecsCompact(elapsedSecs)} طی‌شده</span>
              </button>
            )}
          </div>

          {/* Work Presets: 25, 45, 90 min */}
          <div className="w-full space-y-2.5">
            <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <BookOpen className="h-3.5 w-3.5 text-[#00ffa3]" />
              <span>زمان مطالعه</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {WORK_PRESETS.map((p) => {
                const active = mode === "work" && workDuration === p.mins * 60;
                return (
                  <button
                    key={p.mins}
                    type="button"
                    onClick={() => selectWorkPreset(p.mins)}
                    className={`cursor-pointer rounded-xl border py-2.5 text-xs transition ${
                      active
                        ? "border-[#00ffa3]/40 bg-[#00ffa3]/14 font-bold text-[#00ffa3]"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Break Presets: 5, 15, 30 min */}
            <div className="inline-flex items-center gap-1 pt-1 text-[11px] font-medium text-slate-400">
              <Coffee className="h-3.5 w-3.5 text-[#00d4ff]" />
              <span>زمان استراحت</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {BREAK_PRESETS.map((p) => {
                const active =
                  mode === "break" && breakDuration === p.mins * 60;
                return (
                  <button
                    key={p.mins}
                    type="button"
                    onClick={() => selectBreakPreset(p.mins)}
                    className={`cursor-pointer rounded-xl border py-2.5 text-xs transition ${
                      active
                        ? "border-[#00d4ff]/40 bg-[#00d4ff]/14 font-bold text-[#00d4ff]"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (6 cols): Subject, Session Metadata & Today's Log */}
        <div className="space-y-4 lg:col-span-6">
          <div className="bt-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-200">
                <Layers className="h-4 w-4 text-[#00ffa3]" />
                <span>انتخاب درس و جزئیات پومودورو</span>
              </span>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 text-xs text-slate-400 no-underline hover:text-[#00ffa3]"
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span>ویرایش دروس</span>
              </Link>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {subjects.map((s) => {
                const active = selectedSubjectId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(s.id)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition"
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

            <div className="grid grid-cols-1 gap-2.5 border-t border-white/[0.07] pt-3.5 sm:grid-cols-2">
              <input
                type="text"
                placeholder="مبحث فعلی (اختیاری)"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="bt-input text-xs"
              />
              <input
                type="text"
                placeholder="منبع / کتاب (اختیاری)"
                value={sourceBook}
                onChange={(e) => setSourceBook(e.target.value)}
                className="bt-input text-xs"
              />
              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <input
                  type="number"
                  min={1}
                  dir="ltr"
                  placeholder="از صفحه"
                  value={pageFrom}
                  onChange={(e) => setPageFrom(e.target.value)}
                  className="bt-input text-center text-xs"
                />
                <input
                  type="number"
                  min={1}
                  dir="ltr"
                  placeholder="تا صفحه"
                  value={pageTo}
                  onChange={(e) => setPageTo(e.target.value)}
                  className="bt-input text-center text-xs"
                />
                <input
                  type="number"
                  min={0}
                  dir="ltr"
                  placeholder="تعداد تست"
                  value={testsTotal}
                  onChange={(e) => setTestsTotal(e.target.value)}
                  className="bt-input text-center text-xs"
                />
              </div>
            </div>
          </div>

          <div className="bt-card p-4 sm:p-5">
            <div className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-200">
              <Activity className="h-4 w-4 text-[#00d4ff]" />
              <span>آمار مطالعه امروز</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.03] p-3.5 text-center">
                <div className="text-2xl leading-none font-extrabold text-[#00ffa3]">
                  {toFaDigits(todayLogs.length)}
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400">
                  نوبت‌های ثبت‌شده امروز
                </div>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3.5 text-center">
                <div
                  className="font-mono text-2xl leading-none font-extrabold text-[#00d4ff]"
                  dir="ltr"
                >
                  {fmtClockHM(todayTotal)}
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400">
                  کل زمان مطالعه امروز
                </div>
              </div>
            </div>
          </div>

          <div className="bt-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-200">
                <History className="h-4 w-4 text-[#00ffa3]" />
                <span>سشن‌ها و گزارش‌های امروز</span>
              </span>
              <Link
                href="/log"
                className="inline-flex items-center gap-0.5 text-xs text-[#00ffa3] no-underline hover:underline"
              >
                <span>ثبت کامل</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            </div>
            {todayLogs.length > 0 ? (
              <div className="max-h-[230px] space-y-2 overflow-y-auto pl-1">
                {todayLogs.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-xl border bg-white/[0.02] px-3.5 py-2.5 text-xs"
                    style={{ borderColor: `${l.subject_color}30` }}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className="inline-flex items-center gap-1.5 font-bold"
                        style={{ color: l.subject_color }}
                      >
                        <SubjectIcon
                          icon={l.subject_icon}
                          className="h-3.5 w-3.5"
                        />
                        <span className="truncate">
                          {l.subject_name}
                          {l.topic ? ` — ${l.topic}` : ""}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        <span dir="ltr">
                          {fmtSecsCompact(l.duration_seconds)}
                        </span>
                        {l.pages_count > 0
                          ? ` • ${toFaDigits(l.pages_count)} صفحه`
                          : ""}
                        {l.tests_total > 0
                          ? ` • ${toFaDigits(l.tests_total)} تست`
                          : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteLog(l.id, l.duration_seconds)}
                      className="cursor-pointer rounded-md p-1.5 text-slate-500 transition hover:bg-red-500/15 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                هنوز سشنی در امروز ثبت نشده است
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
