import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import {
  calcAccuracy,
  calcCompetitiveScore,
  calcKonkurPercent,
  calcMinutesBetween,
  DEFAULT_TARGET_HOURS,
  getIranianDayIndex,
  getPresetByFieldLabel,
  getTehranToday,
  isValidHexColor,
  shiftDateISO,
  STUDY_FIELD_PRESETS,
} from "./constants";

export interface StadaUser {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  study_field: string;
  class_code: string | null;
  streak: number;
  last_study_date: string | null;
  target_exam_date: string | null;
  target_hours: number;
  created_at: string;
}

export interface StadaSubject {
  id: number;
  user_id: number;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
}

export interface StadaStudyLog {
  id: number;
  user_id: number;
  subject_id: number | null;
  subject_name: string;
  subject_color: string;
  subject_icon: string;
  log_date: string;
  duration_seconds: number;
  topic: string | null;
  source_book: string | null;
  page_from: number | null;
  page_to: number | null;
  pages_count: number;
  tests_total: number;
  tests_wrong: number | null;
  tests_blank: number | null;
  test_accuracy: number | null;
  konkur_score: number | null;
  note: string | null;
  created_at: string;
}

export interface StadaWeeklyPlan {
  id: number;
  user_id: number;
  subject_id: number | null;
  subject_name: string;
  subject_color: string;
  subject_icon: string;
  plan_date: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  planned_minutes: number;
  topic: string;
  source_note: string | null;
  is_completed: boolean;
  created_at: string;
}

export interface StadaClass {
  id: number;
  code: string;
  name: string;
  created_by: number | null;
  created_at: string;
}

export interface LeaderboardMember {
  id: number;
  name: string;
  study_field: string;
  streak: number;
  study_seconds: number;
  study_hours: number;
  total_tests: number;
  total_pages: number;
  avg_accuracy: number;
  score: number;
}

// ── Supabase singleton ─────────────────────────────────────────
let supabaseAdmin: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function getStorageMode(): "supabase" | "local" {
  return isSupabaseConfigured() ? "supabase" : "local";
}

function getSupabase(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  supabaseAdmin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseAdmin;
}

