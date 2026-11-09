import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const sp = await searchParams;
  const initialTab = sp.tab === "register" ? "register" : "login";

  return <LoginForm initialTab={initialTab} />;
}
