import { requireUser } from "@/lib/auth";
import { getUserSubjects, getUserWeeklyPlans } from "@/lib/db";
import {
  getIranianWeekStartSaturday,
  getTehranToday,
  shiftDateISO,
} from "@/lib/constants";
import PlannerClient from "@/components/PlannerClient";

export const metadata = {
  title: "برنامه‌ریزی هفتگی",
};

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const todayIso = getTehranToday();
  const currentWeekStartIso = getIranianWeekStartSaturday(todayIso);
  const nextWeekStartIso = shiftDateISO(currentWeekStartIso, 7);

  // Default to current week unless ?week=next or ISO date provided
  const initialWeekStartIso =
    sp.week === "next"
      ? nextWeekStartIso
      : sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week)
        ? getIranianWeekStartSaturday(sp.week)
        : currentWeekStartIso;

  const initialWeekEndIso = shiftDateISO(initialWeekStartIso, 6);

  const [subjects, initialPlans] = await Promise.all([
    getUserSubjects(user.id),
    getUserWeeklyPlans(user.id, initialWeekStartIso, initialWeekEndIso),
  ]);

  return (
    <PlannerClient
      subjects={subjects}
      currentWeekStartIso={currentWeekStartIso}
      nextWeekStartIso={nextWeekStartIso}
      todayIso={todayIso}
      initialWeekStartIso={initialWeekStartIso}
      initialPlans={initialPlans}
    />
  );
}
