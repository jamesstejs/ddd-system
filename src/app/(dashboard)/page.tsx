import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AppRole } from "@/lib/auth";

function AdminDashboard() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Protokoly ke schválení</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">
            Bude implementováno ve sprintu 21
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nedomluvené termíny</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">
            Bude implementováno ve sprintu 14
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Technici bez směn</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">
            Bude implementováno ve sprintu 10
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Neuhrazené faktury</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">
            Bude implementováno ve sprintu 29
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function TechnikDashboard() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Můj den</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Žádné zásahy na dnes.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Bude implementováno ve sprintu 12
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Klienti k domluvení</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">
            Bude implementováno ve sprintu 14
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vyplnit dostupnost</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Bude implementováno ve sprintu 10
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Moje prémie</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">0 Kč</p>
          <p className="text-sm text-muted-foreground">
            Bude implementováno ve sprintu 30
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function KlientDashboard() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Moje protokoly</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Bude implementováno ve sprintu 32
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Moje faktury</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Bude implementováno ve sprintu 32
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("aktivni_role")
    .eq("id", user.id)
    .single();

  const role: AppRole = profile?.aktivni_role || "technik";

  return (
    <div className="space-y-4">
      {(role === "admin" || role === "super_admin") && <AdminDashboard />}
      {role === "technik" && <TechnikDashboard />}
      {role === "klient" && <KlientDashboard />}
    </div>
  );
}
