import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getZasah } from "@/lib/supabase/queries/zasahy";
import { getPouceniForZasah } from "@/lib/supabase/queries/sablony_pouceni";
import { getAktivniPripravky } from "@/lib/supabase/queries/pripravky";
import { getBezpecnostniListy } from "@/lib/supabase/queries/bezpecnostni_listy";
import { createEmailLog } from "@/lib/supabase/queries/email_log";
import { sendProtokolEmail } from "@/lib/email/resend";
import { renderZasahPredEmailHtml } from "@/lib/email/templates/ZasahPredEmail";

type TypedSupabase = SupabaseClient<Database>;

export interface SendZasahPredEmailResult {
  success: boolean;
  error?: string;
  skipped?: boolean;
}

/**
 * Odešle klientovi email s BL + poučení před zásahem.
 * Volá se po vytvoření/potvrzení zásahu v kalendáři.
 *
 * Pokud klient nemá email, vrací skipped=true (ne error — technik to neovlivní).
 */
export async function sendZasahPredEmail(
  supabase: TypedSupabase,
  zasahId: string,
): Promise<SendZasahPredEmailResult> {
  // 1. Načtení zásahu s kompletním řetězcem: zasah → zakazka → objekt → klient
  const { data: zasah } = await getZasah(supabase, zasahId);
  if (!zasah) {
    return { success: false, error: "Zasah nenalezen" };
  }

  const zakazky = zasah.zakazky as Record<string, unknown> | null;
  const objekty = zakazky?.objekty as Record<string, unknown> | null;
  const klienti = objekty?.klienti as Record<string, unknown> | null;

  const klientEmail = klienti?.email as string | null;
  if (!klientEmail) {
    return { success: true, skipped: true };
  }

  const klientName =
    (klienti?.nazev as string) ||
    `${(klienti?.prijmeni as string) || ""} ${(klienti?.jmeno as string) || ""}`.trim() ||
    "Klient";
  const objektNazev = (objekty?.nazev as string) || "";
  const objektAdresa = (objekty?.adresa as string) || "";
  const typyZasahu = (zakazky?.typy_zasahu as string[]) || [];
  const skudci = (zakazky?.skudci as string[]) || [];
  const objektTyp = (objekty?.typ_objektu as string) || "";

  const datumZasahu = zasah.datum
    ? new Date(zasah.datum).toLocaleDateString("cs-CZ")
    : "";
  const casOd = zasah.cas_od || "";

  try {
    // 2. Načtení relevantních poučení
    const { data: pouceni } = await getPouceniForZasah(
      supabase,
      skudci,
      typyZasahu,
    );

    const pouceniTexty = (pouceni || []).map((p) => ({
      nazev: p.nazev,
      obsah: p.obsah,
    }));

    // 3. Najít přípravky relevantní pro škůdce + typ prostoru objektu
    const { data: allPripravky } = await getAktivniPripravky(supabase);
    const relevantPripravky = findRelevantPripravky(
      allPripravky || [],
      skudci,
      objektTyp,
    );

    // 4. Načíst BL souborů pro relevantní přípravky
    const blAttachments: { filename: string; content: Buffer }[] = [];
    const blNames: string[] = [];

    for (const pripravek of relevantPripravky) {
      const { data: blData } = await getBezpecnostniListy(
        supabase,
        pripravek.id,
      );
      for (const bl of blData || []) {
        if (blNames.includes(bl.nazev_souboru)) continue;
        try {
          const res = await fetch(bl.soubor_url);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            blAttachments.push({
              filename: bl.nazev_souboru,
              content: Buffer.from(arrayBuffer),
            });
            blNames.push(bl.nazev_souboru);
          }
        } catch {
          // Skip broken BL files silently
        }
      }
    }

    // 5. Render email HTML
    const html = renderZasahPredEmailHtml({
      klientName,
      objektNazev: objektNazev || "—",
      objektAdresa,
      datumZasahu,
      casOd,
      skudci,
      typyZasahu,
      pouceniTexty,
      bezpecnostniListy: blNames,
    });

    const subject = `Informace pred zasahem — ${objektNazev || klientName} — Deraplus`;

    // 6. Odeslání emailu
    const resendId = await sendProtokolEmail({
      to: klientEmail,
      subject,
      html,
      attachments: blAttachments,
    });

    // 7. Záznam do email_log
    await createEmailLog(supabase, {
      zasah_id: zasahId,
      prijemce: klientEmail,
      predmet: subject,
      typ: "terminy",
      stav: "odeslano",
      resend_id: resendId,
      odeslano_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (err) {
    // Log chyby
    try {
      await createEmailLog(supabase, {
        zasah_id: zasahId,
        prijemce: klientEmail,
        predmet: `Informace pred zasahem — Deraplus`,
        typ: "terminy",
        stav: "chyba",
        chyba_detail:
          err instanceof Error ? err.message : "Neznama chyba",
      });
    } catch {
      // Ignore logging error
    }

    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Nepodarilo se odeslat email",
    };
  }
}

/**
 * Najde přípravky relevantní pro dané škůdce a typ prostoru objektu.
 * Přípravky mají `cilovy_skudce` JSONB a `omezeni_prostor` JSONB.
 */
export function findRelevantPripravky(
  pripravky: Array<{
    id: string;
    nazev: string;
    cilovy_skudce: unknown;
    omezeni_prostor: unknown;
  }>,
  skudci: string[],
  objektTyp: string,
): Array<{ id: string; nazev: string }> {
  if (skudci.length === 0) return [];

  const typProstoru = mapObjektTypToTypProstoru(objektTyp);

  return pripravky.filter((p) => {
    // Kontrola cílového škůdce
    const ciloviSkudci = p.cilovy_skudce as string[] | null;
    if (!ciloviSkudci || !Array.isArray(ciloviSkudci)) return false;

    const matchesSkudce = skudci.some((s) =>
      ciloviSkudci.some(
        (cs) => cs.toLowerCase() === s.toLowerCase(),
      ),
    );
    if (!matchesSkudce) return false;

    // Kontrola omezení prostoru (pokud existuje)
    if (typProstoru) {
      const omezeni = p.omezeni_prostor as string[] | null;
      if (omezeni && Array.isArray(omezeni) && omezeni.length > 0) {
        return omezeni.some(
          (o) => o.toLowerCase() === typProstoru.toLowerCase(),
        );
      }
    }

    return true;
  });
}

/**
 * Mapuje typ_objektu enum na typ prostoru pro filtrování přípravků.
 */
function mapObjektTypToTypProstoru(objektTyp: string): string | null {
  const map: Record<string, string> = {
    gastro: "potravinarsky",
    sklad_nevyzivocisna: "prumysl",
    sklad_zivocisna: "potravinarsky",
    domacnost: "domacnost",
    kancelar: "prumysl",
    skola: "prumysl",
    hotel: "prumysl",
    nemocnice: "prumysl",
    ubytovna: "domacnost",
    vyrobni_hala: "prumysl",
  };
  return map[objektTyp] || null;
}
