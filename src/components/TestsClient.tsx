"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  calcAccuracy,
  calcKonkurPercent,
  formatJalaliDate,
  getSubjectInfo,
  SUBJECT_LIST,
  SubjectKey,
  toFaDigits,
} from "@/lib/constants";
import type { BtTestResult } from "@/lib/db";

export default function TestsClient({
  initialTests,
}: {
  initialTests: BtTestResult[];
}) {
  const router = useRouter();
  const [tests, setTests] = useState<BtTestResult[]>(initialTests);
  const [subject, setSubject] = useState<SubjectKey>("cell");
  const [totalStr, setTotalStr] = useState("");
  const [wrongStr, setWrongStr] = useState("");
  const [blankStr, setBlankStr] = useState("");
  const [note, setNote] = useState("");
  const [filterSub, setFilterSub] = useState<string>("all");

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const preview = useMemo(() => {
    const t = parseInt(totalStr, 10);
    const w = parseInt(wrongStr || "0", 10);
    const b = parseInt(blankStr || "0", 10);
    if (
      !Number.isFinite(t) ||
      t < 1 ||
      !Number.isFinite(w) ||
      w < 0 ||
      !Number.isFinite(b) ||
      b < 0 ||
      w + b > t
    ) {
      return null;
    }
    const correct = t - w - b;
    const acc = calcAccuracy(t, w, b);
    const konkur = calcKonkurPercent(t, w, b);
    return { t, w, b, correct, acc, konkur };
  }, [totalStr, wrongStr, blankStr]);

  const stats = useMemo(() => {
    let totalQ = 0;
    let totalWrong = 0;
    let totalBlank = 0;
    let konkurSum = 0;
    for (const item of tests) {
      totalQ += item.total;
      totalWrong += item.wrong;
      totalBlank += item.blank;
      konkurSum +=
        item.konkur_score ?? calcKonkurPercent(item.total, item.wrong, item.blank);
    }
    const overallAcc =
      totalQ > 0
        ? Math.round(((totalQ - totalWrong - totalBlank) / totalQ) * 1000) / 10
        : 0;
    const avgKonkur =
      tests.length > 0 ? Math.round((konkurSum / tests.length) * 10) / 10 : 0;
    return { totalQ, totalWrong, overallAcc, avgKonkur };
  }, [tests]);

  const filteredTests = useMemo(() => {
    if (filterSub === "all") return tests;
    return tests.filter((t) => t.subject === filterSub);
  }, [tests, filterSub]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const total = parseInt(totalStr, 10);
    const wrong = parseInt(wrongStr || "0", 10);
    const blank = parseInt(blankStr || "0", 10);

    if (
      !Number.isFinite(total) ||
      total < 1 ||
      wrong < 0 ||
      blank < 0 ||
      wrong + blank > total
    ) {
      setFeedback({
        type: "err",
        text: "لطفاً اعداد معتبر وارد کنید (مجموع غلط و نزده نباید از کل سوالات بیشتر باشد)",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          total,
          wrong,
          blank,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "err",
          text: data.error || "خطا در ثبت تست",
        });
      } else {
        setTests((prev) => [data.test, ...prev]);
        setTotalStr("");
        setWrongStr("");
        setBlankStr("");
        setNote("");
        setFeedback({
          type: "ok",
          text: `نتیجه با دقت ${data.test.accuracy}% (درصد کنکوری: ${data.test.konkur_score}%) ثبت شد ✓`,
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
      const res = await fetch(`/api/tests/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTests((prev) => prev.filter((t) => t.id !== id));
        router.refresh();
      }
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-slate-100 sm:text-[22px]">
          📝 ثبت نتیجه تست
        </h1>
        <p className="mt-1 text-xs text-slate-400 sm:text-[13px]">
          ثبت و تحلیل درصد تست‌های تالیفی و کنکوری به تفکیک هر درس زیست‌شناسی
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="bt-card p-5">
            {feedback && (
              <div
                className={`mb-4 rounded-xl border px-3.5 py-2.5 text-[13px] ${
                  feedback.type === "ok"
                    ? "border-[#00ffa3]/30 bg-[#00ffa3]/10 text-[#00ffa3]"
                    : "border-red-500/30 bg-red-500/10 text-red-300"
                }`}
              >
                {feedback.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">
                  انتخاب درس
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_LIST.map((s) => {
                    const active = subject === s.key;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setSubject(s.key)}
                        className="cursor-pointer rounded-lg border px-3 py-2 text-[13px] transition"
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
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    کل سوال
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    required
                    dir="ltr"
                    placeholder="مثلاً 30"
                    value={totalStr}
                    onChange={(e) => setTotalStr(e.target.value)}
                    className="bt-input"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    تعداد غلط
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    required
                    dir="ltr"
                    placeholder="مثلاً 5"
                    value={wrongStr}
                    onChange={(e) => setWrongStr(e.target.value)}
                    className="bt-input"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    نزده{" "}
                    <span className="text-[10px] text-slate-500">(اختیاری)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    dir="ltr"
                    placeholder="0"
                    value={blankStr}
                    onChange={(e) => setBlankStr(e.target.value)}
                    className="bt-input"
                  />
                </div>
              </div>

              {preview && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <div className="flex items-center justify-around gap-4">
                    <div>
                      <div
                        className="text-3xl leading-none font-extrabold"
                        dir="ltr"
                        style={{
                          color:
                            preview.acc >= 70
                              ? "#00ffa3"
                              : preview.acc >= 50
                                ? "#ffb347"
                                : "#ef4444",
                        }}
                      >
                        {Math.round(preview.acc)}%
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        دقت پاسخگویی
                      </div>
                    </div>
                    <div className="h-9 w-px bg-white/10" />
                    <div>
                      <div
                        className="text-3xl leading-none font-extrabold text-[#00d4ff]"
                        dir="ltr"
                      >
                        {preview.konkur}%
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        درصد کنکوری (با نمره منفی)
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 text-xs text-slate-400">
                    {toFaDigits(preview.correct)} صحیح • {toFaDigits(preview.w)}{" "}
                    غلط • {toFaDigits(preview.b)} نزده از{" "}
                    {toFaDigits(preview.t)} سوال
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  یادداشت{" "}
                  <span className="text-[11px] text-slate-500">(اختیاری)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="مثلاً: فصل ۳ رونویسی نیاز به مرور دوباره دارد..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="bt-input resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bt-btn-primary w-full py-3 text-[15px]"
              >
                {saving ? "در حال ثبت..." : "ثبت نتیجه تست"}
              </button>
            </form>
          </div>

          <div className="bt-card p-5">
            <div className="mb-3 text-[13px] font-semibold text-slate-300">
              📊 آمار کلی تست‌ها
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                <div className="text-2xl font-extrabold text-[#00d4ff]">
                  {toFaDigits(stats.totalQ)}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">کل تست</div>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                <div className="text-2xl font-extrabold text-red-400">
                  {toFaDigits(stats.totalWrong)}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">کل غلط</div>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                <div
                  className="text-2xl font-extrabold text-[#00ffa3]"
                  dir="ltr"
                >
                  {stats.overallAcc}%
                </div>
                <div className="mt-1 text-[11px] text-slate-400">دقت کلی</div>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                <div
                  className="text-2xl font-extrabold text-[#ff6b9d]"
                  dir="ltr"
                >
                  {stats.avgKonkur}%
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  میانگین کنکوری
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Card */}
        <div className="bt-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-slate-300">
              🕐 تاریخچه تست‌ها ({toFaDigits(filteredTests.length)})
            </span>
          </div>

          <div className="mb-3.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFilterSub("all")}
              className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs transition ${
                filterSub === "all"
                  ? "bg-[#00ffa3]/15 font-bold text-[#00ffa3]"
                  : "bg-white/[0.03] text-slate-400 hover:text-slate-200"
              }`}
            >
              همه
            </button>
            {SUBJECT_LIST.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setFilterSub(s.key)}
                className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs transition ${
                  filterSub === s.key
                    ? "bg-white/15 font-bold text-white"
                    : "bg-white/[0.03] text-slate-400 hover:text-slate-200"
                }`}
              >
                {s.emoji} {s.name}
              </button>
            ))}
          </div>

          {filteredTests.length > 0 ? (
            <div className="max-h-[480px] space-y-2.5 overflow-y-auto pl-1">
              {filteredTests.map((t) => {
                const sub = getSubjectInfo(t.subject);
                const acc = t.accuracy;
                const color =
                  acc >= 70 ? "#00ffa3" : acc >= 50 ? "#ffb347" : "#ef4444";
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-slate-200">
                        {sub.emoji} {sub.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {formatJalaliDate(t.test_date)} | {toFaDigits(t.total)}{" "}
                        تست، {toFaDigits(t.wrong)} غلط
                        {t.blank > 0 ? `، ${toFaDigits(t.blank)} نزده` : ""}
                      </div>
                      {t.note && (
                        <div className="mt-1 text-[11px] text-slate-300/80">
                          💬 {t.note}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="text-left" dir="ltr">
                        <div
                          className="text-lg leading-none font-extrabold"
                          style={{ color }}
                        >
                          {acc}%
                        </div>
                        {t.konkur_score !== null && (
                          <div className="mt-1 text-[10px] text-slate-400">
                            کنکور: {t.konkur_score}%
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        title="حذف نتیجه"
                        className="cursor-pointer rounded-md p-1.5 text-slate-500 transition hover:bg-red-500/15 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-slate-500">
              هنوز تستی در این بخش ثبت نشده است
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
