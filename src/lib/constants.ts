export type SubjectKey =
  | "cell"
  | "molecular"
  | "genetics"
  | "biochem"
  | "lang"
  | "other";

export interface SubjectInfo {
  key: SubjectKey;
  name: string;
  emoji: string;
  color: string;
}

export const SUBJECTS: Record<SubjectKey, SubjectInfo> = {
  cell: {
    key: "cell",
    name: "زیست سلولی",
    emoji: "🔬",
    color: "#00ffa3",
  },
  molecular: {
    key: "molecular",
    name: "زیست مولکولی",
    emoji: "🧬",
    color: "#00d4ff",
  },
  genetics: {
    key: "genetics",
    name: "ژنتیک",
    emoji: "🧫",
    color: "#ff6b9d",
  },
  biochem: {
    key: "biochem",
    name: "بیوشیمی",
    emoji: "⚗️",
    color: "#ffb347",
  },
  lang: {
    key: "lang",
    name: "زبان تخصصی",
    emoji: "📖",
    color: "#c084fc",
  },
  other: {
    key: "other",
    name: "سایر",
    emoji: "📚",
    color: "#94a3b8",
  },
};

export const SUBJECT_LIST: SubjectInfo[] = Object.values(SUBJECTS);

export function isSubjectKey(val: unknown): val is SubjectKey {
  return typeof val === "string" && val in SUBJECTS;
}

export function getSubjectInfo(key: string): SubjectInfo {
  if (isSubjectKey(key)) return SUBJECTS[key];
  return SUBJECTS.other;
}

export const DEFAULT_EXAM_DATE = process.env.EXAM_DATE || "2027-05-06";
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
  const utc = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + daysOffset, 12, 0, 0));
  return utc.toISOString().slice(0, 10);
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

const WEEKDAYS_SHORT_FA = ["یکش", "دوش", "سه", "چهار", "پنج", "جمع", "شنب"];

export function getPersianWeekdayShort(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0)).getUTCDay();
  return WEEKDAYS_SHORT_FA[dow] ?? isoDate;
}

export function formatJalaliDate(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
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

export function calcKonkurPercent(total: number, wrong: number, blank = 0): number {
  if (total <= 0) return 0;
  const correct = Math.max(0, total - wrong - blank);
  const raw = ((correct * 3 - wrong) / (total * 3)) * 100;
  return Math.round(raw * 100) / 100;
}

export function calcCompetitiveScore(
  studySeconds: number,
  streak: number,
  totalTests: number
): number {
  const studyHours = Math.round((studySeconds / 3600) * 10) / 10;
  return Math.floor(studyHours * 10 + streak * 5 + totalTests * 2);
}