// ── Row Normalizers ────────────────────────────────────────────
function mapUser(row: Record<string, unknown>): StadaUser {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    password_hash: String(row.password_hash ?? ""),
    study_field: String(row.study_field || "کنکور سراسری — علوم تجربی"),
    class_code: row.class_code ? String(row.class_code) : null,
    streak: Number(row.streak ?? 0),
    last_study_date: row.last_study_date ? String(row.last_study_date) : null,
    target_exam_date: row.target_exam_date
      ? String(row.target_exam_date)
      : null,
    target_hours: Number(row.target_hours ?? DEFAULT_TARGET_HOURS),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapSubject(row: Record<string, unknown>): StadaSubject {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    name: String(row.name ?? ""),
    color: String(row.color ?? "#00ffa3"),
    icon: String(row.icon ?? "📘"),
    sort_order: Number(row.sort_order ?? 0),
    is_archived: Boolean(row.is_archived ?? false),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapLog(row: Record<string, unknown>): StadaStudyLog {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    subject_id:
      row.subject_id !== null && row.subject_id !== undefined
        ? Number(row.subject_id)
        : null,
    subject_name: String(row.subject_name ?? "عمومی"),
    subject_color: String(row.subject_color ?? "#00ffa3"),
    subject_icon: String(row.subject_icon ?? "📘"),
    log_date: String(row.log_date ?? ""),
    duration_seconds: Number(row.duration_seconds ?? 0),
    topic: row.topic ? String(row.topic) : null,
    source_book: row.source_book ? String(row.source_book) : null,
    page_from:
      row.page_from !== null && row.page_from !== undefined
        ? Number(row.page_from)
        : null,
    page_to:
      row.page_to !== null && row.page_to !== undefined
        ? Number(row.page_to)
        : null,
    pages_count: Number(row.pages_count ?? 0),
    tests_total: Number(row.tests_total ?? 0),
    tests_wrong:
      row.tests_wrong !== null && row.tests_wrong !== undefined
        ? Number(row.tests_wrong)
        : null,
    tests_blank:
      row.tests_blank !== null && row.tests_blank !== undefined
        ? Number(row.tests_blank)
        : null,
    test_accuracy:
      row.test_accuracy !== null && row.test_accuracy !== undefined
        ? Number(row.test_accuracy)
        : null,
    konkur_score:
      row.konkur_score !== null && row.konkur_score !== undefined
        ? Number(row.konkur_score)
        : null,
    note: row.note ? String(row.note) : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapPlan(row: Record<string, unknown>): StadaWeeklyPlan {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    subject_id:
      row.subject_id !== null && row.subject_id !== undefined
        ? Number(row.subject_id)
        : null,
    subject_name: String(row.subject_name ?? ""),
    subject_color: String(row.subject_color ?? "#00ffa3"),
    subject_icon: String(row.subject_icon ?? "📘"),
    plan_date: String(row.plan_date ?? ""),
    day_of_week: Number(row.day_of_week ?? 0),
    start_time: String(row.start_time ?? "09:00"),
    end_time: String(row.end_time ?? "11:00"),
    planned_minutes: Number(row.planned_minutes ?? 60),
    topic: String(row.topic ?? ""),
    source_note: row.source_note ? String(row.source_note) : null,
    is_completed: Boolean(row.is_completed ?? false),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapClass(row: Record<string, unknown>): StadaClass {
  return {
    id: Number(row.id),
    code: String(row.code ?? ""),
    name: String(row.name ?? ""),
    created_by:
      row.created_by !== null && row.created_by !== undefined
        ? Number(row.created_by)
        : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

// ── Local Dev File Store (used ONLY when SUPABASE_URL is unset) ─
interface LocalDbData {
  seq: {
    users: number;
    classes: number;
    subjects: number;
    logs: number;
    plans: number;
  };
  users: StadaUser[];
  classes: StadaClass[];
  subjects: StadaSubject[];
  logs: StadaStudyLog[];
  plans: StadaWeeklyPlan[];
}

const LOCAL_DB_PATH = path.join(process.cwd(), ".cache", "stada-dev.json");

function readLocalDb(): LocalDbData {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const raw = fs.readFileSync(LOCAL_DB_PATH, "utf8");
      const parsed = JSON.parse(raw) as Partial<LocalDbData>;
      return {
        seq: {
          users: parsed.seq?.users ?? 0,
          classes: parsed.seq?.classes ?? 0,
          subjects: parsed.seq?.subjects ?? 0,
          logs: parsed.seq?.logs ?? 0,
          plans: parsed.seq?.plans ?? 0,
        },
        users: parsed.users ?? [],
        classes: parsed.classes ?? [],
        subjects: parsed.subjects ?? [],
        logs: parsed.logs ?? [],
        plans: parsed.plans ?? [],
      };
    }
  } catch {
    // ignore corrupt dev cache
  }
  return {
    seq: { users: 0, classes: 0, subjects: 0, logs: 0, plans: 0 },
    users: [],
    classes: [],
    subjects: [],
    logs: [],
    plans: [],
  };
}

function writeLocalDb(data: LocalDbData): void {
  const dir = path.dirname(LOCAL_DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

function generateClassCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function computeEffectiveStreak(
  streak: number,
  lastStudyDate: string | null
): number {
  if (!lastStudyDate || streak <= 0) return 0;
  const today = getTehranToday();
  const yesterday = shiftDateISO(today, -1);
  if (lastStudyDate === today || lastStudyDate === yesterday) {
    return streak;
  }
  return 0;
}

// ── User & Auth ────────────────────────────────────────────────

export async function findUserByEmail(
  email: string
): Promise<StadaUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    return db.users.find((u) => u.email.toLowerCase() === normalized) ?? null;
  }
  const { data, error } = await getSupabase()
    .from("bt_users")
    .select("*")
    .ilike("email", normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapUser(data) : null;
}

export async function findUserById(id: number): Promise<StadaUser | null> {
  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    return db.users.find((u) => u.id === id) ?? null;
  }
  const { data, error } = await getSupabase()
    .from("bt_users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapUser(data) : null;
}

export async function ensureFreshUserStreak(
  user: StadaUser
): Promise<StadaUser> {
  const effective = computeEffectiveStreak(user.streak, user.last_study_date);
  if (effective === user.streak) return user;

  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const u = db.users.find((x) => x.id === user.id);
    if (u) {
      u.streak = 0;
      writeLocalDb(db);
    }
    return { ...user, streak: 0 };
  }

  await getSupabase()
    .from("bt_users")
    .update({ streak: 0 })
    .eq("id", user.id);
  return { ...user, streak: 0 };
}

export async function createUser(params: {
  name: string;
  email: string;
  passwordHash: string;
  studyField: string;
  classCode: string | null;
}): Promise<StadaUser> {
  const email = params.email.trim().toLowerCase();
  const name = params.name.trim();
  const studyField =
    params.studyField.trim() || "کنکور سراسری — علوم تجربی";
  const classCode = params.classCode
    ? params.classCode.trim().toUpperCase()
    : null;

  const preset = getPresetByFieldLabel(studyField);

  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const id = ++db.seq.users;
    const newUser: StadaUser = {
      id,
      name,
      email,
      password_hash: params.passwordHash,
      study_field: studyField,
      class_code: classCode,
      streak: 0,
      last_study_date: null,
      target_exam_date: null,
      target_hours: DEFAULT_TARGET_HOURS,
      created_at: new Date().toISOString(),
    };
    db.users.push(newUser);

    preset.subjects.forEach((s, idx) => {
      db.subjects.push({
        id: ++db.seq.subjects,
        user_id: id,
        name: s.name,
        color: s.color,
        icon: s.icon,
        sort_order: idx,
        is_archived: false,
        created_at: new Date().toISOString(),
      });
    });

    writeLocalDb(db);
    return newUser;
  }

  const sb = getSupabase();
  const { data, error } = await sb
    .from("bt_users")
    .insert({
      name,
      email,
      password_hash: params.passwordHash,
      study_field: studyField,
      class_code: classCode,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const createdUser = mapUser(data);

  if (preset.subjects.length > 0) {
    await sb.from("bt_subjects").insert(
      preset.subjects.map((s, idx) => ({
        user_id: createdUser.id,
        name: s.name,
        color: s.color,
        icon: s.icon,
        sort_order: idx,
      }))
    );
  }

  return createdUser;
}

export async function updateUserProfile(
  userId: number,
  params: {
    name?: string;
    studyField?: string;
    targetExamDate?: string | null;
    targetHours?: number;
  }
): Promise<StadaUser> {
  const current = await findUserById(userId);
  if (!current) throw new Error("کاربر یافت نشد");

  const nextName = params.name?.trim() ? params.name.trim() : current.name;
  const nextField = params.studyField?.trim()
    ? params.studyField.trim()
    : current.study_field;
  const nextHours =
    typeof params.targetHours === "number" && Number.isFinite(params.targetHours)
      ? Math.min(5000, Math.max(10, Math.round(params.targetHours)))
      : current.target_hours;
  const nextExamDate =
    params.targetExamDate === undefined
      ? current.target_exam_date
      : params.targetExamDate && /^\d{4}-\d{2}-\d{2}$/.test(params.targetExamDate)
        ? params.targetExamDate
        : null;

  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const u = db.users.find((x) => x.id === userId);
    if (!u) throw new Error("کاربر یافت نشد");
    u.name = nextName;
    u.study_field = nextField;
    u.target_exam_date = nextExamDate;
    u.target_hours = nextHours;
    writeLocalDb(db);
    return u;
  }

  const { data, error } = await getSupabase()
    .from("bt_users")
    .update({
      name: nextName,
      study_field: nextField,
      target_exam_date: nextExamDate,
      target_hours: nextHours,
    })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapUser(data);
}

// ── Custom Subjects (bt_subjects) ──────────────────────────────

export async function getUserSubjects(userId: number): Promise<StadaSubject[]> {
  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    let list = db.subjects
      .filter((s) => s.user_id === userId && !s.is_archived)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

    if (list.length === 0) {
      const user = db.users.find((u) => u.id === userId);
      const preset = getPresetByFieldLabel(user?.study_field ?? "");
      preset.subjects.forEach((s, idx) => {
        db.subjects.push({
          id: ++db.seq.subjects,
          user_id: userId,
          name: s.name,
          color: s.color,
          icon: s.icon,
          sort_order: idx,
          is_archived: false,
          created_at: new Date().toISOString(),
        });
      });
      writeLocalDb(db);
      list = db.subjects
        .filter((s) => s.user_id === userId && !s.is_archived)
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    }
    return list;
  }

  const sb = getSupabase();
  const { data, error } = await sb
    .from("bt_subjects")
    .select("*")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    const user = await findUserById(userId);
    const preset = getPresetByFieldLabel(user?.study_field ?? "");
    const { data: seeded, error: seedErr } = await sb
      .from("bt_subjects")
      .insert(
        preset.subjects.map((s, idx) => ({
          user_id: userId,
          name: s.name,
          color: s.color,
          icon: s.icon,
          sort_order: idx,
        }))
      )
      .select("*");
    if (seedErr) throw new Error(seedErr.message);
    return (seeded ?? []).map((r) => mapSubject(r));
  }

  return data.map((r) => mapSubject(r));
}

export async function createSubject(
  userId: number,
  params: { name: string; color: string; icon?: string }
): Promise<StadaSubject> {
  const name = params.name.trim().slice(0, 100);
  const color = isValidHexColor(params.color) ? params.color.trim() : "#00ffa3";
  const icon = params.icon?.trim() ? params.icon.trim().slice(0, 12) : "📘";

  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const maxOrder = db.subjects
      .filter((s) => s.user_id === userId)
      .reduce((m, s) => Math.max(m, s.sort_order), -1);
    const created: StadaSubject = {
      id: ++db.seq.subjects,
      user_id: userId,
      name,
      color,
      icon,
      sort_order: maxOrder + 1,
      is_archived: false,
      created_at: new Date().toISOString(),
    };
    db.subjects.push(created);
    writeLocalDb(db);
    return created;
  }

  const existing = await getUserSubjects(userId);
  const nextOrder =
    existing.reduce((m, s) => Math.max(m, s.sort_order), -1) + 1;

  const { data, error } = await getSupabase()
    .from("bt_subjects")
    .insert({
      user_id: userId,
      name,
      color,
      icon,
      sort_order: nextOrder,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapSubject(data);
}

export async function updateSubject(
  userId: number,
  subjectId: number,
  params: { name?: string; color?: string; icon?: string }
): Promise<StadaSubject | null> {
  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const s = db.subjects.find(
      (x) => x.id === subjectId && x.user_id === userId
    );
    if (!s) return null;
    if (params.name?.trim()) s.name = params.name.trim().slice(0, 100);
    if (params.color && isValidHexColor(params.color))
      s.color = params.color.trim();
    if (params.icon?.trim()) s.icon = params.icon.trim().slice(0, 12);

    // Sync color/name/icon across user logs & weekly plans
    for (const log of db.logs) {
      if (log.user_id === userId && log.subject_id === subjectId) {
        log.subject_name = s.name;
        log.subject_color = s.color;
        log.subject_icon = s.icon;
      }
    }
    for (const plan of db.plans) {
      if (plan.user_id === userId && plan.subject_id === subjectId) {
        plan.subject_name = s.name;
        plan.subject_color = s.color;
        plan.subject_icon = s.icon;
      }
    }
    writeLocalDb(db);
    return s;
  }

  const sb = getSupabase();
  const patch: Record<string, unknown> = {};
  if (params.name?.trim()) patch.name = params.name.trim().slice(0, 100);
  if (params.color && isValidHexColor(params.color))
    patch.color = params.color.trim();
  if (params.icon?.trim()) patch.icon = params.icon.trim().slice(0, 12);

  const { data, error } = await sb
    .from("bt_subjects")
    .update(patch)
    .eq("id", subjectId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const updated = mapSubject(data);

  // Sync logs and weekly plans with updated subject visual identity
  await Promise.all([
    sb
      .from("bt_study_logs")
      .update({
        subject_name: updated.name,
        subject_color: updated.color,
        subject_icon: updated.icon,
      })
      .eq("user_id", userId)
      .eq("subject_id", subjectId),
    sb
      .from("bt_weekly_plans")
      .update({
        subject_name: updated.name,
        subject_color: updated.color,
        subject_icon: updated.icon,
      })
      .eq("user_id", userId)
      .eq("subject_id", subjectId),
  ]);

  return updated;
}

export async function deleteSubject(
  userId: number,
  subjectId: number
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const idx = db.subjects.findIndex(
      (s) => s.id === subjectId && s.user_id === userId
    );
    if (idx === -1) return false;
    db.subjects.splice(idx, 1);
    writeLocalDb(db);
    return true;
  }

  const { error } = await getSupabase()
    .from("bt_subjects")
    .delete()
    .eq("id", subjectId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return true;
}

export async function applyPresetSubjectsForUser(
  userId: number,
  presetId: string,
  replaceExisting = false
): Promise<StadaSubject[]> {
  const preset =
    STUDY_FIELD_PRESETS.find((p) => p.id === presetId) ??
    STUDY_FIELD_PRESETS[0];

  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    if (replaceExisting) {
      db.subjects = db.subjects.filter((s) => s.user_id !== userId);
    }
    const existingNames = new Set(
      db.subjects
        .filter((s) => s.user_id === userId && !s.is_archived)
        .map((s) => s.name)
    );
    let nextOrder = db.subjects
      .filter((s) => s.user_id === userId)
      .reduce((m, s) => Math.max(m, s.sort_order), -1);

    for (const s of preset.subjects) {
      if (!existingNames.has(s.name)) {
        db.subjects.push({
          id: ++db.seq.subjects,
          user_id: userId,
          name: s.name,
          color: s.color,
          icon: s.icon,
          sort_order: ++nextOrder,
          is_archived: false,
          created_at: new Date().toISOString(),
        });
      }
    }
    writeLocalDb(db);
    return db.subjects.filter((s) => s.user_id === userId && !s.is_archived);
  }

  const sb = getSupabase();
  if (replaceExisting) {
    await sb.from("bt_subjects").delete().eq("user_id", userId);
  }

  const current = await (async () => {
    const { data } = await sb
      .from("bt_subjects")
      .select("*")
      .eq("user_id", userId)
      .eq("is_archived", false);
    return (data ?? []).map((r) => mapSubject(r));
  })();

  const existingNames = new Set(current.map((c) => c.name));
  let nextOrder = current.reduce((m, s) => Math.max(m, s.sort_order), -1);
  const toInsert = preset.subjects
    .filter((s) => !existingNames.has(s.name))
    .map((s) => ({
      user_id: userId,
      name: s.name,
      color: s.color,
      icon: s.icon,
      sort_order: ++nextOrder,
    }));

  if (toInsert.length > 0) {
    await sb.from("bt_subjects").insert(toInsert);
  }

  return getUserSubjects(userId);
}

// ── Unified Study & Test Logs (bt_study_logs) ──────────────────

export interface CreateStudyLogInput {
  userId: number;
  subjectId: number;
  logDate?: string;
  durationSeconds: number;
  topic?: string | null;
  sourceBook?: string | null;
  pageFrom?: number | null;
  pageTo?: number | null;
  pagesCount?: number | null;
  testsTotal?: number;
  testsWrong?: number | null;
  testsBlank?: number | null;
  note?: string | null;
}

export async function createStudyLog(input: CreateStudyLogInput): Promise<{
  log: StadaStudyLog;
  streak: number;
  todayTotalSeconds: number;
}> {
  const subjects = await getUserSubjects(input.userId);
  const sub =
    subjects.find((s) => s.id === input.subjectId) ??
    subjects[0] ?? {
      id: null,
      name: "عمومی",
      color: "#00ffa3",
      icon: "📘",
    };

  const today = getTehranToday();
  const yesterday = shiftDateISO(today, -1);
  const logDate =
    input.logDate && /^\d{4}-\d{2}-\d{2}$/.test(input.logDate)
      ? input.logDate
      : today;

  const durationSeconds = Math.max(
    0,
    Math.min(86400, Math.round(input.durationSeconds || 0))
  );

  const pageFrom =
    input.pageFrom !== null &&
    input.pageFrom !== undefined &&
    Number.isFinite(input.pageFrom) &&
    input.pageFrom >= 0
      ? Math.floor(input.pageFrom)
      : null;
  const pageTo =
    input.pageTo !== null &&
    input.pageTo !== undefined &&
    Number.isFinite(input.pageTo) &&
    input.pageTo >= 0
      ? Math.floor(input.pageTo)
      : null;

  let pagesCount = 0;
  if (
    input.pagesCount !== null &&
    input.pagesCount !== undefined &&
    Number.isFinite(input.pagesCount) &&
    input.pagesCount > 0
  ) {
    pagesCount = Math.floor(input.pagesCount);
  } else if (pageFrom !== null && pageTo !== null && pageTo >= pageFrom) {
    pagesCount = pageTo - pageFrom + 1;
  }

  const testsTotal = Math.max(0, Math.floor(input.testsTotal ?? 0));
  let testsWrong: number | null = null;
  let testsBlank: number | null = null;
  let testAccuracy: number | null = null;
  let konkurScore: number | null = null;

  if (
    testsTotal > 0 &&
    input.testsWrong !== null &&
    input.testsWrong !== undefined &&
    Number.isFinite(input.testsWrong)
  ) {
    testsWrong = Math.max(0, Math.floor(input.testsWrong));
    testsBlank =
      input.testsBlank !== null &&
      input.testsBlank !== undefined &&
      Number.isFinite(input.testsBlank)
        ? Math.max(0, Math.floor(input.testsBlank))
        : 0;
    if (testsWrong + testsBlank <= testsTotal) {
      testAccuracy = calcAccuracy(testsTotal, testsWrong, testsBlank);
      konkurScore = calcKonkurPercent(testsTotal, testsWrong, testsBlank);
    }
  }

  const topic = input.topic?.trim() ? input.topic.trim().slice(0, 200) : null;
  const sourceBook = input.sourceBook?.trim()
    ? input.sourceBook.trim().slice(0, 150)
    : null;
  const note = input.note?.trim() ? input.note.trim().slice(0, 800) : null;

  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const log: StadaStudyLog = {
      id: ++db.seq.logs,
      user_id: input.userId,
      subject_id: sub.id,
      subject_name: sub.name,
      subject_color: sub.color,
      subject_icon: sub.icon,
      log_date: logDate,
      duration_seconds: durationSeconds,
      topic,
      source_book: sourceBook,
      page_from: pageFrom,
      page_to: pageTo,
      pages_count: pagesCount,
      tests_total: testsTotal,
      tests_wrong: testsWrong,
      tests_blank: testsBlank,
      test_accuracy: testAccuracy,
      konkur_score: konkurScore,
      note,
      created_at: new Date().toISOString(),
    };
    db.logs.push(log);

    const u = db.users.find((x) => x.id === input.userId);
    let streak = u?.streak ?? 0;
    if (u && logDate === today) {
      if (u.last_study_date === yesterday) {
        streak = (u.streak || 0) + 1;
      } else if (u.last_study_date === today) {
        streak = Math.max(1, u.streak || 1);
      } else {
        streak = 1;
      }
      u.streak = streak;
      u.last_study_date = today;
    }
    writeLocalDb(db);

    const todayTotalSeconds = db.logs
      .filter((l) => l.user_id === input.userId && l.log_date === today)
      .reduce((acc, l) => acc + l.duration_seconds, 0);

    return { log, streak, todayTotalSeconds };
  }

  const sb = getSupabase();
  const { data: inserted, error: insertErr } = await sb
    .from("bt_study_logs")
    .insert({
      user_id: input.userId,
      subject_id: sub.id,
      subject_name: sub.name,
      subject_color: sub.color,
      subject_icon: sub.icon,
      log_date: logDate,
      duration_seconds: durationSeconds,
      topic,
      source_book: sourceBook,
      page_from: pageFrom,
      page_to: pageTo,
      pages_count: pagesCount,
      tests_total: testsTotal,
      tests_wrong: testsWrong,
      tests_blank: testsBlank,
      test_accuracy: testAccuracy,
      konkur_score: konkurScore,
      note,
    })
    .select("*")
    .single();
  if (insertErr) throw new Error(insertErr.message);

  const user = await findUserById(input.userId);
  let streak = user?.streak ?? 0;
  if (user && logDate === today) {
    if (user.last_study_date === yesterday) {
      streak = (user.streak || 0) + 1;
    } else if (user.last_study_date === today) {
      streak = Math.max(1, user.streak || 1);
    } else {
      streak = 1;
    }
    await sb
      .from("bt_users")
      .update({ streak, last_study_date: today })
      .eq("id", input.userId);
  }

  const { data: todayRows } = await sb
    .from("bt_study_logs")
    .select("duration_seconds")
    .eq("user_id", input.userId)
    .eq("log_date", today);

  const todayTotalSeconds = (todayRows ?? []).reduce(
    (sum, r) => sum + Number(r.duration_seconds ?? 0),
    0
  );

  return { log: mapLog(inserted), streak, todayTotalSeconds };
}

export async function getUserStudyLogs(
  userId: number,
  opts?: { fromDate?: string; toDate?: string; limit?: number }
): Promise<StadaStudyLog[]> {
  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const list = db.logs
      .filter(
        (l) =>
          l.user_id === userId &&
          (!opts?.fromDate || l.log_date >= opts.fromDate) &&
          (!opts?.toDate || l.log_date <= opts.toDate)
      )
      .sort(
        (a, b) =>
          b.log_date.localeCompare(a.log_date) ||
          b.created_at.localeCompare(a.created_at)
      );
    return opts?.limit ? list.slice(0, opts.limit) : list;
  }

  let q = getSupabase()
    .from("bt_study_logs")
    .select("*")
    .eq("user_id", userId)
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (opts?.fromDate) q = q.gte("log_date", opts.fromDate);
  if (opts?.toDate) q = q.lte("log_date", opts.toDate);
  if (opts?.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapLog(r));
}

