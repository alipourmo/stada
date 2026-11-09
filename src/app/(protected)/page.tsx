import Link from "next/link";
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
  getTehranToday,
  shiftDateISO,
  toFaDigits,
} from "@/lib/constants";
import {
  StackedSubjectTimelineChart,
  SubjectDoughnutChart,
} from "@/components/Charts";

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

  return (
    <div className="space-y-6">
      {/* Top Greeting & Exam Countdown Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-100 sm:text-2xl">
              سلام {firstName} 👋
            </h1>
            <Link
              href="/settings"
              className="rounded-full border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-3 py-0.5 text-xs font-semibold text-[#00d4ff] no-underline hover:bg-[#00d4ff]/20"
            >
              🎓 {user.study_field}
            </Link>
          </div>
          <p className="mt-1 text-xs text-slate-400 sm:text-[13px]">
            امروز {formatJalaliDate(todayIso)} — هر صفحه و هر تست، یک قدم
            نزدیک‌تر به هدف
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-2xl border border-[#00ffa3]/25 bg-gradient-to-l from-[#00ffa3]/12 to-[#00d4ff]/10 px-4 py-2.5 no-underline transition hover:border-[#00ffa3]/50"
          >
            <div className="text-3xl leading-none font-extrabold text-[#00ffa3]">
              {toFaDigits(daysLeft)}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100">
                روز تا آزمون هدف
              </div>
              <div className="text-[11px] text-slate-400">
                {formatJalaliDate(examDate)}
              </div>
            </div>
          </Link>

          <Link
            href="/log"
            className="bt-btn-primary inline-flex items-center gap-1.5 px-4 py-3 text-xs sm:text-sm"
          >
            📝 ثبت گزارش مطالعه
          </Link>
        </div>
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="bt-card p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">مطالعه امروز</span>
            <span className="text-lg">⏱️</span>
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
            <span className="text-lg">📅</span>
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
            <span className="text-lg">📖</span>
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
            <span className="text-xs text-slate-400">کل تست‌های حل‌شده</span>
            <span className="text-lg">📝</span>
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
      </div>

      {/* Overall Goal Progress Card */}
      <div className="bt-card p-5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-bold text-slate-100">
            🎯 پیشرفت کل ساعت مطالعه نسبت به هدف ({toFaDigits(totalHours)} از{" "}
            {toFaDigits(user.target_hours)} ساعت)
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-extrabold text-[#00ffa3]">
              {toFaDigits(progressPct)}%
            </span>
            <Link
              href="/settings"
              className="text-xs text-slate-400 no-underline hover:text-[#00d4ff]"
            >
              ویرایش هدف ✎
            </Link>
          </div>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-l from-[#00d4ff] to-[#00ffa3] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Today's Scheduled Blocks from Weekly Planner */}
      <div className="bt-card p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-100">
            📅 برنامه مطالعاتی امروز من
          </span>
          <Link
            href="/planner"
            className="text-xs font-semibold text-[#00ffa3] no-underline hover:underline"
          >
            مدیریت برنامه هفتگی ←
          </Link>
        </div>

        {todayPlans.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
            {todayPlans.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-xl border bg-white/[0.02] p-3"
                style={{
                  borderColor: `${p.subject_color}40`,
                  borderRightWidth: "4px",
                  borderRightColor: p.subject_color,
                }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[11px] font-bold"
                      style={{
                        backgroundColor: `${p.subject_color}20`,
                        color: p.subject_color,
                      }}
                      dir="ltr"
                    >
                      {p.start_time}-{p.end_time}
                    </span>
                    <span
                      className="truncate text-xs font-bold"
                      style={{ color: p.subject_color }}
                    >
                      {p.subject_icon} {p.subject_name}
                    </span>
                  </div>
                  <div
                    className={`mt-1 truncate text-xs ${
                      p.is_completed
                        ? "text-slate-400 line-through"
                        : "text-slate-200"
                    }`}
                  >
                    {p.topic}
                  </div>
                </div>
                <Link
                  href={`/log?subjectId=${p.subject_id ?? ""}&topic=${encodeURIComponent(p.topic)}&mins=${p.planned_minutes}&date=${p.plan_date}`}
                  className="shrink-0 rounded-lg bg-[#00ffa3]/12 px-2.5 py-1 text-[11px] font-bold text-[#00ffa3] no-underline hover:bg-[#00ffa3]/25"
                >
                  ثبت گزارش
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-4 text-xs text-slate-400">
            <span>
              هنوز باکس مطالعه‌ای برای امروز در برنامه هفتگی تعریف نکرده‌اید.
            </span>
            <Link
              href="/planner"
              className="rounded-lg bg-[#00d4ff]/15 px-3 py-1.5 font-bold text-[#00d4ff] no-underline hover:bg-[#00d4ff]/25"
            >
              + چیدن برنامه هفته پیش رو
            </Link>
          </div>
        )}
      </div>

      {/* Charts Row: 7-Day Colored Stacked Bar + Subject Share Doughnut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="bt-card p-5 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-100">
              📊 مطالعه ۷ روز اخیر به تفکیک رنگ هر درس (دقیقه)
            </span>
            <Link
              href="/reports"
              className="text-xs text-[#00ffa3] no-underline hover:underline"
            >
              گزارش روزانه / هفتگی / ماهانه ←
            </Link>
          </div>
          {stackedSeries.length > 0 ? (
            <StackedSubjectTimelineChart
              labels={last7Days.map((d) => formatJalaliShortDayMonth(d))}
              series={stackedSeries}
              unitLabel="دقیقه"
            />
          ) : (
            <div className="flex h-[245px] items-center justify-center text-xs text-slate-500">
              اولین گزارش مطالعه خود را ثبت کنید تا نمودار رنگی دروس نمایش داده
              شود
            </div>
          )}
        </div>

        <div className="bt-card p-5 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-100">
              🎨 سهم کل هر درس از مطالعه شما
            </span>
            <Link
              href="/settings"
              className="text-xs text-slate-400 no-underline hover:text-[#00d4ff]"
            >
              تغییر رنگ دروس
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
      </div>

      {/* Recent Logs */}
      <div className="bt-card p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-100">
            🧾 آخرین گزارش‌های ثبت‌شده
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/pomodoro"
              className="text-xs font-semibold text-[#00d4ff] no-underline hover:underline"
            >
              ⏱️ تایمر پومودورو
            </Link>
            <Link
              href="/log"
              className="text-xs font-semibold text-[#00ffa3] no-underline hover:underline"
            >
              + ثبت گزارش جدید
            </Link>
          </div>
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
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: l.subject_color }}
                    />
                    <span
                      className="font-bold"
                      style={{ color: l.subject_color }}
                    >
                      {l.subject_icon} {l.subject_name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatJalaliDate(l.log_date)}
                    </span>
                  </div>
                  {l.topic && (
                    <div className="mt-1 truncate text-slate-200">
                      📌 {l.topic}
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                    {l.duration_seconds > 0 && (
                      <span dir="ltr">
                        ⏱️ {fmtSecsCompact(l.duration_seconds)}
                      </span>
                    )}
                    {l.pages_count > 0 && (
                      <span>📖 {toFaDigits(l.pages_count)} صفحه</span>
                    )}
                    {l.tests_total > 0 && (
                      <span className="text-[#ff6b9d]">
                        📝 {toFaDigits(l.tests_total)} تست
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
      </div>
    </div>
  );
}
