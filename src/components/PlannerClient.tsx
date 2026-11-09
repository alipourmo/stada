"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  calcMinutesBetween,
  fmtSecsCompact,
  formatJalaliDate,
  formatJalaliShortDayMonth,
  IRANIAN_WEEKDAYS,
  shiftDateISO,
  toFaDigits,
} from "@/lib/constants";
import type { StadaSubject, StadaWeeklyPlan } from "@/lib/db";
import SubjectIcon from "./SubjectIcon";

interface PlannerClientProps {
  subjects: StadaSubject[];
  currentWeekStartIso: string;
  nextWeekStartIso: string;
  todayIso: string;
  initialWeekStartIso: string;
  initialPlans: StadaWeeklyPlan[];
}

export default function PlannerClient({
  subjects,
  currentWeekStartIso,
  nextWeekStartIso,
  todayIso,
  initialWeekStartIso,
  initialPlans,
}: PlannerClientProps) {
  const [weekStartIso, setWeekStartIso] = useState(initialWeekStartIso);
  const [plans, setPlans] = useState<StadaWeeklyPlan[]>(initialPlans);
  const [loadingWeek, setLoadingWeek] = useState(false);

  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [subjectId, setSubjectId] = useState<number>(subjects[0]?.id ?? 0);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [topic, setTopic] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const weekEndIso = shiftDateISO(weekStartIso, 6);
  const weekDays = useMemo(() => {
    return IRANIAN_WEEKDAYS.map((wd) => {
      const iso = shiftDateISO(weekStartIso, wd.index);
      return {
        ...wd,
        iso,
        jalaliShort: formatJalaliShortDayMonth(iso),
      };
    });
  }, [weekStartIso]);

  const plannedMinsPreview = useMemo(
    () => calcMinutesBetween(startTime, endTime),
    [startTime, endTime]
  );

  async function loadWeek(newStartIso: string) {
    setWeekStartIso(newStartIso);
    setLoadingWeek(true);
    try {
      const endIso = shiftDateISO(newStartIso, 6);
      const res = await fetch(
        `/api/planner?from=${encodeURIComponent(newStartIso)}&to=${encodeURIComponent(endIso)}`
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.plans)) {
        setPlans(data.plans);
      }
    } catch {
      // ignore
    } finally {
      setLoadingWeek(false);
    }
  }

  useEffect(() => {
    setPlans(initialPlans);
  }, [initialPlans]);

  const weekSummary = useMemo(() => {
    let totalMins = 0;
    let completedMins = 0;
    const bySub = new Map<
      string,
      { name: string; color: string; icon: string; mins: number }
    >();

    for (const p of plans) {
      totalMins += p.planned_minutes;
      if (p.is_completed) completedMins += p.planned_minutes;
      const key = `${p.subject_id ?? p.subject_name}`;
      const cur = bySub.get(key) ?? {
        name: p.subject_name,
        color: p.subject_color,
        icon: p.subject_icon,
        mins: 0,
      };
      cur.mins += p.planned_minutes;
      bySub.set(key, cur);
    }

    const completionPct =
      totalMins > 0 ? Math.round((completedMins / totalMins) * 100) : 0;

    return {
      totalMins,
      completedMins,
      completionPct,
      subjects: Array.from(bySub.values()).sort((a, b) => b.mins - a.mins),
    };
  }, [plans]);

  async function handleAddPlan(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!topic.trim()) {
      setFeedback({
        type: "err",
        text: "لطفاً مبحث مورد مطالعه را وارد کنید",
      });
      return;
    }

    if (plannedMinsPreview <= 0) {
      setFeedback({
        type: "err",
        text: "ساعت پایان باید بعد از ساعت شروع باشد",
      });
      return;
    }

    const planDate = shiftDateISO(weekStartIso, selectedDayIdx);
    setSaving(true);
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: subjectId,
          plan_date: planDate,
          start_time: startTime,
          end_time: endTime,
          topic: topic.trim(),
          source_note: sourceNote.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "err",
          text: data.error || "خطا در افزودن به برنامه هفتگی",
        });
      } else {
        setPlans((prev) =>
          [...prev, data.plan].sort(
            (a, b) =>
              a.plan_date.localeCompare(b.plan_date) ||
              a.start_time.localeCompare(b.start_time)
          )
        );
        setTopic("");
        setSourceNote("");
        setFeedback({
          type: "ok",
          text: `به برنامه روز ${IRANIAN_WEEKDAYS[selectedDayIdx].full} اضافه شد`,
        });
      }
    } catch {
      setFeedback({ type: "err", text: "خطا در ارتباط با سرور" });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleComplete(plan: StadaWeeklyPlan) {
    const nextVal = !plan.is_completed;
    setPlans((prev) =>
      prev.map((p) => (p.id === plan.id ? { ...p, is_completed: nextVal } : p))
    );
    try {
      await fetch(`/api/planner/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: nextVal }),
      });
    } catch {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === plan.id ? { ...p, is_completed: plan.is_completed } : p
        )
      );
    }
  }

  async function handleDeletePlan(id: number) {
    try {
      const res = await fetch(`/api/planner/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      // ignore
    }
  }

  const isCurrentWeek = weekStartIso === currentWeekStartIso;
  const isNextWeek = weekStartIso === nextWeekStartIso;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header & Week Selector */}
      <div className="flex flex-col justify-between gap-3.5 sm:flex-row sm:items-center">
        <div>
          <h1 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-100 sm:text-[22px]">
            <CalendarDays className="h-5 w-5 text-[#00ffa3]" />
            <span>برنامه‌ریزی هفتگی مطالعه</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-[13px]">
            تعریف ساعت‌های دقیق مطالعه دروس و مباحث برای هفته جاری و هفته پیش رو
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => loadWeek(currentWeekStartIso)}
              className={`cursor-pointer rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                isCurrentWeek
                  ? "border-[#00d4ff]/40 bg-[#00d4ff]/15 text-[#00d4ff]"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200"
              }`}
            >
              هفته جاری
            </button>
            <button
              type="button"
              onClick={() => loadWeek(nextWeekStartIso)}
              className={`inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                isNextWeek
                  ? "border-[#00ffa3]/40 bg-[#00ffa3]/15 text-[#00ffa3]"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>هفته پیش رو</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1.5">
            <button
              type="button"
              onClick={() => loadWeek(shiftDateISO(weekStartIso, -7))}
              className="cursor-pointer rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              title="هفته قبل"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-medium text-slate-200">
              {formatJalaliDate(weekStartIso)} تا {formatJalaliDate(weekEndIso)}
            </span>
            <button
              type="button"
              onClick={() => loadWeek(shiftDateISO(weekStartIso, 7))}
              className="cursor-pointer rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              title="هفته بعد"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Study Block Form */}
      <div className="bt-card p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-100">
            <CalendarPlus className="h-4 w-4 text-[#00ffa3]" />
            <span>افزودن باکس مطالعه به برنامه هفتگی</span>
          </span>
          {plannedMinsPreview > 0 && (
            <span className="rounded-full bg-[#00ffa3]/12 px-3 py-1 text-xs font-bold text-[#00ffa3]">
              مدت باکس:{" "}
              <span dir="ltr">{fmtSecsCompact(plannedMinsPreview * 60)}</span>
            </span>
          )}
        </div>

        {feedback && (
          <div
            className={`mb-4 flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs ${
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

        <form onSubmit={handleAddPlan} className="space-y-4">
          {/* Day of week pills */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">
              ۱. انتخاب روز هفته
            </label>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7 sm:gap-2">
              {weekDays.map((d) => {
                const active = selectedDayIdx === d.index;
                return (
                  <button
                    key={d.index}
                    type="button"
                    onClick={() => setSelectedDayIdx(d.index)}
                    className={`cursor-pointer rounded-xl border px-2 py-2 text-center transition ${
                      active
                        ? "border-[#00ffa3]/45 bg-[#00ffa3]/14 font-bold text-[#00ffa3]"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="text-xs">{d.full}</div>
                    <div className="mt-0.5 text-[10px] opacity-75">
                      {d.jalaliShort}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Pills */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">
              ۲. انتخاب درس
            </label>
            <div className="flex flex-wrap gap-1.5">
              {subjects.map((s) => {
                const active = subjectId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSubjectId(s.id)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition"
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-12">
            <div className="col-span-2 sm:col-span-6">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                ۳. مبحث و بخش مورد نظر
              </label>
              <input
                type="text"
                required
                maxLength={250}
                placeholder="مثلاً: غشا بخش ۱ / فصل ۲ معادلات"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="bt-input text-xs"
              />
            </div>

            <div className="col-span-1 sm:col-span-3">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                از ساعت
              </label>
              <input
                type="time"
                required
                dir="ltr"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bt-input text-center font-mono text-xs"
              />
            </div>

            <div className="col-span-1 sm:col-span-3">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                تا ساعت
              </label>
              <input
                type="time"
                required
                dir="ltr"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bt-input text-center font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              maxLength={200}
              placeholder="توضیح تکمیلی اختیاری (مثلاً: منبع خیلی سبز صفحه ۱۰ تا ۲۵ + ۳۰ تست)"
              value={sourceNote}
              onChange={(e) => setSourceNote(e.target.value)}
              className="bt-input flex-1 text-xs"
            />
            <button
              type="submit"
              disabled={saving}
              className="bt-btn-primary inline-flex shrink-0 items-center justify-center gap-1.5 px-5 py-3 text-xs sm:py-2.5"
            >
              <Plus className="h-4 w-4" />
              <span>{saving ? "در حال افزودن..." : "افزودن به برنامه"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Weekly Summary Strip */}
      {plans.length > 0 && (
        <div className="bt-card p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <BarChart3 className="h-4 w-4 text-[#00ffa3]" />
              <span>
                مجموع برنامه این هفته:{" "}
                <span className="text-[#00ffa3]" dir="ltr">
                  {fmtSecsCompact(weekSummary.totalMins * 60)}
                </span>
              </span>
            </div>
            <div className="text-xs text-slate-400">
              تحقق برنامه:{" "}
              <strong className="text-[#00d4ff]">
                {toFaDigits(weekSummary.completionPct)}%
              </strong>{" "}
              (
              <span dir="ltr">
                {fmtSecsCompact(weekSummary.completedMins * 60)}
              </span>{" "}
              انجام‌شده)
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {weekSummary.subjects.map((sub) => (
              <div
                key={sub.name}
                className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs"
                style={{
                  borderColor: `${sub.color}40`,
                  backgroundColor: `${sub.color}12`,
                  color: sub.color,
                }}
              >
                <SubjectIcon icon={sub.icon} className="h-3.5 w-3.5" />
                <span>{sub.name}:</span>
                <strong dir="ltr">{fmtSecsCompact(sub.mins * 60)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7 Days Schedule Grid */}
      <div
        className={`space-y-3 transition-opacity ${loadingWeek ? "opacity-50" : "opacity-100"}`}
      >
        {weekDays.map((day) => {
          const dayPlans = plans.filter((p) => p.plan_date === day.iso);
          const dayTotalMins = dayPlans.reduce(
            (s, p) => s + p.planned_minutes,
            0
          );
          const isToday = day.iso === todayIso;

          return (
            <div
              key={day.iso}
              className={`bt-card p-4 sm:p-5 ${
                isToday ? "border-[#00ffa3]/40" : ""
              }`}
            >
              <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-100">
                    {day.full}
                  </span>
                  <span className="text-xs text-slate-400">
                    {day.jalaliShort}
                  </span>
                  {isToday && (
                    <span className="rounded-full bg-[#00ffa3]/15 px-2 py-0.5 text-[10px] font-bold text-[#00ffa3]">
                      امروز
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {dayTotalMins > 0 && (
                    <span
                      className="text-xs font-semibold text-slate-300"
                      dir="ltr"
                    >
                      {fmtSecsCompact(dayTotalMins * 60)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDayIdx(day.index);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                  >
                    <Plus className="h-3 w-3" />
                    <span>افزودن</span>
                  </button>
                </div>
              </div>

              {dayPlans.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {dayPlans.map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
                        p.is_completed
                          ? "bg-white/[0.01] opacity-70"
                          : "bg-white/[0.03]"
                      }`}
                      style={{
                        borderColor: `${p.subject_color}40`,
                        borderRightWidth: "4px",
                        borderRightColor: p.subject_color,
                      }}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(p)}
                          className="mt-0.5 cursor-pointer text-slate-400 hover:text-[#00ffa3]"
                          title={
                            p.is_completed
                              ? "علامت به عنوان انجام‌نشده"
                              : "علامت به عنوان انجام‌شده"
                          }
                        >
                          {p.is_completed ? (
                            <CheckCircle2 className="h-5 w-5 text-[#00ffa3]" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="rounded-md px-2 py-0.5 font-mono text-[11px] font-bold"
                              style={{
                                backgroundColor: `${p.subject_color}20`,
                                color: p.subject_color,
                              }}
                              dir="ltr"
                            >
                              {p.start_time} - {p.end_time}
                            </span>
                            <span
                              className="inline-flex items-center gap-1 text-xs font-bold"
                              style={{ color: p.subject_color }}
                            >
                              <SubjectIcon
                                icon={p.subject_icon}
                                className="h-3.5 w-3.5"
                              />
                              <span>{p.subject_name}</span>
                            </span>
                          </div>

                          <div
                            className={`mt-1 text-[13px] font-medium ${
                              p.is_completed
                                ? "text-slate-400 line-through"
                                : "text-slate-100"
                            }`}
                          >
                            {p.topic}
                          </div>

                          {p.source_note && (
                            <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-400">
                              <BookOpen className="h-3 w-3 shrink-0" />
                              <span>{p.source_note}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Link
                          href={`/log?subjectId=${p.subject_id ?? ""}&topic=${encodeURIComponent(p.topic)}&mins=${p.planned_minutes}&date=${p.plan_date}&source=${encodeURIComponent(p.source_note || "")}`}
                          title="ثبت گزارش انجام این مبحث"
                          className="rounded-lg bg-[#00ffa3]/12 p-1.5 text-[#00ffa3] no-underline transition hover:bg-[#00ffa3]/25"
                        >
                          <ClipboardCheck className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(p.id)}
                          title="حذف از برنامه"
                          className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/15 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-3 text-xs text-slate-500">
                  برنامه‌ای برای این روز ثبت نشده است
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
