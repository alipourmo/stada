import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createClassForUser,
  joinClassByCode,
  leaveCurrentClass,
} from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "لطفاً ابتدا وارد شوید" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    if (action === "create") {
      const className = String(body.class_name ?? "").trim();
      if (!className) {
        return NextResponse.json(
          { error: "لطفاً نام کلاس را وارد کنید" },
          { status: 400 }
        );
      }
      if (className.length > 100) {
        return NextResponse.json(
          { error: "نام کلاس نباید بیشتر از ۱۰۰ کاراکتر باشد" },
          { status: 400 }
        );
      }
      const cls = await createClassForUser({
        name: className,
        userId: user.id,
      });
      return NextResponse.json({
        success: true,
        classInfo: cls,
      });
    }

    if (action === "join") {
      const code = String(body.code ?? "")
        .trim()
        .toUpperCase();
      if (!code) {
        return NextResponse.json(
          { error: "لطفاً کد کلاس را وارد کنید" },
          { status: 400 }
        );
      }
      const cls = await joinClassByCode(user.id, code);
      if (!cls) {
        return NextResponse.json(
          { error: "کد کلاس وارد شده نامعتبر است" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        classInfo: cls,
      });
    }

    if (action === "leave") {
      await leaveCurrentClass(user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "عملیات نامعتبر" }, { status: 400 });
  } catch (err) {
    console.error("Class management error:", err);
    return NextResponse.json(
      { error: "خطا در مدیریت کلاس" },
      { status: 500 }
    );
  }
}