export async function deleteStudyLog(
  userId: number,
  logId: number
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const idx = db.logs.findIndex(
      (l) => l.id === logId && l.user_id === userId
    );
    if (idx === -1) return false;
    db.logs.splice(idx, 1);
    writeLocalDb(db);
    return true;
  }

  const { error } = await getSupabase()
    .from("bt_study_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return true;
}

// ── Weekly Study Planner (bt_weekly_plans) ─────────────────────

export async function getUserWeeklyPlans(
  userId: number,
  fromDate: string,
  toDate: string
): Promise<StadaWeeklyPlan[]> {
  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    return db.plans
      .filter(
        (p) =>
          p.user_id === userId &&
          p.plan_date >= fromDate &&
          p.plan_date <= toDate
      )
      .sort(
        (a, b) =>
          a.plan_date.localeCompare(b.plan_date) ||
          a.start_time.localeCompare(b.start_time)
      );
  }

  const { data, error } = await getSupabase()
    .from("bt_weekly_plans")
    .select("*")
    .eq("user_id", userId)
    .gte("plan_date", fromDate)
    .lte("plan_date", toDate)
    .order("plan_date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapPlan(r));
}

export async function createWeeklyPlan(params: {
  userId: number;
  subjectId: number;
  planDate: string;
  startTime: string;
  endTime: string;
  topic: string;
  sourceNote?: string | null;
}): Promise<StadaWeeklyPlan> {
  const subjects = await getUserSubjects(params.userId);
  const sub =
    subjects.find((s) => s.id === params.subjectId) ??
    subjects[0] ?? {
      id: null,
      name: "عمومی",
      color: "#00ffa3",
      icon: "📘",
    };

  const plannedMinutes = calcMinutesBetween(params.startTime, params.endTime);
  if (plannedMinutes <= 0) {
    throw new Error("ساعت پایان باید بعد از ساعت شروع باشد");
  }
  const dayOfWeek = getIranianDayIndex(params.planDate);
  const topic = params.topic.trim().slice(0, 250);
  const sourceNote = params.sourceNote?.trim()
    ? params.sourceNote.trim().slice(0, 200)
    : null;

  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const plan: StadaWeeklyPlan = {
      id: ++db.seq.plans,
      user_id: params.userId,
      subject_id: sub.id,
      subject_name: sub.name,
      subject_color: sub.color,
      subject_icon: sub.icon,
      plan_date: params.planDate,
      day_of_week: dayOfWeek,
      start_time: params.startTime,
      end_time: params.endTime,
      planned_minutes: plannedMinutes,
      topic,
      source_note: sourceNote,
      is_completed: false,
      created_at: new Date().toISOString(),
    };
    db.plans.push(plan);
    writeLocalDb(db);
    return plan;
  }

  const { data, error } = await getSupabase()
    .from("bt_weekly_plans")
    .insert({
      user_id: params.userId,
      subject_id: sub.id,
      subject_name: sub.name,
      subject_color: sub.color,
      subject_icon: sub.icon,
      plan_date: params.planDate,
      day_of_week: dayOfWeek,
      start_time: params.startTime,
      end_time: params.endTime,
      planned_minutes: plannedMinutes,
      topic,
      source_note: sourceNote,
      is_completed: false,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapPlan(data);
}

export async function toggleWeeklyPlanCompleted(
  userId: number,
  planId: number,
  isCompleted: boolean
): Promise<StadaWeeklyPlan | null> {
  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const p = db.plans.find((x) => x.id === planId && x.user_id === userId);
    if (!p) return null;
    p.is_completed = isCompleted;
    writeLocalDb(db);
    return p;
  }

  const { data, error } = await getSupabase()
    .from("bt_weekly_plans")
    .update({ is_completed: isCompleted })
    .eq("id", planId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPlan(data) : null;
}

export async function deleteWeeklyPlan(
  userId: number,
  planId: number
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const idx = db.plans.findIndex(
      (p) => p.id === planId && p.user_id === userId
    );
    if (idx === -1) return false;
    db.plans.splice(idx, 1);
    writeLocalDb(db);
    return true;
  }

  const { error } = await getSupabase()
    .from("bt_weekly_plans")
    .delete()
    .eq("id", planId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return true;
}

// ── Classes & Competitive Leaderboard ──────────────────────────

export async function findClassByCode(
  code: string
): Promise<StadaClass | null> {
  const clean = code.trim().toUpperCase();
  if (!clean) return null;

  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    return db.classes.find((c) => c.code === clean) ?? null;
  }

  const { data, error } = await getSupabase()
    .from("bt_classes")
    .select("*")
    .eq("code", clean)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapClass(data) : null;
}

