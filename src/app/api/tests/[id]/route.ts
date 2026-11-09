import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteTestResult } from "@/lib/db";

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
    const testId = Number(id);
    if (!Number.isInteger(testId) || testId <= 0) {
      return NextResponse.json({ error: "شناسه نامعتبر" }, { status: 400 });
    }
    await deleteTestResult(user.id, testId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete test error:", err);
    return NextResponse.json({ error: "خطا در حذف نتیجه تست" }, { status: 500 });
  }
}
