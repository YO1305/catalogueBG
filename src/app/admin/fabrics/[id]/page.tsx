import { redirect } from "next/navigation";

export default async function EditFabricPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/fabrics?edit=${encodeURIComponent(id)}`);
}
