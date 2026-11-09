import { requireUser } from "@/lib/auth";
import { getClassLeaderboard } from "@/lib/db";
import ClassManagerClient from "@/components/ClassManagerClient";

export const metadata = {
  title: "مدیریت کلاس",
};

export default async function ClassPage() {
  const user = await requireUser();
  let currentClass: { code: string; name: string; memberCount: number } | null =
    null;

  if (user.class_code) {
    const { classInfo, members } = await getClassLeaderboard(user.class_code);
    if (classInfo) {
      currentClass = {
        code: classInfo.code,
        name: classInfo.name,
        memberCount: members.length,
      };
    }
  }

  return <ClassManagerClient currentClass={currentClass} />;
}
