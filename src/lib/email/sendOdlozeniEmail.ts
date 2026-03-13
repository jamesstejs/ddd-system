import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getZasah } from "@/lib/supabase/queries/zasahy";
import { createEmailLog } from "@/lib/supabase/queries/email_log";
import { sendProtokolEmail } from "@/lib/email/resend";
import { renderOdlozeniEmailHtml } from "@/lib/email/templates/OdlozeniEmail";

type TypedSupabase = SupabaseClient<Database>;

export interface SendOdlozeniEmailResult {
  success: boolean;
  error?: string;
  skipped?: boolean;
}

/**
 * Odesle klientovi email o posunuti terminu zasahu.
 * Volá se po postponeZasah (admin i klient).
 *
 * Pokud klient nema email, vrati skipped=true.
 */
export async function sendOdlozeniEmail(
  supabase: TypedSupabase,
  zasahId: string,
  puvodniDatum: string,
  novyDatum: string,
  duvod: string | null,
  iniciator: "admin" | "klient",
): Promise<SendOdlozeniEmailResult> {
  // 1. Nacteni zasahu s kompletnim retezcem
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

  // Format dates for display
  const formatDatum = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("cs-CZ");
    } catch {
      return d;
    }
  };

  try {
    // 2. Render email HTML
    const html = renderOdlozeniEmailHtml({
      klientName,
      objektNazev: objektNazev || "—",
      objektAdresa,
      puvodniDatum: formatDatum(puvodniDatum),
      novyDatum: formatDatum(novyDatum),
      duvod,
      iniciator,
    });

    const subject = `Zmena terminu zasahu — ${objektNazev || klientName} — Deraplus`;

    // 3. Odeslani emailu
    const resendId = await sendProtokolEmail({
      to: klientEmail,
      subject,
      html,
      attachments: [],
    });

    // 4. Zaznam do email_log
    await createEmailLog(supabase, {
      zasah_id: zasahId,
      prijemce: klientEmail,
      predmet: subject,
      typ: "odlozeni",
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
        predmet: `Zmena terminu zasahu — Deraplus`,
        typ: "odlozeni",
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
