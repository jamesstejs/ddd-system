import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/queries/profiles";
import {
  getProtokol,
  getProtokolDeratBody,
  getProtokolDezinsBody,
  getProtokolPostrik,
  getProtokolFotky,
  getLatestProtokolForObjekt,
} from "@/lib/supabase/queries/protokoly";
import { getOkruhy } from "@/lib/supabase/queries/okruhy";
import { getAktivniPripravky } from "@/lib/supabase/queries/pripravky";
import { getSkudci } from "@/lib/supabase/queries/skudci";
import { getEmailLogByProtokol } from "@/lib/supabase/queries/email_log";
import { notFound, redirect } from "next/navigation";
import { ProtokolFormView } from "./ProtokolFormView";
import type { AppRole } from "@/lib/auth";

// Vercel Pro: 30s timeout (default 10s je málo pro chain DB queries)
export const maxDuration = 30;

type TabType = "deratizace" | "dezinsekce" | "postrik";

// Mapování typy_zasahu z DB na naše tab typy
function mapTypyZasahuToTabs(typyZasahu: unknown): TabType[] {
  if (!Array.isArray(typyZasahu)) return ["deratizace"];

  const tabs: TabType[] = [];
  for (const typ of typyZasahu) {
    if (typeof typ !== "string") continue;
    if (
      (typ === "vnitrni_deratizace" || typ === "vnejsi_deratizace") &&
      !tabs.includes("deratizace")
    ) {
      tabs.push("deratizace");
    }
    if (typ === "vnitrni_dezinsekce" && !tabs.includes("dezinsekce")) {
      tabs.push("dezinsekce");
    }
    if (typ === "postrik" && !tabs.includes("postrik")) {
      tabs.push("postrik");
    }
  }

  return tabs.length > 0 ? tabs : ["deratizace"];
}

