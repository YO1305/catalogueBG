"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18n";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { ADMIN_SECTIONS, defaultSectionsForRole, sectionLabelKey } from "@/lib/adminAccess";
import { createUserAction, deleteUserAction, updateUserAccessAction } from "@/lib/actions";
import type { AdminSection, PublicUser, Role } from "@/types";

const EDITABLE_SECTIONS = ADMIN_SECTIONS.filter((item) => item !== "access");

function UserAccessRow({ user, selfId }: { user: PublicUser; selfId?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [role, setRole] = useState<Role>(user.role);
  const [sections, setSections] = useState<AdminSection[]>(user.sections?.length ? user.sections : defaultSectionsForRole(user.role));
  const [open, setOpen] = useState(false);

  const toggle = (section: AdminSection) => {
    setSections((prev) => (prev.includes(section) ? prev.filter((item) => item !== section) : [...prev, section]));
  };

  return (
    <li className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="min-w-0 text-left" onClick={() => setOpen((value) => !value)}>
          <span className="font-medium">{user.name}</span>
          <span className="block truncate text-xs text-ink/60">
            {user.email} · {t(`users.${user.role}`)}
          </span>
        </button>
        {user.id !== selfId ? (
          <button
            type="button"
            className="text-xs text-red-700 underline"
            onClick={async () => {
              await deleteUserAction(user.id);
              router.refresh();
            }}
          >
            {t("common.delete")}
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="mt-3 space-y-3 border-t border-ink/10 pt-3">
          <div>
            <Label>{t("users.role")}</Label>
            <select
              className="mt-1 h-10 w-full border px-2"
              value={role}
              onChange={(event) => {
                const next = event.target.value as Role;
                setRole(next);
                setSections(defaultSectionsForRole(next));
              }}
            >
              <option value="admin">{t("users.admin")}</option>
              <option value="designer">{t("users.designer")}</option>
              <option value="manager">{t("users.manager")}</option>
            </select>
          </div>
          {role !== "admin" ? (
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-ink/55">{t("access.sections")}</legend>
              {EDITABLE_SECTIONS.map((section) => (
                <label key={section} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={sections.includes(section)} onChange={() => toggle(section)} />
                  {t(sectionLabelKey(section))}
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="text-xs text-ink/55">{t("access.adminAll")}</p>
          )}
          <Button
            type="button"
            onClick={async () => {
              await updateUserAccessAction({ id: user.id, role, sections: role === "admin" ? null : sections });
              router.refresh();
            }}
          >
            {t("common.save")}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export function AccessScreen({ users, selfId }: { users: PublicUser[]; selfId?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "designer" as Role });
  const [sections, setSections] = useState<AdminSection[]>(() => defaultSectionsForRole("designer"));
  const preset = useMemo(() => defaultSectionsForRole(form.role), [form.role]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink/70">{t("access.hint")}</p>
      <ul className="space-y-2">
        {users.map((user) => (
          <UserAccessRow key={user.id} user={user} selfId={selfId} />
        ))}
      </ul>
      <form
        className="grid max-w-lg gap-3 rounded-xl border border-ink/10 bg-white p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await createUserAction({ ...form, sections: form.role === "admin" ? undefined : sections });
          setForm({ email: "", name: "", password: "", role: "designer" });
          setSections(defaultSectionsForRole("designer"));
          router.refresh();
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
        <select
          className="h-10 border px-2"
          value={form.role}
          onChange={(event) => {
            const role = event.target.value as Role;
            setForm({ ...form, role });
            setSections(defaultSectionsForRole(role));
          }}
        >
          <option value="admin">{t("users.admin")}</option>
          <option value="designer">{t("users.designer")}</option>
          <option value="manager">{t("users.manager")}</option>
        </select>
        {form.role !== "admin" ? (
          <fieldset className="grid gap-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-ink/55">{t("access.sections")}</legend>
            {EDITABLE_SECTIONS.map((section) => (
              <label key={section} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sections.includes(section)}
                  onChange={() => setSections((prev) => (prev.includes(section) ? prev.filter((item) => item !== section) : [...prev, section]))}
                />
                {t(sectionLabelKey(section))}
              </label>
            ))}
          </fieldset>
        ) : null}
        <Button type="submit">{t("common.create")}</Button>
        {form.role !== "admin" ? (
          <button type="button" className="text-left text-xs text-ink/55 underline" onClick={() => setSections(preset)}>
            {t("access.resetPreset")}
          </button>
        ) : null}
      </form>
      <p className="text-xs text-ink/50">{t("access.relogin")}</p>
    </div>
  );
}
