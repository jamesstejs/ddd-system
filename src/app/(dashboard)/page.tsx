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
import { toDateString } from "@/lib/utils/dateUtils";
import { getZasahyForTechnik } from "@/lib/supabase/queries/zasahy";
import {
  getAktivniPripominky,
  getAktivniPripominkyTechnik,
} from "@/lib/supabase/queries/pripominky";
import { getProtokolyByStatus } from "@/lib/supabase/queries/protokoly";
import { sumNeuhrazeneFaktury } from "@/lib/supabase/queries/faktury";
import { formatCasCz, formatDatumCzLong } from "@/lib/utils/dostupnostUtils";

/** Format YYYY-MM-DD → "9. 3." (short Czech date) */
function formatDatumShort(datum: string): string {
  const [, m, d] = datum.split("-").map(Number);
  return `${d}. ${m}.`;
}

async function ProtokolyKeSchvaleniWidget({
  supabase,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  let protokoly: { id: string; cislo_protokolu: string | null; zasahy: unknown }[] = [];
  try {
    const { data } = await getProtokolyByStatus(supabase, "ke_schvaleni");
    protokoly = (data ?? []) as typeof protokoly;
  } catch {
    // fallback
  }

  function getKlientName(p: { zasahy: unknown }): string {
    const zasahy = p.zasahy as Record<string, unknown> | null;
    const zakazky = zasahy?.zakazky as Record<string, unknown> | null;
    const objekty = zakazky?.objekty as Record<string, unknown> | null;
    const klient = objekty?.klienti as { nazev?: string; jmeno?: string; prijmeni?: string } | null;
    if (!klient) return "\u2014";
    return klient.nazev || `${klient.prijmeni ?? ""} ${klient.jmeno ?? ""}`.trim() || "\u2014";
  }

  return (
    <Link href="/protokoly">
      <Card className="transition-colors active:bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Protokoly ke schválení</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{protokoly.length}</p>
          {protokoly.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {protokoly.slice(0, 3).map((p) => (
                <li key={p.id} className="text-sm text-muted-foreground truncate">
                  {p.cislo_protokolu || "Bez čísla"} &ndash; {getKlientName(p)}
                </li>
              ))}
              {protokoly.length > 3 && (
                <li className="text-xs text-muted-foreground">
                  +{protokoly.length - 3} dalších
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Žádné protokoly</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

async function NeuhrazeneFakturyWidget({
  supabase,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  let count = 0;
  let suma = 0;
  try {
    const result = await sumNeuhrazeneFaktury(supabase);
    count = result.count;
    suma = result.suma;
  } catch {
    // fallback
  }

  const formattedSuma = new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(suma);

  return (
    <Link href="/faktury">
      <Card
        className={`transition-colors active:bg-muted/50 ${
          count > 0 ? "border-amber-200 bg-amber-50" : ""
        }`}
      >
        <CardHeader>
          <CardTitle className="text-base">Neuhrazené faktury</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${count > 0 ? "text-amber-700" : ""}`}>
            {count}
          </p>
          {count > 0 ? (
            <p className="text-sm text-amber-600">
              Celkem {formattedSuma}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Vše uhrazeno
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
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

  // Nedomluvené termíny — reálná data
  type PripominkaRow = {
    id: string;
    created_at: string;
    profiles: { jmeno: string | null; prijmeni: string | null } | null;
    zasahy: { datum: string } | null;
    zakazky: { objekty: { klienti: { nazev: string; jmeno: string; prijmeni: string; typ: string } } } | null;
  };
  let pripominky: PripominkaRow[] = [];
  try {
    const { data } = await getAktivniPripominky(supabase);
    pripominky = (data ?? []) as PripominkaRow[];
  } catch {
    // fallback
  }

  function getPripominkaKlientName(p: PripominkaRow): string {
    const klient = p.zakazky?.objekty?.klienti;
    if (!klient) return "—";
    if (klient.typ === "firma") return klient.nazev;
    return `${klient.prijmeni} ${klient.jmeno}`.trim();
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ProtokolyKeSchvaleniWidget supabase={supabase} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nedomluvené termíny</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{pripominky.length}</p>
          {pripominky.length > 0 ? (
            <div className="mt-1 space-y-1">
              {pripominky.slice(0, 5).map((p) => (
                <p key={p.id} className="text-sm text-muted-foreground">
                  {getPripominkaKlientName(p)}
                  {p.profiles && (
                    <span className="text-xs"> — {p.profiles.jmeno} {p.profiles.prijmeni}</span>
                  )}
                  {p.zasahy?.datum && (
                    <span className="text-xs"> ({formatDatumShort(p.zasahy.datum)})</span>
                  )}
                </p>
              ))}
              {pripominky.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  a dalších {pripominky.length - 5}...
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Žádné nedomluvené termíny
            </p>
          )}
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
      <NeuhrazeneFakturyWidget supabase={supabase} />
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

  // Můj den — reálná data
  const dnes = toDateString(new Date());
  let dnesnizasahy: { id: string; cas_od: string; cas_do: string; status: string; zakazky: { objekty: { klienti: { nazev: string; jmeno: string; prijmeni: string; typ: string } } } | null }[] = [];
  try {
    const { data } = await getZasahyForTechnik(supabase, userId, dnes, dnes);
    dnesnizasahy = (data ?? []).filter((z: { status: string }) => z.status !== "zruseno") as typeof dnesnizasahy;
  } catch {
    // fallback
  }

  function getKlientName(z: typeof dnesnizasahy[number]): string {
    const klient = z.zakazky?.objekty?.klienti;
    if (!klient) return "—";
    if (klient.typ === "firma") return klient.nazev;
    return `${klient.prijmeni} ${klient.jmeno}`.trim();
  }

  // Klienti k domluvení — reálná data
  type TechnikPripominkaRow = {
    id: string;
    created_at: string;
    zasahy: { datum: string } | null;
    zakazky: { objekty: { klienti: { nazev: string; jmeno: string; prijmeni: string; typ: string } } } | null;
  };
  let mojePripominky: TechnikPripominkaRow[] = [];
  try {
    const { data } = await getAktivniPripominkyTechnik(supabase, userId);
    mojePripominky = (data ?? []) as TechnikPripominkaRow[];
  } catch {
    // fallback
  }

  function getPripominkaKlient(p: TechnikPripominkaRow): string {
    const klient = p.zakazky?.objekty?.klienti;
    if (!klient) return "—";
    if (klient.typ === "firma") return klient.nazev;
    return `${klient.prijmeni} ${klient.jmeno}`.trim();
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Link href="/kalendar" className="contents">
        <Card className="cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted/70">
          <CardHeader>
            <CardTitle className="text-base">Můj den</CardTitle>
          </CardHeader>
          <CardContent>
            {dnesnizasahy.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Žádné zásahy na dnes.
              </p>
            ) : (
              <div className="space-y-1">
                <p className="text-2xl font-bold">{dnesnizasahy.length}</p>
                <p className="text-sm text-muted-foreground">
                  {dnesnizasahy.length === 1
                    ? "zásah dnes"
                    : dnesnizasahy.length < 5
                      ? "zásahy dnes"
                      : "zásahů dnes"}
                </p>
                {dnesnizasahy.slice(0, 3).map((z) => (
                  <p key={z.id} className="text-sm text-muted-foreground">
                    {formatCasCz(z.cas_od.substring(0, 5))} — {getKlientName(z)}
                  </p>
                ))}
                {dnesnizasahy.length > 3 && (
                  <p className="text-sm text-muted-foreground">
                    a dalších {dnesnizasahy.length - 3}...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Klienti k domluvení</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{mojePripominky.length}</p>
          {mojePripominky.length > 0 ? (
            <div className="mt-1 space-y-1">
              {mojePripominky.slice(0, 3).map((p) => (
                <p key={p.id} className="text-sm text-muted-foreground">
                  {getPripominkaKlient(p)}
                  {p.zasahy?.datum && (
                    <span className="text-xs"> (zásah {formatDatumShort(p.zasahy.datum)})</span>
                  )}
                </p>
              ))}
              {mojePripominky.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  a dalších {mojePripominky.length - 3}...
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Žádní klienti k domluvení
            </p>
          )}
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
