import { redirect } from "next/navigation";
import { AdminApp } from "@/components/admin/admin-app";
import { currentStaff } from "@/lib/admin/session";
import { getMerchStore } from "@/lib/content/merch-store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await currentStaff();
  if (!user) redirect("/admin/login");
  return <div className="admin-page"><AdminApp user={user} content={await getMerchStore()} /></div>;
}
