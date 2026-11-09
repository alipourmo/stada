export interface SubjectSeed {
  name: string;
  color: string;
  icon: string;
}

export interface StudyFieldPreset {
  id: string;
  label: string;
  subjects: SubjectSeed[];
}

export const SUBJECT_COLOR_PALETTE = [
  "#00ffa3",
  "#00d4ff",
  "#3b82f6",
  "#8b5cf6",
  "#c084fc",
  "#ff6b9d",
  "#f43f5e",
  "#fb923c",
  "#ffb347",
  "#eab308",
  "#84cc16",
  "#14b8a6",
  "#38bdf8",
  "#94a3b8",
];

export const SUBJECT_ICON_PALETTE = [
  "📘",
  "🧬",
  "⚗️",
  "⚡",
  "📐",
  "🔬",
  "📖",
  "🌍",
  "🧠",
  "💻",
  "📊",
  "🎨",
  "⚖️",
  "🕌",
  "🌐",
  "📚",
];

export const STUDY_FIELD_PRESETS: StudyFieldPreset[] = [
  {
    id: "tajrobi",
    label: "کنکور سراسری — علوم تجربی",
    subjects: [
      { name: "زیست‌شناسی", color: "#00ffa3", icon: "🧬" },
      { name: "شیمی", color: "#00d4ff", icon: "⚗️" },
      { name: "فیزیک", color: "#3b82f6", icon: "⚡" },
      { name: "ریاضی", color: "#ffb347", icon: "📐" },
      { name: "زمین‌شناسی", color: "#84cc16", icon: "🌍" },
      { name: "دروس عمومی", color: "#c084fc", icon: "📚" },
    ],
  },
  {
    id: "riazi",
    label: "کنکور سراسری — ریاضی و فیزیک",
    subjects: [
      { name: "حسابان و ریاضیات", color: "#3b82f6", icon: "📐" },
      { name: "هندسه و گسسته", color: "#8b5cf6", icon: "📊" },
      { name: "فیزیک", color: "#00d4ff", icon: "⚡" },
      { name: "شیمی", color: "#00ffa3", icon: "⚗️" },
      { name: "دروس عمومی", color: "#ffb347", icon: "📚" },
    ],
  },
  {
    id: "ensani",
    label: "کنکور سراسری — علوم انسانی",
    subjects: [
      { name: "علوم و فنون ادبی", color: "#ff6b9d", icon: "📖" },
      { name: "ریاضی و آمار", color: "#3b82f6", icon: "📊" },
      { name: "اقتصاد", color: "#00ffa3", icon: "💻" },
      { name: "عربی اختصاصی", color: "#ffb347", icon: "🕌" },
      { name: "تاریخ و جغرافیا", color: "#eab308", icon: "🌍" },
      { name: "جامعه‌شناسی و روان‌شناسی", color: "#00d4ff", icon: "🧠" },
      { name: "فلسفه و منطق", color: "#c084fc", icon: "⚖️" },
    ],
  },
  {
    id: "honar_zaban",
    label: "کنکور سراسری — هنر و زبان",
    subjects: [
      { name: "زبان تخصصی", color: "#00d4ff", icon: "🌐" },
      { name: "درک عمومی هنر", color: "#ff6b9d", icon: "🎨" },
      { name: "خلاقیت تصویری و موسیقی", color: "#ffb347", icon: "📖" },
      { name: "دروس عمومی", color: "#c084fc", icon: "📚" },
    ],
  },
  {
    id: "arshad_bio",
    label: "کارشناسی ارشد — زیست‌شناسی",
    subjects: [
      { name: "زیست سلولی", color: "#00ffa3", icon: "🔬" },
      { name: "زیست مولکولی", color: "#00d4ff", icon: "🧬" },
      { name: "ژنتیک", color: "#ff6b9d", icon: "🧫" },
      { name: "بیوشیمی", color: "#ffb347", icon: "⚗️" },
      { name: "زبان تخصصی", color: "#c084fc", icon: "📖" },
    ],
  },
  {
    id: "arshad_eng",
    label: "کارشناسی ارشد — مهندسی و علوم پایه",
    subjects: [
      { name: "ریاضیات تخصصی", color: "#3b82f6", icon: "📐" },
      { name: "درس تخصصی ۱", color: "#00ffa3", icon: "💻" },
      { name: "درس تخصصی ۲", color: "#00d4ff", icon: "⚡" },
      { name: "درس تخصصی ۳", color: "#ff6b9d", icon: "📊" },
      { name: "زبان تخصصی", color: "#c084fc", icon: "🌐" },
    ],
  },
  {
    id: "custom",
    label: "سایر رشته‌ها / آزمون دلخواه",
    subjects: [
      { name: "درس اول", color: "#00ffa3", icon: "📘" },
      { name: "درس دوم", color: "#00d4ff", icon: "📖" },
      { name: "درس سوم", color: "#ff6b9d", icon: "📊" },
      { name: "درس چهارم", color: "#ffb347", icon: "📚" },
    ],
  },
];

