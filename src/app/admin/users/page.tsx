import { UsersScreen } from "@/components/admin/UsersScreen";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireSession(["admin"]);
  const db = await getDb();
  return <UsersScreen users={db.users.map(({ passwordHash: _hash, ...user }) => user)} />;
}
