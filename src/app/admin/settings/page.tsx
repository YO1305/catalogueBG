import { DirectoryScreen } from "@/components/admin/DirectoryScreen";
import { requireSession } from "@/lib/auth";
import { getDictionaries } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [session, db] = await Promise.all([requireSession(), getDictionaries()]);
  return <DirectoryScreen role={session.role} collections={db.collections} fabricTypes={db.fabricTypes} productTypes={db.productTypes} glossary={db.glossary} />;
}
