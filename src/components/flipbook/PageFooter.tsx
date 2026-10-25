"use client";

import { Mail, MapPin, Phone, Send } from "lucide-react";
import { useI18n } from "@/components/i18n/I18n";
import { contactAddress } from "@/lib/localize";
import type { Catalog } from "@/types";

function telegramHandle(value: string) {
  const clean = value.trim().replace(/^https?:\/\/t\.me\//i, "");
  return clean.startsWith("@") ? clean : `@${clean}`;
}

/** Contacts on every inner page: small, but large enough to read on a phone. */
export function PageFooter({ catalog }: { catalog: Catalog }) {
  const { lang } = useI18n();
  const { phone, telegram, email } = catalog.contacts;
  const address = contactAddress(catalog, lang);
  const items = [
    phone ? { key: "phone", icon: Phone, text: phone } : null,
    telegram ? { key: "telegram", icon: Send, text: telegramHandle(telegram) } : null,
    email ? { key: "email", icon: Mail, text: email } : null,
    address ? { key: "address", icon: MapPin, text: address } : null,
  ].filter((item) => item !== null);
  if (!items.length) return null;
  return (
    <footer
      className="flex shrink-0 flex-wrap items-center justify-center gap-x-[1.1em] gap-y-[0.2em] border-t px-[6%] py-[1.6%] text-[0.6em] leading-none"
      style={{ borderColor: "var(--line)", color: "var(--muted)" }}
    >
      {items.map(({ key, icon: Icon, text }) => (
        <span key={key} className="flex min-w-0 items-center gap-[0.35em]">
          <Icon className="h-[1.1em] w-[1.1em] shrink-0" aria-hidden />
          <span className="truncate">{text}</span>
        </span>
      ))}
    </footer>
  );
}
