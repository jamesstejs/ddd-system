import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AppRole } from "@/lib/auth";
import {
  getTechniciWithoutDostupnost,
  countDaysWithDostupnost,
} from "@/lib/supabase/queries/dostupnost";
import {
  getAvailableDateRange,
  countWorkDays,
  getDostupnostStatus,
} from "@/lib/utils/dostupnostUtils";

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function AdminDashboard({
  supabase,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  // Technici bez směn — reálná data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const za14 = new Date(today);
  za14.setDate(za14.getDate() + 14);

  let techniciBezSmen: { id: string; jmeno: string | null; prijmeni: string | null }[] = [];
  try {
    const { data } = await getTechniciWithoutDostupnost(
      supabase,
      toDateString(today),
      toDateString(za14),
    );
    techniciBezSmen = data ?? [];
  } catch {
    // RLS může blokovat pokud nejsme admin — fallback na 0
  }

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
          <p className="text-2xl font-bold">{techniciBezSmen.length}</p>
          {techniciBezSmen.length > 0 ? (
            <div className="mt-1 space-y-1">
              {techniciBezSmen.slice(0, 5).map((t) => (
                <p key={t.id} className="text-sm text-muted-foreground">
                  {t.jmeno} {t.prijmeni}
                </p>
              ))}
              {techniciBezSmen.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  a dalších {techniciBezSmen.length - 5}...
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Všichni technici mají vyplněno
            </p>
          )}
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

async function TechnikDashboard({
  supabase,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}) {
  // Dostupnost stats — reálná data
  const { od, do: doDate } = getAvailableDateRange();
  const datumOd = toDateString(od);
  const datumDo = toDateString(doDate);

  let filledDays = 0;
  try {
    filledDays = await countDaysWithDostupnost(supabase, userId, datumOd, datumDo);
  } catch {
    // fallback
  }

  const totalWorkDays = countWorkDays(od, doDate);
  const status = getDostupnostStatus(filledDays, totalWorkDays);

  const statusColors = {
    ok: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    critical: "bg-red-100 text-red-800",
  };

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
      <Link href="/dostupnost" className="contents">
        <Card className="cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted/70">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Vyplnit dostupnost</CardTitle>
            <Badge className={statusColors[status]}>
              {status === "ok"
                ? "OK"
                : status === "warning"
                  ? "Částečně"
                  : "Chybí"}
            </Badge>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {filledDays} / {totalWorkDays}
            </p>
            <p className="text-sm text-muted-foreground">
              pracovních dní vyplněno
            </p>
          </CardContent>
        </Card>
      </Link>
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
    .is("deleted_at", null)
    .single();

  const role: AppRole = profile?.aktivni_role || "technik";

  return (
    <div className="space-y-4">
      {(role === "admin" || role === "super_admin") && (
        <AdminDashboard supabase={supabase} />
      )}
      {role === "technik" && (
        <TechnikDashboard supabase={supabase} userId={user.id} />
      )}
      {role === "klient" && <KlientDashboard />}
    </div>
  );
}
