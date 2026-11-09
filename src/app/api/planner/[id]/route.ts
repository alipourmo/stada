import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteWeeklyPlan, toggleWeeklyPlanCompleted } from "@/lib/db";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }
    const { id } = await context.params;
    const planId = Number(id);
    if (!Number.isInteger(planId) || planId <= 0) {
      return NextResponse.json({ error: "شناسه نامعتبر" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const updated = await toggleWeeklyPlanCompleted(
      user.id,
      planId,
      Boolean(body.is_completed)
    );

    if (!updated) {
      return NextResponse.json({ error: "برنامه یافت نشد" }, { status: 404 });
    }

    return NextResponse.json({ success: true, plan: updated });
  } catch (err) {
    console.error("Update weekly plan error:", err);
    return NextResponse.json(
      { error: "خطا در بروزرسانی وضعیت برنامه" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }
    const { id } = await context.params;
    const planId = Number(id);
    if (!Number.isInteger(planId) || planId <= 0) {
      return NextResponse.json({ error: "شناسه نامعتبر" }, { status: 400 });
    }
    await deleteWeeklyPlan(user.id, planId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete weekly plan error:", err);
    return NextResponse.json(
      { error: "خطا در حذف آیتم برنامه" },
      { status: 500 }
    );
  }
}
