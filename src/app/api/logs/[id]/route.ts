import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteStudyLog } from "@/lib/db";

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
    const logId = Number(id);
    if (!Number.isInteger(logId) || logId <= 0) {
      return NextResponse.json({ error: "شناسه نامعتبر" }, { status: 400 });
    }
    await deleteStudyLog(user.id, logId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete study log error:", err);
    return NextResponse.json({ error: "خطا در حذف گزارش" }, { status: 500 });
  }
}
