import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfiles } from "@/lib/supabase/queries/profiles";
import { UserList } from "./UserList";

export default async function UzivatelePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profiles } = await getProfiles(supabase);

  return <UserList profiles={profiles || []} />;
}
