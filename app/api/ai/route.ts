export const runtime = "nodejs";

export async function POST(request: Request) {
  const { message } = await request.json().catch(() => ({ message: "" }));
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json({
      answer: "OPENAI_API_KEY روی Vercel تنظیم نشده است. ثبت داده‌ها کار می‌کند، اما پاسخ واقعی AI فعال نیست.",
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        input: [
          {
            role: "system",
            content:
              "تو دستیار فارسی یک داوطلب کنکور کارشناسی ارشد زیست و بیوتکنولوژی هستی. پاسخ‌ها دقیق، آموزشی، کوتاه و قابل اجرا باشند.",
          },
          { role: "user", content: message || "" },
        ],
      }),
    });

    const data = await response.json();
    if (data.error) {
      return Response.json({ answer: `خطای OpenAI: ${data.error.message}` });
    }

    const answer =
      data.output_text ||
      (data.output || [])
        .flatMap((item: any) => item.content || [])
        .map((item: any) => item.text)
        .filter(Boolean)
        .join("\n");

    return Response.json({ answer: answer || "پاسخی دریافت نشد." });
  } catch (error: any) {
    return Response.json({ answer: `خطا در اتصال AI: ${error.message}` });
  }
}
