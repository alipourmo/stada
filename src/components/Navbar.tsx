"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toFaDigits } from "@/lib/constants";

interface NavbarProps {
  firstName: string;
  initialStreak: number;
  initialDaysLeft: number;
}

const NAV_ITEMS = [
  { href: "/", icon: "📊", label: "داشبورد" },
  { href: "/pomodoro", icon: "⏱️", label: "پومودورو" },
  { href: "/tests", icon: "📝", label: "ثبت تست" },
  { href: "/leaderboard", icon: "🏆", label: "لیدربورد" },
  { href: "/reports", icon: "📈", label: "گزارش" },
  { href: "/class", icon: "👥", label: "کلاس" },
];

export default function Navbar({
  firstName,
  initialStreak,
  initialDaysLeft,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [streak, setStreak] = useState(initialStreak);
  const [daysLeft, setDaysLeft] = useState(initialDaysLeft);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setStreak(initialStreak);
  }, [initialStreak]);

  useEffect(() => {
    setDaysLeft(initialDaysLeft);
  }, [initialDaysLeft]);

  useEffect(() => {
    function onStreakUpdate(e: Event) {
      const detail = (e as CustomEvent<{ streak?: number; daysLeft?: number }>)
        .detail;
      if (typeof detail?.streak === "number") {
        setStreak(detail.streak);
      }
      if (typeof detail?.daysLeft === "number") {
        setDaysLeft(detail.daysLeft);
      }
    }
    window.addEventListener("biotrack:meta", onStreakUpdate);
    return () => window.removeEventListener("biotrack:meta", onStreakUpdate);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      window.location.href = "/api/auth/logout";
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#030712]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <span className="text-2xl leading-none">🧬</span>
            <div>
              <div className="text-[15px] font-extrabold tracking-tight text-[#00ffa3]">
                BioTrack
              </div>
              <div className="text-[10px] text-slate-500">کنکور زیست</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
                    active
                      ? "bg-[#00ffa3]/12 font-semibold text-[#00ffa3]"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div
              title="روزهای مطالعه پیوسته"
              className="rounded-full border border-[#ffb347]/30 bg-[#ffb347]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ffb347] sm:text-xs"
            >
              🔥 {toFaDigits(streak)} روز
            </div>
            <div
              title="روزهای باقی‌مانده تا آزمون هدف"
              className="rounded-full border border-[#00ffa3]/25 bg-[#00ffa3]/[0.08] px-2.5 py-1 text-[11px] font-semibold text-[#00ffa3] sm:text-xs"
            >
              ⏰ {toFaDigits(daysLeft)} روز
            </div>
            <span className="hidden max-w-[110px] truncate text-xs text-slate-300 sm:inline">
              {firstName}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="cursor-pointer rounded-md bg-white/[0.05] px-2.5 py-1 text-xs text-slate-400 transition-colors hover:bg-red-500/15 hover:text-red-400"
            >
              {loggingOut ? "..." : "خروج"}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="منوی موبایل"
        className="fixed right-0 bottom-0 left-0 z-50 border-t border-white/[0.08] bg-[#030712]/95 px-1.5 py-1.5 backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[10px] transition-colors ${
                  active
                    ? "bg-[#00ffa3]/12 font-bold text-[#00ffa3]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span className="mt-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
