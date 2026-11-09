import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateUserProfile } from "@/lib/db";

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const name =
      typeof body.name === "string" ? body.name.trim().slice(0, 100) : undefined;
    const studyField =
      typeof body.study_field === "string"
        ? body.study_field.trim().slice(0, 120)
        : undefined;
    const targetHours =
      body.target_hours !== undefined ? Number(body.target_hours) : undefined;
    const targetExamDate =
      body.target_exam_date === null
        ? null
        : typeof body.target_exam_date === "string"
          ? body.target_exam_date.trim() || null
          : undefined;

    if (
      targetHours !== undefined &&
      (!Number.isFinite(targetHours) || targetHours < 10 || targetHours > 5000)
    ) {
      return NextResponse.json(
        { error: "ساعت هدف باید بین ۱۰ تا ۵۰۰۰ ساعت باشد" },
        { status: 400 }
      );
    }

    if (
      targetExamDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(targetExamDate)
    ) {
      return NextResponse.json(
        { error: "فرمت تاریخ آزمون معتبر نیست" },
        { status: 400 }
      );
    }

    const updated = await updateUserProfile(user.id, {
      name,
      studyField,
      targetExamDate,
      targetHours,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        study_field: updated.study_field,
        target_exam_date: updated.target_exam_date,
        target_hours: updated.target_hours,
      },
    });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json(
      { error: "خطا در بروزرسانی پروفایل" },
      { status: 500 }
    );
  }
}
