import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Bookmark,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  Circle,
  ClipboardCheck,
  ClipboardPen,
  Clock,
  FileCheck2,
  GraduationCap,
  History,
  Hourglass,
  PieChart,
  Plus,
  Settings,
  Target,
  Timer,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import {
  getUserStudyLogs,
  getUserSubjects,
  getUserWeeklyPlans,
} from "@/lib/db";
import {
  DEFAULT_EXAM_DATE,
  fmtClockHM,
  fmtSecsCompact,
  formatJalaliDate,
  formatJalaliShortDayMonth,
  getDaysLeft,
  getPersianWeekdayFull,
  getTehranToday,
  shiftDateISO,
  toFaDigits,
} from "@/lib/constants";
import {
  StackedSubjectTimelineChart,
  SubjectDoughnutChart,
} from "@/components/Charts";
import SubjectIcon from "@/components/SubjectIcon";

export default async function DashboardPage() {
  const user = await requireUser();
  const todayIso = getTehranToday();
  const weekAgoIso = shiftDateISO(todayIso, -6);

  const [subjects, allLogs, todayPlans] = await Promise.all([
    getUserSubjects(user.id),
    getUserStudyLogs(user.id),
    getUserWeeklyPlans(user.id, todayIso, todayIso),
  ]);

  let todaySecs = 0;
  let weekSecs = 0;
  let totalSecs = 0;
  let totalPages = 0;
  let totalTests = 0;
  let accSum = 0;
  let accCount = 0;

  for (const l of allLogs) {
    totalSecs += l.duration_seconds;
    totalPages += l.pages_count;
    totalTests += l.tests_total;
    if (l.log_date === todayIso) todaySecs += l.duration_seconds;
    if (l.log_date >= weekAgoIso && l.log_date <= todayIso) {
      weekSecs += l.duration_seconds;
    }
    if (l.test_accuracy !== null) {
      accSum += l.test_accuracy;
      accCount += 1;
    }
  }

  const avgAccuracy =
    accCount > 0 ? Math.round((accSum / accCount) * 10) / 10 : null;
  const totalHours = Math.round((totalSecs / 3600) * 10) / 10;
  const progressPct = Math.min(
    100,
    Math.round((totalHours / Math.max(1, user.target_hours)) * 100)
  );

  // 7-day stacked timeline by subject color
  const last7Days = Array.from({ length: 7 }, (_, i) =>
    shiftDateISO(todayIso, i - 6)
  );
  const weekLogs = allLogs.filter(
    (l) => l.log_date >= weekAgoIso && l.log_date <= todayIso
  );

  const subjectColorMap = new Map<string, string>();
  for (const s of subjects) subjectColorMap.set(s.name, s.color);
  for (const l of allLogs) {
    if (!subjectColorMap.has(l.subject_name)) {
      subjectColorMap.set(l.subject_name, l.subject_color);
    }
  }

  const weekSubjectNames = Array.from(
    new Set(weekLogs.map((l) => l.subject_name))
  );
  const stackedSeries = weekSubjectNames.map((subName) => ({
    label: subName,
    color: subjectColorMap.get(subName) || "#00ffa3",
    data: last7Days.map((d) =>
      Math.round(
        weekLogs
          .filter((l) => l.log_date === d && l.subject_name === subName)
          .reduce((s, l) => s + l.duration_seconds, 0) / 60
      )
    ),
  }));

  // Overall subject doughnut share
  const overallBySubject = new Map<string, { color: string; mins: number }>();
  for (const l of allLogs) {
    const cur = overallBySubject.get(l.subject_name) ?? {
      color: subjectColorMap.get(l.subject_name) || l.subject_color,
      mins: 0,
    };
    cur.mins += Math.round(l.duration_seconds / 60);
    overallBySubject.set(l.subject_name, cur);
  }

  const examDate = user.target_exam_date || DEFAULT_EXAM_DATE;
  const daysLeft = getDaysLeft(examDate);
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const completedTodayPlans = todayPlans.filter((p) => p.is_completed).length;
  const todayPlannedMins = todayPlans.reduce(
    (sum, p) => sum + p.planned_minutes,
    0
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* SECTION 1 (FIRST & LARGEST): HERO EXAM COUNTDOWN */}
      <section className="relative overflow-hidden rounded-2xl border border-[#00ffa3]/30 bg-gradient-to-br from-[#00ffa3]/[0.12] via-[#0a0f1e]/95 to-[#00d4ff]/[0.1] p-5 shadow-xl shadow-[#00ffa3]/[0.04] sm:rounded-3xl sm:p-8">
        <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[#00ffa3]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-[#00d4ff]/10 blur-3xl" />

        {/* Top Meta Bar */}
        <div className="relative flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-200 sm:text-sm">
              سلام {firstName}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#00d4ff]">
              <GraduationCap className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-[180px] truncate sm:max-w-none">
                {user.study_field}
              </span>
            </span>
          </div>

          <Link
            href="/settings"
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-300 no-underline transition hover:border-[#00ffa3]/40 hover:text-[#00ffa3]"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>تغییر تاریخ آزمون</span>
          </Link>
        </div>

        {/* Center Giant Countdown Focal Point */}
        <div className="relative my-5 flex flex-col items-center justify-center text-center sm:my-7">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#00ffa3]/25 bg-[#00ffa3]/10 px-3 py-1 text-[11px] font-semibold text-[#00ffa3] sm:text-xs">
            <Hourglass className="h-3.5 w-3.5" />
            <span>روزشمار آزمون هدف</span>
          </div>

          <div
            className="text-6xl leading-none font-black tracking-tight text-[#00ffa3] sm:text-7xl lg:text-8xl"
            style={{ textShadow: "0 0 36px rgba(0, 255, 163, 0.28)" }}
          >
            {toFaDigits(daysLeft)}
          </div>

          <div className="mt-2 text-base font-extrabold text-slate-100 sm:text-xl">
            روز باقی‌مانده تا روز آزمون
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-[#00d4ff]" />
              <span>تاریخ آزمون: {formatJalaliDate(examDate)}</span>
            </span>
            <span className="hidden text-slate-600 sm:inline">•</span>
            <span>
              امروز {getPersianWeekdayFull(todayIso)}،{" "}
              {formatJalaliDate(todayIso)}
            </span>
          </div>
        </div>

        {/* Quick Mobile-Friendly Primary Actions */}
        <div className="relative grid grid-cols-2 gap-2.5 sm:mx-auto sm:max-w-md sm:gap-3">
          <Link
            href="/log"
            className="bt-btn-primary inline-flex items-center justify-center gap-1.5 py-2.5 text-xs no-underline sm:py-3 sm:text-sm"
          >
            <ClipboardPen className="h-4 w-4 shrink-0" />
            <span>ثبت گزارش مطالعه</span>
          </Link>
          <Link
            href="/pomodoro"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] py-2.5 text-xs font-bold text-slate-100 no-underline transition hover:bg-white/[0.12] sm:py-3 sm:text-sm"
          >
            <Timer className="h-4 w-4 shrink-0 text-[#00d4ff]" />
            <span>شروع پومودورو</span>
          </Link>
        </div>
      </section>

      {/* SECTION 2 (SECOND SECTION): TODAY'S SCHEDULE / PLAN */}
      <section className="bt-card p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00d4ff]/12 text-[#00d4ff]">
              <CalendarCheck2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-100 sm:text-base">
                برنامه مطالعاتی امروز
              </h2>
              <p className="text-[11px] text-slate-400">
                {todayPlans.length > 0
                  ? `${toFaDigits(completedTodayPlans)} از ${toFaDigits(todayPlans.length)} باکس انجام شده • مجموع ${fmtSecsCompact(todayPlannedMins * 60)}`
                  : `${getPersianWeekdayFull(todayIso)} ${formatJalaliShortDayMonth(todayIso)}`}
              </p>
            </div>
          </div>

          <Link
            href="/planner"
            className="inline-flex items-center gap-1 rounded-xl border border-[#00ffa3]/25 bg-[#00ffa3]/10 px-3 py-1.5 text-xs font-bold text-[#00ffa3] no-underline transition hover:bg-[#00ffa3]/20"
          >
            <span>برنامه هفتگی</span>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        {todayPlans.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {todayPlans.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition ${
                  p.is_completed
                    ? "bg-white/[0.015] opacity-75"
                    : "bg-white/[0.03]"
                }`}
                style={{
                  borderColor: `${p.subject_color}38`,
                  borderRightWidth: "4px",
                  borderRightColor: p.subject_color,
                }}
              >
                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {p.is_completed ? (
                      <CheckCircle2 className="h-5 w-5 text-[#00ffa3]" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold"
                        style={{
                          backgroundColor: `${p.subject_color}20`,
                          color: p.subject_color,
                        }}
                        dir="ltr"
                      >
                        {p.start_time} - {p.end_time}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 truncate text-xs font-bold"
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
                      className={`mt-1.5 text-[13px] font-semibold ${
                        p.is_completed
                          ? "text-slate-400 line-through"
                          : "text-slate-100"
                      }`}
                    >
                      {p.topic}
                    </div>

                    {p.source_note && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <BookOpen className="h-3 w-3 shrink-0" />
                        <span className="truncate">{p.source_note}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  href={`/log?subjectId=${p.subject_id ?? ""}&topic=${encodeURIComponent(p.topic)}&mins=${p.planned_minutes}&date=${p.plan_date}&source=${encodeURIComponent(p.source_note || "")}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#00ffa3]/12 px-3 py-2 text-xs font-bold text-[#00ffa3] no-underline transition hover:bg-[#00ffa3]/22"
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  <span>ثبت گزارش</span>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-dashed border-white/12 bg-white/[0.015] p-5 text-center sm:flex-row sm:text-right">
            <div className="text-xs leading-relaxed text-slate-400">
              هنوز باکس مطالعه‌ای برای امروز ثبت نکرده‌اید. ساعت‌های مطالعه امروز
              و هفته پیش رو را مشخص کنید تا در همین بخش نمایش داده شوند.
            </div>
            <Link
              href="/planner"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#00d4ff]/15 px-4 py-2.5 text-xs font-bold text-[#00d4ff] no-underline transition hover:bg-[#00d4ff]/25"
            >
              <Plus className="h-4 w-4" />
              <span>تنظیم برنامه امروز</span>
            </Link>
          </div>
        )}
      </section>

      {/* SECTION 3: 4 KPI STAT CARDS */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="bt-card p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">مطالعه امروز</span>
            <Clock className="h-4 w-4 text-[#00ffa3]" />
          </div>
          <div
            className="font-mono text-2xl leading-none font-extrabold text-[#00ffa3] sm:text-[26px]"
            dir="ltr"
          >
            {fmtClockHM(todaySecs)}
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">ساعت و دقیقه</div>
        </div>

        <div className="bt-card p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">۷ روز اخیر</span>
            <CalendarRange className="h-4 w-4 text-[#00d4ff]" />
          </div>
          <div
            className="text-2xl leading-none font-extrabold text-[#00d4ff] sm:text-[26px]"
            dir="ltr"
          >
            {fmtSecsCompact(weekSecs)}
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">مجموع هفتگی</div>
        </div>

        <div className="bt-card p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">صفحات مطالعه‌شده</span>
            <BookOpen className="h-4 w-4 text-[#a78bfa]" />
          </div>
          <div className="text-2xl leading-none font-extrabold text-[#a78bfa] sm:text-[26px]">
            {toFaDigits(totalPages)}
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            کل صفحات ثبت‌شده
          </div>
        </div>

        <div className="bt-card p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">تست‌های حل‌شده</span>
            <FileCheck2 className="h-4 w-4 text-[#ff6b9d]" />
          </div>
          <div className="text-2xl leading-none font-extrabold text-[#ff6b9d] sm:text-[26px]">
            {toFaDigits(totalTests)}
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            {avgAccuracy !== null
              ? `میانگین دقت: ${avgAccuracy}%`
              : "آماده ثبت تست"}
          </div>
        </div>
      </section>

      {/* SECTION 4: OVERALL GOAL PROGRESS */}
      <section className="bt-card p-4 sm:p-5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-100 sm:text-sm">
            <Target className="h-4 w-4 shrink-0 text-[#00ffa3]" />
            <span>
              پیشرفت کل ساعت مطالعه ({toFaDigits(totalHours)} از{" "}
              {toFaDigits(user.target_hours)} ساعت)
            </span>
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-extrabold text-[#00ffa3]">
              {toFaDigits(progressPct)}%
            </span>
            <Link
              href="/settings"
              className="text-xs text-slate-400 no-underline hover:text-[#00d4ff]"
            >
              ویرایش هدف
            </Link>
          </div>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-l from-[#00d4ff] to-[#00ffa3] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </section>

      {/* SECTION 5: CHARTS */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="bt-card p-4 sm:p-5 lg:col-span-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-100">
              <BarChart3 className="h-4 w-4 text-[#00ffa3]" />
              <span>مطالعه ۷ روز اخیر به تفکیک درس (دقیقه)</span>
            </span>
            <Link
              href="/reports"
              className="inline-flex items-center gap-0.5 text-xs text-[#00ffa3] no-underline hover:underline"
            >
              <span>گزارش کامل</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
          {stackedSeries.length > 0 ? (
            <StackedSubjectTimelineChart
              labels={last7Days.map((d) => formatJalaliShortDayMonth(d))}
              series={stackedSeries}
              unitLabel="دقیقه"
            />
          ) : (
            <div className="flex h-[220px] items-center justify-center text-xs text-slate-500">
              اولین گزارش مطالعه خود را ثبت کنید تا نمودار رنگی دروس نمایش داده
              شود
            </div>
          )}
        </div>

        <div className="bt-card p-4 sm:p-5 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-100">
              <PieChart className="h-4 w-4 text-[#00d4ff]" />
              <span>سهم کل هر درس</span>
            </span>
            <Link
              href="/settings"
              className="text-xs text-slate-400 no-underline hover:text-[#00d4ff]"
            >
              رنگ دروس
            </Link>
          </div>
          <SubjectDoughnutChart
            items={Array.from(overallBySubject.entries()).map(
              ([name, info]) => ({
                name,
                color: info.color,
                value: info.mins,
              })
            )}
            unitLabel="دقیقه"
          />
        </div>
      </section>

      {/* SECTION 6: RECENT LOGS */}
      <section className="bt-card p-4 sm:p-5">
        <div className="mb-3.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-100">
            <History className="h-4 w-4 text-[#00ffa3]" />
            <span>آخرین گزارش‌های ثبت‌شده</span>
          </span>
          <Link
            href="/log"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#00ffa3] no-underline hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>ثبت گزارش جدید</span>
          </Link>
        </div>

        {allLogs.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {allLogs.slice(0, 6).map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-xl border bg-white/[0.02] p-3 text-xs"
                style={{ borderColor: `${l.subject_color}30` }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 font-bold"
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
                    <div className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-slate-200">
                      <Bookmark className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="truncate">{l.topic}</span>
                    </div>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-2.5 text-[11px] text-slate-400">
                    {l.duration_seconds > 0 && (
                      <span className="inline-flex items-center gap-1" dir="ltr">
                        <Clock className="h-3 w-3" />
                        {fmtSecsCompact(l.duration_seconds)}
                      </span>
                    )}
                    {l.pages_count > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {toFaDigits(l.pages_count)} صفحه
                      </span>
                    )}
                    {l.tests_total > 0 && (
                      <span className="inline-flex items-center gap-1 text-[#ff6b9d]">
                        <FileCheck2 className="h-3 w-3" />
                        {toFaDigits(l.tests_total)} تست
                        {l.test_accuracy !== null
                          ? ` (${l.test_accuracy}%)`
                          : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            هنوز گزارشی ثبت نشده است — از دکمه «ثبت گزارش مطالعه» شروع کنید!
          </div>
        )}
      </section>
    </div>
  );
}
