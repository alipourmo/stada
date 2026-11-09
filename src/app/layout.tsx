import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "stada — پلتفرم هوشمند برنامه‌ریزی و گزارش مطالعه",
    template: "%s | stada",
  },
  description:
    "سامانه جامع برنامه‌ریزی هفتگی، ثبت گزارش مطالعه و تست، تایمر پومودورو و تحلیل پیشرفت ویژه کنکور سراسری و آزمون‌های تخصصی",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className="antialiased selection:bg-[#00ffa3]/20 selection:text-[#00ffa3]">
        {children}
      </body>
    </html>
  );
}
