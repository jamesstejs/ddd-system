"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireTechnik } from "@/lib/auth/requireTechnik";
import { revalidatePath } from "next/cache";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Hromadně synchronizuje stav plateb z Fakturoidu.
 * Načte všechny neuhrazené faktury s fakturoid_id, pro každou zavolá
 * Fakturoid API a aktualizuje stav v DB pokud se liší.
 *
 * Navíc provede lokální overdue check: pokud datum_splatnosti < today
 * a stav je "odeslana", přepne na "po_splatnosti".
 */
export async function syncFakturoidPaymentsAction(): Promise<{
  success: boolean;
  updated: number;
  errors: number;
  total: number;
  error?: string;
}> {
  try {
    const { supabase } = await requireAdmin();

    const [{ getFaktury, updateFaktura }, { getInvoice, mapFakturoidStatus }] =
      await Promise.all([
        import("@/lib/supabase/queries/faktury"),
        import("@/lib/fakturoid"),
      ]);

    // Načíst všechny neuhrazené faktury
    const { data: faktury } = await getFaktury(supabase);
    if (!faktury) {
      return { success: true, updated: 0, errors: 0, total: 0 };
    }

    const neuhrazene = faktury.filter(
      (f: { stav: string; fakturoid_id: number | null }) =>
        ["vytvorena", "odeslana", "po_splatnosti"].includes(f.stav) &&
        f.fakturoid_id,
    );

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    let updated = 0;
    let errors = 0;

    for (const f of neuhrazene) {
      try {
        // Fakturoid API check
        const fakturoidInvoice = await getInvoice(f.fakturoid_id as number);
        const newStav = mapFakturoidStatus(fakturoidInvoice.status);

        if (newStav !== f.stav) {
          await updateFaktura(supabase, f.id, { stav: newStav });
          updated++;
          continue;
        }

        // Lokální overdue check
        if (
          f.stav === "odeslana" &&
          f.datum_splatnosti &&
          f.datum_splatnosti < today
        ) {
          await updateFaktura(supabase, f.id, { stav: "po_splatnosti" });
          updated++;
        }
      } catch {
        errors++;
      }
    }

    revalidatePath("/faktury");
    revalidatePath("/");

    return {
      success: true,
      updated,
      errors,
      total: neuhrazene.length,
    };
  } catch (err) {
    return {
      success: false,
      updated: 0,
      errors: 0,
      total: 0,
      error:
        err instanceof Error ? err.message : "Nepodařilo se synchronizovat",
    };
  }
}

/**
 * Zkontroluje stav platby jedné faktury v Fakturoidu.
 * Funguje pro proforma i běžné faktury.
 */
export async function checkSinglePaymentAction(
  fakturaId: string,
): Promise<{
  success: boolean;
  paid?: boolean;
  newStav?: string;
  error?: string;
}> {
  if (!UUID_REGEX.test(fakturaId)) {
    return { success: false, error: "Neplatný formát ID faktury" };
  }

  try {
    // Technik i admin
    let supabase;
    try {
      const result = await requireTechnik();
      supabase = result.supabase;
    } catch {
      const result = await requireAdmin();
      supabase = result.supabase;
    }

    const [{ getFaktura, updateFaktura }, { getInvoice, mapFakturoidStatus }] =
      await Promise.all([
        import("@/lib/supabase/queries/faktury"),
        import("@/lib/fakturoid"),
      ]);

    const { data: faktura } = await getFaktura(supabase, fakturaId);
    if (!faktura) {
      return { success: false, error: "Faktura nenalezena" };
    }
    if (faktura.stav === "uhrazena") {
      return { success: true, paid: true, newStav: "uhrazena" };
    }
    if (!faktura.fakturoid_id) {
      return { success: false, error: "Chybí Fakturoid ID" };
    }

    const fakturoidInvoice = await getInvoice(faktura.fakturoid_id);
    const newStav = mapFakturoidStatus(fakturoidInvoice.status);

    if (newStav !== faktura.stav) {
      await updateFaktura(supabase, fakturaId, { stav: newStav });

      revalidatePath("/faktury");
      revalidatePath(`/faktury/${fakturaId}`);
      revalidatePath("/");

      return {
        success: true,
        paid: newStav === "uhrazena",
        newStav,
      };
    }

    return { success: true, paid: false, newStav: faktura.stav };
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
