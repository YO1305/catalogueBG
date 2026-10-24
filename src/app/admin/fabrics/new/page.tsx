import { redirect } from "next/navigation";

export default function NewFabricPage() {
  redirect("/admin/fabrics?create=1");
}
