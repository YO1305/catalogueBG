import { UsersScreen } from "@/components/admin/UsersScreen";
import { requireSession } from "@/lib/auth";
import { getUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [, users] = await Promise.all([requireSession(["admin"]), getUsers()]);
  return <UsersScreen users={users.map(({ passwordHash: _hash, ...user }) => user)} />;
}
