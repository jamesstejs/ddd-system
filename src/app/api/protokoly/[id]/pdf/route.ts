import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/queries/profiles";
import {
  getProtokol,
  getProtokolPostrik,
  getProtokolDeratBody,
  getProtokolDezinsBody,
} from "@/lib/supabase/queries/protokoly";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  DezinsekniProtokolPdf,
  buildDezinsekniPdfData,
} from "@/lib/pdf/dezinsekniProtokol";
import path from "path";
import type { AppRole } from "@/lib/auth";

export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile || !Array.isArray(profile.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = ["admin", "super_admin"].some((r) =>
    (profile.role as AppRole[]).includes(r as AppRole),
  );
  const isTechnik = (profile.role as AppRole[]).includes("technik" as AppRole);

  if (!isAdmin && !isTechnik) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Load protocol
  const { data: protokol, error: protokolError } = await getProtokol(supabase, id);
  if (protokolError || !protokol) {
    return NextResponse.json({ error: "Protocol not found" }, { status: 404 });
  }

  // Authorization: admin sees all, technik only own
  if (!isAdmin && isTechnik && protokol.technik_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Extract nested data
  const zasahy = protokol.zasahy as Record<string, unknown> | null;
  const zakazky = zasahy?.zakazky as Record<string, unknown> | null;
  const objekty = zakazky?.objekty as Record<string, unknown> | null;
  const klienti = objekty?.klienti as Record<string, unknown> | null;

  // Load postrik + derat + dezins data in parallel
  const [{ data: postrikData }, { data: deratData }, { data: dezinsData }] = await Promise.all([
    getProtokolPostrik(supabase, id),
    getProtokolDeratBody(supabase, id),
    getProtokolDezinsBody(supabase, id),
  ]);

  const postriky = (postrikData || []).map((p) => {
    const pripravkyArr = (
      (p as Record<string, unknown>).protokol_postrik_pripravky as
        | {
            spotreba: string | null;
            koncentrace_procent: number | null;
            pripravky: {
              nazev: string;
              ucinna_latka: string | null;
              protilatka: string | null;
            };
          }[]
        | null
    ) || [];

    return {
      skudce: p.skudce,
      plocha_m2: p.plocha_m2,
      typ_zakroku: p.typ_zakroku,
      poznamka: p.poznamka,
      pripravky: pripravkyArr.map((pp) => ({
        nazev: pp.pripravky.nazev,
        ucinna_latka: pp.pripravky.ucinna_latka,
        protilatka: pp.pripravky.protilatka,
        spotreba: pp.spotreba,
        koncentrace_procent: pp.koncentrace_procent,
      })),
    };
  });

  // Map derat body data
  const deratBody = (deratData || []).map((d) => {
    const pripravky = d.pripravky as { nazev: string } | null;
    const okruhy = d.okruhy as { nazev: string } | null;
    return {
      cislo_bodu: d.cislo_bodu,
      typ_stanicky: d.typ_stanicky,
      pozer_procent: d.pozer_procent,
      stav_stanicky: d.stav_stanicky,
      pripravek_nazev: pripravky?.nazev ?? null,
      okruh_nazev: okruhy?.nazev ?? null,
    };
  });

  // Map dezins body data
  const dezinsBody = (dezinsData || []).map((d) => {
    const okruhy = d.okruhy as { nazev: string } | null;
    return {
      cislo_bodu: d.cislo_bodu,
      typ_lapace: d.typ_lapace,
      druh_hmyzu: d.druh_hmyzu,
      pocet: d.pocet,
      okruh_nazev: okruhy?.nazev ?? null,
    };
  });

  // Collect unique preparation names for BL section
  const pripravekNames = [
    ...new Set(
      postriky.flatMap((p) => p.pripravky.map((pp) => pp.nazev)),
    ),
  ].map((name) => `Bezpečnostní list: ${name}`);

  // Build PDF data
  const pdfData = buildDezinsekniPdfData({
    protokol: {
      cislo_protokolu: protokol.cislo_protokolu,
      poznamka: protokol.poznamka,
      veta_ucinnosti: protokol.veta_ucinnosti,
      zodpovedny_technik: protokol.zodpovedny_technik,
    },
    zasah: {
      datum: (zasahy?.datum as string) ?? null,
    },
    klient: {
      nazev: (klienti?.nazev as string) ?? null,
      jmeno: (klienti?.jmeno as string) ?? null,
      prijmeni: (klienti?.prijmeni as string) ?? null,
      ico: (klienti?.ico as string) ?? null,
      dic: (klienti?.dic as string) ?? null,
      adresa: (klienti?.adresa as string) ?? null,
      email: (klienti?.email as string) ?? null,
      telefon: (klienti?.telefon as string) ?? null,
    },
    objekt: {
      nazev: (objekty?.nazev as string) ?? null,
      adresa: (objekty?.adresa as string) ?? null,
    },
    postriky,
    deratBody,
    dezinsBody,
    bezpecnostniListy: pripravekNames,
    dalsiZasah: null, // TODO: populate from next scheduled zasah
  });

  // Resolve logo path
  const logoPath = path.join(process.cwd(), "public", "logo.png");

  // Render PDF
  try {
    const nodeBuffer = await renderToBuffer(
      DezinsekniProtokolPdf({ data: pdfData, logoPath }),
    );
    // Convert Node Buffer to Uint8Array for NextResponse compatibility
    const uint8 = new Uint8Array(nodeBuffer);

    const filename = `${pdfData.cislo_protokolu || "protokol"}.pdf`;

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (renderError) {
    console.error("PDF render error:", renderError);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
