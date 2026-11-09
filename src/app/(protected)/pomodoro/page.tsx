import { requireUser } from "@/lib/auth";
import { getUserStudySessions } from "@/lib/db";
import { getTehranToday } from "@/lib/constants";
import PomodoroClient from "@/components/PomodoroClient";

export const metadata = {
  title: "پومودورو",
};

export default async function PomodoroPage() {
  const user = await requireUser();
  const todayIso = getTehranToday();
  const todaySessions = await getUserStudySessions(user.id, todayIso);
  const filteredToday = todaySessions.filter(
    (s) => s.session_date === todayIso
  );
  const todayTotal = filteredToday.reduce((sum, s) => sum + s.seconds, 0);

  return (
    <PomodoroClient
      initialTodaySessions={filteredToday}
      initialTodayTotal={todayTotal}
    />
  );
}
