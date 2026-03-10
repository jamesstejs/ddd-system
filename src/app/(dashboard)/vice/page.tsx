import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ROLE_LABELS } from "@/types/roles";
import { LogoutButton } from "./LogoutButton";

export default async function VicePage() {
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

  if (!profile) redirect("/login");

  const isAdmin =
    profile.aktivni_role === "admin" ||
    profile.aktivni_role === "super_admin";
  const isTechnik = profile.aktivni_role === "technik";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Jméno</p>
            <p className="font-medium">
              {profile.jmeno} {profile.prijmeni}
            </p>
          </div>
          <Separator />
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{profile.email}</p>
          </div>
          {profile.telefon && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Telefon</p>
                <p className="font-medium">{profile.telefon}</p>
              </div>
            </>
          )}
          <Separator />
          <div>
            <p className="text-sm text-muted-foreground">Aktivní role</p>
            <p className="font-medium">
              {ROLE_LABELS[profile.aktivni_role]}
            </p>
          </div>
        </CardContent>
      </Card>

      {isTechnik && (
        <Card>
          <CardContent className="space-y-1 pt-6">
            <Link
              href="/dostupnost"
              className="flex min-h-[44px] items-center text-sm font-medium underline-offset-4 hover:underline active:underline focus-visible:underline"
            >
              Moje dostupnost
            </Link>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardContent className="space-y-1 pt-6">
            <Link
              href="/uzivatele"
              className="flex min-h-[44px] items-center text-sm font-medium underline-offset-4 hover:underline active:underline focus-visible:underline"
            >
              Správa uživatelů
            </Link>
            <Link
              href="/skudci"
              className="flex min-h-[44px] items-center text-sm font-medium underline-offset-4 hover:underline active:underline focus-visible:underline"
            >
              Škůdci
            </Link>
            <Link
              href="/pripravky"
              className="flex min-h-[44px] items-center text-sm font-medium underline-offset-4 hover:underline active:underline focus-visible:underline"
            >
              Přípravky
            </Link>
          </CardContent>
        </Card>
      )}

      {profile.aktivni_role === "super_admin" && (
        <Card>
          <CardContent className="pt-6">
            <Link
              href="/nastaveni"
              className="flex min-h-[44px] items-center text-sm font-medium underline-offset-4 hover:underline active:underline focus-visible:underline"
            >
              Nastavení systému
            </Link>
          </CardContent>
        </Card>
      )}

      <LogoutButton />
    </div>
  );
}
