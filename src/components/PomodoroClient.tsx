"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Volume2, VolumeX, PlusCircle } from "lucide-react";
import {
  fmtClockHM,
  fmtSecsCompact,
  getSubjectInfo,
  SUBJECT_LIST,
  SubjectKey,
  toFaDigits,
} from "@/lib/constants";
import type { BtStudySession } from "@/lib/db";

interface PomodoroClientProps {
  initialTodaySessions: BtStudySession[];
  initialTodayTotal: number;
}

const WORK_PRESETS = [
  { mins: 25, label: "مطالعه ۲۵ دقیقه" },
  { mins: 45, label: "مطالعه ۴۵ دقیقه" },
  { mins: 50, label: "مطالعه ۵۰ دقیقه" },
];

const BREAK_PRESETS = [
  { mins: 5, label: "استراحت ۵ دقیقه" },
  { mins: 15, label: "استراحت ۱۵ دقیقه" },
];

export default function PomodoroClient({
  initialTodaySessions,
  initialTodayTotal,
}: PomodoroClientProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"work" | "break">("work");
  const [workDuration, setWorkDuration] = useState(25 * 60);
  const [breakDuration, setBreakDuration] = useState(5 * 60);
  const [secsLeft, setSecsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [rounds, setRounds] = useState(0);
  const [curSubject, setCurSubject] = useState<SubjectKey>("cell");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [todaySessions, setTodaySessions] =
    useState<BtStudySession[]>(initialTodaySessions);
  const [todayTotal, setTodayTotal] = useState(initialTodayTotal);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Manual study entry state
  const [manualOpen, setManualOpen] = useState(false);
  const [manualMins, setManualMins] = useState("30");

  const targetEndRef = useRef<number | null>(null);
  const completingRef = useRef(false);

  const totalCurrentDuration = mode === "work" ? workDuration : breakDuration;
  const elapsedSecs = Math.max(0, totalCurrentDuration - secsLeft);
  const activeSubInfo = getSubjectInfo(curSubject);
  const ringColor = mode === "work" ? activeSubInfo.color : "#00d4ff";

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
    async (subject: SubjectKey, secondsToSave: number) => {
      setSaving(true);
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, seconds: secondsToSave }),
        });
        const data = await res.json();
        if (!res.ok) {
          showNotification("err", data.error || "خطا در ثبت سشن");
          return false;
        }
        if (typeof data.streak === "number") {
          window.dispatchEvent(
            new CustomEvent("biotrack:meta", {
              detail: { streak: data.streak },
            })
          );
        }
        if (typeof data.todayTotal === "number") {
          setTodayTotal(data.todayTotal);
        }
        if (data.session) {
          setTodaySessions((prev) => [data.session, ...prev]);
        }
        showNotification(
          "ok",
          `سشن ${getSubjectInfo(subject).name} (${fmtSecsCompact(secondsToSave)}) با موفقیت ذخیره شد ✓`
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
    [router]
  );

  // Wall-clock accurate timer interval
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
          void persistSession(curSubject, workDuration).finally(() => {
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
  }, [running, mode, curSubject, workDuration, breakDuration, playChime, persistSession]);

  // Update browser tab title while running
  useEffect(() => {
    const m = String(Math.floor(secsLeft / 60)).padStart(2, "0");
    const s = String(secsLeft % 60).padStart(2, "0");
    if (running) {
      document.title = `${m}:${s} ${mode === "work" ? "🧠" : "☕"} ${activeSubInfo.name} | BioTrack`;
    } else {
      document.title = "پومودورو | BioTrack";
    }
    return () => {
      document.title = "BioTrack — داشبورد کنکور زیست‌شناسی";
    };
  }, [secsLeft, running, mode, activeSubInfo.name]);

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
    const ok = await persistSession(curSubject, elapsedSecs);
    if (ok) {
      setSecsLeft(workDuration);
    }
  }

  async function handleManualLog(e: React.FormEvent) {
    e.preventDefault();
    const mins = Number(manualMins);
    if (!Number.isFinite(mins) || mins < 1 || mins > 720) {
      showNotification("err", "لطفاً بین ۱ تا ۷۲۰ دقیقه وارد کنید");
      return;
    }
    const ok = await persistSession(curSubject, Math.round(mins * 60));
    if (ok) {
      setManualOpen(false);
    }
  }

  async function handleDeleteSession(id: number, seconds: number) {
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTodaySessions((prev) => prev.filter((s) => s.id !== id));
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 sm:text-[22px]">
            ⏱️ تایمر پومودورو
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-[13px]">
            تمرکز عمیق روی دروس زیست‌شناسی با ثبت خودکار زمان مطالعه و استریک
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
          className={`mb-4 rounded-xl border px-4 py-3 text-xs font-medium ${
            toast.type === "ok"
              ? "border-[#00ffa3]/30 bg-[#00ffa3]/10 text-[#00ffa3]"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Timer Card */}
        <div className="bt-card flex flex-col items-center justify-center p-7 text-center sm:p-8">
          <div
            className={`mb-5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold ${
              mode === "work"
                ? "bg-[#00ffa3]/12 text-[#00ffa3]"
                : "bg-[#00d4ff]/12 text-[#00d4ff]"
            }`}
          >
            {mode === "work"
              ? `🧠 زمان مطالعه — ${activeSubInfo.name}`
              : "☕ زمان استراحت"}
          </div>

          <div className="relative mx-auto mb-6 h-[225px] w-[225px]">
            <svg width="225" height="225" viewBox="0 0 220 220">
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
                  filter: `drop-shadow(0 0 8px ${ringColor}45)`,
                }}
              />
            </svg>
            <div className=" absolute inset-0 flex flex-col items-center justify-center">
              <div
                className="font-mono text-[44px] leading-none font-extrabold tracking-tight"
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

          {/* Primary Action Buttons */}
          <div className="mb-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={toggleTimer}
              disabled={saving}
              className="bt-btn-primary px-6 py-2.5 text-sm"
            >
              {running ? "⏸ توقف" : "▶ شروع"}
            </button>
            <button
              type="button"
              onClick={resetTimer}
              className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.1]"
            >
              ↩ ریست
            </button>
            {!running && mode === "work" && elapsedSecs >= 60 && (
              <button
                type="button"
                onClick={handleSavePartial}
                disabled={saving}
                className="cursor-pointer rounded-xl border border-[#00ffa3]/30 bg-[#00ffa3]/12 px-4 py-2.5 text-xs font-bold text-[#00ffa3] transition hover:bg-[#00ffa3]/20"
              >
                💾 ثبت {fmtSecsCompact(elapsedSecs)} طی‌شده
              </button>
            )}
          </div>

          {/* Mode & Duration Presets */}
          <div className="flex flex-wrap justify-center gap-2">
            {WORK_PRESETS.map((p) => {
              const active = mode === "work" && workDuration === p.mins * 60;
              return (
                <button
                  key={p.mins}
                  type="button"
                  onClick={() => selectWorkPreset(p.mins)}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs transition ${
                    active
                      ? "border-[#00ffa3]/35 bg-[#00ffa3]/12 font-semibold text-[#00ffa3]"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
            {BREAK_PRESETS.map((p) => {
              const active = mode === "break" && breakDuration === p.mins * 60;
              return (
                <button
                  key={p.mins}
                  type="button"
                  onClick={() => selectBreakPreset(p.mins)}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs transition ${
                    active
                      ? "border-[#00d4ff]/35 bg-[#00d4ff]/12 font-semibold text-[#00d4ff]"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Subject + Today Stats + Log */}
        <div className="space-y-4">
          <div className="bt-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-slate-300">
                📚 درس فعلی
              </span>
              <button
                type="button"
                onClick={() => setManualOpen((v) => !v)}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#00d4ff] hover:underline"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>ثبت دستی مطالعه</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {SUBJECT_LIST.map((s) => {
                const active = curSubject === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setCurSubject(s.key)}
                    className="cursor-pointer rounded-lg border px-3.5 py-2 text-[13px] transition"
                    style={
                      active
                        ? {
                            backgroundColor: `${s.color}20`,
                            color: s.color,
                            borderColor: `${s.color}66`,
                            fontWeight: 700,
                          }
                        : {
                            backgroundColor: "rgba(255,255,255,0.03)",
                            color: "#94a3b8",
                            borderColor: "rgba(255,255,255,0.08)",
                          }
                    }
                  >
                    {s.emoji} {s.name}
                  </button>
                );
              })}
            </div>

            {manualOpen && (
              <form
                onSubmit={handleManualLog}
                className="mt-4 flex flex-wrap items-end gap-2.5 border-t border-white/10 pt-3.5"
              >
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] text-slate-400">
                    مدت زمان مطالعه «{activeSubInfo.name}» (دقیقه)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={720}
                    required
                    dir="ltr"
                    value={manualMins}
                    onChange={(e) => setManualMins(e.target.value)}
                    className="bt-input text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="bt-btn-primary px-4 py-2.5 text-xs"
                >
                  {saving ? "ثبت..." : "افزودن به امروز"}
                </button>
              </form>
            )}
          </div>

          <div className="bt-card p-5">
            <div className="mb-3 text-[13px] font-semibold text-slate-300">
              📊 آمار امروز
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.03] p-3.5 text-center">
                <div className="text-2xl leading-none font-extrabold text-[#00ffa3]">
                  {toFaDigits(todaySessions.length + rounds * 0)}
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400">
                  سشن‌های ثبت‌شده امروز
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
                  کل مطالعه امروز
                </div>
              </div>
            </div>
          </div>

          <div className="bt-card p-5">
            <div className="mb-3 text-[13px] font-semibold text-slate-300">
              🕐 سشن‌های امروز
            </div>
            {todaySessions.length > 0 ? (
              <div className="max-h-[250px] space-y-2 overflow-y-auto pl-1">
                {todaySessions.map((s) => {
                  const sub = getSubjectInfo(s.subject);
                  const timeStr = new Date(s.created_at).toLocaleTimeString(
                    "fa-IR",
                    {
                      timeZone: "Asia/Tehran",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  );
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-[#00ffa3]/15 bg-[#00ffa3]/[0.03] px-3.5 py-2.5 text-[13px]"
                    >
                      <div>
                        <div className="font-medium text-slate-200">
                          {sub.emoji} {sub.name}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          <span dir="ltr">{fmtSecsCompact(s.seconds)}</span> •{" "}
                          {timeStr}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSession(s.id, s.seconds)}
                        title="حذف سشن"
                        className="cursor-pointer rounded-md p-1.5 text-slate-500 transition hover:bg-red-500/15 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                هنوز سشنی در امروز ثبت نشده است
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
