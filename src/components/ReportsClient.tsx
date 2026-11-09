"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Settings2 } from "lucide-react";
import {
  fmtSecsCompact,
  formatJalaliDate,
  formatJalaliShortDayMonth,
  getIranianWeekStartSaturday,
  shiftDateISO,
  toFaDigits,
} from "@/lib/constants";
import type { StadaStudyLog, StadaSubject } from "@/lib/db";
import {
  StackedSubjectTimelineChart,
  SubjectColorBarChart,
  SubjectDoughnutChart,
  TestAccuracyTrendChart,
} from "./Charts";

type ReportPeriod = "daily" | "weekly" | "monthly" | "overall";

interface ReportsClientProps {
  subjects: StadaSubject[];
  logs: StadaStudyLog[];
  todayIso: string;
}

export default function ReportsClient({
  subjects,
  logs,
  todayIso,
}: ReportsClientProps) {
  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const [selectedDayIso, setSelectedDayIso] = useState<string>(todayIso);
  const [selectedWeekStartIso, setSelectedWeekStartIso] = useState<string>(
    getIranianWeekStartSaturday(todayIso)
  );
  const [selectedMonthEndIso, setSelectedMonthEndIso] =
    useState<string>(todayIso);

  // Filter logs according to active period
  const { periodLogs, periodTitle, timelineBuckets } = useMemo(() => {
    if (period === "daily") {
      const filtered = logs.filter((l) => l.log_date === selectedDayIso);
      return {
        periodLogs: filtered,
        periodTitle: `گزارش روزانه — ${formatJalaliDate(selectedDayIso)}`,
        timelineBuckets: [
          {
            key: selectedDayIso,
            label: formatJalaliShortDayMonth(selectedDayIso),
          },
        ],
      };
    }

    if (period === "weekly") {
      const endIso = shiftDateISO(selectedWeekStartIso, 6);
      const filtered = logs.filter(
        (l) => l.log_date >= selectedWeekStartIso && l.log_date <= endIso
      );
      const buckets = Array.from({ length: 7 }, (_, idx) => {
        const d = shiftDateISO(selectedWeekStartIso, idx);
        return { key: d, label: formatJalaliShortDayMonth(d) };
      });
      return {
        periodLogs: filtered,
        periodTitle: `گزارش هفتگی — ${formatJalaliDate(selectedWeekStartIso)} تا ${formatJalaliDate(endIso)}`,
        timelineBuckets: buckets,
      };
    }

    if (period === "monthly") {
      const startIso = shiftDateISO(selectedMonthEndIso, -29);
      const filtered = logs.filter(
        (l) => l.log_date >= startIso && l.log_date <= selectedMonthEndIso
      );
      const buckets = Array.from({ length: 30 }, (_, idx) => {
        const d = shiftDateISO(startIso, idx);
        return { key: d, label: formatJalaliShortDayMonth(d) };
      });
      return {
        periodLogs: filtered,
        periodTitle: `گزارش ماهانه (۳۰ روزه) — ${formatJalaliDate(startIso)} تا ${formatJalaliDate(selectedMonthEndIso)}`,
        timelineBuckets: buckets,
      };
    }

    // Overall: group by Iranian week (up to 12 distinct weeks or months if sparse)
    const sortedAsc = [...logs].sort((a, b) =>
      a.log_date.localeCompare(b.log_date)
    );
    const weekKeys = Array.from(
      new Set(sortedAsc.map((l) => getIranianWeekStartSaturday(l.log_date)))
    ).slice(-12);

    const buckets =
      weekKeys.length > 0
        ? weekKeys.map((wk) => ({
            key: wk,
            label: `هفته ${formatJalaliShortDayMonth(wk)}`,
          }))
        : [
            {
              key: getIranianWeekStartSaturday(todayIso),
              label: formatJalaliShortDayMonth(todayIso),
            },
          ];

    return {
      periodLogs: logs,
      periodTitle: "گزارش جامع کلی (از ابتدای فعالیت تا امروز)",
      timelineBuckets: buckets,
    };
  }, [
    period,
    logs,
    selectedDayIso,
    selectedWeekStartIso,
    selectedMonthEndIso,
    todayIso,
  ]);

  // Build subject map so even archived/deleted subjects retain their color
  const subjectCatalog = useMemo(() => {
    const map = new Map<
      string,
      { name: string; color: string; icon: string }
    >();
    for (const s of subjects) {
      map.set(s.name, { name: s.name, color: s.color, icon: s.icon });
    }
    for (const l of periodLogs) {
      if (!map.has(l.subject_name)) {
        map.set(l.subject_name, {
          name: l.subject_name,
          color: l.subject_color || "#00ffa3",
          icon: l.subject_icon || "📘",
        });
      }
    }
    return Array.from(map.values());
  }, [subjects, periodLogs]);

  // Aggregate per-subject metrics for the selected period
  const subjectStats = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        color: string;
        icon: string;
        secs: number;
        pages: number;
        tests: number;
        accSum: number;
        accCount: number;
        konkurSum: number;
        konkurCount: number;
        entries: number;
      }
    >();

    for (const cat of subjectCatalog) {
      map.set(cat.name, {
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        secs: 0,
        pages: 0,
        tests: 0,
        accSum: 0,
        accCount: 0,
        konkurSum: 0,
        konkurCount: 0,
        entries: 0,
      });
    }

    for (const l of periodLogs) {
      const item = map.get(l.subject_name) ?? {
        name: l.subject_name,
        color: l.subject_color || "#00ffa3",
        icon: l.subject_icon || "📘",
        secs: 0,
        pages: 0,
        tests: 0,
        accSum: 0,
        accCount: 0,
        konkurSum: 0,
        konkurCount: 0,
        entries: 0,
      };
      item.secs += l.duration_seconds;
      item.pages += l.pages_count;
      item.tests += l.tests_total;
      item.entries += 1;
      if (l.test_accuracy !== null) {
        item.accSum += l.test_accuracy;
        item.accCount += 1;
      }
      if (l.konkur_score !== null) {
        item.konkurSum += l.konkur_score;
        item.konkurCount += 1;
      }
      map.set(l.subject_name, item);
    }

    return Array.from(map.values()).sort(
      (a, b) => b.secs - a.secs || b.tests - a.tests
    );
  }, [subjectCatalog, periodLogs]);

  // Totals in selected period
  const kpis = useMemo(() => {
    let totalSecs = 0;
    let totalPages = 0;
    let totalTests = 0;
    let accSum = 0;
    let accCount = 0;

    for (const l of periodLogs) {
      totalSecs += l.duration_seconds;
      totalPages += l.pages_count;
      totalTests += l.tests_total;
      if (l.test_accuracy !== null) {
        accSum += l.test_accuracy;
        accCount += 1;
      }
    }

    return {
      totalSecs,
      totalPages,
      totalTests,
      avgAccuracy:
        accCount > 0 ? Math.round((accSum / accCount) * 10) / 10 : null,
    };
  }, [periodLogs]);

  // Stacked timeline chart series (each subject in its own custom color!)
  const stackedSeries = useMemo(() => {
    const activeSubjects = subjectStats.filter((s) => s.secs > 0);
    return activeSubjects.map((sub) => {
      const data = timelineBuckets.map((b) => {
        const bucketSecs = periodLogs
          .filter((l) => {
            if (l.subject_name !== sub.name) return false;
            if (period === "overall") {
              return getIranianWeekStartSaturday(l.log_date) === b.key;
            }
            return l.log_date === b.key;
          })
          .reduce((sum, l) => sum + l.duration_seconds, 0);
        return Math.round(bucketSecs / 60);
      });
      return {
        label: sub.name,
        color: sub.color,
        data,
      };
    });
  }, [subjectStats, timelineBuckets, periodLogs, period]);

  const accuracyPoints = useMemo(() => {
    return [...periodLogs]
      .filter((l) => l.test_accuracy !== null)
      .sort((a, b) => a.log_date.localeCompare(b.log_date) || a.id - b.id)
      .slice(-20)
      .map((l) => ({
        label: formatJalaliShortDayMonth(l.log_date),
        accuracy: l.test_accuracy ?? 0,
        subjectName: l.subject_name,
        color: l.subject_color,
      }));
  }, [periodLogs]);

  function handleExportCSV() {
    const header = [
      "تاریخ میلادی",
      "تاریخ شمسی",
      "درس",
      "مبحث",
      "مدت مطالعه (دقیقه)",
      "منبع",
      "از صفحه",
      "تا صفحه",
      "تعداد صفحات",
      "تعداد کل تست",
      "تعداد غلط",
      "تعداد نزده",
      "دقت (%)",
      "درصد کنکوری (%)",
      "یادداشت",
    ];
    const rows = periodLogs.map((l) => [
      l.log_date,
      formatJalaliDate(l.log_date),
      l.subject_name,
      l.topic ?? "",
      String(Math.round(l.duration_seconds / 60)),
      l.source_book ?? "",
      l.page_from !== null ? String(l.page_from) : "",
      l.page_to !== null ? String(l.page_to) : "",
      String(l.pages_count),
      String(l.tests_total),
      l.tests_wrong !== null ? String(l.tests_wrong) : "",
      l.tests_blank !== null ? String(l.tests_blank) : "",
      l.test_accuracy !== null ? String(l.test_accuracy) : "",
      l.konkur_score !== null ? String(l.konkur_score) : "",
      (l.note ?? "").replace(/\r?\n/g, " "),
    ]);

    const csvContent =
      "\uFEFF" +
      [header, ...rows]
        .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stada-report-${period}-${todayIso}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header & Period Tabs */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 sm:text-[22px]">
            📊 گزارش‌ها و نمودارهای تحلیلی
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-[13px]">
            {periodTitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 4 Period Tabs: Daily, Weekly, Monthly, Overall */}
          <div className="grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {(
              [
                ["daily", "روزانه"],
                ["weekly", "هفتگی"],
                ["monthly", "ماهانه"],
                ["overall", "کلی"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs transition ${
                  period === key
                    ? "bg-[#00ffa3]/15 font-extrabold text-[#00ffa3]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.08]"
          >
            <Download className="h-3.5 w-3.5 text-[#00ffa3]" />
            <span>خروجی CSV</span>
          </button>

          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 no-underline transition hover:bg-white/[0.08]"
          >
            <Settings2 className="h-3.5 w-3.5 text-[#00d4ff]" />
            <span>رنگ دروس</span>
          </Link>
        </div>
      </div>

      {/* Sub-navigation for Daily / Weekly / Monthly */}
      {period !== "overall" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
          {period === "daily" && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedDayIso(shiftDateISO(selectedDayIso, -1))
                }
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-slate-300 hover:bg-white/[0.1]"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                روز قبل
              </button>
              <input
                type="date"
                value={selectedDayIso}
                onChange={(e) => setSelectedDayIso(e.target.value)}
                className="rounded-lg border border-white/15 bg-[#0f172a] px-2.5 py-1 text-xs text-slate-200"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() =>
                  setSelectedDayIso(shiftDateISO(selectedDayIso, 1))
                }
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-slate-300 hover:bg-white/[0.1]"
              >
                روز بعد
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {selectedDayIso !== todayIso && (
                <button
                  type="button"
                  onClick={() => setSelectedDayIso(todayIso)}
                  className="cursor-pointer rounded-lg bg-[#00ffa3]/15 px-2.5 py-1 text-xs font-bold text-[#00ffa3]"
                >
                  بازگشت به امروز
                </button>
              )}
            </div>
          )}

          {period === "weekly" && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedWeekStartIso(
                    shiftDateISO(selectedWeekStartIso, -7)
                  )
                }
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-slate-300 hover:bg-white/[0.1]"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                هفته قبل
              </button>
              <span className="text-xs font-semibold text-slate-200">
                {formatJalaliDate(selectedWeekStartIso)} تا{" "}
                {formatJalaliDate(shiftDateISO(selectedWeekStartIso, 6))}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelectedWeekStartIso(shiftDateISO(selectedWeekStartIso, 7))
                }
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-slate-300 hover:bg-white/[0.1]"
              >
                هفته بعد
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {selectedWeekStartIso !==
                getIranianWeekStartSaturday(todayIso) && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedWeekStartIso(
                      getIranianWeekStartSaturday(todayIso)
                    )
                  }
                  className="cursor-pointer rounded-lg bg-[#00ffa3]/15 px-2.5 py-1 text-xs font-bold text-[#00ffa3]"
                >
                  هفته جاری
                </button>
              )}
            </div>
          )}

          {period === "monthly" && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedMonthEndIso(shiftDateISO(selectedMonthEndIso, -30))
                }
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-slate-300 hover:bg-white/[0.1]"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                ۳۰ روز قبل‌تر
              </button>
              <span className="text-xs font-semibold text-slate-200">
                {formatJalaliDate(shiftDateISO(selectedMonthEndIso, -29))} تا{" "}
                {formatJalaliDate(selectedMonthEndIso)}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelectedMonthEndIso(shiftDateISO(selectedMonthEndIso, 30))
                }
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-slate-300 hover:bg-white/[0.1]"
              >
                ۳۰ روز بعدتر
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {selectedMonthEndIso !== todayIso && (
                <button
                  type="button"
                  onClick={() => setSelectedMonthEndIso(todayIso)}
                  className="cursor-pointer rounded-lg bg-[#00ffa3]/15 px-2.5 py-1 text-xs font-bold text-[#00ffa3]"
                >
                  ۳۰ روز اخیر
                </button>
              )}
            </div>
          )}

          <div className="text-xs text-slate-400">
            تعداد گزارش‌های این بازه:{" "}
            <strong className="text-slate-200">
              {toFaDigits(periodLogs.length)} نوبت
            </strong>
          </div>
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="bt-card p-5 text-center">
          <div
            className="text-2xl leading-none font-extrabold text-[#00ffa3] sm:text-3xl"
            dir="ltr"
          >
            {fmtSecsCompact(kpis.totalSecs)}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            مجموع زمان مطالعه بازه
          </div>
        </div>

        <div className="bt-card p-5 text-center">
          <div className="text-2xl leading-none font-extrabold text-[#00d4ff] sm:text-3xl">
            {toFaDigits(kpis.totalPages)}
          </div>
          <div className="mt-2 text-xs text-slate-400">صفحات مطالعه‌شده</div>
        </div>

        <div className="bt-card p-5 text-center">
          <div className="text-2xl leading-none font-extrabold text-[#ff6b9d] sm:text-3xl">
            {toFaDigits(kpis.totalTests)}
          </div>
          <div className="mt-2 text-xs text-slate-400">تست‌های حل‌شده</div>
        </div>

        <div className="bt-card p-5 text-center">
          <div
            className="text-2xl leading-none font-extrabold text-[#a78bfa] sm:text-3xl"
            dir="ltr"
          >
            {kpis.avgAccuracy !== null ? `${kpis.avgAccuracy}%` : "—"}
          </div>
          <div className="mt-2 text-xs text-slate-400">میانگین دقت تست‌ها</div>
        </div>
      </div>

      {/* Charts Row 1: Stacked Timeline by Subject Color + Doughnut Share by Subject Color */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="bt-card p-5 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100">
              🎨 روند مطالعه به تفکیک رنگ هر درس (دقیقه)
            </h2>
          </div>
          {stackedSeries.length > 0 ? (
            <StackedSubjectTimelineChart
              labels={timelineBuckets.map((b) => b.label)}
              series={stackedSeries}
              unitLabel="دقیقه"
            />
          ) : (
            <div className="flex h-[245px] items-center justify-center text-xs text-slate-500">
              در این بازه زمانی مطالعه‌ای ثبت نشده است
            </div>
          )}
        </div>

        <div className="bt-card p-5 lg:col-span-5">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-slate-100">
              🍩 سهم هر درس از کل مطالعه این بازه
            </h2>
          </div>
          <SubjectDoughnutChart
            items={subjectStats.map((s) => ({
              name: s.name,
              color: s.color,
              value: Math.round(s.secs / 60),
            }))}
            unitLabel="دقیقه"
          />
        </div>
      </div>

      {/* Charts Row 2: Tests per Subject (Colored) + Accuracy Trend */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bt-card p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-100">
            📝 تعداد تست حل‌شده در هر درس (با رنگ اختصاصی درس)
          </h2>
          {subjectStats.some((s) => s.tests > 0) ? (
            <SubjectColorBarChart
              items={subjectStats
                .filter((s) => s.tests > 0)
                .map((s) => ({
                  name: s.name,
                  color: s.color,
                  value: s.tests,
                }))}
              unitLabel="تست"
            />
          ) : (
            <div className="flex h-[225px] items-center justify-center text-xs text-slate-500">
              هنوز تستی در این بازه زمانی ثبت نشده است
            </div>
          )}
        </div>

        <div className="bt-card p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-100">
            📈 روند دقت درصدگیری تست‌ها
          </h2>
          {accuracyPoints.length > 0 ? (
            <TestAccuracyTrendChart points={accuracyPoints} />
          ) : (
            <div className="flex h-[225px] items-center justify-center text-xs text-slate-500">
              برای مشاهده روند دقت، هنگام ثبت تست تعداد غلط‌ها را هم وارد کنید
            </div>
          )}
        </div>
      </div>

      {/* Per-Subject Breakdown Table with Color Progress Bars */}
      <div className="bt-card p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-bold text-slate-100">
          📚 جدول تفکیکی عملکرد هر درس در این بازه
        </h2>

        <div className="space-y-3">
          {subjectStats.map((s) => {
            const sharePct =
              kpis.totalSecs > 0
                ? Math.round((s.secs / kpis.totalSecs) * 100)
                : 0;
            const avgAcc =
              s.accCount > 0
                ? Math.round((s.accSum / s.accCount) * 10) / 10
                : null;
            const avgKonkur =
              s.konkurCount > 0
                ? Math.round((s.konkurSum / s.konkurCount) * 10) / 10
                : null;

            return (
              <div
                key={s.name}
                className="rounded-xl border bg-white/[0.02] p-3.5"
                style={{ borderColor: `${s.color}30` }}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{
                        backgroundColor: s.color,
                        boxShadow: `0 0 8px ${s.color}66`,
                      }}
                    />
                    <span
                      className="text-sm font-bold"
                      style={{ color: s.color }}
                    >
                      {s.icon} {s.name}
                    </span>
                    <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-slate-300">
                      سهم مطالعه: {toFaDigits(sharePct)}%
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                    <span>
                      ⏱️ <strong dir="ltr">{fmtSecsCompact(s.secs)}</strong>
                    </span>
                    <span>
                      📖 <strong>{toFaDigits(s.pages)}</strong> صفحه
                    </span>
                    <span>
                      📝 <strong>{toFaDigits(s.tests)}</strong> تست
                    </span>
                    {avgAcc !== null && (
                      <span className="text-[#00ffa3]">
                        دقت: <strong dir="ltr">{avgAcc}%</strong>
                        {avgKonkur !== null ? ` (کنکوری ${avgKonkur}%)` : ""}
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${sharePct}%`,
                      backgroundColor: s.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Log Entries in Period */}
      <div className="bt-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-100">
            🧾 ریز گزارش‌های مطالعه‌شده در این بازه ({toFaDigits(periodLogs.length)})
          </h2>
          <Link
            href="/log"
            className="text-xs font-semibold text-[#00ffa3] no-underline hover:underline"
          >
            + ثبت گزارش جدید
          </Link>
        </div>

        {periodLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="px-3 py-2.5 text-right font-semibold">تاریخ</th>
                  <th className="px-3 py-2.5 text-right font-semibold">درس</th>
                  <th className="px-3 py-2.5 text-right font-semibold">مبحث</th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    منبع و صفحات
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold">زمان</th>
                  <th className="px-3 py-2.5 text-center font-semibold">تست</th>
                </tr>
              </thead>
              <tbody>
                {periodLogs.slice(0, 60).map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-2.5 text-slate-400">
                      {formatJalaliDate(l.log_date)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex items-center gap-1.5 font-bold"
                        style={{ color: l.subject_color }}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: l.subject_color }}
                        />
                        {l.subject_icon} {l.subject_name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-200">
                      {l.topic || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">
                      {l.source_book ? `${l.source_book} ` : ""}
                      {l.page_from !== null && l.page_to !== null
                        ? `(ص ${toFaDigits(l.page_from)} تا ${toFaDigits(l.page_to)} — ${toFaDigits(l.pages_count)} صفحه)`
                        : l.pages_count > 0
                          ? `${toFaDigits(l.pages_count)} صفحه`
                          : l.source_book
                            ? ""
                            : "—"}
                    </td>
                    <td
                      className="px-3 py-2.5 text-center font-mono text-slate-200"
                      dir="ltr"
                    >
                      {l.duration_seconds > 0
                        ? fmtSecsCompact(l.duration_seconds)
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {l.tests_total > 0 ? (
                        <span className="text-[#ff6b9d]">
                          {toFaDigits(l.tests_total)} تست
                          {l.test_accuracy !== null
                            ? ` (${l.test_accuracy}%)`
                            : ""}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-slate-500">
            گزارشی در این بازه زمانی ثبت نشده است
          </div>
        )}
      </div>
    </div>
  );
}
