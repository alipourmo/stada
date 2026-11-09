import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteStudySession } from "@/lib/db";

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
    const sessionId = Number(id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: "شناسه نامعتبر" }, { status: 400 });
    }
    await deleteStudySession(user.id, sessionId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete session error:", err);
    return NextResponse.json({ error: "خطا در حذف سشن" }, { status: 500 });
  }
}
