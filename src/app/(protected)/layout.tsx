import { requireUser } from "@/lib/auth";
import { DEFAULT_EXAM_DATE, getDaysLeft } from "@/lib/constants";
import Navbar from "@/components/Navbar";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const daysLeft = getDaysLeft(user.target_exam_date || DEFAULT_EXAM_DATE);

  return (
    <div className="min-h-screen pb-22 xl:pb-10">
      <Navbar
        firstName={firstName}
        studyField={user.study_field}
        initialStreak={user.streak}
        initialDaysLeft={daysLeft}
      />
      <main className="mx-auto max-w-[1260px] px-4 py-6 sm:px-6 sm:py-7">
        {children}
      </main>
    </div>
  );
}
