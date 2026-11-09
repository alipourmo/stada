import { requireUser } from "@/lib/auth";
import { getUserSubjects } from "@/lib/db";
import { DEFAULT_EXAM_DATE } from "@/lib/constants";
import SettingsClient from "@/components/SettingsClient";

export const metadata = {
  title: "پروفایل و تنظیمات دروس",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const subjects = await getUserSubjects(user.id);

  return (
    <SettingsClient
      user={{
        name: user.name,
        email: user.email,
        study_field: user.study_field,
        target_exam_date: user.target_exam_date || DEFAULT_EXAM_DATE,
        target_hours: user.target_hours,
      }}
      initialSubjects={subjects}
    />
  );
}
