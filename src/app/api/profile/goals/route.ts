import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateUserGoals } from "@/lib/db";

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetHours = Number(body.target_hours ?? 500);
    const targetExamDate = body.target_exam_date
      ? String(body.target_exam_date).trim()
      : null;

    if (!Number.isFinite(targetHours) || targetHours < 10 || targetHours > 5000) {
      return NextResponse.json(
        { error: "ساعت هدف باید بین ۱۰ تا ۵۰۰۰ ساعت باشد" },
        { status: 400 }
      );
    }

    if (targetExamDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetExamDate)) {
      return NextResponse.json(
        { error: "فرمت تاریخ معتبر نیست" },
        { status: 400 }
      );
    }

    const updated = await updateUserGoals(user.id, {
      targetExamDate,
      targetHours,
    });

    return NextResponse.json({
      success: true,
      target_exam_date: updated.target_exam_date,
      target_hours: updated.target_hours,
    });
  } catch (err) {
    console.error("Goals update error:", err);
    return NextResponse.json(
      { error: "خطا در بروزرسانی اهداف مطالعه" },
      { status: 500 }
    );
  }
}
