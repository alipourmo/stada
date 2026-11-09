import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getClassLeaderboard, LeaderboardMember } from "@/lib/db";
import { toFaDigits } from "@/lib/constants";
import CopyCodeBadge from "@/components/CopyCodeBadge";

export const metadata = {
  title: "لیدربورد رقابتی",
};

type FilterKey = "score" | "study" | "tests" | "streak";

const FILTER_LABELS: Record<FilterKey, string> = {
  score: "امتیاز کل",
  study: "ساعت مطالعه",
  tests: "تعداد تست",
  streak: "Streak",
};

const MEDALS = ["🥇", "🥈", "🥉"];

function getMetricValue(m: LeaderboardMember, filter: FilterKey): number {
  switch (filter) {
    case "study":
      return m.study_hours;
    case "tests":
      return m.total_tests;
    case "streak":
      return m.streak;
    default:
      return m.score;
  }
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const rawFilter = sp.filter ?? "score";
  const filter: FilterKey =
    rawFilter === "study" ||
    rawFilter === "tests" ||
    rawFilter === "streak" ||
    rawFilter === "score"
      ? rawFilter
      : "score";

  const { classInfo, members } = user.class_code
    ? await getClassLeaderboard(user.class_code)
    : { classInfo: null, members: [] };

  const sortedMembers = [...members].sort(
    (a, b) => getMetricValue(b, filter) - getMetricValue(a, filter)
  );
  const topVal =
    sortedMembers.length > 0 ? getMetricValue(sortedMembers[0], filter) : 1;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 sm:text-[22px]">
            🏆 لیدربورد رقابتی
          </h1>
          {classInfo && (
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <span className="text-xs text-slate-400">
                کلاس:{" "}
                <strong className="text-[#00ffa3]">{classInfo.name}</strong>
              </span>
              <CopyCodeBadge code={classInfo.code} />
            </div>
          )}
        </div>

        {user.class_code && (
          <Link
            href="/class"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-300 no-underline transition hover:bg-white/[0.08]"
          >
            ⚙️ مدیریت / تغییر کلاس
          </Link>
        )}
      </div>

      {!user.class_code || !classInfo ? (
        <div className="bt-card px-5 py-12 text-center">
          <div className="mb-4 text-5xl">👥</div>
          <h2 className="text-lg font-bold text-slate-100">
            عضو کلاسی نیستید
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs text-slate-400 sm:text-[13px]">
            برای رقابت دوستانه با همکلاسی‌ها و رصد رتبه‌بندی مطالعه و تست، یک
            کلاس جدید بسازید یا با کد دعوت بپیوندید.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/class"
              className="bt-btn-primary px-6 py-3 text-sm no-underline"
            >
              ساختن کلاس جدید
            </Link>
            <Link
              href="/class"
              className="rounded-xl border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-slate-300 no-underline transition hover:bg-white/[0.1]"
            >
              پیوستن با کد کلاس
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="mb-5 flex flex-wrap gap-2">
            {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => {
              const active = filter === key;
              return (
                <Link
                  key={key}
                  href={`/leaderboard?filter=${key}`}
                  className={`rounded-xl border px-4 py-2 text-[13px] no-underline transition ${
                    active
                      ? "border-[#00d4ff]/35 bg-[#00d4ff]/12 font-bold text-[#00d4ff]"
                      : "border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                  }`}
                >
                  {FILTER_LABELS[key]}
                </Link>
              );
            })}
          </div>

          {/* Ranked Members */}
          <div className="space-y-3">
            {sortedMembers.map((m, idx) => {
              const isMe = m.id === user.id;
              const rawVal = getMetricValue(m, filter);
              const pct =
                topVal > 0 ? Math.min(100, Math.round((rawVal / topVal) * 100)) : 0;
              const dispVal =
                filter === "study"
                  ? `${m.study_hours}h`
                  : filter === "streak"
                    ? `${toFaDigits(m.streak)} 🔥`
                    : toFaDigits(rawVal);

              const valColor =
                idx === 0 ? "#ffb347" : isMe ? "#00ffa3" : "#94a3b8";
              const initial = m.name.trim().slice(0, 1) || "؟";

              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-3.5 rounded-2xl border p-4 transition sm:gap-4 sm:p-5 ${
                    isMe
                      ? "border-[#00ffa3]/35 bg-[#00ffa3]/[0.04]"
                      : "border-white/[0.08] bg-[#0a0f1e]/85"
                  }`}
                >
                  <div className="w-9 text-center text-2xl">
                    {idx < 3 ? (
                      MEDALS[idx]
                    ) : (
                      <span
                        className="text-base font-extrabold text-slate-500"
                        dir="ltr"
                      >
                        #{idx + 1}
                      </span>
                    )}
                  </div>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/10 bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-lg font-bold text-slate-100">
                    {initial}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`truncate text-[15px] font-bold ${
                          isMe ? "text-[#00ffa3]" : "text-slate-100"
                        }`}
                      >
                        {m.name}
                      </span>
                      {isMe && (
                        <span className="rounded-full bg-[#00ffa3]/15 px-2 py-0.5 text-[10px] font-bold text-[#00ffa3]">
                          شما
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>
                        ⏱️ <span dir="ltr">{m.study_hours}h</span>
                      </span>
                      <span>📝 {toFaDigits(m.total_tests)} تست</span>
                      <span>🔥 {toFaDigits(m.streak)} روز</span>
                      {m.avg_accuracy > 0 && (
                        <span>
                          🎯 دقت <span dir="ltr">{m.avg_accuracy}%</span>
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isMe
                            ? "#00ffa3"
                            : idx === 0
                              ? "#ffb347"
                              : "#334155",
                        }}
                      />
                    </div>
                  </div>

                  <div className="min-w-[70px] text-center">
                    <div
                      className="text-2xl leading-none font-extrabold sm:text-[28px]"
                      style={{ color: valColor }}
                      dir="ltr"
                    >
                      {dispVal}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      {FILTER_LABELS[filter]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scoring Legend */}
          <div className="bt-card mt-6 border-[#ffb347]/20 p-5">
            <div className="mb-3 text-[13px] font-bold text-[#ffb347]">
              🏅 سیستم امتیازدهی رقابتی
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[#ffb347]/[0.06] p-3.5 text-center">
                <div className="text-xl font-extrabold text-[#ffb347]">+۱۰</div>
                <div className="mt-1 text-[11px] text-slate-400">
                  هر ساعت مطالعه ثبت‌شده
                </div>
              </div>
              <div className="rounded-xl bg-[#ffb347]/[0.06] p-3.5 text-center">
                <div className="text-xl font-extrabold text-[#ffb347]">+۵</div>
                <div className="mt-1 text-[11px] text-slate-400">
                  هر روز پیوستگی (Streak)
                </div>
              </div>
              <div className="rounded-xl bg-[#ffb347]/[0.06] p-3.5 text-center">
                <div className="text-xl font-extrabold text-[#ffb347]">+۲</div>
                <div className="mt-1 text-[11px] text-slate-400">
                  هر سوال تست حل‌شده
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
