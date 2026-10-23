import { translate } from "@/lib/i18n";

export default function NotFound() {
  return <p className="p-10 font-display text-3xl">{translate("ru", "catalog.searchEmpty")}</p>;
}
