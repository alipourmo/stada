"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Palette,
  Pencil,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import {
  formatJalaliDate,
  STUDY_FIELD_PRESETS,
  SUBJECT_COLOR_PALETTE,
  SUBJECT_ICON_PALETTE,
  toFaDigits,
} from "@/lib/constants";
import type { StadaSubject } from "@/lib/db";
import SubjectIcon, { SUBJECT_ICON_LABELS } from "./SubjectIcon";

interface SettingsClientProps {
  user: {
    name: string;
    email: string;
    study_field: string;
    target_exam_date: string;
    target_hours: number;
  };
  initialSubjects: StadaSubject[];
}

export default function SettingsClient({
  user,
  initialSubjects,
}: SettingsClientProps) {
  const router = useRouter();

  const [name, setName] = useState(user.name);
  const matchingPreset = STUDY_FIELD_PRESETS.find(
    (p) => p.label === user.study_field
  );
  const [presetId, setPresetId] = useState(
    matchingPreset ? matchingPreset.id : "custom"
  );
  const [customField, setCustomField] = useState(
    matchingPreset ? "" : user.study_field
  );
  const [examDate, setExamDate] = useState(user.target_exam_date);
  const [targetHours, setTargetHours] = useState(String(user.target_hours));
  const [savingProfile, setSavingProfile] = useState(false);

  const [subjects, setSubjects] = useState<StadaSubject[]>(initialSubjects);
  const [newSubName, setNewSubName] = useState("");
  const [newSubColor, setNewSubColor] = useState(SUBJECT_COLOR_PALETTE[0]);
  const [newSubIcon, setNewSubIcon] = useState("book");
  const [addingSub, setAddingSub] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#00ffa3");
  const [editIcon, setEditIcon] = useState("book");

  const [toast, setToast] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  function notify(type: "ok" | "err", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const preset = STUDY_FIELD_PRESETS.find((p) => p.id === presetId);
      const finalField =
        presetId === "custom"
          ? customField.trim() || "آزمون سفارشی"
          : preset?.label || user.study_field;

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          study_field: finalField,
          target_exam_date: examDate || null,
          target_hours: Number(targetHours),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify("err", data.error || "خطا در ذخیره پروفایل");
      } else {
        notify("ok", "تنظیمات پروفایل و آزمون هدف با موفقیت ذخیره شد");
        router.refresh();
      }
    } catch {
      notify("err", "خطا در ارتباط با سرور");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAddSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubName.trim()) return;
    setAddingSub(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSubName.trim(),
          color: newSubColor,
          icon: newSubIcon,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify("err", data.error || "خطا در افزودن درس");
      } else {
        setSubjects((prev) => [...prev, data.subject]);
        setNewSubName("");
        const nextColor =
          SUBJECT_COLOR_PALETTE[
            (subjects.length + 1) % SUBJECT_COLOR_PALETTE.length
          ];
        setNewSubColor(nextColor);
        notify("ok", `درس «${data.subject.name}» اضافه شد`);
        router.refresh();
      }
    } catch {
      notify("err", "خطا در ارتباط با سرور");
    } finally {
      setAddingSub(false);
    }
  }

  function startEditing(s: StadaSubject) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditColor(s.color);
    setEditIcon(
      SUBJECT_ICON_PALETTE.includes(s.icon) ? s.icon : "book"
    );
  }

  async function saveEditSubject(id: number) {
    try {
      const res = await fetch(`/api/subjects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          color: editColor,
          icon: editIcon,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify("err", data.error || "خطا در ویرایش درس");
      } else {
        setSubjects((prev) =>
          prev.map((item) => (item.id === id ? data.subject : item))
        );
        setEditingId(null);
        notify(
          "ok",
          `درس «${data.subject.name}» و رنگ آن در تمام نمودارها بروزرسانی شد`
        );
        router.refresh();
      }
    } catch {
      notify("err", "خطا در ارتباط با سرور");
    }
  }

  async function handleDeleteSubject(s: StadaSubject) {
    if (subjects.length <= 1) {
      notify("err", "حداقل یک درس باید در لیست شما باقی بماند");
      return;
    }
    try {
      const res = await fetch(`/api/subjects/${s.id}`, { method: "DELETE" });
      if (res.ok) {
        setSubjects((prev) => prev.filter((item) => item.id !== s.id));
        notify("ok", `درس «${s.name}» حذف شد`);
        router.refresh();
      }
    } catch {
      notify("err", "خطا در حذف درس");
    }
  }

  async function handleLoadPreset(replaceExisting: boolean) {
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply_preset",
          preset_id: presetId,
          replace_existing: replaceExisting,
        }),
      });
      const data = await res.json();
      if (res.ok && data.subjects) {
        setSubjects(data.subjects);
        notify("ok", "دروس پیشنهادی رشته بارگذاری شدند");
        router.refresh();
      }
    } catch {
      notify("err", "خطا در بارگذاری دروس پیشنهادی");
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-100 sm:text-[22px]">
          <Settings className="h-5 w-5 text-[#00ffa3]" />
          <span>پروفایل، رشته تحصیلی و مدیریت دروس</span>
        </h1>
        <p className="mt-1 text-xs text-slate-400 sm:text-[13px]">
          رشته تحصیلی، تاریخ آزمون هدف و دروس اختصاصی خود را به همراه رنگ دلخواه
          هر درس در نمودارها تنظیم کنید
        </p>
      </div>

      {toast && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-medium ${
            toast.type === "ok"
              ? "border-[#00ffa3]/30 bg-[#00ffa3]/10 text-[#00ffa3]"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {toast.type === "ok" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{toast.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Profile & Exam Config (5 cols) */}
        <div className="bt-card p-4 sm:p-6 lg:col-span-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-100">
              <UserCheck className="h-4 w-4 text-[#00ffa3]" />
              <span>مشخصات فردی و آزمون هدف</span>
            </h2>
            <span className="text-[11px] text-slate-500" dir="ltr">
              {user.email}
            </span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                نام و نام خانوادگی
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bt-input"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                مقطع و رشته تحصیلی
              </label>
              <select
                value={presetId}
                onChange={(e) => setPresetId(e.target.value)}
                className="bt-input bg-[#0f172a]"
              >
                {STUDY_FIELD_PRESETS.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    className="bg-[#0f172a] text-slate-100"
                  >
                    {p.label}
                  </option>
                ))}
              </select>

              {presetId === "custom" && (
                <input
                  type="text"
                  required
                  placeholder="عنوان رشته یا آزمون خود را وارد کنید"
                  value={customField}
                  onChange={(e) => setCustomField(e.target.value)}
                  className="bt-input mt-2.5"
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  تاریخ آزمون هدف
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="bt-input text-xs"
                  dir="ltr"
                />
                {examDate && (
                  <div className="mt-1 text-[11px] text-[#00ffa3]">
                    معادل شمسی: {formatJalaliDate(examDate)}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  هدف کل ساعت مطالعه
                </label>
                <input
                  type="number"
                  min={10}
                  max={5000}
                  required
                  dir="ltr"
                  value={targetHours}
                  onChange={(e) => setTargetHours(e.target.value)}
                  className="bt-input text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="bt-btn-primary w-full py-3 text-sm"
            >
              {savingProfile ? "در حال ذخیره..." : "ذخیره مشخصات و آزمون هدف"}
            </button>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-[#00d4ff]" />
                <span>بارگذاری سریع دروس رشته انتخابی</span>
              </div>
              <p className="mb-3 text-[11px] leading-relaxed text-slate-400">
                می‌توانید دروس استاندارد رشته انتخاب‌شده را به لیست دروس خود
                اضافه یا جایگزین کنید:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleLoadPreset(false)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-3 py-1.5 text-xs font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>افزودن دروس این رشته</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset(true)}
                  className="cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.08]"
                >
                  جایگزینی کامل لیست دروس
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Subjects & Colors Manager (7 cols) */}
        <div className="bt-card p-4 sm:p-6 lg:col-span-7">
          <div className="mb-4">
            <h2 className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-100">
              <Palette className="h-4 w-4 text-[#00d4ff]" />
              <span>
                دروس من و رنگ اختصاصی در نمودارها ({toFaDigits(subjects.length)}
                )
              </span>
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">
              رنگ هر درس مستقیماً در نمودارهای گزارش، برنامه هفتگی و تایمر
              پومودورو نمایش داده می‌شود
            </p>
          </div>

          {/* Add New Subject Form */}
          <form
            onSubmit={handleAddSubject}
            className="mb-5 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4"
          >
            <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#00ffa3]">
              <Plus className="h-4 w-4" />
              <span>تعریف درس جدید</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <label className="mb-1 block text-[11px] text-slate-400">
                  نام درس
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="مثلاً: فیزیک پایه، حسابان، شیمی..."
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="bt-input text-xs"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="mb-1 block text-[11px] text-slate-400">
                  آیکون درس
                </label>
                <select
                  value={newSubIcon}
                  onChange={(e) => setNewSubIcon(e.target.value)}
                  className="bt-input bg-[#0f172a] text-xs"
                >
                  {SUBJECT_ICON_PALETTE.map((ic) => (
                    <option key={ic} value={ic} className="bg-[#0f172a]">
                      {SUBJECT_ICON_LABELS[ic] || ic}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="mb-1 block text-[11px] text-slate-400">
                  رنگ دلخواه
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newSubColor}
                    onChange={(e) => setNewSubColor(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded-lg border border-white/15 bg-transparent p-0.5"
                  />
                  <span
                    className="font-mono text-[11px] text-slate-300"
                    dir="ltr"
                  >
                    {newSubColor}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {SUBJECT_COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewSubColor(c)}
                    className={`h-5 w-5 cursor-pointer rounded-full transition-transform ${
                      newSubColor.toLowerCase() === c.toLowerCase()
                        ? "scale-125 ring-2 ring-white"
                        : "opacity-80 hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={addingSub}
                className="bt-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs"
              >
                <Plus className="h-4 w-4" />
                <span>{addingSub ? "افزودن..." : "افزودن درس"}</span>
              </button>
            </div>
          </form>

          {/* Subjects List */}
          <div className="max-h-[420px] space-y-2.5 overflow-y-auto pl-1">
            {subjects.map((s) => {
              const isEditing = editingId === s.id;
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white/[0.02] px-3.5 py-3 transition"
                  style={{ borderColor: `${s.color}35` }}
                >
                  {isEditing ? (
                    <div className="flex w-full flex-wrap items-center gap-2">
                      <select
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        className="rounded-lg border border-white/15 bg-[#0f172a] px-2 py-1.5 text-xs text-slate-200"
                      >
                        {SUBJECT_ICON_PALETTE.map((ic) => (
                          <option key={ic} value={ic}>
                            {SUBJECT_ICON_LABELS[ic] || ic}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bt-input min-w-[130px] flex-1 py-1.5 text-xs"
                      />

                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded-md border border-white/15 bg-transparent p-0.5"
                      />

                      <div className="flex items-center gap-1">
                        {SUBJECT_COLOR_PALETTE.slice(0, 7).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            className="h-4 w-4 cursor-pointer rounded-full"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => saveEditSubject(s.id)}
                          className="cursor-pointer rounded-lg bg-[#00ffa3]/20 p-1.5 text-[#00ffa3] hover:bg-[#00ffa3]/30"
                          title="ذخیره"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="cursor-pointer rounded-lg bg-white/10 p-1.5 text-slate-300 hover:bg-white/20"
                          title="انصراف"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: `${s.color}20`,
                            color: s.color,
                          }}
                        >
                          <SubjectIcon icon={s.icon} className="h-4 w-4" />
                        </span>
                        <span className="truncate text-sm font-bold text-slate-100">
                          {s.name}
                        </span>
                        <span
                          className="hidden rounded-md px-2 py-0.5 font-mono text-[10px] sm:inline"
                          style={{
                            backgroundColor: `${s.color}18`,
                            color: s.color,
                          }}
                          dir="ltr"
                        >
                          {s.color}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEditing(s)}
                          title="ویرایش نام و رنگ"
                          className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubject(s)}
                          title="حذف درس"
                          className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/15 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