export async function createClassForUser(params: {
  name: string;
  userId: number;
}): Promise<StadaClass> {
  const name = params.name.trim();
  let code = generateClassCode();

  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await findClassByCode(code);
    if (!existing) break;
    code = generateClassCode();
  }

  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const cls: StadaClass = {
      id: ++db.seq.classes,
      code,
      name,
      created_by: params.userId,
      created_at: new Date().toISOString(),
    };
    db.classes.push(cls);
    const u = db.users.find((x) => x.id === params.userId);
    if (u) u.class_code = code;
    writeLocalDb(db);
    return cls;
  }

  const sb = getSupabase();
  const { data, error } = await sb
    .from("bt_classes")
    .insert({ code, name, created_by: params.userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const { error: updateErr } = await sb
    .from("bt_users")
    .update({ class_code: code })
    .eq("id", params.userId);
  if (updateErr) throw new Error(updateErr.message);

  return mapClass(data);
}

export async function joinClassByCode(
  userId: number,
  code: string
): Promise<StadaClass | null> {
  const cls = await findClassByCode(code);
  if (!cls) return null;

  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const u = db.users.find((x) => x.id === userId);
    if (u) {
      u.class_code = cls.code;
      writeLocalDb(db);
    }
    return cls;
  }

  const { error } = await getSupabase()
    .from("bt_users")
    .update({ class_code: cls.code })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return cls;
}

