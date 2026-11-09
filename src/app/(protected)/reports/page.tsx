import { requireUser } from "@/lib/auth";
import { getUserStudySessions, getUserTestResults } from "@/lib/db";
import {
  calcKonkurPercent,
  getPersianWeekdayShort,
  getTehranToday,
  shiftDateISO,
  SUBJECT_LIST,
  toFaDigits,
} from "@/lib/constants";
import {
  SubjectMasteryRadarChart,
  TestAccuracyLineChart,
  WeeklyStudyBarChart,
} from "@/components/Charts";

export const metadata = {
  title: "گزارش پیشرفت",
};

type SugType = "danger" | "warn" | "ok" | "info";

export default async function ReportsPage() {
  const user = await requireUser();
  const todayIso = getTehranToday();
  const thirtyDaysAgoIso = shiftDateISO(todayIso, -30);

  const [sessions, tests] = await Promise.all([
    getUserStudySessions(user.id),
    getUserTestResults(user.id),
  ]);

  // Subject study totals & daily grouping
  const subTimes: Record<string, number> = {};
  const byDateSecs: Record<string, number> = {};
  const last30ByDate: Record<string, number> = {};
  let totalSecs = 0;

  for (const s of sessions) {
    subTimes[s.subject] = (subTimes[s.subject] ?? 0) + s.seconds;
    byDateSecs[s.session_date] = (byDateSecs[s.session_date] ?? 0) + s.seconds;
    if (s.session_date >= thirtyDaysAgoIso) {
      last30ByDate[s.session_date] =
        (last30ByDate[s.session_date] ?? 0) + s.seconds;
    }
    totalSecs += s.seconds;
  }

  const totalHours = Math.round((totalSecs / 3600) * 10) / 10;

  // Average daily minutes across active study days in last 30 days
  const activeDayTotals = Object.values(last30ByDate);
  const avgDailyMins =
    activeDayTotals.length > 0
      ? Math.round(
          activeDayTotals.reduce((a, b) => a + b, 0) /
            activeDayTotals.length /
            60
        )
      : 0;

  // Test aggregations
  let totalTests = 0;
  let totalWrong = 0;
  let totalBlank = 0;
  const subTestStats: Record<
    string,
    { accSum: number; konkurSum: number; count: number; questions: number }
  > = {};

  for (const t of tests) {
    totalTests += t.total;
    totalWrong += t.wrong;
    totalBlank += t.blank;

    const cur = subTestStats[t.subject] ?? {
      accSum: 0,
      konkurSum: 0,
      count: 0,
      questions: 0,
    };
    cur.accSum += t.accuracy;
    cur.konkurSum +=
      t.konkur_score ?? calcKonkurPercent(t.total, t.wrong, t.blank);
    cur.count += 1;
    cur.questions += t.total;
    subTestStats[t.subject] = cur;
  }

  const overallAcc =
    totalTests > 0
      ? Math.round(
          ((totalTests - totalWrong - totalBlank) / totalTests) * 1000
        ) / 10
      : 0;

  // Weekly 7-day chart
  const weekLabels: string[] = [];
  const weekData: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = shiftDateISO(todayIso, -i);
    weekLabels.push(getPersianWeekdayShort(d));
    weekData.push(Math.round((byDateSecs[d] ?? 0) / 60));
  }

  // Last 15 test accuracies chronologically
  const chronological15 = [...tests.slice(0, 15)].reverse();
  const accLabels = chronological15.map((_, i) => `#${i + 1}`);
  const accData = chronological15.map((t) => t.accuracy);

  // Radar chart data (minutes per subject)
  const radarLabels = SUBJECT_LIST.map((s) => s.name);
  const radarData = SUBJECT_LIST.map((s) =>
    Math.round((subTimes[s.key] ?? 0) / 60)
  );

  // Smart Suggestions
  const suggestions: { type: SugType; text: string }[] = [];
  for (const s of SUBJECT_LIST) {
    const secs = subTimes[s.key] ?? 0;
    if (secs === 0) {
      suggestions.push({
        type: "danger",
        text: `درس «${s.name}» را هنوز مطالعه نکرده‌اید`,
      });
    } else if (secs < 3600) {
      suggestions.push({
        type: "warn",
        text: `درس «${s.name}» کمتر از یک ساعت مطالعه شده — نیاز به توجه بیشتر`,
      });
    }
  }

  if (suggestions.length === 0) {
    suggestions.push({
      type: "ok",
      text: "آفرین! تمام دروس را بیش از یک ساعت مطالعه کرده‌اید 🎉",
    });
  }

  if (totalTests > 0 && overallAcc < 60) {
    suggestions.push({
      type: "warn",
      text: "دقت کلی تست‌ها پایین‌تر از ۶۰٪ است — روی مرور نکات و تحلیل غلط‌ها تمرکز کنید",
    });
  }

  for (const s of SUBJECT_LIST) {
    const st = subTestStats[s.key];
    if (st && st.count > 0) {
      const avgA = st.accSum / st.count;
      if (avgA < 55) {
        suggestions.push({
          type: "warn",
          text: `میانگین دقت تست در «${s.name}» (${Math.round(avgA)}%) پایین است — تست آموزشی بیشتری حل کنید`,
        });
      }
    }
  }

  suggestions.push({
    type: "info",
    text: "هدف پیشنهادی: حداقل ۲ ساعت مطالعه متمرکز برای هر درس در هفته آینده",
  });

  const sugStyle: Record<
    SugType,
    { bg: string; border: string; text: string; icon: string }
  > = {
    danger: {
      bg: "rgba(239, 68, 68, 0.08)",
      border: "rgba(239, 68, 68, 0.25)",
      text: "#fca5a5",
      icon: "⚠️",
    },
    warn: {
      bg: "rgba(255, 179, 71, 0.08)",
      border: "rgba(255, 179, 71, 0.25)",
      text: "#ffb347",
      icon: "💛",
    },
    ok: {
      bg: "rgba(0, 255, 163, 0.08)",
      border: "rgba(0, 255, 163, 0.25)",
      text: "#00ffa3",
      icon: "✅",
    },
    info: {
      bg: "rgba(0, 212, 255, 0.07)",
      border: "rgba(0, 212, 255, 0.22)",
      text: "#00d4ff",
      icon: "🎯",
    },
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-slate-100 sm:text-[22px]">
          📈 گزارش پیشرفت و تحلیل هوشمند
        </h1>
        <p className="mt-1 text-xs text-slate-400 sm:text-[13px]">
          ارزیابی جامع تعادل مطالعاتی، تسلط به دروس و روند تست‌زنی شما
        </p>
      </div>

      {/* 4 KPI Cards */}
      <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="bt-card p-4 sm:p-5">
          <div className="mb-2 text-[11px] font-medium text-slate-400">
            کل ساعت مطالعه
          </div>
          <div
            className="text-2xl leading-none font-extrabold text-[#00ffa3] sm:text-[28px]"
            dir="ltr"
          >
            {totalHours}h
          </div>
        </div>

        <div className="bt-card p-4 sm:p-5">
          <div className="mb-2 text-[11px] font-medium text-slate-400">
            میانگین روزانه (۳۰ روز)
          </div>
          <div
            className="text-2xl leading-none font-extrabold text-[#00d4ff] sm:text-[28px]"
            dir="ltr"
          >
            {avgDailyMins}m
          </div>
        </div>

        <div className="bt-card p-4 sm:p-5">
          <div className="mb-2 text-[11px] font-medium text-slate-400">
            دقت کلی تست
          </div>
          <div
            className="text-2xl leading-none font-extrabold text-[#ff6b9d] sm:text-[28px]"
            dir="ltr"
          >
            {overallAcc}%
          </div>
        </div>

        <div className="bt-card p-4 sm:p-5">
          <div className="mb-2 text-[11px] font-medium text-slate-400">
            streak فعلی
          </div>
          <div className="text-2xl leading-none font-extrabold text-[#ffb347] sm:text-[28px]">
            {toFaDigits(user.streak)} 🔥
          </div>
        </div>
      </div>

      {/* Row 1: Weekly Bar + Test Trend Line */}
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bt-card p-5">
          <div className="mb-3.5 text-[13px] font-semibold text-slate-300">
            📅 مطالعه ۷ روز اخیر (دقیقه)
          </div>
          <WeeklyStudyBarChart labels={weekLabels} data={weekData} />
        </div>

        <div className="bt-card p-5">
          <div className="mb-3.5 text-[13px] font-semibold text-slate-300">
            🎯 روند دقت تست‌ها (۱۵ آزمون اخیر)
          </div>
          {accData.length >= 2 ? (
            <TestAccuracyLineChart labels={accLabels} data={accData} />
          ) : (
            <div className="flex h-[210px] items-center justify-center text-xs text-slate-500">
              حداقل ۲ تست ثبت کنید تا نمودار روند ترسیم شود
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Radar Chart + Smart Advisor */}
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bt-card p-5">
          <div className="mb-3.5 text-[13px] font-semibold text-slate-300">
            🕸️ تسلط به دروس (دقیقه مطالعه)
          </div>
          <SubjectMasteryRadarChart labels={radarLabels} data={radarData} />
        </div>

        <div className="bt-card p-5">
          <div className="mb-3.5 text-[13px] font-semibold text-slate-300">
            💡 پیشنهاد هوشمند مشاوره‌ای
          </div>
          <div className="max-h-[255px] space-y-2.5 overflow-y-auto pl-1">
            {suggestions.map((sug, i) => {
              const st = sugStyle[sug.type];
              return (
                <div
                  key={i}
                  className="rounded-xl border px-3.5 py-2.5 text-[13px] leading-relaxed"
                  style={{
                    backgroundColor: st.bg,
                    borderColor: st.border,
                    color: st.text,
                  }}
                >
                  {st.icon} {sug.text}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Per-Subject Test Breakdown */}
      <div className="bt-card p-5">
        <div className="mb-4 text-[13px] font-semibold text-slate-300">
          📊 دقت تست‌ها به تفکیک درس
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SUBJECT_LIST.map((s) => {
            const st = subTestStats[s.key];
            const avgAcc =
              st && st.count > 0
                ? Math.round((st.accSum / st.count) * 10) / 10
                : null;
            const avgKonkur =
              st && st.count > 0
                ? Math.round((st.konkurSum / st.count) * 10) / 10
                : null;
            const color =
              avgAcc === null
                ? "#475569"
                : avgAcc >= 70
                  ? "#00ffa3"
                  : avgAcc >= 50
                    ? "#ffb347"
                    : "#ef4444";

            return (
              <div
                key={s.key}
                className="rounded-xl border bg-white/[0.02] p-4"
                style={{ borderColor: `${s.color}25` }}
              >
                <div className="mb-2 text-xs text-slate-300">
                  {s.emoji} {s.name}
                </div>
                <div
                  className="text-2xl leading-none font-extrabold"
                  style={{ color }}
                  dir="ltr"
                >
                  {avgAcc !== null ? `${avgAcc}%` : "—"}
                </div>
                <div className="mt-2 text-[11px] text-slate-400">
                  {st && st.count > 0 ? (
                    <>
                      {toFaDigits(st.count)} نوبت ({toFaDigits(st.questions)}{" "}
                      سوال)
                      {avgKonkur !== null && (
                        <span className="mr-1 text-slate-500">
                          • کنکور: <span dir="ltr">{avgKonkur}%</span>
                        </span>
                      )}
                    </>
                  ) : (
                    "تست ثبت نشده"
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
