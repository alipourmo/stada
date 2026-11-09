"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CopyCodeBadge from "@/components/CopyCodeBadge";
import { toFaDigits } from "@/lib/constants";

interface ClassManagerProps {
  currentClass: {
    code: string;
    name: string;
    memberCount: number;
  } | null;
}

export default function ClassManagerClient({
  currentClass,
}: ClassManagerProps) {
  const router = useRouter();
  const [className, setClassName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setCreatedCode(null);
    setLoading(true);

    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", class_name: className }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "خطا در ساخت کلاس");
      } else {
        setClassName("");
        setCreatedCode(data.classInfo.code);
        setSuccessMsg(
          `کلاس «${data.classInfo.name}» با موفقیت ساخته شد! این کد را به دوستانتان بدهید:`
        );
        router.refresh();
      }
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setCreatedCode(null);
    setLoading(true);

    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", code: joinCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "کد کلاس نامعتبر است");
      } else {
        router.push("/leaderboard");
        router.refresh();
      }
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }

  async function handleLeave() {
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });
      if (res.ok) {
        setCreatedCode(null);
        setSuccessMsg("از کلاس فعلی خارج شدید.");
        router.refresh();
      }
    } catch {
      setError("خطا در خروج از کلاس");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-slate-100 sm:text-[22px]">
          👥 مدیریت کلاس رقابتی
        </h1>
        <p className="mt-1 text-xs text-slate-400 sm:text-[13px]">
          گروه مطالعاتی خودتان را بسازید یا با کد ۶ رقمی به کلاس دوستان بپیوندید
        </p>
      </div>

      {successMsg && (
        <div className="mb-5 rounded-2xl border border-[#00ffa3]/30 bg-[#00ffa3]/10 p-4 text-center text-sm text-[#00ffa3]">
          <div>{successMsg}</div>
          {createdCode && (
            <div className="mt-3 flex justify-center">
              <CopyCodeBadge code={createdCode} />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {currentClass && (
        <div className="bt-card mb-5 flex flex-col justify-between gap-4 border-[#00ffa3]/25 p-5 sm:flex-row sm:items-center">
          <div>
            <div className="text-xs text-slate-400">کلاس فعلی شما</div>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <span className="text-lg font-extrabold text-slate-100">
                {currentClass.name}
              </span>
              <CopyCodeBadge code={currentClass.code} />
              <span className="text-xs text-slate-400">
                ({toFaDigits(currentClass.memberCount)} عضو)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/leaderboard"
              className="bt-btn-primary px-4 py-2 text-xs no-underline"
            >
              🏆 مشاهده لیدربورد
            </Link>
            <button
              type="button"
              onClick={handleLeave}
              disabled={loading}
              className="cursor-pointer rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              خروج از کلاس
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bt-card p-6">
          <div className="mb-4 text-sm font-bold text-slate-200">
            🏫 ساختن کلاس جدید
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                نام کلاس یا گروه مطالعاتی
              </label>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="مثلاً: گروه ارشد زیست ۱۴۰۶"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="bt-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bt-btn-primary w-full py-3 text-sm"
            >
              {loading ? "در حال ساخت..." : "ساختن کلاس و دریافت کد"}
            </button>
          </form>
        </div>

        <div className="bt-card p-6">
          <div className="mb-4 text-sm font-bold text-slate-200">
            🔑 پیوستن با کد کلاس
          </div>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                کد کلاس ۶ کاراکتری
              </label>
              <input
                type="text"
                required
                maxLength={10}
                dir="ltr"
                placeholder="مثلاً: ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="bt-input text-center font-mono tracking-[0.25em] uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bt-btn-primary w-full py-3 text-sm"
            >
              {loading ? "در حال بررسی..." : "پیوستن به کلاس"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
