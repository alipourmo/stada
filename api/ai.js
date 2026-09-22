module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    res.status(200).json({
      answer: "OPENAI_API_KEY روی Vercel تنظیم نشده است. داده‌ها ذخیره می‌شوند، اما پاسخ واقعی AI فعال نیست.",
    });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        input: [
          {
            role: "system",
            content: "تو دستیار فارسی یک داوطلب کنکور کارشناسی ارشد زیست و بیوتکنولوژی هستی. پاسخ‌ها دقیق، آموزشی، کوتاه و قابل اجرا باشند.",
          },
          {
            role: "user",
            content: body.message || "",
          },
        ],
      }),
    });
    const data = await response.json();
    if (data.error) {
      res.status(200).json({ answer: `خطای OpenAI: ${data.error.message}` });
      return;
    }
    const answer = data.output_text || (data.output || [])
      .flatMap((item) => item.content || [])
      .map((item) => item.text)
      .filter(Boolean)
      .join("\n");
    res.status(200).json({ answer: answer || "پاسخی دریافت نشد." });
  } catch (error) {
    res.status(200).json({ answer: `خطا در اتصال AI: ${error.message}` });
  }
};
