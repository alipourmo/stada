import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteSubject, updateSubject } from "@/lib/db";

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
    const subjectId = Number(id);
    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      return NextResponse.json({ error: "شناسه نامعتبر" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const updated = await updateSubject(user.id, subjectId, {
      name: typeof body.name === "string" ? body.name : undefined,
      color: typeof body.color === "string" ? body.color : undefined,
      icon: typeof body.icon === "string" ? body.icon : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: "درس یافت نشد" }, { status: 404 });
    }

    return NextResponse.json({ success: true, subject: updated });
  } catch (err) {
    console.error("Update subject error:", err);
    return NextResponse.json(
      { error: "خطا در ویرایش درس" },
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
    const subjectId = Number(id);
    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      return NextResponse.json({ error: "شناسه نامعتبر" }, { status: 400 });
    }

    await deleteSubject(user.id, subjectId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete subject error:", err);
    return NextResponse.json(
      { error: "خطا در حذف درس" },
      { status: 500 }
    );
  }
}
