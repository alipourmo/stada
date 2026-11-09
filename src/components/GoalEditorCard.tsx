"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2, X } from "lucide-react";
import { formatJalaliDate, toFaDigits } from "@/lib/constants";

interface GoalEditorCardProps {
  daysLeft: number;
  examDateIso: string;
  totalHours: number;
  targetHours: number;
}

export default function GoalEditorCard({
  daysLeft,
  examDateIso,
  totalHours,
  targetHours,
}: GoalEditorCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [dateVal, setDateVal] = useState(examDateIso);
  const [hoursVal, setHoursVal] = useState(String(targetHours));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pct = Math.min(100, Math.round((totalHours / Math.max(1, targetHours)) * 100));
  const weeksLeft = Math.floor(daysLeft / 7);
  const monthsLeft = Math.floor(daysLeft / 30);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_exam_date: dateVal || null,
          target_hours: Number(hoursVal),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "خطا در ذخیره تنظیمات");
      } else {
        setEditing(false);
        router.refresh();
      }
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-5 rounded-2xl border border-[#00ffa3]/20 bg-gradient-to-br from-[#00ffa3]/[0.05] via-[#0f172a]/80 to-[#00d4ff]/[0.05] p-5 sm:px-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>زمان باقی‌مانده تا کنکور</span>
            <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-slate-300">
              {formatJalaliDate(examDateIso)}
            </span>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-[#00ffa3] transition hover:bg-[#00ffa3]/10"
            >
              <Settings2 className="h-3 w-3" />
              <span>تنظیم هدف</span>
            </button>
          </div>
          <div className="flex items-center gap-6 sm:gap-8">
            {[
              [daysLeft, "روز"],
              [weeksLeft, "هفته"],
              [monthsLeft, "ماه"],
            ].map(([val, lbl]) => (
              <div key={String(lbl)} className="text-center">
                <div className="text-3xl leading-none font-extrabold text-[#00ffa3] sm:text-4xl">
                  {toFaDigits(val)}
                </div>
                <div className="mt-1 text-xs text-slate-400">{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full sm:w-[240px]">
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
            <span>هدف: {toFaDigits(targetHours)} ساعت مطالعه</span>
            <span className="font-bold text-[#00ffa3]">{toFaDigits(pct)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-l from-[#00ffa3] to-[#00d4ff] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 text-left text-[11px] text-slate-400" dir="ltr">
            {totalHours}h / {targetHours}h
          </div>
        </div>
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="mt-4 border-t border-white/10 pt-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              🎯 شخصی‌سازی تاریخ آزمون و هدف ساعت مطالعه
            </span>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="cursor-pointer text-slate-400 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {error && (
            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] text-slate-400">
                تاریخ آزمون (میلادی)
              </label>
              <input
                type="date"
                value={dateVal}
                onChange={(e) => setDateVal(e.target.value)}
                className="bt-input text-xs"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-400">
                هدف کل مطالعه (ساعت)
              </label>
              <input
                type="number"
                min={10}
                max={5000}
                value={hoursVal}
                onChange={(e) => setHoursVal(e.target.value)}
                className="bt-input text-xs"
                dir="ltr"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="bt-btn-primary w-full px-4 py-2.5 text-xs"
              >
                {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
