"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toFaDigits } from "@/lib/constants";

interface NavbarProps {
  firstName: string;
  studyField: string;
  initialStreak: number;
  initialDaysLeft: number;
}

const DESKTOP_NAV_ITEMS = [
  { href: "/", icon: "📊", label: "داشبورد" },
  { href: "/log", icon: "📝", label: "ثبت گزارش" },
  { href: "/planner", icon: "📅", label: "برنامه هفتگی" },
  { href: "/pomodoro", icon: "⏱️", label: "پومودورو" },
  { href: "/reports", icon: "📈", label: "گزارش‌ها" },
  { href: "/leaderboard", icon: "🏆", label: "رقابت" },
  { href: "/settings", icon: "⚙️", label: "پروفایل و دروس" },
];

const MOBILE_NAV_ITEMS = [
  { href: "/", icon: "📊", label: "داشبورد" },
  { href: "/log", icon: "📝", label: "ثبت گزارش" },
  { href: "/planner", icon: "📅", label: "برنامه" },
  { href: "/pomodoro", icon: "⏱️", label: "پومودورو" },
  { href: "/reports", icon: "📈", label: "گزارش‌ها" },
  { href: "/settings", icon: "⚙️", label: "تنظیمات" },
];

export default function Navbar({
  firstName,
  studyField,
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
    function onMetaUpdate(e: Event) {
      const detail = (e as CustomEvent<{ streak?: number; daysLeft?: number }>)
        .detail;
      if (typeof detail?.streak === "number") {
        setStreak(detail.streak);
      }
      if (typeof detail?.daysLeft === "number") {
        setDaysLeft(detail.daysLeft);
      }
    }
    window.addEventListener("stada:meta", onMetaUpdate);
    return () => window.removeEventListener("stada:meta", onMetaUpdate);
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
        <div className="mx-auto flex h-[62px] max-w-[1260px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00ffa3] to-[#00d4ff] text-base font-black text-[#030712] shadow-lg shadow-[#00ffa3]/15">
              S
            </div>
            <div>
              <div
                className="text-base leading-none font-black tracking-tight text-[#00ffa3]"
                dir="ltr"
              >
                stada
              </div>
              <div className="mt-0.5 max-w-[130px] truncate text-[10px] text-slate-400">
                {studyField}
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {DESKTOP_NAV_ITEMS.map((item) => {
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
                      ? "bg-[#00ffa3]/12 font-bold text-[#00ffa3]"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/leaderboard"
              title="لیدربورد و کلاس رقابتی"
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold no-underline transition xl:hidden ${
                pathname.startsWith("/leaderboard") ||
                pathname.startsWith("/class")
                  ? "border-[#ff6b9d]/40 bg-[#ff6b9d]/15 text-[#ff6b9d]"
                  : "border-white/10 bg-white/[0.04] text-slate-300"
              }`}
            >
              🏆 <span className="hidden sm:inline">رقابت</span>
            </Link>
            <div
              title="روزهای مطالعه پیوسته"
              className="rounded-full border border-[#ffb347]/30 bg-[#ffb347]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ffb347]"
            >
              🔥 {toFaDigits(streak)} روز
            </div>
            <Link
              href="/settings"
              title="روزهای باقی‌مانده تا آزمون هدف (کلیک برای ویرایش)"
              className="rounded-full border border-[#00ffa3]/25 bg-[#00ffa3]/[0.08] px-2.5 py-1 text-[11px] font-semibold text-[#00ffa3] no-underline transition hover:bg-[#00ffa3]/15"
            >
              ⏰ {toFaDigits(daysLeft)} روز
            </Link>
            <Link
              href="/settings"
              className="hidden max-w-[100px] truncate text-xs text-slate-300 no-underline hover:text-[#00ffa3] md:inline"
            >
              {firstName}
            </Link>
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

      {/* Mobile / Tablet Bottom Navigation */}
      <nav
        aria-label="منوی پایین صفحه"
        className="fixed right-0 bottom-0 left-0 z-50 border-t border-white/[0.08] bg-[#030712]/95 px-1.5 py-1.5 backdrop-blur-xl xl:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-6 gap-1">
          {MOBILE_NAV_ITEMS.map((item) => {
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
