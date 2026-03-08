import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getKlient } from "@/lib/supabase/queries/klienti";
import { getObjekt } from "@/lib/supabase/queries/objekty";
import { getOkruhy } from "@/lib/supabase/queries/okruhy";
import { ObjektDetail } from "./ObjektDetail";

export default async function ObjektDetailPage({
  params,
}: {
  params: Promise<{ id: string; objektId: string }>;
}) {
  const { id: klientId, objektId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: klient }, { data: objekt }] = await Promise.all([
    getKlient(supabase, klientId),
    getObjekt(supabase, objektId),
  ]);

  if (!klient || !objekt) notFound();

  // Verify objekt belongs to this klient
  if (objekt.klient_id !== klientId) notFound();

  const { data: okruhy } = await getOkruhy(supabase, objektId);

  return (
    <ObjektDetail
      klient={klient}
      objekt={objekt}
      okruhy={okruhy || []}
    />
  );
}
