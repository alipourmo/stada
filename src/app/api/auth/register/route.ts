import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  createClassForUser,
  createUser,
  findClassByCode,
  findUserByEmail,
} from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const studyField = String(
      body.study_field ?? "کنکور سراسری — علوم تجربی"
    ).trim();
    const classCode = String(body.class_code ?? "")
      .trim()
      .toUpperCase();
    const newClassName = String(body.new_class_name ?? "").trim();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "لطفاً تمام فیلدهای الزامی را پر کنید" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "فرمت ایمیل وارد شده معتبر نیست" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "رمز عبور باید حداقل ۶ کاراکتر باشد" },
        { status: 400 }
      );
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "این ایمیل قبلاً ثبت شده است" },
        { status: 409 }
      );
    }

    if (classCode && !newClassName) {
      const cls = await findClassByCode(classCode);
      if (!cls) {
        return NextResponse.json(
          { error: "کد کلاس وارد شده نامعتبر است" },
          { status: 400 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({
      name,
      email,
      passwordHash,
      studyField,
      classCode: !newClassName && classCode ? classCode : null,
    });

    let createdClassCode: string | null = null;
    if (newClassName) {
      const cls = await createClassForUser({
        name: newClassName,
        userId: user.id,
      });
      createdClassCode = cls.code;
    }

    await setSessionCookie({
      uid: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        study_field: user.study_field,
        class_code: createdClassCode ?? user.class_code,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "خطای سرور در ثبت‌نام. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
