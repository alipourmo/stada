import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordStudySession } from "@/lib/db";
import { isSubjectKey } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "لطفاً ابتدا وارد شوید" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const subject = isSubjectKey(body.subject) ? body.subject : "other";
    const seconds = Number(body.seconds ?? 0);

    if (!Number.isFinite(seconds) || seconds < 30 || seconds > 43200) {
      return NextResponse.json(
        { error: "مدت زمان سشن معتبر نیست (بین ۳۰ ثانیه تا ۱۲ ساعت)" },
        { status: 400 }
      );
    }

    const result = await recordStudySession({
      userId: user.id,
      subject,
      seconds: Math.round(seconds),
    });

    return NextResponse.json({
      success: true,
      streak: result.streak,
      todayTotal: result.todayTotal,
      session: result.session,
    });
  } catch (err) {
    console.error("Save session error:", err);
    return NextResponse.json(
      { error: "خطا در ثبت سشن مطالعه" },
      { status: 500 }
    );
  }
}
