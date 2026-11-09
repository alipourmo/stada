import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BioTrack — داشبورد کنکور زیست‌شناسی",
    template: "%s | BioTrack",
  },
  description:
    "پلتفرم هوشمند مدیریت مطالعه، تایمر پومودورو، تحلیل تست و رقابت کلاسی ویژه داوطلبان کنکور زیست‌شناسی",
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