export async function leaveCurrentClass(userId: number): Promise<void> {
  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const u = db.users.find((x) => x.id === userId);
    if (u) {
      u.class_code = null;
      writeLocalDb(db);
    }
    return;
  }

  const { error } = await getSupabase()
    .from("bt_users")
    .update({ class_code: null })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function getClassLeaderboard(classCode: string): Promise<{
  classInfo: StadaClass | null;
  members: LeaderboardMember[];
}> {
  const cleanCode = classCode.trim().toUpperCase();
  const classInfo = await findClassByCode(cleanCode);
  if (!classInfo) {
    return { classInfo: null, members: [] };
  }

  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const classUsers = db.users.filter((u) => u.class_code === cleanCode);
    const members: LeaderboardMember[] = classUsers.map((u) => {
      const userLogs = db.logs.filter((l) => l.user_id === u.id);
      const studySeconds = userLogs.reduce(
        (sum, l) => sum + l.duration_seconds,
        0
      );
      const totalTests = userLogs.reduce((sum, l) => sum + l.tests_total, 0);
      const totalPages = userLogs.reduce((sum, l) => sum + l.pages_count, 0);
      const withAcc = userLogs.filter((l) => l.test_accuracy !== null);
      const avgAcc =
        withAcc.length > 0
          ? Math.round(
              (withAcc.reduce((s, l) => s + (l.test_accuracy ?? 0), 0) /
                withAcc.length) *
                10
            ) / 10
          : 0;
      const effectiveStreak = computeEffectiveStreak(
        u.streak,
        u.last_study_date
      );
      const studyHours = Math.round((studySeconds / 3600) * 10) / 10;
      return {
        id: u.id,
        name: u.name,
        study_field: u.study_field,
        streak: effectiveStreak,
        study_seconds: studySeconds,
        study_hours: studyHours,
        total_tests: totalTests,
        total_pages: totalPages,
        avg_accuracy: avgAcc,
        score: calcCompetitiveScore(
          studySeconds,
          effectiveStreak,
          totalTests,
          totalPages
        ),
      };
    });
    return { classInfo, members };
  }

  const sb = getSupabase();
  const { data: userRows, error: uErr } = await sb
    .from("bt_users")
    .select("id, name, study_field, streak, last_study_date")
    .eq("class_code", cleanCode);
  if (uErr) throw new Error(uErr.message);

  const users = userRows ?? [];
  if (users.length === 0) {
    return { classInfo, members: [] };
  }

  const userIds = users.map((u) => Number(u.id));
  const { data: logRows } = await sb
    .from("bt_study_logs")
    .select("user_id, duration_seconds, tests_total, pages_count, test_accuracy")
    .in("user_id", userIds);

  const agg = new Map<
    number,
    {
      secs: number;
      tests: number;
      pages: number;
      accSum: number;
      accCount: number;
    }
  >();

  for (const r of logRows ?? []) {
    const uid = Number(r.user_id);
    const cur = agg.get(uid) ?? {
      secs: 0,
      tests: 0,
      pages: 0,
      accSum: 0,
      accCount: 0,
    };
    cur.secs += Number(r.duration_seconds ?? 0);
    cur.tests += Number(r.tests_total ?? 0);
    cur.pages += Number(r.pages_count ?? 0);
    if (r.test_accuracy !== null && r.test_accuracy !== undefined) {
      cur.accSum += Number(r.test_accuracy);
      cur.accCount += 1;
    }
    agg.set(uid, cur);
  }

  const members: LeaderboardMember[] = users.map((u) => {
    const uid = Number(u.id);
    const st = agg.get(uid) ?? {
      secs: 0,
      tests: 0,
      pages: 0,
      accSum: 0,
      accCount: 0,
    };
    const studyHours = Math.round((st.secs / 3600) * 10) / 10;
    const effectiveStreak = computeEffectiveStreak(
      Number(u.streak ?? 0),
      u.last_study_date ? String(u.last_study_date) : null
    );
    const avgAccuracy =
      st.accCount > 0
        ? Math.round((st.accSum / st.accCount) * 10) / 10
        : 0;

    return {
      id: uid,
      name: String(u.name ?? ""),
      study_field: String(u.study_field || ""),
      streak: effectiveStreak,
      study_seconds: st.secs,
      study_hours: studyHours,
      total_tests: st.tests,
      total_pages: st.pages,
      avg_accuracy: avgAccuracy,
      score: calcCompetitiveScore(
        st.secs,
        effectiveStreak,
        st.tests,
        st.pages
      ),
    };
  });

  return { classInfo, members };
}
