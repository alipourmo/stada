"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ClipboardPen,
  Flame,
  Hourglass,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Timer,
  Trophy,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { toFaDigits } from "@/lib/constants";

interface NavbarProps {
  firstName: string;
  studyField: string;
  initialStreak: number;
  initialDaysLeft: number;
}

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  matchAlso?: string;
}

const DESKTOP_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "داشبورد", Icon: LayoutDashboard },
  { href: "/log", label: "ثبت گزارش", Icon: ClipboardPen },
  { href: "/planner", label: "برنامه هفتگی", Icon: CalendarDays },
  { href: "/pomodoro", label: "پومودورو", Icon: Timer },
  { href: "/reports", label: "گزارش‌ها", Icon: BarChart3 },
  {
    href: "/leaderboard",
    label: "لیدربورد",
    Icon: Trophy,
    matchAlso: "/class",
  },
];

const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "داشبورد", Icon: LayoutDashboard },
  { href: "/log", label: "ثبت گزارش", Icon: ClipboardPen },
  { href: "/planner", label: "برنامه", Icon: CalendarDays },
  { href: "/pomodoro", label: "پومودورو", Icon: Timer },
  { href: "/reports", label: "گزارش‌ها", Icon: BarChart3 },
  {
    href: "/leaderboard",
    label: "لیدربورد",
    Icon: Trophy,
    matchAlso: "/class",
  },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStreak(initialStreak);
  }, [initialStreak]);

  useEffect(() => {
    setDaysLeft(initialDaysLeft);
  }, [initialDaysLeft]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [menuOpen]);

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
        <div className="mx-auto flex h-[58px] max-w-[1260px] items-center justify-between gap-2 px-3.5 sm:h-[62px] sm:px-6">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 no-underline">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#00ffa3] to-[#00d4ff] text-sm font-black text-[#030712] shadow-lg shadow-[#00ffa3]/15 sm:h-9 sm:w-9 sm:text-base">
              S
            </div>
            <span
              className="text-base leading-none font-black tracking-tight text-[#00ffa3] sm:text-lg"
              dir="ltr"
            >
              stada
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 xl:flex">
            {DESKTOP_NAV_ITEMS.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href) ||
                    (item.matchAlso ? pathname.startsWith(item.matchAlso) : false);
              const Icon = item.Icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] no-underline transition-colors ${
                    active
                      ? "bg-[#00ffa3]/12 font-bold text-[#00ffa3]"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Header Right-in-LTR / Left-in-RTL: ONLY Streak + Countdown + Hamburger Menu */}
          <div
            ref={menuContainerRef}
            className="relative flex items-center gap-1.5 sm:gap-2"
          >
            {/* Streak Badge */}
            <div
              title="روزهای مطالعه پیوسته"
              className="inline-flex items-center gap-1 rounded-full border border-[#ffb347]/30 bg-[#ffb347]/10 px-2.5 py-1 text-[11px] font-bold text-[#ffb347] sm:px-3 sm:text-xs"
            >
              <Flame className="h-3.5 w-3.5 shrink-0" />
              <span>{toFaDigits(streak)} روز</span>
            </div>

            {/* Countdown Badge */}
            <div
              title="روزهای باقی‌مانده تا آزمون هدف"
              className="inline-flex items-center gap-1 rounded-full border border-[#00ffa3]/25 bg-[#00ffa3]/[0.08] px-2.5 py-1 text-[11px] font-bold text-[#00ffa3] sm:px-3 sm:text-xs"
            >
              <Hourglass className="h-3.5 w-3.5 shrink-0" />
              <span>{toFaDigits(daysLeft)} روز</span>
            </div>

            {/* Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="منوی حساب کاربری و تنظیمات"
              aria-expanded={menuOpen}
              className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border transition ${
                menuOpen || pathname.startsWith("/settings")
                  ? "border-[#00ffa3]/40 bg-[#00ffa3]/12 text-[#00ffa3]"
                  : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
              }`}
            >
              {menuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            {/* Hamburger Menu Popover */}
            {menuOpen && (
              <div className="absolute top-[calc(100%+10px)] left-0 z-50 w-72 overflow-hidden rounded-2xl border border-white/12 bg-[#0a0f1e]/98 p-2 shadow-2xl shadow-black/60 backdrop-blur-2xl">
                <div className="mb-1.5 flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00ffa3]/15 text-[#00ffa3]">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-extrabold text-slate-100">
                      {firstName}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-400">
                      {studyField}
                    </div>
                  </div>
                </div>

                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs no-underline transition ${
                    pathname.startsWith("/settings")
                      ? "bg-[#00ffa3]/12 font-bold text-[#00ffa3]"
                      : "text-slate-200 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="h-4 w-4 text-[#00ffa3]" />
                    <div>
                      <div className="font-semibold">پروفایل و تنظیمات</div>
                      <div className="text-[10px] text-slate-400">
                        رشته، دروس، رنگ نمودارها و تاریخ آزمون
                      </div>
                    </div>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-slate-500" />
                </Link>

                <Link
                  href="/class"
                  onClick={() => setMenuOpen(false)}
                  className={`mt-1 flex items-center justify-between rounded-xl px-3 py-2.5 text-xs no-underline transition ${
                    pathname.startsWith("/class")
                      ? "bg-[#00d4ff]/12 font-bold text-[#00d4ff]"
                      : "text-slate-200 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="h-4 w-4 text-[#00d4ff]" />
                    <div>
                      <div className="font-semibold">مدیریت کلاس رقابتی</div>
                      <div className="text-[10px] text-slate-400">
                        ساخت گروه یا عضویت با کد دعوت
                      </div>
                    </div>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-slate-500" />
                </Link>

                <div className="my-1.5 h-px bg-white/[0.08]" />

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-right text-xs font-semibold text-red-400 transition hover:bg-red-500/12"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>
                    {loggingOut ? "در حال خروج از حساب..." : "خروج از حساب"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile / Tablet Bottom Navigation (Includes Leaderboard!) */}
      <nav
        aria-label="ناوبری پایین صفحه"
        className="safe-bottom-nav fixed right-0 bottom-0 left-0 z-40 border-t border-white/[0.08] bg-[#030712]/95 px-1.5 pt-1.5 backdrop-blur-xl xl:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-6 gap-0.5">
          {MOBILE_NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href) ||
                  (item.matchAlso ? pathname.startsWith(item.matchAlso) : false);
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[10px] no-underline transition-colors sm:text-[11px] ${
                  active
                    ? "bg-[#00ffa3]/12 font-bold text-[#00ffa3]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="mt-1 max-w-full truncate px-0.5">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