export default async function ProtokolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Načtení profilu
  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile || !Array.isArray(profile.role)) redirect("/login");

  const isAdmin = ["admin", "super_admin"].some((r) =>
    (profile.role as AppRole[]).includes(r as AppRole),
  );
  const isTechnik = (profile.role as AppRole[]).includes("technik" as AppRole);

  if (!isAdmin && !isTechnik) redirect("/");

  // Načtení protokolu
  const { data: protokol, error } = await getProtokol(supabase, id);
  if (error || !protokol) {
    notFound();
  }

  // Autorizace: admin vidí vše, technik jen své
  let userRole: "admin" | "technik";
  if (isAdmin) {
    userRole = "admin";
  } else if (isTechnik && protokol.technik_id === user.id) {
    userRole = "technik";
  } else {
    redirect("/kalendar");
  }

  // Extrakce objektId a dalších dat z nested relations
  const zasahy = protokol.zasahy as Record<string, unknown> | null;
  const zakazky = zasahy?.zakazky as Record<string, unknown> | null;
  const objekty = zakazky?.objekty as { id: string } | null;
  const objektId = objekty?.id;

  // Extrakce typy_zasahu pro určení tabů
  const typyZasahu = zakazky?.typy_zasahu;
  const availableTabs = mapTypyZasahuToTabs(typyZasahu);

  // Extrakce typ_objektu pro filtrování přípravků postřiku
  const typObjektu =
    ((objekty as Record<string, unknown>)?.typ_objektu as string) || null;

  const needsDezins = availableTabs.includes("dezinsekce");
  const needsPostrik = availableTabs.includes("postrik");
  const needsSkudci = needsDezins || needsPostrik;

  // Najít předchozí protokol pro statistiky (paralelně s ostatním)
  const previousProtokolPromise = objektId
    ? getLatestProtokolForObjekt(supabase, objektId)
    : Promise.resolve({ data: null, error: null });

  // PARALELNÍ načtení nezávislých dat
  const [
    bodyResult,
    pripravkyResult,
    okruhyResult,
    dezinsBodyResult,
    postrikResult,
    skudciResult,
    fotkyResult,
    vetyUcinnostiResult,
    previousProtokolyResult,
    emailLogResult,
  ] = await Promise.all([
    getProtokolDeratBody(supabase, id),
    getAktivniPripravky(supabase),
    objektId
      ? getOkruhy(supabase, objektId)
      : Promise.resolve({ data: null, error: null }),
    needsDezins
      ? getProtokolDezinsBody(supabase, id)
      : Promise.resolve({ data: null, error: null }),
    needsPostrik
      ? getProtokolPostrik(supabase, id)
      : Promise.resolve({ data: null, error: null }),
    needsSkudci
      ? getSkudci(supabase)
      : Promise.resolve({ data: null, error: null }),
    getProtokolFotky(supabase, id),
    supabase
      .from("sablony_pouceni")
      .select("id, nazev, obsah")
      .eq("typ_zasahu", "ucinnost")
      .eq("aktivni", true)
      .is("deleted_at", null),
    previousProtokolPromise,
    getEmailLogByProtokol(supabase, id),
  ]);

  // Načíst body předchozího protokolu pro statistiky
  const previousProtokoly = previousProtokolyResult.data || [];
  const previousProtokol = previousProtokoly.find((p) => {
    if (p.id === id) return false; // vyloučit current
    const zasahyP = p.zasahy as Record<string, unknown> | null;
    const zakazkyP = zasahyP?.zakazky as Record<string, unknown> | null;
    const objektyP = zakazkyP?.objekty as { id: string } | null;
    return objektyP?.id === objektId;
  });

  let previousDeratBody: { pozer_procent: number }[] | null = null;
  let previousDezinsBody: { pocet: number }[] | null = null;

  if (previousProtokol) {
    const [prevDeratResult, prevDezinsResult] = await Promise.all([
      getProtokolDeratBody(supabase, previousProtokol.id),
      getProtokolDezinsBody(supabase, previousProtokol.id),
    ]);
    previousDeratBody = (prevDeratResult.data || []).map((b) => ({
      pozer_procent: b.pozer_procent,
    }));
    previousDezinsBody = (prevDezinsResult.data || []).map((b) => ({
      pocet: b.pocet,
    }));
  }

  const allPripravky = pripravkyResult.data || [];
  const okruhy = (okruhyResult.data || []).map((o) => ({
    id: o.id,
    nazev: o.nazev,
  }));

  // Klient info
  const klienti = objekty
    ? ((zakazky?.objekty as Record<string, unknown>)?.klienti as {
        nazev: string;
        jmeno: string;
        prijmeni: string;
      } | null)
    : null;
  const klientName = klienti
    ? klienti.nazev || `${klienti.prijmeni} ${klienti.jmeno}`.trim()
    : "—";
  const objektNazev =
    ((objekty as Record<string, unknown>)?.nazev as string) || "";

  // ---- Derat data ----
  const deratBody = (bodyResult.data || []).map((b) => ({
    id: b.id,
    cislo_bodu: b.cislo_bodu,
    okruh_id: b.okruh_id,
    typ_stanicky: b.typ_stanicky,
    pripravek_id: b.pripravek_id,
    pozer_procent: b.pozer_procent,
    stav_stanicky: b.stav_stanicky,
  }));
  const deratPripravky = allPripravky
    .filter((p) => p.typ === "rodenticid")
    .map((p) => ({
      id: p.id,
      nazev: p.nazev,
      ucinna_latka: p.ucinna_latka,
      protilatka: p.protilatka,
    }));

  // ---- Dezins data ----
  const dezinsBody = needsDezins
    ? (dezinsBodyResult.data || []).map((b) => ({
        id: b.id,
        cislo_bodu: b.cislo_bodu,
        okruh_id: b.okruh_id,
        typ_lapace: b.typ_lapace,
        druh_hmyzu: b.druh_hmyzu,
        pocet: b.pocet,
      }))
    : [];

  // ---- Postrik data ----
  const postrikPostriky = needsPostrik
    ? (postrikResult.data || []).map((p) => ({
        id: p.id,
        skudce: p.skudce,
        plocha_m2: p.plocha_m2,
        typ_zakroku: p.typ_zakroku,
        poznamka: p.poznamka,
        protokol_postrik_pripravky: (
          (p as Record<string, unknown>).protokol_postrik_pripravky as
            | {
                id: string;
                spotreba: string | null;
                koncentrace_procent: number | null;
                pripravky: {
                  id: string;
                  nazev: string;
                  ucinna_latka: string | null;
                  protilatka: string | null;
                };
              }[]
            | null
        ) || [],
      }))
    : [];
  const postrikPripravky = needsPostrik
    ? allPripravky
        .filter((p) => p.typ === "insekticid" || p.typ === "biocid")
        .map((p) => ({
          id: p.id,
          nazev: p.nazev,
          ucinna_latka: p.ucinna_latka,
          protilatka: p.protilatka,
          typ: p.typ,
          cilovy_skudce: p.cilovy_skudce,
          omezeni_prostor: p.omezeni_prostor,
        }))
    : [];

  // ---- Škůdci ----
  const skudci = needsSkudci
    ? (skudciResult.data || []).map((s) => ({
        id: s.id,
        nazev: s.nazev,
        typ: s.typ,
      }))
    : [];

  // Fotky data
  const fotky = (fotkyResult.data || []).map((f) => ({
    id: f.id,
    soubor_url: f.soubor_url,
    popis: f.popis,
  }));

  // Věty účinnosti šablony
  const vetyUcinnosti = (vetyUcinnostiResult.data || []).map((s) => ({
    id: s.id,
    nazev: s.nazev,
    obsah: s.obsah,
  }));

  // Technik jméno pro admin view
  const technikProfile = protokol.profiles as {
    jmeno: string | null;
    prijmeni: string | null;
  } | null;
  const technikName = technikProfile
    ? `${technikProfile.jmeno ?? ""} ${technikProfile.prijmeni ?? ""}`.trim()
    : undefined;

  // Email data
  const klientEmail = (klienti as Record<string, unknown> | null)?.email as
    | string
    | null;
  const emailLog = (emailLogResult.data || []).map((e) => ({
    id: e.id,
    prijemce: e.prijemce,
    predmet: e.predmet,
    stav: e.stav,
    chyba_detail: e.chyba_detail,
    odeslano_at: e.odeslano_at,
    created_at: e.created_at,
  }));

  return (
    <div className="mx-auto max-w-lg pb-24">
      <ProtokolFormView
        protokol={{
          id: protokol.id,
          cislo_protokolu: protokol.cislo_protokolu,
          status: protokol.status,
          poznamka: protokol.poznamka,
          zasah_id: protokol.zasah_id,
          veta_ucinnosti: protokol.veta_ucinnosti,
          podpis_klient_url: protokol.podpis_klient_url,
          admin_komentar: protokol.admin_komentar,
        }}
        klientName={klientName}
        objektNazev={objektNazev}
        availableTabs={availableTabs}
        deratData={
          availableTabs.includes("deratizace")
            ? {
                body: deratBody,
                okruhy,
                pripravky: deratPripravky,
              }
            : undefined
        }
        dezinsData={
          needsDezins
            ? {
                body: dezinsBody,
                okruhy,
                skudci,
              }
            : undefined
        }
        postrikData={
          needsPostrik
            ? {
                postriky: postrikPostriky,
                pripravky: postrikPripravky,
                skudci,
                typObjektu,
              }
            : undefined
        }
        fotky={fotky}
        vetyUcinnosti={vetyUcinnosti}
        previousDeratBody={previousDeratBody}
        previousDezinsBody={previousDezinsBody}
        userRole={userRole}
        technikName={technikName}
        klientEmail={klientEmail}
        emailLog={emailLog}
      />
    </div>
  );
}
