import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "لطفاً ایمیل و رمز عبور را وارد کنید" },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "ایمیل یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    // Normalize PHP $2y$ prefix if migrating from PHP password_hash()
    const normalizedHash = user.password_hash.startsWith("$2y$")
      ? "$2a$" + user.password_hash.slice(4)
      : user.password_hash;

    const valid = await bcrypt.compare(password, normalizedHash);
    if (!valid) {
      return NextResponse.json(
        { error: "ایمیل یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    await setSessionCookie({
      uid: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "خطای سرور در فرآیند ورود. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
