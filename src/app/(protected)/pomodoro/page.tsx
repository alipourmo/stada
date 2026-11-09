import { requireUser } from "@/lib/auth";
import { getUserStudyLogs, getUserSubjects } from "@/lib/db";
import { getTehranToday } from "@/lib/constants";
import PomodoroClient from "@/components/PomodoroClient";

export const metadata = {
  title: "تایمر پومودورو",
};

export default async function PomodoroPage() {
  const user = await requireUser();
  const todayIso = getTehranToday();

  const [subjects, todayLogs] = await Promise.all([
    getUserSubjects(user.id),
    getUserStudyLogs(user.id, { fromDate: todayIso, toDate: todayIso }),
  ]);

  const todayTotal = todayLogs.reduce((sum, l) => sum + l.duration_seconds, 0);

  return (
    <PomodoroClient
      subjects={subjects}
      initialTodayLogs={todayLogs}
      initialTodayTotal={todayTotal}
    />
  );
}
