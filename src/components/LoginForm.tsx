"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { STUDY_FIELD_PRESETS } from "@/lib/constants";

export default function LoginForm({
  initialTab = "login",
}: {
  initialTab?: "login" | "register";
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPresetLabel, setSelectedPresetLabel] = useState(
    STUDY_FIELD_PRESETS[0].label
  );
  const [customFieldName, setCustomFieldName] = useState("");
  const [classMode, setClassMode] = useState<"join" | "create">("join");
  const [classCode, setClassCode] = useState("");
  const [newClassName, setNewClassName] = useState("");

  const isCustomField =
    selectedPresetLabel === "سایر رشته‌ها / آزمون دلخواه";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint =
        tab === "login" ? "/api/auth/login" : "/api/auth/register";
      const studyField =
        isCustomField && customFieldName.trim()
          ? customFieldName.trim()
          : selectedPresetLabel;

      const payload =
        tab === "login"
          ? { email, password }
          : {
              name,
              email,
              password,
              study_field: studyField,
              class_code: classMode === "join" ? classCode : "",
              new_class_name: classMode === "create" ? newClassName : "",
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "خطایی رخ داد. لطفاً دوباره تلاش کنید.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("خطا در برقراری ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-[460px] rounded-[22px] border border-white/[0.08] bg-[#0f172a]/90 p-7 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-9">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00ffa3] to-[#00d4ff] text-2xl font-black text-[#030712] shadow-xl shadow-[#00ffa3]/20">
            S
          </div>
          <h1
            className="text-[28px] font-black tracking-tight text-[#00ffa3]"
            dir="ltr"
          >
            stada
          </h1>
          <p className="mt-1 text-[13px] text-slate-400">
            پلتفرم هوشمند برنامه‌ریزی، گزارش مطالعه و تحلیل کنکور
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-xl bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setError("");
            }}
            className={`flex-1 cursor-pointer rounded-lg py-2.5 text-sm transition ${
              tab === "login"
                ? "bg-[#00ffa3]/12 font-bold text-[#00ffa3]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ورود
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setError("");
            }}
            className={`flex-1 cursor-pointer rounded-lg py-2.5 text-sm transition ${
              tab === "register"
                ? "bg-[#00ffa3]/12 font-bold text-[#00ffa3]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ثبت‌نام
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === "register" && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  نام کامل
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: علی رضایی"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bt-input"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  رشته تحصیلی / آزمون هدف{" "}
                  <span className="text-[10px] text-slate-500">
                    (بعداً در پروفایل قابل تغییر است)
                  </span>
                </label>
                <select
                  value={selectedPresetLabel}
                  onChange={(e) => setSelectedPresetLabel(e.target.value)}
                  className="bt-input bg-[#0f172a]"
                >
                  {STUDY_FIELD_PRESETS.map((p) => (
                    <option
                      key={p.id}
                      value={p.label}
                      className="bg-[#0f172a] text-slate-100"
                    >
                      {p.label}
                    </option>
                  ))}
                </select>
                {isCustomField && (
                  <input
                    type="text"
                    placeholder="نام رشته یا آزمون دلخواه خود را بنویسید..."
                    value={customFieldName}
                    onChange={(e) => setCustomFieldName(e.target.value)}
                    className="bt-input mt-2"
                  />
                )}
              </div>
            </>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              ایمیل
            </label>
            <input
              type="email"
              required
              dir="ltr"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bt-input text-left"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              رمز عبور{" "}
              {tab === "register" && (
                <span className="text-[11px] text-slate-500">
                  (حداقل ۶ کاراکتر)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                minLength={tab === "register" ? 6 : 1}
                dir="ltr"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bt-input pl-10 text-left"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label="نمایش رمز عبور"
                className="absolute top-1/2 left-3 -translate-y-1/2 cursor-pointer text-slate-500 hover:text-slate-300"
              >
                {showPass ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {tab === "register" && (
            <div className="pt-1">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-400">
                  کلاس یا گروه رقابتی{" "}
                  <span className="text-[11px] text-slate-500">(اختیاری)</span>
                </label>
                <div className="flex gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setClassMode("join")}
                    className={`cursor-pointer rounded-md px-2 py-0.5 transition ${
                      classMode === "join"
                        ? "bg-[#00d4ff]/15 text-[#00d4ff]"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    دارم کد کلاس
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassMode("create")}
                    className={`cursor-pointer rounded-md px-2 py-0.5 transition ${
                      classMode === "create"
                        ? "bg-[#00ffa3]/15 text-[#00ffa3]"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    ساخت کلاس جدید
                  </button>
                </div>
              </div>

              {classMode === "join" ? (
                <input
                  type="text"
                  maxLength={10}
                  dir="ltr"
                  placeholder="مثلاً: ABC123"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  className="bt-input text-center font-mono tracking-[0.25em] uppercase"
                />
              ) : (
                <input
                  type="text"
                  maxLength={100}
                  placeholder="نام کلاس جدید (مثلاً: گروه کنکور ۱۴۰۶)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="bt-input"
                />
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bt-btn-primary mt-2 w-full py-3.5 text-[15px]"
          >
            {loading
              ? "در حال پردازش..."
              : tab === "login"
                ? "ورود به stada"
                : "ساخت حساب رایگان"}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-400">
          مشاور یا سرگروه هستید؟{" "}
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setClassMode("create");
              setError("");
            }}
            className="cursor-pointer font-semibold text-[#00ffa3] hover:underline"
          >
            ایجاد کلاس رقابتی جدید
          </button>
        </div>
      </div>
    </div>
  );
}