export function getPresetByFieldLabel(fieldLabel: string): StudyFieldPreset {
  const found = STUDY_FIELD_PRESETS.find((p) => p.label === fieldLabel);
  return found ?? STUDY_FIELD_PRESETS[0];
}

export const IRANIAN_WEEKDAYS = [
  { index: 0, full: "شنبه", short: "شنب" },
  { index: 1, full: "یکشنبه", short: "یکش" },
  { index: 2, full: "دوشنبه", short: "دوش" },
  { index: 3, full: "سه‌شنبه", short: "سه‌ش" },
  { index: 4, full: "چهارشنبه", short: "چهار" },
  { index: 5, full: "پنج‌شنبه", short: "پنج" },
  { index: 6, full: "جمعه", short: "جمع" },
];

export const DEFAULT_EXAM_DATE = process.env.EXAM_DATE || "2027-07-01";
export const DEFAULT_TARGET_HOURS = 500;

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

export function fmtSecsCompact(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function fmtSecsPersian(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${toFaDigits(h)} ساعت و ${toFaDigits(m)} دقیقه`;
  if (h > 0) return `${toFaDigits(h)} ساعت`;
  return `${toFaDigits(m)} دقیقه`;
}

export function fmtClockHM(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getTehranToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "2026";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export function shiftDateISO(baseIsoDate: string, daysOffset: number): string {
  const [y, m, d] = baseIsoDate.split("-").map(Number);
  const utc = new Date(
    Date.UTC(y || 2026, (m || 1) - 1, (d || 1) + daysOffset, 12, 0, 0)
  );
  return utc.toISOString().slice(0, 10);
}

export function getIranianDayIndex(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const jsDay = new Date(
    Date.UTC(y || 2026, (m || 1) - 1, d || 1, 12, 0, 0)
  ).getUTCDay();
  // Saturday (6) -> 0, Sunday (0) -> 1, ..., Friday (5) -> 6
  return (jsDay + 1) % 7;
}

export function getIranianWeekStartSaturday(isoDate: string): string {
  const idx = getIranianDayIndex(isoDate);
  return shiftDateISO(isoDate, -idx);
}

export function getDaysLeft(examDateIso?: string | null): number {
  const targetStr = examDateIso || DEFAULT_EXAM_DATE;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetStr)) return 0;
  const todayStr = getTehranToday();
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const [ey, em, ed] = targetStr.split("-").map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const examUtc = Date.UTC(ey, em - 1, ed);
  const diffDays = Math.round((examUtc - todayUtc) / 86_400_000);
  return diffDays > 0 ? diffDays : 0;
}

const WEEKDAYS_SHORT_FA = ["یکش", "دوش", "سه‌ش", "چهار", "پنج", "جمع", "شنب"];

export function getPersianWeekdayShort(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dow = new Date(
    Date.UTC(y || 2026, (m || 1) - 1, d || 1, 12, 0, 0)
  ).getUTCDay();
  return WEEKDAYS_SHORT_FA[dow] ?? isoDate;
}

export function getPersianWeekdayFull(isoDate: string): string {
  const idx = getIranianDayIndex(isoDate);
  return IRANIAN_WEEKDAYS[idx]?.full ?? isoDate;
}

export function formatJalaliDate(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1, 12, 0, 0));
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(dt);
  } catch {
    return isoDate;
  }
}

export function formatJalaliShortDayMonth(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1, 12, 0, 0));
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
    }).format(dt);
  } catch {
    return isoDate;
  }
}

export function formatJalaliTodayFull(): string {
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      timeZone: "Asia/Tehran",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  } catch {
    return getTehranToday();
  }
}

export function calcAccuracy(total: number, wrong: number, blank = 0): number {
  if (total <= 0) return 0;
  const correct = Math.max(0, total - wrong - blank);
  return Math.round((correct / total) * 10000) / 100;
}

export function calcKonkurPercent(
  total: number,
  wrong: number,
  blank = 0
): number {
  if (total <= 0) return 0;
  const correct = Math.max(0, total - wrong - blank);
  const raw = ((correct * 3 - wrong) / (total * 3)) * 100;
  return Math.round(raw * 100) / 100;
}

export function calcCompetitiveScore(
  studySeconds: number,
  streak: number,
  totalTests: number,
  totalPages = 0
): number {
  const studyHours = Math.round((studySeconds / 3600) * 10) / 10;
  return Math.floor(
    studyHours * 10 + streak * 5 + totalTests * 2 + Math.floor(totalPages * 0.5)
  );
}

export function calcMinutesBetween(startTime: string, endTime: string): number {
  const m1 = /^(\d{2}):(\d{2})$/.exec(startTime);
  const m2 = /^(\d{2}):(\d{2})$/.exec(endTime);
  if (!m1 || !m2) return 0;
  const startMins = Number(m1[1]) * 60 + Number(m1[2]);
  const endMins = Number(m2[1]) * 60 + Number(m2[2]);
  return endMins > startMins ? endMins - startMins : 0;
}

export function isValidHexColor(c: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(c.trim());
}
