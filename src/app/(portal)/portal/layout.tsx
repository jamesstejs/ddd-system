import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { AppRole } from "@/types/roles";

export default async function PortalLayout({
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
    .select("jmeno, prijmeni, aktivni_role, klient_id")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  // Only klient role can access portal
  const role = profile.aktivni_role as AppRole;
  if (role !== "klient") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Portal Top Bar */}
      <header className="sticky top-0 z-50 border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-primary">Deraplus</h1>
            <p className="text-xs text-muted-foreground">Klientský portál</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {profile.jmeno} {profile.prijmeni}
            </p>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-xs text-muted-foreground underline"
              >
                Odhlásit se
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Portal Navigation */}
      <nav className="border-b bg-white px-4">
        <div className="mx-auto flex max-w-2xl gap-1 overflow-x-auto">
          <Link
            href="/portal"
            className="whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground active:text-foreground [&.active]:border-primary [&.active]:text-foreground"
          >
            Přehled
          </Link>
          <Link
            href="/portal/protokoly"
            className="whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground active:text-foreground"
          >
            Protokoly
          </Link>
          <Link
            href="/portal/faktury"
            className="whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground active:text-foreground"
          >
            Faktury
          </Link>
          <Link
            href="/portal/terminy"
            className="whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground active:text-foreground"
          >
            Termíny
          </Link>
        </div>
      </nav>

      {/* Portal Content */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4">
        {children}
      </main>

      {/* Portal Footer */}
      <footer className="border-t bg-white px-4 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} AHELP Group, s.r.o. (Deraplus) · 800 130 303 · info@deraplus.cz
        </p>
      </footer>
    </div>
  );
}
