import { SettingsScreen } from "@/components/admin/SettingsScreen";
import { requireSession } from "@/lib/auth";
import { getDictionaries, getUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [session, db, users, params] = await Promise.all([requireSession(), getDictionaries(), getUsers(), searchParams]);
  return (
    <SettingsScreen
      role={session.role}
      sessionSections={session.sections}
      selfId={session.uid}
      users={users.map(({ passwordHash: _hash, ...user }) => user)}
      collections={db.collections}
      fabricTypes={db.fabricTypes}
      finishes={db.finishes}
      productTypes={db.productTypes}
      glossary={db.glossary}
      initialTab={params.tab}
    />
  );
}
