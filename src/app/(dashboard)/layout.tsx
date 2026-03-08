import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopBarWrapper } from "@/components/layout/TopBarWrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBarWrapper profile={profile} />
      <main className="flex-1 px-4 pb-20 pt-4">{children}</main>
      <BottomNav aktivniRole={profile.aktivni_role} />
    </div>
  );
}
