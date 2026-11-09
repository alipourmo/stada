import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  applyPresetSubjectsForUser,
  createSubject,
  getUserSubjects,
} from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }
    const subjects = await getUserSubjects(user.id);
    return NextResponse.json({ subjects });
  } catch (err) {
    console.error("Get subjects error:", err);
    return NextResponse.json(
      { error: "خطا در دریافت لیست دروس" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    if (body.action === "apply_preset") {
      const presetId = String(body.preset_id ?? "tajrobi");
      const replaceExisting = Boolean(body.replace_existing ?? false);
      const subjects = await applyPresetSubjectsForUser(
        user.id,
        presetId,
        replaceExisting
      );
      return NextResponse.json({ success: true, subjects });
    }

    const name = String(body.name ?? "").trim();
    const color = String(body.color ?? "#00ffa3").trim();
    const icon = String(body.icon ?? "book").trim();

    if (!name) {
      return NextResponse.json(
        { error: "لطفاً نام درس را وارد کنید" },
        { status: 400 }
      );
    }

    const subject = await createSubject(user.id, { name, color, icon });
    return NextResponse.json({ success: true, subject });
  } catch (err) {
    console.error("Create subject error:", err);
    return NextResponse.json(
      { error: "خطا در ایجاد درس جدید" },
      { status: 500 }
    );
  }
}
