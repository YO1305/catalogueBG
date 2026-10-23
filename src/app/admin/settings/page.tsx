import { DirectoryScreen } from "@/components/admin/DirectoryScreen";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireSession();
  const db = await getDb();
  return <DirectoryScreen role={session.role} collections={db.collections} fabricTypes={db.fabricTypes} productTypes={db.productTypes} glossary={db.glossary} />;
}
