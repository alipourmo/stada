import { requireUser } from "@/lib/auth";
import { getUserTestResults } from "@/lib/db";
import TestsClient from "@/components/TestsClient";

export const metadata = {
  title: "ثبت تست",
};

export default async function TestsPage() {
  const user = await requireUser();
  const history = await getUserTestResults(user.id, 50);

  return <TestsClient initialTests={history} />;
}
