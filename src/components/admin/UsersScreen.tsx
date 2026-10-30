"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { createUserAction, deleteUserAction } from "@/lib/actions";
import { isQuotaFail, runAdminAction } from "@/lib/runAdminAction";
import type { PublicUser, Role } from "@/types";

export function UsersScreen({ users }: { users: PublicUser[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "designer" as Role });
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <h1 className="font-display text-4xl">{t("users.title")}</h1>
      <ul className="mt-4 space-y-2">
        {users.map((user) => (
          <li key={user.id} className="flex items-center justify-between bg-white px-3 py-2 text-sm">
            <span>
              {user.name} · {user.email} · {t(`users.${user.role}`)}
            </span>
            <button type="button" disabled={busy} onClick={async () => {
              setBusy(true);
              try {
                const result = await runAdminAction(t, () => deleteUserAction(user.id));
                if (!result || isQuotaFail(result) || !result.ok) return;
                router.refresh();
              } finally {
                setBusy(false);
              }
            }}>
              {t("common.delete")}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-6 grid max-w-lg gap-3 bg-white p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try {
            const result = await runAdminAction(t, () => createUserAction(form));
            if (!result || isQuotaFail(result) || !result.ok) return;
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="font-display text-2xl">{t("users.create")}</h2>
        <Label>{t("common.name")}</Label>
        <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Label>{t("auth.email")}</Label>
        <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        <Label>{t("auth.password")}</Label>
        <Input type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
        <Label>{t("users.role")}</Label>
        <select className="h-10 border px-2" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
          <option value="admin">{t("users.admin")}</option>
          <option value="designer">{t("users.designer")}</option>
          <option value="manager">{t("users.manager")}</option>
        </select>
        <Button type="submit" disabled={busy}>{t("common.create")}</Button>
      </form>
    </div>
  );
}
