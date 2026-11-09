import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordTestResult } from "@/lib/db";
import { isSubjectKey } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "لطفاً ابتدا وارد شوید" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const subject = isSubjectKey(body.subject) ? body.subject : "other";
    const total = Number(body.total ?? 0);
    const wrong = Number(body.wrong ?? 0);
    const blank = Number(body.blank ?? 0);
    const note = typeof body.note === "string" ? body.note.trim() : null;

    if (
      !Number.isInteger(total) ||
      !Number.isInteger(wrong) ||
      !Number.isInteger(blank) ||
      total < 1 ||
      total > 500 ||
      wrong < 0 ||
      blank < 0 ||
      wrong + blank > total
    ) {
      return NextResponse.json(
        {
          error:
            "لطفاً اعداد معتبر وارد کنید (مجموع غلط و نزده نباید بیشتر از کل سوالات باشد)",
        },
        { status: 400 }
      );
    }

    const test = await recordTestResult({
      userId: user.id,
      subject,
      total,
      wrong,
      blank,
      note: note ? note.slice(0, 500) : null,
    });

    return NextResponse.json({
      success: true,
      test,
    });
  } catch (err) {
    console.error("Save test error:", err);
    return NextResponse.json(
      { error: "خطا در ثبت نتیجه تست" },
      { status: 500 }
    );
  }
}
