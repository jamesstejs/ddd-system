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
import { getBonusySummary, getAllBonusySummary, getCurrentMonthStart } from "@/lib/supabase/queries/bonusy";
import { getOverdueZasahy } from "@/lib/supabase/queries/zasahy";

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

async function MojePremieWidget({
  supabase,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}) {
  const mesic = getCurrentMonthStart();
  let summary = { pending: 0, proplaceno: 0, celkem: 0, pocet: 0 };
  try {
    summary = await getBonusySummary(supabase, userId, mesic);
  } catch {
    // fallback
  }

  const formattedCelkem = new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(summary.celkem);

  const formattedPending = new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(summary.pending);

  return (
    <Link href="/premie" className="contents">
      <Card className="cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted/70">
        <CardHeader>
          <CardTitle className="text-base">Moje prémie</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formattedCelkem}</p>
          {summary.pocet > 0 ? (
            <p className="text-sm text-muted-foreground">
              {summary.pocet} {summary.pocet === 1 ? "bonus" : summary.pocet < 5 ? "bonusy" : "bonusů"}
              {summary.pending > 0 && (
                <span className="text-amber-600 ml-1">
                  ({formattedPending} k proplacení)
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tento měsíc zatím žádné
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

async function ProtokolyKOdeslaniWidget({
  supabase,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  let protokoly: { id: string; cislo_protokolu: string | null; zasahy: unknown }[] = [];
  try {
    const { data } = await getProtokolyByStatus(supabase, "schvaleny");
    protokoly = (data ?? []) as typeof protokoly;
  } catch {
    // fallback
  }

  return (
    <Link href="/protokoly">
      <Card className={`transition-colors active:bg-muted/50 ${protokoly.length > 0 ? "border-blue-200 bg-blue-50" : ""}`}>
        <CardHeader>
          <CardTitle className="text-base">Protokoly k odeslání</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${protokoly.length > 0 ? "text-blue-700" : ""}`}>{protokoly.length}</p>
          <p className="text-sm text-muted-foreground">
            {protokoly.length > 0 ? "Schválené, čekají na odeslání" : "Vše odesláno"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

async function VeciVeZpozdeniWidget({
  supabase,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const dnes = toDateString(new Date());
  type OverdueRow = {
    id: string;
    datum: string;
    cas_od: string;
    status: string;
    profiles: { jmeno: string | null; prijmeni: string | null } | null;
    zakazky: { objekty: { nazev: string; klienti: { nazev: string; jmeno: string; prijmeni: string; typ: string } } } | null;
  };
  let overdueZasahy: OverdueRow[] = [];
  try {
    const { data } = await getOverdueZasahy(supabase, dnes);
    overdueZasahy = (data ?? []) as OverdueRow[];
  } catch {
    // fallback
  }

  function getKlient(z: OverdueRow): string {
    const klient = z.zakazky?.objekty?.klienti;
    if (!klient) return "\u2014";
    if (klient.typ === "firma") return klient.nazev;
    return `${klient.prijmeni} ${klient.jmeno}`.trim();
  }

  const count = overdueZasahy.length;

  return (
    <Link href="/kalendar">
      <Card className={`transition-colors active:bg-muted/50 ${count > 0 ? "border-red-200 bg-red-50" : ""}`}>
        <CardHeader>
          <CardTitle className="text-base">Věci ve zpoždění</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${count > 0 ? "text-red-700" : ""}`}>{count}</p>
          {count > 0 ? (
            <div className="mt-1 space-y-1">
              {overdueZasahy.slice(0, 3).map((z) => (
                <p key={z.id} className="text-sm text-red-600 truncate">
                  {formatDatumShort(z.datum)} — {getKlient(z)}
                  {z.profiles && <span className="text-xs"> ({z.profiles.jmeno})</span>}
                </p>
              ))}
              {count > 3 && (
                <p className="text-xs text-muted-foreground">+{count - 3} dalších</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nic ve zpoždění</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

async function PrehledOdmenVsechWidget({
  supabase,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const mesic = getCurrentMonthStart();
  let summary = { pending: 0, proplaceno: 0, celkem: 0, pocet: 0 };
  try {
    summary = await getAllBonusySummary(supabase, mesic);
  } catch {
    // fallback
  }

  const formattedCelkem = new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(summary.celkem);

  const formattedPending = new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(summary.pending);

  return (
    <Link href="/premie">
      <Card className="transition-colors active:bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Odměny celkem (všichni)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formattedCelkem}</p>
          <p className="text-sm text-muted-foreground">
            {summary.pocet} {summary.pocet === 1 ? "bonus" : summary.pocet < 5 ? "bonusy" : "bonusů"}
            {summary.pending > 0 && (
              <span className="text-amber-600 ml-1">
                ({formattedPending} k proplacení)
              </span>
            )}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

async function AdminDashboard({
  supabase,
  userId,
  isSuperAdmin = false,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  isSuperAdmin?: boolean;
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
      <ProtokolyKOdeslaniWidget supabase={supabase} />
      <VeciVeZpozdeniWidget supabase={supabase} />
      <MojePremieWidget supabase={supabase} userId={userId} />
      {isSuperAdmin && <PrehledOdmenVsechWidget supabase={supabase} />}

      {/* Quick Actions */}
      <Card className="sm:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Rychlé akce</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/zakazky"
              className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
            >
              + Nová zakázka
            </Link>
            <Link
              href="/klienti"
              className="inline-flex min-h-[44px] items-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70"
            >
              + Nový klient
            </Link>
            <Link
              href="/kalendar"
              className="inline-flex min-h-[44px] items-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70"
            >
              Kalendář
            </Link>
            <Link
              href="/protokoly"
              className="inline-flex min-h-[44px] items-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70"
            >
              Protokoly
            </Link>
            <Link
              href="/faktury"
              className="inline-flex min-h-[44px] items-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70"
            >
              Faktury
            </Link>
          </div>
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
      <MojePremieWidget supabase={supabase} userId={userId} />

      {/* Quick Actions */}
      <Card className="sm:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Rychlé akce</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/kalendar"
              className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
            >
              Můj den
            </Link>
            <Link
              href="/dostupnost"
              className="inline-flex min-h-[44px] items-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70"
            >
              Dostupnost
            </Link>
            <Link
              href="/premie"
              className="inline-flex min-h-[44px] items-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70"
            >
              Prémie
            </Link>
          </div>
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
        <AdminDashboard supabase={supabase} userId={user.id} isSuperAdmin={role === "super_admin"} />
      )}
      {role === "technik" && (
        <TechnikDashboard supabase={supabase} userId={user.id} />
      )}
      {role === "klient" && <KlientDashboard />}
    </div>
  );
}
