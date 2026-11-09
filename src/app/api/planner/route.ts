import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createWeeklyPlan, getUserWeeklyPlans } from "@/lib/db";
import { calcMinutesBetween } from "@/lib/constants";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from") || "";
    const toDate = searchParams.get("to") || "";

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: "بازه زمانی مشخص نشده است" },
        { status: 400 }
      );
    }

    const plans = await getUserWeeklyPlans(user.id, fromDate, toDate);
    return NextResponse.json({ plans });
  } catch (err) {
    console.error("Get weekly plans error:", err);
    return NextResponse.json(
      { error: "خطا در دریافت برنامه هفتگی" },
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
    const subjectId = Number(body.subject_id ?? 0);
    const planDate = String(body.plan_date ?? "").trim();
    const startTime = String(body.start_time ?? "").trim();
    const endTime = String(body.end_time ?? "").trim();
    const topic = String(body.topic ?? "").trim();
    const sourceNote =
      typeof body.source_note === "string" ? body.source_note.trim() : null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
      return NextResponse.json(
        { error: "تاریخ برنامه معتبر نیست" },
        { status: 400 }
      );
    }

    if (!topic) {
      return NextResponse.json(
        { error: "لطفاً مبحث مورد مطالعه را وارد کنید" },
        { status: 400 }
      );
    }

    const mins = calcMinutesBetween(startTime, endTime);
    if (mins <= 0) {
      return NextResponse.json(
        { error: "ساعت پایان باید بزرگتر از ساعت شروع باشد" },
        { status: 400 }
      );
    }

    const plan = await createWeeklyPlan({
      userId: user.id,
      subjectId,
      planDate,
      startTime,
      endTime,
      topic,
      sourceNote,
    });

    return NextResponse.json({ success: true, plan });
  } catch (err) {
    console.error("Create weekly plan error:", err);
    return NextResponse.json(
      { error: "خطا در ثبت برنامه هفتگی" },
      { status: 500 }
    );
  }
}
