import { requireUser } from "@/lib/auth";
import { getUserStudyLogs, getUserSubjects } from "@/lib/db";
import { getTehranToday } from "@/lib/constants";
import StudyLogClient from "@/components/StudyLogClient";

export const metadata = {
  title: "ثبت گزارش مطالعه و تست",
};

export default async function StudyLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    subjectId?: string;
    topic?: string;
    mins?: string;
    date?: string;
    source?: string;
  }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const todayIso = getTehranToday();

  const [subjects, logs] = await Promise.all([
    getUserSubjects(user.id),
    getUserStudyLogs(user.id, { limit: 60 }),
  ]);

  return (
    <StudyLogClient
      subjects={subjects}
      initialLogs={logs}
      todayIso={todayIso}
      prefill={{
        subjectId: sp.subjectId ? Number(sp.subjectId) : undefined,
        topic: sp.topic,
        mins: sp.mins ? Number(sp.mins) : undefined,
        date: sp.date,
        sourceNote: sp.source,
      }}
    />
  );
}
