"use server";

import { requireTechnik } from "@/lib/auth/requireTechnik";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ProformaData {
  proformaId: string;
  cislo: string;
  castka_s_dph: number;
  castka_bez_dph: number;
  fakturoidPublicUrl: string | null;
  iban: string;
  vs: string;
}

/**
 * Vytvoří proformu pro zásah.
 * Technik volá na místě u zakázky s platba_predem=true.
 *
 * Flow:
 * 1. Auth: requireTechnik (vlastní zásah)
 * 2. Načte zasah → zakazka → objekt → klient
 * 3. Kontrola duplicity (getProformaByZakazka)
 * 4. findOrCreateSubject v Fakturoidu
 * 5. Načte polozky, buildInvoiceLines
 * 6. createProformaInvoice v Fakturoidu
 * 7. Uloží do DB (is_proforma=true)
 */
export async function createProformaAction(
  zasahId: string,
): Promise<{ success: boolean; data?: ProformaData; error?: string }> {
  if (!UUID_REGEX.test(zasahId)) {
    return { success: false, error: "Neplatný formát ID zásahu" };
  }

  try {
    const { supabase, user } = await requireTechnik();

    // Načtení zásahu s vazbami
    const { data: zasah, error: zasahErr } = await supabase
      .from("zasahy")
      .select(
        `
        id, technik_id, zakazka_id,
        zakazky!zasahy_zakazka_id_fkey (
          id, typ, status, platba_predem,
          cena_zaklad, cena_po_sleve, cena_s_dph, dph_sazba_snapshot,
          objekty!inner (
            id, nazev, adresa,
            klienti!inner (
              id, nazev, jmeno, prijmeni, typ, ico, dic, email, telefon,
              dph_sazba, fakturoid_subject_id
            )
          )
        )
      `,
      )
      .eq("id", zasahId)
      .is("deleted_at", null)
      .single();

    if (zasahErr || !zasah) {
      return { success: false, error: "Zásah nenalezen" };
    }

    // Ověření, že zásah patří technikovi
    if (zasah.technik_id !== user.id) {
      return { success: false, error: "Nemáte oprávnění pro tento zásah" };
    }

    const zakazky = zasah.zakazky as Record<string, unknown> | null;
    if (!zakazky) {
      return { success: false, error: "Zakázka nenalezena" };
    }

    // Ověření platba_predem
    if (zakazky.platba_predem !== true) {
      return {
        success: false,
        error: "Tato zakázka nemá nastavenou platbu předem",
      };
    }

    const objekty = zakazky.objekty as Record<string, unknown> | null;
    const klienti = objekty?.klienti as Record<string, unknown> | null;
    if (!klienti) {
      return { success: false, error: "Klient nenalezen" };
    }

    const zakazkaId = zakazky.id as string;
    const klientId = klienti.id as string;

    // Dynamické importy
    const [
      { getProformaByZakazka, createFaktura, updateKlientFakturoidId },
      { getPolozkyForZakazka },
      { findOrCreateSubject, buildInvoiceLines, createProformaInvoice, getEffectiveVatRate },
      { getCompanyIban, extractDigits },
    ] = await Promise.all([
      import("@/lib/supabase/queries/faktury"),
      import("@/lib/supabase/queries/zakazka_polozky"),
      import("@/lib/fakturoid"),
      import("@/lib/utils/qrPayment"),
    ]);

    // Kontrola duplicity — pokud proforma existuje, vrátíme ji
    const { data: existingProforma } = await getProformaByZakazka(
      supabase,
      zakazkaId,
    );
    if (existingProforma) {
      const vs = extractDigits(existingProforma.cislo || "");
      return {
        success: true,
        data: {
          proformaId: existingProforma.id,
          cislo: existingProforma.cislo || "",
          castka_s_dph: existingProforma.castka_s_dph ?? 0,
          castka_bez_dph: existingProforma.castka_bez_dph ?? 0,
          fakturoidPublicUrl: existingProforma.proforma_public_url || null,
          iban: getCompanyIban(),
          vs,
        },
      };
    }

    // Klient data pro Fakturoid subject
    const klientData = {
      nazev: (klienti.nazev as string) || "",
      jmeno: (klienti.jmeno as string) || "",
      prijmeni: (klienti.prijmeni as string) || "",
      typ: (klienti.typ as "firma" | "fyzicka_osoba") || "firma",
      ico: (klienti.ico as string | null) || null,
      dic: (klienti.dic as string | null) || null,
      email: (klienti.email as string | null) || null,
      telefon: (klienti.telefon as string | null) || null,
      adresa: (objekty?.adresa as string) || "",
      fakturoid_subject_id:
        (klienti.fakturoid_subject_id as number | null) || null,
    };

    // 1. Find/create Fakturoid subject
    const subjectId = await findOrCreateSubject(klientData);
    if (!klientData.fakturoid_subject_id) {
      await updateKlientFakturoidId(supabase, klientId, subjectId);
    }

    // 2. Načíst položky zakázky
    const { data: polozky } = await getPolozkyForZakazka(supabase, zakazkaId);
    if (!polozky || polozky.length === 0) {
      return {
        success: false,
        error: "Zakázka nemá žádné položky k fakturaci",
      };
    }

    // 3. DPH sazba — respektuj nastavení Fakturoid účtu (neplátce DPH → 0)
    const dphSazba =
      (zakazky.dph_sazba_snapshot as number) ||
      (klienti.dph_sazba as number) ||
      21;
    const effectiveVatRate = await getEffectiveVatRate(dphSazba);
    const cenaZaklad =
      (zakazky.cena_po_sleve as number) ||
      (zakazky.cena_zaklad as number) ||
      0;
    const cenaSdph =
      (zakazky.cena_s_dph as number) || cenaZaklad * (1 + effectiveVatRate / 100);

    // 4. Build invoice lines
    const lines = buildInvoiceLines(polozky, effectiveVatRate);

    // 5. Create proforma in Fakturoid
    const splatnostDnu = 14;
    const fakturoidInvoice = await createProformaInvoice({
      subject_id: subjectId,
      lines,
      due: splatnostDnu,
      payment_method: "bank",
      language: "cz",
      note: "Proforma faktura — platba na místě",
    });

    // 6. Save to DB
    const { data: faktura, error: insertError } = await createFaktura(
      supabase,
      {
        zakazka_id: zakazkaId,
        protokol_id: null,
        fakturoid_id: fakturoidInvoice.id,
        cislo: fakturoidInvoice.number,
        castka_bez_dph: parseFloat(fakturoidInvoice.subtotal) || cenaZaklad,
        castka_s_dph: parseFloat(fakturoidInvoice.total) || cenaSdph,
        dph_sazba: dphSazba,
        splatnost_dnu: splatnostDnu,
        datum_splatnosti: fakturoidInvoice.due_on,
        stav: "vytvorena",
        fakturoid_url: fakturoidInvoice.html_url || null,
        fakturoid_pdf_url: fakturoidInvoice.pdf_url || null,
        is_proforma: true,
        proforma_public_url: fakturoidInvoice.public_html_url || null,
      },
    );

    if (insertError || !faktura) {
      return { success: false, error: insertError?.message || "Chyba při ukládání" };
    }

    const vs = extractDigits(fakturoidInvoice.number || "");

    revalidatePath("/kalendar");
    revalidatePath("/faktury");

    return {
      success: true,
      data: {
        proformaId: faktura.id,
        cislo: fakturoidInvoice.number,
        castka_s_dph: parseFloat(fakturoidInvoice.total) || cenaSdph,
        castka_bez_dph: parseFloat(fakturoidInvoice.subtotal) || cenaZaklad,
        fakturoidPublicUrl: fakturoidInvoice.public_html_url || null,
        iban: getCompanyIban(),
        vs,
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Nepodařilo se vytvořit proformu",
    };
  }
}

/**
 * Zkontroluje stav platby proformy v Fakturoidu.
 * Technik nebo admin volá po QR platbě.
 */
export async function checkProformaPaymentAction(
  fakturaId: string,
): Promise<{ success: boolean; paid?: boolean; error?: string }> {
  if (!UUID_REGEX.test(fakturaId)) {
    return { success: false, error: "Neplatný formát ID faktury" };
  }

  try {
    // Povolit technikovi i adminovi
    let supabase;
    try {
      const result = await requireTechnik();
      supabase = result.supabase;
    } catch {
      const result = await requireAdmin();
      supabase = result.supabase;
    }

    const [{ getFaktura, updateFaktura }, { getInvoice }] = await Promise.all([
      import("@/lib/supabase/queries/faktury"),
      import("@/lib/fakturoid"),
    ]);

    // Načíst fakturu z DB
    const { data: faktura } = await getFaktura(supabase, fakturaId);
    if (!faktura) {
      return { success: false, error: "Faktura nenalezena" };
    }
    if (!faktura.is_proforma) {
      return { success: false, error: "Faktura není proforma" };
    }
    if (faktura.stav === "uhrazena") {
      return { success: true, paid: true };
    }
    if (!faktura.fakturoid_id) {
      return { success: false, error: "Chybí Fakturoid ID" };
    }

    // Dotaz na Fakturoid
    const fakturoidInvoice = await getInvoice(faktura.fakturoid_id);

    if (fakturoidInvoice.status === "paid") {
      // Aktualizovat v DB
      await updateFaktura(supabase, fakturaId, { stav: "uhrazena" });

      revalidatePath("/kalendar");
      revalidatePath("/faktury");
      revalidatePath(`/faktury/${fakturaId}`);

      return { success: true, paid: true };
    }

    return { success: true, paid: false };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Nepodařilo se zkontrolovat platbu",
    };
  }
}
