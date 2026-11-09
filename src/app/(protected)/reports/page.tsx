import { requireUser } from "@/lib/auth";
import { getUserStudyLogs, getUserSubjects } from "@/lib/db";
import { getTehranToday } from "@/lib/constants";
import ReportsClient from "@/components/ReportsClient";

export const metadata = {
  title: "گزارش‌ها و نمودارها",
};

export default async function ReportsPage() {
  const user = await requireUser();
  const todayIso = getTehranToday();

  const [subjects, logs] = await Promise.all([
    getUserSubjects(user.id),
    getUserStudyLogs(user.id),
  ]);

  return (
    <ReportsClient
      subjects={subjects}
      logs={logs}
      todayIso={todayIso}
    />
  );
}
