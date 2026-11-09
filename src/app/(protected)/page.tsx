import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  getClassLeaderboard,
  getUserStudySessions,
  getUserTestResults,
} from "@/lib/db";
import {
  DEFAULT_EXAM_DATE,
  DEFAULT_TARGET_HOURS,
  fmtSecsCompact,
  formatJalaliDate,
  formatJalaliTodayFull,
  getDaysLeft,
  getPersianWeekdayShort,
  getSubjectInfo,
  getTehranToday,
  shiftDateISO,
  SUBJECT_LIST,
  toFaDigits,
} from "@/lib/constants";
import GoalEditorCard from "@/components/GoalEditorCard";
import {
  TestAccuracyLineChart,
  WeeklyStudyBarChart,
} from "@/components/Charts";

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const todayIso = getTehranToday();

  const [sessions, tests, leaderboardData] = await Promise.all([
    getUserStudySessions(user.id),
    getUserTestResults(user.id),
    user.class_code
      ? getClassLeaderboard(user.class_code)
      : Promise.resolve({ classInfo: null, members: [] }),
  ]);

  // Study time per subject & today
  const subTimes: Record<string, number> = {};
  const byDateSecs: Record<string, number> = {};
  let totalSecs = 0;
  let todaySecs = 0;

  for (const s of sessions) {
    subTimes[s.subject] = (subTimes[s.subject] ?? 0) + s.seconds;
    byDateSecs[s.session_date] = (byDateSecs[s.session_date] ?? 0) + s.seconds;
    totalSecs += s.seconds;
    if (s.session_date === todayIso) {
      todaySecs += s.seconds;
    }
  }

  // Test summary
  let totalTests = 0;
  let totalWrong = 0;
  let totalBlank = 0;
  for (const t of tests) {
    totalTests += t.total;
    totalWrong += t.wrong;
    totalBlank += t.blank;
  }
  const overallAccuracy =
    totalTests > 0
      ? Math.round(
          ((totalTests - totalWrong - totalBlank) / totalTests) * 1000
        ) / 10
      : 0;

  // Class rank
  let rankDisplay = "—";
  let rankSubtitle = user.class_code ? "لیدربورد" : "بدون کلاس";
  if (leaderboardData.members.length > 0) {
    const sorted = [...leaderboardData.members].sort(
      (a, b) => b.score - a.score
    );
    const idx = sorted.findIndex((m) => m.id === user.id);
    if (idx !== -1) {
      rankDisplay = `#${idx + 1}`;
      rankSubtitle = leaderboardData.classInfo
        ? leaderboardData.classInfo.name
        : "لیدربورد";
    }
  }

  // Weekly 7-day bar chart data
  const weekLabels: string[] = [];
  const weekData: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = shiftDateISO(todayIso, -i);
    weekLabels.push(getPersianWeekdayShort(d));
    weekData.push(Math.round((byDateSecs[d] ?? 0) / 60));
  }

  // Recent test history (latest 5) & chronological last 10 for line chart
  const recentFiveTests = tests.slice(0, 5);
  const chronologicalTenTests = [...tests.slice(0, 10)].reverse();
  const testChartLabels = chronologicalTenTests.map((_, i) => `#${i + 1}`);
  const testChartData = chronologicalTenTests.map((t) => t.accuracy);

  const examDateIso = user.target_exam_date || DEFAULT_EXAM_DATE;
  const daysLeft = getDaysLeft(examDateIso);
  const targetHours = user.target_hours || DEFAULT_TARGET_HOURS;
  const totalHours = Math.round((totalSecs / 3600) * 10) / 10;

  return (
    <div>
      {/* Page Greeting Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 sm:text-[22px]">
            سلام {firstName} 👋
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-[13px]">
            {formatJalaliTodayFull()} — امروز چه درسی می‌خوانی؟
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/pomodoro"
            className="bt-btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 text-xs no-underline sm:text-[13px]"
          >
            <span>⏱️</span>
            <span>شروع پومودورو</span>
          </Link>
          <Link
            href="/tests"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-200 no-underline transition hover:bg-white/[0.08] sm:text-[13px]"
          >
            <span>📝</span>
            <span>ثبت تست جدید</span>
          </Link>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="bt-card flex items-start justify-between p-4 sm:p-5">
          <div>
            <div className="mb-2 text-[11px] font-medium text-slate-400">
              کل زمان مطالعه
            </div>
            <div
              className="text-2xl leading-none font-extrabold text-[#00ffa3] sm:text-[28px]"
              dir="ltr"
            >
              {fmtSecsCompact(totalSecs)}
            </div>
            <div className="mt-1.5 text-[11px] text-slate-500">
              امروز: <span dir="ltr">{fmtSecsCompact(todaySecs)}</span>
            </div>
          </div>
          <span className="text-2xl">⏱️</span>
        </div>

        <div className="bt-card flex items-start justify-between p-4 sm:p-5">
          <div>
            <div className="mb-2 text-[11px] font-medium text-slate-400">
              دقت تست‌ها
            </div>
            <div
              className="text-2xl leading-none font-extrabold text-[#00d4ff] sm:text-[28px]"
              dir="ltr"
            >
              {overallAccuracy}%
            </div>
            <div className="mt-1.5 text-[11px] text-slate-500">
              از {toFaDigits(totalTests)} تست
            </div>
          </div>
          <span className="text-2xl">🎯</span>
        </div>

        <div className="bt-card flex items-start justify-between p-4 sm:p-5">
          <div>
            <div className="mb-2 text-[11px] font-medium text-slate-400">
              روزهای پیوسته
            </div>
            <div className="text-2xl leading-none font-extrabold text-[#ffb347] sm:text-[28px]">
              {toFaDigits(user.streak)}
            </div>
            <div className="mt-1.5 text-[11px] text-slate-500">streak 🔥</div>
          </div>
          <span className="text-2xl">🔥</span>
        </div>

        <Link
          href={user.class_code ? "/leaderboard" : "/class"}
          className="bt-card flex items-start justify-between p-4 no-underline transition hover:border-[#ff6b9d]/35 sm:p-5"
        >
          <div>
            <div className="mb-2 text-[11px] font-medium text-slate-400">
              رتبه در گروه
            </div>
            <div
              className="text-2xl leading-none font-extrabold text-[#ff6b9d] sm:text-[28px]"
              dir="ltr"
            >
              {rankDisplay}
            </div>
            <div className="mt-1.5 max-w-[120px] truncate text-[11px] text-slate-500">
              {rankSubtitle}
            </div>
          </div>
          <span className="text-2xl">🏆</span>
        </Link>
      </div>

      {/* Exam Countdown & Goal Progress */}
      <GoalEditorCard
        daysLeft={daysLeft}
        examDateIso={examDateIso}
        totalHours={totalHours}
        targetHours={targetHours}
      />

      {/* Charts Row */}
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bt-card p-5">
          <div className="mb-3.5 text-[13px] font-semibold text-slate-300">
            ⏱️ مطالعه ۷ روز اخیر (دقیقه)
          </div>
          <WeeklyStudyBarChart labels={weekLabels} data={weekData} />
        </div>

        <div className="bt-card p-5">
          <div className="mb-3.5 text-[13px] font-semibold text-slate-300">
            📊 روند دقت تست‌ها
          </div>
          {testChartData.length >= 2 ? (
            <TestAccuracyLineChart
              labels={testChartLabels}
              data={testChartData}
            />
          ) : (
            <div className="flex h-[210px] flex-col items-center justify-center text-center text-xs text-slate-500">
              <div className="mb-2 text-2xl opacity-50">📈</div>
              <p>برای نمایش نمودار روند، حداقل ۲ نوبت تست ثبت کنید</p>
              <Link
                href="/tests"
                className="mt-2 font-semibold text-[#00ffa3] no-underline hover:underline"
              >
                ثبت تست ←
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Subject Study Breakdown + Recent Tests */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bt-card p-5">
          <div className="mb-3.5 text-[13px] font-semibold text-slate-300">
            📚 زمان مطالعه به تفکیک درس
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SUBJECT_LIST.map((sub) => {
              const secs = subTimes[sub.key] ?? 0;
              // Progress relative to 20 hours per subject benchmark (or share)
              const pct = Math.min(100, Math.round((secs / 3600 / 20) * 100));
              return (
                <div
                  key={sub.key}
                  className="rounded-xl border bg-white/[0.02] p-3.5 transition hover:bg-white/[0.04]"
                  style={{ borderColor: `${sub.color}25` }}
                >
                  <div className="truncate text-xs text-slate-300">
                    {sub.emoji} {sub.name}
                  </div>
                  <div
                    className="mt-1.5 text-xl leading-none font-extrabold"
                    style={{ color: sub.color }}
                    dir="ltr"
                  >
                    {fmtSecsCompact(secs)}
                  </div>
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: sub.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bt-card p-5">
          <div className="mb-3.5 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-slate-300">
              🕐 آخرین تست‌ها
            </span>
            <Link
              href="/tests"
              className="text-xs text-[#00ffa3] no-underline hover:underline"
            >
              مشاهده همه ←
            </Link>
          </div>

          {recentFiveTests.length > 0 ? (
            <div className="max-h-[290px] space-y-2.5 overflow-y-auto pl-1">
              {recentFiveTests.map((t) => {
                const sub = getSubjectInfo(t.subject);
                const acc = t.accuracy;
                const color =
                  acc >= 70 ? "#00ffa3" : acc >= 50 ? "#ffb347" : "#ef4444";
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5"
                  >
                    <div className="min-w-0 flex-1 pl-3">
                      <div className="truncate text-[13px] font-medium text-slate-200">
                        {sub.emoji} {sub.name}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-400">
                        {formatJalaliDate(t.test_date)} | {toFaDigits(t.total)}{" "}
                        سوال، {toFaDigits(t.wrong)} غلط
                        {t.blank > 0 ? `، ${toFaDigits(t.blank)} نزده` : ""}
                        {t.note ? ` • ${t.note}` : ""}
                      </div>
                    </div>
                    <div className="text-left" dir="ltr">
                      <div
                        className="text-lg font-extrabold leading-none"
                        style={{ color }}
                      >
                        {acc}%
                      </div>
                      {t.konkur_score !== null && (
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          تراز منفی: {t.konkur_score}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[220px] flex-col items-center justify-center text-center text-xs text-slate-500">
              <div className="mb-2 text-2xl opacity-50">📝</div>
              <p>هنوز نتیجه‌ای ثبت نشده است</p>
              <Link
                href="/tests"
                className="mt-2 font-semibold text-[#00ffa3] no-underline hover:underline"
              >
                ثبت اولین تست ←
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
