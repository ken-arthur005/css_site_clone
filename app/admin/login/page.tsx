import { redirect } from "next/navigation";
import { AdminLogin } from "@/components/admin/admin-login";
import { currentStaff } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  // Only same-site admin paths are allowed as a destination after signing in.
  const next = typeof query.next === "string" && /^\/admin(\/|\?|$)/.test(query.next) ? query.next : "/admin";
  if (await currentStaff()) redirect(next);
  return <div className="admin-page"><AdminLogin next={next} /></div>;
}
