import Link from "next/link";
import {
  Award,
  Clock,
  Crown,
  FileCheck2,
  Flame,
  Medal,
  School,
  Trophy,
  Users,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getClassLeaderboard } from "@/lib/db";
import CopyCodeBadge from "@/components/CopyCodeBadge";
import { toFaDigits } from "@/lib/constants";

export const metadata = {
  title: "لیدربورد کلاس رقابتی",
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 0) return <Crown className="h-5 w-5 text-[#fbbf24]" />;
  if (rank === 1) return <Medal className="h-5 w-5 text-[#cbd5e1]" />;
  if (rank === 2) return <Award className="h-5 w-5 text-[#cd7c2f]" />;
  return (
    <span className="text-sm font-bold text-slate-400">
      {toFaDigits(rank + 1)}
    </span>
  );
}

export default async function LeaderboardPage() {
  const currentUser = await requireUser();

  if (!currentUser.class_code) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <div>
          <h1 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-100 sm:text-[22px]">
            <Trophy className="h-5 w-5 text-[#00ffa3]" />
            <span>لیدربورد رقابتی stada</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-[13px]">
            رقابت سالم با دوستان و هم‌کلاسی‌ها بر اساس ساعت مطالعه، صفحات، تست و
            استریک
          </p>
        </div>

        <div className="bt-card flex flex-col items-center justify-center p-8 text-center sm:p-10">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00ffa3]/12 text-[#00ffa3]">
            <School className="h-8 w-8" />
          </div>
          <h2 className="text-base font-extrabold text-slate-100 sm:text-lg">
            هنوز عضو هیچ کلاس رقابتی نیستید
          </h2>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-400">
            می‌توانید گروه مطالعاتی یا کلاس مشاوره خودتان را بسازید و کد دعوت ۶
            کاراکتری را برای دوستانتان بفرستید، یا با کد دعوت وارد کلاس شوید.
          </p>
          <Link
            href="/class"
            className="bt-btn-primary mt-5 inline-flex items-center gap-2 px-6 py-3 text-xs no-underline sm:text-sm"
          >
            <Users className="h-4 w-4" />
            <span>ساخت یا پیوستن به کلاس رقابتی</span>
          </Link>
        </div>
      </div>
    );
  }

  const { classInfo, members } = await getClassLeaderboard(
    currentUser.class_code
  );
  const ranked = [...members].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-100 sm:text-[22px]">
            <Trophy className="h-5 w-5 text-[#00ffa3]" />
            <span>لیدربورد کلاس «{classInfo?.name ?? currentUser.class_code}»</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-[13px]">
            امتیاز رقابتی ترکیبی از ساعت مطالعه، استریک روزانه، صفحات خوانده‌شده
            و تست‌های حل‌شده
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {classInfo && <CopyCodeBadge code={classInfo.code} />}
          <Link
            href="/class"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 no-underline transition hover:bg-white/[0.08]"
          >
            <Users className="h-3.5 w-3.5 text-[#00d4ff]" />
            <span>مدیریت کلاس</span>
          </Link>
        </div>
      </div>

      {/* Top 3 Podium */}
      {ranked.length >= 3 && (
        <div className="grid grid-cols-3 items-end gap-2.5 sm:gap-4">
          {[ranked[1], ranked[0], ranked[2]].map((item, idx) => {
            const actualRank = idx === 0 ? 1 : idx === 1 ? 0 : 2;
            const heights = ["min-h-[142px]", "min-h-[172px]", "min-h-[132px]"];
            const colors = ["#94a3b8", "#fbbf24", "#cd7c2f"];
            const color = colors[idx];
            return (
              <div
                key={item.id}
                className={`bt-card flex flex-col items-center justify-center p-3 text-center sm:p-4 ${heights[idx]}`}
                style={{ borderColor: `${color}45` }}
              >
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04]">
                  {actualRank === 0 ? (
                    <Crown className="h-5 w-5 text-[#fbbf24]" />
                  ) : actualRank === 1 ? (
                    <Medal className="h-5 w-5 text-[#cbd5e1]" />
                  ) : (
                    <Award className="h-5 w-5 text-[#cd7c2f]" />
                  )}
                </div>
                <div className="line-clamp-1 text-xs font-bold text-slate-100 sm:text-sm">
                  {item.name}
                </div>
                <div className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">
                  {item.study_field}
                </div>
                <div
                  className="mt-2 text-base font-extrabold sm:text-xl"
                  style={{ color }}
                >
                  {toFaDigits(item.score)} امتیاز
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-slate-500 sm:text-[11px]">
                  <span className="inline-flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {toFaDigits(item.study_hours)}س
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-0.5">
                    <FileCheck2 className="h-3 w-3" />
                    {toFaDigits(item.total_tests)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bt-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-xs text-slate-400">
                <th className="px-3.5 py-3.5 text-right font-semibold">رتبه</th>
                <th className="px-3.5 py-3.5 text-right font-semibold">
                  عضو کلاس و رشته
                </th>
                <th className="px-3.5 py-3.5 text-center font-semibold">
                  امتیاز کل
                </th>
                <th className="px-3.5 py-3.5 text-center font-semibold">
                  ساعت مطالعه
                </th>
                <th className="px-3.5 py-3.5 text-center font-semibold">
                  صفحات
                </th>
                <th className="px-3.5 py-3.5 text-center font-semibold">تست</th>
                <th className="px-3.5 py-3.5 text-center font-semibold">
                  میانگین دقت
                </th>
                <th className="px-3.5 py-3.5 text-center font-semibold">
                  استریک
                </th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => {
                const isMe = r.id === currentUser.id;
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-white/[0.04] transition ${
                      isMe ? "bg-[#00ffa3]/[0.06]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="px-3.5 py-3.5">
                      <RankBadge rank={i} />
                    </td>
                    <td className="px-3.5 py-3.5">
                      <div
                        className={`font-semibold ${
                          isMe ? "text-[#00ffa3]" : "text-slate-100"
                        }`}
                      >
                        {r.name}
                        {isMe && (
                          <span className="mr-1.5 text-[11px] text-slate-400">
                            (شما)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {r.study_field}
                      </div>
                    </td>
                    <td className="px-3.5 py-3.5 text-center font-extrabold text-[#00ffa3]">
                      {toFaDigits(r.score)}
                    </td>
                    <td className="px-3.5 py-3.5 text-center font-semibold text-slate-200">
                      {toFaDigits(r.study_hours)} ساعت
                    </td>
                    <td className="px-3.5 py-3.5 text-center text-[#a78bfa]">
                      {toFaDigits(r.total_pages)}
                    </td>
                    <td className="px-3.5 py-3.5 text-center text-[#ff6b9d]">
                      {toFaDigits(r.total_tests)}
                    </td>
                    <td
                      className="px-3.5 py-3.5 text-center font-semibold"
                      dir="ltr"
                    >
                      {r.avg_accuracy > 0 ? (
                        <span className="text-[#00d4ff]">
                          {r.avg_accuracy}%
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3.5 text-center font-semibold text-[#fb923c]">
                      <span className="inline-flex items-center justify-center gap-1">
                        <Flame className="h-3.5 w-3.5" />
                        {toFaDigits(r.streak)}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {ranked.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center text-xs text-slate-500"
                  >
                    هنوز عضوی در این کلاس ثبت نشده است
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
