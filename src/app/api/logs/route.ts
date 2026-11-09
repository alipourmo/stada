import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createStudyLog, getUserStudyLogs } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from") || undefined;
    const toDate = searchParams.get("to") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    const logs = await getUserStudyLogs(user.id, { fromDate, toDate, limit });
    return NextResponse.json({ logs });
  } catch (err) {
    console.error("Get logs error:", err);
    return NextResponse.json(
      { error: "خطا در دریافت گزارش‌ها" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "لطفاً ابتدا وارد شوید" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const subjectId = Number(body.subject_id ?? 0);
    const logDate =
      typeof body.log_date === "string" ? body.log_date.trim() : undefined;
    const durationSeconds = Number(body.duration_seconds ?? 0);
    const topic =
      typeof body.topic === "string" ? body.topic.trim() : undefined;
    const sourceBook =
      typeof body.source_book === "string" ? body.source_book.trim() : undefined;

    const pageFrom =
      body.page_from !== null &&
      body.page_from !== undefined &&
      body.page_from !== ""
        ? Number(body.page_from)
        : null;
    const pageTo =
      body.page_to !== null &&
      body.page_to !== undefined &&
      body.page_to !== ""
        ? Number(body.page_to)
        : null;
    const pagesCount =
      body.pages_count !== null &&
      body.pages_count !== undefined &&
      body.pages_count !== ""
        ? Number(body.pages_count)
        : null;

    const testsTotal =
      body.tests_total !== null &&
      body.tests_total !== undefined &&
      body.tests_total !== ""
        ? Number(body.tests_total)
        : 0;
    const testsWrong =
      body.tests_wrong !== null &&
      body.tests_wrong !== undefined &&
      body.tests_wrong !== ""
        ? Number(body.tests_wrong)
        : null;
    const testsBlank =
      body.tests_blank !== null &&
      body.tests_blank !== undefined &&
      body.tests_blank !== ""
        ? Number(body.tests_blank)
        : null;
    const note = typeof body.note === "string" ? body.note.trim() : null;

    if (
      durationSeconds <= 0 &&
      testsTotal <= 0 &&
      (!pagesCount || pagesCount <= 0) &&
      (pageFrom === null || pageTo === null)
    ) {
      return NextResponse.json(
        {
          error:
            "لطفاً حداقل یکی از موارد زمان مطالعه، تعداد صفحات یا تعداد تست را وارد کنید",
        },
        { status: 400 }
      );
    }

    if (pageFrom !== null && pageTo !== null && pageTo < pageFrom) {
      return NextResponse.json(
        { error: "شماره صفحه پایان نباید کوچکتر از صفحه شروع باشد" },
        { status: 400 }
      );
    }

    if (
      testsTotal > 0 &&
      testsWrong !== null &&
      (testsWrong < 0 || testsWrong + (testsBlank ?? 0) > testsTotal)
    ) {
      return NextResponse.json(
        {
          error:
            "مجموع تعداد غلط و نزده نباید بیشتر از تعداد کل تست‌ها باشد",
        },
        { status: 400 }
      );
    }

    const result = await createStudyLog({
      userId: user.id,
      subjectId,
      logDate,
      durationSeconds,
      topic,
      sourceBook,
      pageFrom,
      pageTo,
      pagesCount,
      testsTotal,
      testsWrong,
      testsBlank,
      note,
    });

    return NextResponse.json({
      success: true,
      log: result.log,
      streak: result.streak,
      todayTotalSeconds: result.todayTotalSeconds,
    });
  } catch (err) {
    console.error("Create study log error:", err);
    return NextResponse.json(
      { error: "خطا در ثبت گزارش مطالعه" },
      { status: 500 }
    );
  }
}
