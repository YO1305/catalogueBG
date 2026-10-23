import { AdminFrame } from "@/components/admin/AdminFrame";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return <AdminFrame session={session}>{children}</AdminFrame>;
}
