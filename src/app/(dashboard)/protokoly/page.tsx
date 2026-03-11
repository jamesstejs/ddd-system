import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/queries/profiles";
import { getProtokoly } from "@/lib/supabase/queries/protokoly";
import type { AppRole } from "@/lib/auth";
import { ProtokolyList } from "./ProtokolyList";

export default async function ProtokolyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile) redirect("/login");

  const isAdmin = ["admin", "super_admin"].some((r) =>
    (profile.role as AppRole[]).includes(r as AppRole),
  );

  if (!isAdmin) redirect("/");

  const { data: protokoly } = await getProtokoly(supabase);

  return <ProtokolyList protokoly={protokoly || []} />;
}
