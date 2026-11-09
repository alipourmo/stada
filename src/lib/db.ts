import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import {
  calcAccuracy,
  calcCompetitiveScore,
  calcKonkurPercent,
  DEFAULT_TARGET_HOURS,
  getSubjectInfo,
  getTehranToday,
  shiftDateISO,
} from "./constants";

export interface BtUser {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  class_code: string | null;
  streak: number;
  last_study_date: string | null;
  target_exam_date: string | null;
  target_hours: number;
  created_at: string;
}

export interface BtClass {
  id: number;
  code: string;
  name: string;
  created_by: number | null;
  created_at: string;
}

export interface BtStudySession {
  id: number;
  user_id: number;
  subject: string;
  seconds: number;
  session_date: string;
  created_at: string;
}

export interface BtTestResult {
  id: number;
  user_id: number;
  subject: string;
  total: number;
  wrong: number;
  blank: number;
  accuracy: number;
  konkur_score: number | null;
  note: string | null;
  test_date: string;
  created_at: string;
}

export interface LeaderboardMember {
  id: number;
  name: string;
  streak: number;
  study_seconds: number;
  study_hours: number;
  total_tests: number;
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
function mapUser(row: Record<string, unknown>): BtUser {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    password_hash: String(row.password_hash ?? ""),
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

function mapClass(row: Record<string, unknown>): BtClass {
  return {
    id: Number(row.id),
    code: String(row.code ?? ""),
    name: String(row.name ?? ""),
    created_by: row.created_by !== null && row.created_by !== undefined ? Number(row.created_by) : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapSession(row: Record<string, unknown>): BtStudySession {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    subject: String(row.subject ?? "other"),
    seconds: Number(row.seconds ?? 0),
    session_date: String(row.session_date ?? ""),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapTest(row: Record<string, unknown>): BtTestResult {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    subject: String(row.subject ?? "other"),
    total: Number(row.total ?? 0),
    wrong: Number(row.wrong ?? 0),
    blank: Number(row.blank ?? 0),
    accuracy: Number(row.accuracy ?? 0),
    konkur_score:
      row.konkur_score !== null && row.konkur_score !== undefined
        ? Number(row.konkur_score)
        : null,
    note: row.note ? String(row.note) : null,
    test_date: String(row.test_date ?? ""),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

// ── Local Dev File Store (used ONLY when SUPABASE_URL is unset) ─
interface LocalDbData {
  seq: { users: number; classes: number; sessions: number; tests: number };
  users: BtUser[];
  classes: BtClass[];
  sessions: BtStudySession[];
  tests: BtTestResult[];
}

const LOCAL_DB_PATH = path.join(process.cwd(), ".cache", "biotrack-dev.json");

function readLocalDb(): LocalDbData {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const raw = fs.readFileSync(LOCAL_DB_PATH, "utf8");
      return JSON.parse(raw) as LocalDbData;
    }
  } catch {
    // ignore corrupt local dev cache
  }
  return {
    seq: { users: 0, classes: 0, sessions: 0, tests: 0 },
    users: [],
    classes: [],
    sessions: [],
    tests: [],
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

// ── Repository Functions ───────────────────────────────────────

export async function findUserByEmail(email: string): Promise<BtUser | null> {
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

export async function findUserById(id: number): Promise<BtUser | null> {
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

export async function ensureFreshUserStreak(user: BtUser): Promise<BtUser> {
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

export async function findClassByCode(code: string): Promise<BtClass | null> {
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

export async function createUser(params: {
  name: string;
  email: string;
  passwordHash: string;
  classCode: string | null;
}): Promise<BtUser> {
  const email = params.email.trim().toLowerCase();
  const name = params.name.trim();
  const classCode = params.classCode
    ? params.classCode.trim().toUpperCase()
    : null;

  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const id = ++db.seq.users;
    const newUser: BtUser = {
      id,
      name,
      email,
      password_hash: params.passwordHash,
      class_code: classCode,
      streak: 0,
      last_study_date: null,
      target_exam_date: null,
      target_hours: DEFAULT_TARGET_HOURS,
      created_at: new Date().toISOString(),
    };
    db.users.push(newUser);
    writeLocalDb(db);
    return newUser;
  }

  const { data, error } = await getSupabase()
    .from("bt_users")
    .insert({
      name,
      email,
      password_hash: params.passwordHash,
      class_code: classCode,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapUser(data);
}

export async function updateUserGoals(
  userId: number,
  params: { targetExamDate: string | null; targetHours: number }
): Promise<BtUser> {
  const hours = Math.min(5000, Math.max(10, Math.round(params.targetHours)));
  const examDate =
    params.targetExamDate && /^\d{4}-\d{2}-\d{2}$/.test(params.targetExamDate)
      ? params.targetExamDate
      : null;

  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const u = db.users.find((x) => x.id === userId);
    if (!u) throw new Error("کاربر یافت نشد");
    u.target_exam_date = examDate;
    u.target_hours = hours;
    writeLocalDb(db);
    return u;
  }

  const { data, error } = await getSupabase()
    .from("bt_users")
    .update({ target_exam_date: examDate, target_hours: hours })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapUser(data);
}

export async function createClassForUser(params: {
  name: string;
  userId: number;
}): Promise<BtClass> {
  const name = params.name.trim();
  let code = generateClassCode();

  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await findClassByCode(code);
    if (!existing) break;
    code = generateClassCode();
  }

  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const cls: BtClass = {
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
): Promise<BtClass | null> {
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

export async function recordStudySession(params: {
  userId: number;
  subject: string;
  seconds: number;
}): Promise<{
  session: BtStudySession;
  streak: number;
  todayTotal: number;
}> {
  const subject = getSubjectInfo(params.subject).key;
  const seconds = Math.floor(params.seconds);
  const today = getTehranToday();
  const yesterday = shiftDateISO(today, -1);

  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const session: BtStudySession = {
      id: ++db.seq.sessions,
      user_id: params.userId,
      subject,
      seconds,
      session_date: today,
      created_at: new Date().toISOString(),
    };
    db.sessions.push(session);

    let streak = 1;
    const u = db.users.find((x) => x.id === params.userId);
    if (u) {
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

    const todayTotal = db.sessions
      .filter((s) => s.user_id === params.userId && s.session_date === today)
      .reduce((acc, s) => acc + s.seconds, 0);

    return { session, streak, todayTotal };
  }

  const sb = getSupabase();
  const { data: inserted, error: insertErr } = await sb
    .from("bt_study_sessions")
    .insert({
      user_id: params.userId,
      subject,
      seconds,
      session_date: today,
    })
    .select("*")
    .single();
  if (insertErr) throw new Error(insertErr.message);

  const user = await findUserById(params.userId);
  let streak = 1;
  if (user) {
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
      .eq("id", params.userId);
  }

  const { data: todayRows } = await sb
    .from("bt_study_sessions")
    .select("seconds")
    .eq("user_id", params.userId)
    .eq("session_date", today);

  const todayTotal = (todayRows ?? []).reduce(
    (sum, r) => sum + Number(r.seconds ?? 0),
    0
  );

  return { session: mapSession(inserted), streak, todayTotal };
}

export async function deleteStudySession(
  userId: number,
  sessionId: number
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const idx = db.sessions.findIndex(
      (s) => s.id === sessionId && s.user_id === userId
    );
    if (idx === -1) return false;
    db.sessions.splice(idx, 1);
    writeLocalDb(db);
    return true;
  }

  const { error } = await getSupabase()
    .from("bt_study_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return true;
}

export async function getUserStudySessions(
  userId: number,
  sinceDate?: string
): Promise<BtStudySession[]> {
  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    return db.sessions
      .filter(
        (s) =>
          s.user_id === userId && (!sinceDate || s.session_date >= sinceDate)
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  let q = getSupabase()
    .from("bt_study_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (sinceDate) {
    q = q.gte("session_date", sinceDate);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapSession(r));
}

export async function recordTestResult(params: {
  userId: number;
  subject: string;
  total: number;
  wrong: number;
  blank?: number;
  note?: string | null;
}): Promise<BtTestResult> {
  const subject = getSubjectInfo(params.subject).key;
  const total = Math.floor(params.total);
  const wrong = Math.floor(params.wrong);
  const blank = Math.max(0, Math.floor(params.blank ?? 0));
  const accuracy = calcAccuracy(total, wrong, blank);
  const konkurScore = calcKonkurPercent(total, wrong, blank);
  const note = params.note?.trim() ? params.note.trim() : null;
  const today = getTehranToday();

  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const item: BtTestResult = {
      id: ++db.seq.tests,
      user_id: params.userId,
      subject,
      total,
      wrong,
      blank,
      accuracy,
      konkur_score: konkurScore,
      note,
      test_date: today,
      created_at: new Date().toISOString(),
    };
    db.tests.push(item);
    writeLocalDb(db);
    return item;
  }

  const { data, error } = await getSupabase()
    .from("bt_test_results")
    .insert({
      user_id: params.userId,
      subject,
      total,
      wrong,
      blank,
      accuracy,
      konkur_score: konkurScore,
      note,
      test_date: today,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapTest(data);
}

export async function deleteTestResult(
  userId: number,
  testId: number
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const idx = db.tests.findIndex(
      (t) => t.id === testId && t.user_id === userId
    );
    if (idx === -1) return false;
    db.tests.splice(idx, 1);
    writeLocalDb(db);
    return true;
  }

  const { error } = await getSupabase()
    .from("bt_test_results")
    .delete()
    .eq("id", testId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return true;
}

export async function getUserTestResults(
  userId: number,
  limit?: number
): Promise<BtTestResult[]> {
  if (!isSupabaseConfigured()) {
    const db = readLocalDb();
    const list = db.tests
      .filter((t) => t.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return limit ? list.slice(0, limit) : list;
  }

  let q = getSupabase()
    .from("bt_test_results")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (limit) q = q.limit(limit);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapTest(r));
}

export async function getClassLeaderboard(classCode: string): Promise<{
  classInfo: BtClass | null;
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
      const studySeconds = db.sessions
        .filter((s) => s.user_id === u.id)
        .reduce((sum, s) => sum + s.seconds, 0);
      const userTests = db.tests.filter((t) => t.user_id === u.id);
      const totalTests = userTests.reduce((sum, t) => sum + t.total, 0);
      const avgAcc =
        userTests.length > 0
          ? Math.round(
              (userTests.reduce((sum, t) => sum + t.accuracy, 0) /
                userTests.length) *
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
        streak: effectiveStreak,
        study_seconds: studySeconds,
        study_hours: studyHours,
        total_tests: totalTests,
        avg_accuracy: avgAcc,
        score: calcCompetitiveScore(studySeconds, effectiveStreak, totalTests),
      };
    });
    return { classInfo, members };
  }

  const sb = getSupabase();
  const { data: userRows, error: uErr } = await sb
    .from("bt_users")
    .select("id, name, streak, last_study_date")
    .eq("class_code", cleanCode);
  if (uErr) throw new Error(uErr.message);

  const users = userRows ?? [];
  if (users.length === 0) {
    return { classInfo, members: [] };
  }

  const userIds = users.map((u) => Number(u.id));
  const [{ data: sessionRows }, { data: testRows }] = await Promise.all([
    sb
      .from("bt_study_sessions")
      .select("user_id, seconds")
      .in("user_id", userIds),
    sb
      .from("bt_test_results")
      .select("user_id, total, accuracy")
      .in("user_id", userIds),
  ]);

  const secByUser = new Map<number, number>();
  for (const r of sessionRows ?? []) {
    const uid = Number(r.user_id);
    secByUser.set(uid, (secByUser.get(uid) ?? 0) + Number(r.seconds ?? 0));
  }

  const testsByUser = new Map<
    number,
    { totalQuestions: number; accSum: number; count: number }
  >();
  for (const r of testRows ?? []) {
    const uid = Number(r.user_id);
    const cur = testsByUser.get(uid) ?? {
      totalQuestions: 0,
      accSum: 0,
      count: 0,
    };
    cur.totalQuestions += Number(r.total ?? 0);
    cur.accSum += Number(r.accuracy ?? 0);
    cur.count += 1;
    testsByUser.set(uid, cur);
  }

  const members: LeaderboardMember[] = users.map((u) => {
    const uid = Number(u.id);
    const studySeconds = secByUser.get(uid) ?? 0;
    const studyHours = Math.round((studySeconds / 3600) * 10) / 10;
    const tStat = testsByUser.get(uid) ?? {
      totalQuestions: 0,
      accSum: 0,
      count: 0,
    };
    const effectiveStreak = computeEffectiveStreak(
      Number(u.streak ?? 0),
      u.last_study_date ? String(u.last_study_date) : null
    );
    const avgAccuracy =
      tStat.count > 0
        ? Math.round((tStat.accSum / tStat.count) * 10) / 10
        : 0;

    return {
      id: uid,
      name: String(u.name ?? ""),
      streak: effectiveStreak,
      study_seconds: studySeconds,
      study_hours: studyHours,
      total_tests: tStat.totalQuestions,
      avg_accuracy: avgAccuracy,
      score: calcCompetitiveScore(
        studySeconds,
        effectiveStreak,
        tStat.totalQuestions
      ),
    };
  });

  return { classInfo, members };
}
