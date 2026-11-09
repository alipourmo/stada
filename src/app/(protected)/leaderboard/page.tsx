import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getClassLeaderboard } from "@/lib/db";
import CopyCodeBadge from "@/components/CopyCodeBadge";
import { toFaDigits } from "@/lib/constants";

export const metadata = {
  title: "لیدربورد کلاس رقابتی",
};

export default async function LeaderboardPage() {
  const currentUser = await requireUser();

  if (!currentUser.class_code) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 sm:text-[22px]">
            🏆 لیدربورد رقابتی stada
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-[13px]">
            رقابت سالم با دوستان و هم‌کلاسی‌ها بر اساس ساعت مطالعه، صفحات، تست و
            استریک
          </p>
        </div>

        <div className="bt-card flex flex-col items-center justify-center p-10 text-center">
          <div className="mb-3 text-4xl">🏫</div>
          <h2 className="text-lg font-extrabold text-slate-100">
            هنوز عضو هیچ کلاس رقابتی نیستید
          </h2>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-400">
            می‌توانید گروه مطالعاتی یا کلاس مشاوره خودتان را بسازید و کد دعوت ۶
            کاراکتری را برای دوستانتان بفرستید، یا با کد دعوت وارد کلاس شوید.
          </p>
          <Link
            href="/class"
            className="bt-btn-primary mt-5 px-6 py-3 text-sm no-underline"
          >
            👥 ساخت یا پیوستن به کلاس رقابتی
          </Link>
        </div>
      </div>
    );
  }

  const { classInfo, members } = await getClassLeaderboard(
    currentUser.class_code
  );
  const ranked = [...members].sort((a, b) => b.score - a.score);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 sm:text-[22px]">
            🏆 لیدربورد کلاس «{classInfo?.name ?? currentUser.class_code}»
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-[13px]">
            امتیاز رقابتی ترکیبی از ساعت مطالعه، استریک روزانه، صفحات خوانده‌شده
            و تست‌های حل‌شده
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {classInfo && <CopyCodeBadge code={classInfo.code} />}
          <Link
            href="/class"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-300 no-underline transition hover:bg-white/[0.08]"
          >
            👥 مدیریت کلاس
          </Link>
        </div>
      </div>

      {/* Top 3 Podium */}
      {ranked.length >= 3 && (
        <div className="grid grid-cols-3 items-end gap-3 sm:gap-4">
          {[ranked[1], ranked[0], ranked[2]].map((item, idx) => {
            const actualRank = idx === 0 ? 1 : idx === 1 ? 0 : 2;
            const heights = ["min-h-[148px]", "min-h-[178px]", "min-h-[134px]"];
            const colors = ["#94a3b8", "#fbbf24", "#cd7c2f"];
            const color = colors[idx];
            return (
              <div
                key={item.id}
                className={`bt-card flex flex-col items-center justify-center p-4 text-center ${heights[idx]}`}
                style={{ borderColor: `${color}45` }}
              >
                <div className="mb-1.5 text-2xl sm:text-3xl">
                  {medals[actualRank]}
                </div>
                <div className="line-clamp-1 text-xs font-bold text-slate-100 sm:text-sm">
                  {item.name}
                </div>
                <div className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">
                  {item.study_field}
                </div>
                <div
                  className="mt-2 text-lg font-extrabold sm:text-xl"
                  style={{ color }}
                >
                  {toFaDigits(item.score)} امتیاز
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  ⏱️ {toFaDigits(item.study_hours)}س • 📝{" "}
                  {toFaDigits(item.total_tests)} تست
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bt-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-xs text-slate-400">
                <th className="px-4 py-3.5 text-right font-semibold">رتبه</th>
                <th className="px-4 py-3.5 text-right font-semibold">
                  عضو کلاس و رشته
                </th>
                <th className="px-4 py-3.5 text-center font-semibold">
                  امتیاز کل
                </th>
                <th className="px-4 py-3.5 text-center font-semibold">
                  ساعت مطالعه
                </th>
                <th className="px-4 py-3.5 text-center font-semibold">صفحات</th>
                <th className="px-4 py-3.5 text-center font-semibold">تست</th>
                <th className="px-4 py-3.5 text-center font-semibold">
                  میانگین دقت
                </th>
                <th className="px-4 py-3.5 text-center font-semibold">استریک</th>
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
                    <td className="px-4 py-3.5 text-base font-bold">
                      {i < 3 ? medals[i] : toFaDigits(i + 1)}
                    </td>
                    <td className="px-4 py-3.5">
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
                    <td className="px-4 py-3.5 text-center font-extrabold text-[#00ffa3]">
                      {toFaDigits(r.score)}
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-slate-200">
                      {toFaDigits(r.study_hours)} ساعت
                    </td>
                    <td className="px-4 py-3.5 text-center text-[#a78bfa]">
                      {toFaDigits(r.total_pages)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-[#ff6b9d]">
                      {toFaDigits(r.total_tests)}
                    </td>
                    <td
                      className="px-4 py-3.5 text-center font-semibold"
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
                    <td className="px-4 py-3.5 text-center font-semibold text-[#fb923c]">
                      🔥 {toFaDigits(r.streak)}
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
