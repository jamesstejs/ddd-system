"use server";

import { requireTechnik } from "@/lib/auth/requireTechnik";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";
import {
  createProtokol,
  updateProtokol,
  getProtokolByZasah,
  getProtokol,
  getProtokolDeratBody,
  createProtokolDeratBod,
  updateProtokolDeratBod,
  deleteProtokolDeratBod,
  getProtokolDezinsBody,
  createProtokolDezinsBod,
  updateProtokolDezinsBod,
  deleteProtokolDezinsBod,
  getProtokolPostrik,
  createProtokolPostrik,
  updateProtokolPostrik,
  deleteProtokolPostrik,
  createProtokolPostrikPripravek,
  updateProtokolPostrikPripravek,
  deleteProtokolPostrikPripravek,
  getLatestProtokolForObjekt,
  createProtokolFotka,
  deleteProtokolFotka,
} from "@/lib/supabase/queries/protokoly";
import { getOkruhy } from "@/lib/supabase/queries/okruhy";
import { getAktivniPripravky } from "@/lib/supabase/queries/pripravky";
import {
  prefillBodyFromPrevious,
  prefillDezinsBodyFromPrevious,
  filterPripravkyForPostrik,
  computeDeratStatistiky,
  computeDezinsStatistiky,
} from "@/lib/utils/protokolUtils";
import type { Database } from "@/lib/supabase/database.types";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/queries/profiles";
import type { AppRole } from "@/lib/auth";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================
// Auth helper: supports both technik (own rozpracovany) and admin editing
// ============================================================

/**
 * Flexible auth for protocol editing.
 * - Admin/super_admin: can edit any protocol in ke_schvaleni (or rozpracovany)
 * - Technik: can edit own protocol only when rozpracovany
 */
async function requireProtokolEditor(protokolId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nepřihlášen");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile) throw new Error("Profil nenalezen");

  const isAdmin = ["admin", "super_admin"].some((r) =>
    (profile.role as string[]).includes(r),
  );
  const isTechnik = (profile.role as string[]).includes("technik");

  const { data: protokol } = await getProtokol(supabase, protokolId);
  if (!protokol) throw new Error("Protokol nenalezen");

  if (isAdmin) {
    // Admin can edit protocols in ke_schvaleni or rozpracovany
    if (protokol.status !== "ke_schvaleni" && protokol.status !== "rozpracovany") {
      throw new Error("Protokol v tomto stavu nelze editovat");
    }
    return { supabase, user, protokol, isAdmin: true };
  }

  if (isTechnik && protokol.technik_id === user.id) {
    if (protokol.status !== "rozpracovany") {
      throw new Error("Protokol nelze editovat (status: " + protokol.status + ")");
    }
    return { supabase, user, protokol, isAdmin: false };
  }

  throw new Error("Nemáte oprávnění k tomuto protokolu");
}

type DeratBodInput = {
  id?: string;
  _deleted?: boolean;
  cislo_bodu: string;
  okruh_id: string | null;
  typ_stanicky: Database["public"]["Enums"]["typ_stanicky"];
  pripravek_id: string | null;
  pozer_procent: number;
  stav_stanicky: Database["public"]["Enums"]["stav_stanicky"];
};

type DezinsBodInput = {
  id?: string;
  _deleted?: boolean;
  cislo_bodu: string;
  okruh_id: string | null;
  typ_lapace: Database["public"]["Enums"]["typ_lapace"];
  druh_hmyzu: string | null;
  pocet: number;
};

type PostrikInput = {
  id?: string;
  _deleted?: boolean;
  skudce: string | null;
  plocha_m2: number | null;
  typ_zakroku: Database["public"]["Enums"]["typ_zakroku"] | null;
  poznamka_postriku: string | null;
  pripravky: PostrikPripravekInput[];
};

type PostrikPripravekInput = {
  id?: string;
  _deleted?: boolean;
  pripravek_id: string;
  spotreba: string | null;
  koncentrace_procent: number | null;
};

// ============================================================
// Init — vytvoření protokolu + generování čísla
// ============================================================

/**
 * Inicializuje nový protokol pro daný zásah.
 * Pokud už protokol pro zásah existuje, vrátí existující.
 * Generuje cislo_protokolu přes DB funkci.
 */
export async function initProtokolAction(zasahId: string) {
  if (!UUID_REGEX.test(zasahId)) {
    throw new Error("Neplatný formát ID zásahu");
  }

  const { supabase, user } = await requireTechnik();

  // Ověření vlastnictví zásahu
  const { data: zasah } = await supabase
    .from("zasahy")
    .select("id, technik_id, status, zakazka_id")
    .eq("id", zasahId)
    .is("deleted_at", null)
    .single();

  if (!zasah || zasah.technik_id !== user.id) {
    throw new Error("Nemáte oprávnění k tomuto zásahu");
  }

  // Pokud už protokol existuje → vrátit ho
  const { data: existing } = await getProtokolByZasah(supabase, zasahId);
  if (existing) {
    return existing;
  }

  // Vytvořit nový protokol
  const { data: protokol, error: createErr } = await createProtokol(supabase, {
    zasah_id: zasahId,
    technik_id: user.id,
    status: "rozpracovany",
  });

  if (createErr || !protokol) {
    throw new Error(createErr?.message || "Nepodařilo se vytvořit protokol");
  }

  // Vygenerovat číslo protokolu přes DB funkci
  const { data: cislo } = await supabase.rpc("generate_cislo_protokolu", {
    p_zasah_id: zasahId,
  });

  if (cislo) {
    await updateProtokol(supabase, protokol.id, {
      cislo_protokolu: cislo,
    });
  }

  revalidatePath("/protokoly");
  revalidatePath("/kalendar");

  return { ...protokol, cislo_protokolu: cislo || null };
}

// ============================================================
// Pre-fill body z předchozího protokolu
// ============================================================

/**
 * Načte předvyplněné body z předchozího protokolu pro daný zásah.
 * Hledá poslední schválený/odeslaný protokol pro stejný objekt.
 */
export async function getPrefilledBodyAction(zasahId: string) {
  if (!UUID_REGEX.test(zasahId)) {
    throw new Error("Neplatný formát ID zásahu");
  }

  const { supabase, user } = await requireTechnik();

  // Najdi objekt přes zasah → zakazka → objekt
  const { data: zasah } = await supabase
    .from("zasahy")
    .select(`
      id, technik_id,
      zakazky (
        id,
        objekty (
          id
        )
      )
    `)
    .eq("id", zasahId)
    .is("deleted_at", null)
    .single();

  if (!zasah || zasah.technik_id !== user.id) {
    throw new Error("Nemáte oprávnění k tomuto zásahu");
  }

  const objektId = (zasah.zakazky as Record<string, unknown>)?.objekty as
    | { id: string }
    | null;
  if (!objektId?.id) {
    return [];
  }

  // Najdi poslední dokončený protokol pro tento objekt
  const { data: recentProtokoly } = await getLatestProtokolForObjekt(
    supabase,
    objektId.id,
  );

  if (!recentProtokoly || recentProtokoly.length === 0) {
    return [];
  }

  // Filtruj v aplikačním kódu (PostgREST nefiltruje nested relations)
  const matchingProtokol = recentProtokoly.find((p) => {
    const zasahy = p.zasahy as Record<string, unknown> | null;
    const zakazky = zasahy?.zakazky as Record<string, unknown> | null;
    const objekty = zakazky?.objekty as { id: string } | null;
    return objekty?.id === objektId.id;
  });

  if (!matchingProtokol) {
    return [];
  }

  // Načti body předchozího protokolu
  const { data: prevBody } = await getProtokolDeratBody(
    supabase,
    matchingProtokol.id,
  );

  if (!prevBody || prevBody.length === 0) {
    return [];
  }

  return prefillBodyFromPrevious(prevBody);
}

// ============================================================
// Uložení deratizačních bodů + poznámky (single action)
// ============================================================

/**
 * Uloží deratizační body a poznámku protokolu v jednom požadavku.
 * Body se zpracovávají paralelně (Promise.all) místo sekvenčně.
 * - Nové body (bez id) → createProtokolDeratBod
 * - Existující body (s id) → updateProtokolDeratBod
 * - Smazané body (_deleted: true) → deleteProtokolDeratBod
 */
export async function saveDeratBodyAction(
  protokolId: string,
  body: DeratBodInput[],
  poznamka?: string,
) {
  if (!UUID_REGEX.test(protokolId)) {
    throw new Error("Neplatný formát ID protokolu");
  }

  const { supabase } = await requireProtokolEditor(protokolId);

  // Zpracování bodů PARALELNĚ (místo sekvenčního for-await)
  const promises = body.map(async (bod) => {
    if (bod._deleted && bod.id) {
      const { error } = await deleteProtokolDeratBod(supabase, bod.id);
      if (error) return `Chyba při mazání bodu ${bod.cislo_bodu}: ${error.message}`;
    } else if (bod.id) {
      const { error } = await updateProtokolDeratBod(supabase, bod.id, {
        cislo_bodu: bod.cislo_bodu,
        okruh_id: bod.okruh_id,
        typ_stanicky: bod.typ_stanicky,
        pripravek_id: bod.pripravek_id,
        pozer_procent: bod.pozer_procent,
        stav_stanicky: bod.stav_stanicky,
      });
      if (error) return `Chyba při ukládání bodu ${bod.cislo_bodu}: ${error.message}`;
    } else {
      const { error } = await createProtokolDeratBod(supabase, {
        protokol_id: protokolId,
        cislo_bodu: bod.cislo_bodu,
        okruh_id: bod.okruh_id,
        typ_stanicky: bod.typ_stanicky,
        pripravek_id: bod.pripravek_id,
        pozer_procent: bod.pozer_procent,
        stav_stanicky: bod.stav_stanicky,
      });
      if (error) return `Chyba při vytváření bodu ${bod.cislo_bodu}: ${error.message}`;
    }
    return null;
  });

  // Uložit poznámku paralelně s body
  if (poznamka !== undefined) {
    promises.push(
      updateProtokol(supabase, protokolId, {
        poznamka: poznamka || null,
      }).then(({ error }) =>
        error ? `Chyba při ukládání poznámky: ${error.message}` : null,
      ),
    );
  }

  const results = await Promise.all(promises);
  const errors = results.filter((r): r is string => r !== null);

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  // POZNÁMKA: revalidatePath NENÍ potřeba — stránka je dynamická (auth check)
  // a DeratFormView je client component s vlastním state.
  // revalidatePath způsoboval 503 timeout na Vercel (re-render chain queries).
}

// ============================================================
// Uložení poznámky (standalone — pro zpětnou kompatibilitu)
// ============================================================

/**
 * Uloží poznámku k protokolu.
 * POZNÁMKA: Preferuj saveDeratBodyAction s poznamka parametrem.
 */
export async function saveProtokolPoznamkaAction(
  protokolId: string,
  poznamka: string,
) {
  if (!UUID_REGEX.test(protokolId)) {
    throw new Error("Neplatný formát ID protokolu");
  }

  const { supabase } = await requireProtokolEditor(protokolId);

  const { error } = await updateProtokol(supabase, protokolId, {
    poznamka: poznamka || null,
  });

  if (error) throw new Error(error.message);

  // POZNÁMKA: revalidatePath NENÍ potřeba (viz saveDeratBodyAction komentář)
}

// ============================================================
// Uložení dezinsekčních bodů + poznámky
// ============================================================

/**
 * Uloží dezinsekční body a volitelně poznámku protokolu.
 * Vzor z saveDeratBodyAction — paralelní Promise.all.
 */
export async function saveDezinsBodyAction(
  protokolId: string,
  body: DezinsBodInput[],
  poznamka?: string,
) {
  if (!UUID_REGEX.test(protokolId)) {
    throw new Error("Neplatný formát ID protokolu");
  }

  const { supabase } = await requireProtokolEditor(protokolId);

  const promises = body.map(async (bod) => {
    if (bod._deleted && bod.id) {
      const { error } = await deleteProtokolDezinsBod(supabase, bod.id);
      if (error) return `Chyba při mazání bodu ${bod.cislo_bodu}: ${error.message}`;
    } else if (bod.id) {
      const { error } = await updateProtokolDezinsBod(supabase, bod.id, {
        cislo_bodu: bod.cislo_bodu,
        okruh_id: bod.okruh_id,
        typ_lapace: bod.typ_lapace,
        druh_hmyzu: bod.druh_hmyzu,
        pocet: bod.pocet,
      });
      if (error) return `Chyba při ukládání bodu ${bod.cislo_bodu}: ${error.message}`;
    } else {
      const { error } = await createProtokolDezinsBod(supabase, {
        protokol_id: protokolId,
        cislo_bodu: bod.cislo_bodu,
        okruh_id: bod.okruh_id,
        typ_lapace: bod.typ_lapace,
        druh_hmyzu: bod.druh_hmyzu,
        pocet: bod.pocet,
      });
      if (error) return `Chyba při vytváření bodu ${bod.cislo_bodu}: ${error.message}`;
    }
    return null;
  });

  if (poznamka !== undefined) {
    promises.push(
      updateProtokol(supabase, protokolId, {
        poznamka: poznamka || null,
      }).then(({ error }) =>
        error ? `Chyba při ukládání poznámky: ${error.message}` : null,
      ),
    );
  }

  const results = await Promise.all(promises);
  const errors = results.filter((r): r is string => r !== null);

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}

// ============================================================
// Pre-fill dezinsekčních bodů z předchozího protokolu
// ============================================================

/**
 * Načte předvyplněné dezinsekční body z předchozího protokolu.
 */
export async function getPrefilledDezinsBodyAction(zasahId: string) {
  if (!UUID_REGEX.test(zasahId)) {
    throw new Error("Neplatný formát ID zásahu");
  }

  const { supabase, user } = await requireTechnik();

  const { data: zasah } = await supabase
    .from("zasahy")
    .select(`
      id, technik_id,
      zakazky (
        id,
        objekty (
          id
        )
      )
    `)
    .eq("id", zasahId)
    .is("deleted_at", null)
    .single();

  if (!zasah || zasah.technik_id !== user.id) {
    throw new Error("Nemáte oprávnění k tomuto zásahu");
  }

  const objektId = (zasah.zakazky as Record<string, unknown>)?.objekty as
    | { id: string }
    | null;
  if (!objektId?.id) {
    return [];
  }

  const { data: recentProtokoly } = await getLatestProtokolForObjekt(
    supabase,
    objektId.id,
  );

  if (!recentProtokoly || recentProtokoly.length === 0) {
    return [];
  }

  const matchingProtokol = recentProtokoly.find((p) => {
    const zasahy = p.zasahy as Record<string, unknown> | null;
    const zakazky = zasahy?.zakazky as Record<string, unknown> | null;
    const objekty = zakazky?.objekty as { id: string } | null;
    return objekty?.id === objektId.id;
  });

  if (!matchingProtokol) {
    return [];
  }

  const { data: prevBody } = await getProtokolDezinsBody(
    supabase,
    matchingProtokol.id,
  );

  if (!prevBody || prevBody.length === 0) {
    return [];
  }

  return prefillDezinsBodyFromPrevious(prevBody);
}

// ============================================================
// Uložení postřiku + přípravků
// ============================================================

/**
 * Uloží postřiky a jejich přípravky.
 * Nový postřik: sekvenční (potřebuje postrik_id pro přípravky).
 * Update/delete: paralelní.
 */
export async function savePostrikAction(
  protokolId: string,
  postriky: PostrikInput[],
  poznamka?: string,
) {
  if (!UUID_REGEX.test(protokolId)) {
    throw new Error("Neplatný formát ID protokolu");
  }

  const { supabase } = await requireProtokolEditor(protokolId);

  const allErrors: string[] = [];

  for (const postrik of postriky) {
    if (postrik._deleted && postrik.id) {
      // Smazat přípravky postřiku
      const pripravkyPromises = postrik.pripravky
        .filter((pp) => pp.id)
        .map(async (pp) => {
          const { error } = await deleteProtokolPostrikPripravek(supabase, pp.id!);
          if (error) return `Chyba při mazání přípravku: ${error.message}`;
          return null;
        });
      const pripResults = await Promise.all(pripravkyPromises);
      allErrors.push(...pripResults.filter((r): r is string => r !== null));

      // Smazat postřik
      const { error } = await deleteProtokolPostrik(supabase, postrik.id);
      if (error) allErrors.push(`Chyba při mazání postřiku: ${error.message}`);
    } else if (postrik.id) {
      // Update existujícího postřiku + přípravky paralelně
      const promises: Promise<string | null>[] = [];

      promises.push(
        updateProtokolPostrik(supabase, postrik.id, {
          skudce: postrik.skudce,
          plocha_m2: postrik.plocha_m2,
          typ_zakroku: postrik.typ_zakroku,
          poznamka: postrik.poznamka_postriku,
        }).then(({ error }) =>
          error ? `Chyba při ukládání postřiku: ${error.message}` : null,
        ),
      );

      for (const pp of postrik.pripravky) {
        if (pp._deleted && pp.id) {
          promises.push(
            deleteProtokolPostrikPripravek(supabase, pp.id).then(({ error }) =>
              error ? `Chyba při mazání přípravku: ${error.message}` : null,
            ),
          );
        } else if (pp.id) {
          promises.push(
            updateProtokolPostrikPripravek(supabase, pp.id, {
              pripravek_id: pp.pripravek_id,
              spotreba: pp.spotreba,
              koncentrace_procent: pp.koncentrace_procent,
            }).then(({ error }) =>
              error ? `Chyba při ukládání přípravku: ${error.message}` : null,
            ),
          );
        } else {
          promises.push(
            createProtokolPostrikPripravek(supabase, {
              postrik_id: postrik.id,
              pripravek_id: pp.pripravek_id,
              spotreba: pp.spotreba,
              koncentrace_procent: pp.koncentrace_procent,
            }).then(({ error }) =>
              error ? `Chyba při vytváření přípravku: ${error.message}` : null,
            ),
          );
        }
      }

      const results = await Promise.all(promises);
      allErrors.push(...results.filter((r): r is string => r !== null));
    } else {
      // Nový postřik — sekvenční (potřebujeme postrik_id)
      const { data: newPostrik, error: createErr } = await createProtokolPostrik(
        supabase,
        {
          protokol_id: protokolId,
          skudce: postrik.skudce,
          plocha_m2: postrik.plocha_m2,
          typ_zakroku: postrik.typ_zakroku,
          poznamka: postrik.poznamka_postriku,
        },
      );

      if (createErr || !newPostrik) {
        allErrors.push(`Chyba při vytváření postřiku: ${createErr?.message || "unknown"}`);
        continue;
      }

      // Vytvořit přípravky paralelně
      const pripPromises = postrik.pripravky
        .filter((pp) => !pp._deleted)
        .map(async (pp) => {
          const { error } = await createProtokolPostrikPripravek(supabase, {
            postrik_id: newPostrik.id,
            pripravek_id: pp.pripravek_id,
            spotreba: pp.spotreba,
            koncentrace_procent: pp.koncentrace_procent,
          });
          if (error) return `Chyba při vytváření přípravku: ${error.message}`;
          return null;
        });

      const pripResults = await Promise.all(pripPromises);
      allErrors.push(...pripResults.filter((r): r is string => r !== null));
    }
  }

  // Poznámka paralelně
  if (poznamka !== undefined) {
    const { error } = await updateProtokol(supabase, protokolId, {
      poznamka: poznamka || null,
    });
    if (error) allErrors.push(`Chyba při ukládání poznámky: ${error.message}`);
  }

  if (allErrors.length > 0) {
    throw new Error(allErrors.join("; "));
  }
}

// ============================================================
// Data loading pro formulář
// ============================================================

/**
 * Načte aktivní rodenticidy pro výběr v protokolu.
 */
export async function getPripravkyForProtokolAction() {
  const { supabase } = await requireTechnik();

  const { data, error } = await getAktivniPripravky(supabase);
  if (error) throw new Error(error.message);

  // Filtr na rodenticidy
  return (data || []).filter((p) => p.typ === "rodenticid");
}

/**
 * Načte okruhy pro daný objekt.
 */
export async function getOkruhyForObjektAction(objektId: string) {
  if (!UUID_REGEX.test(objektId)) {
    throw new Error("Neplatný formát ID objektu");
  }

  const { supabase } = await requireTechnik();

  const { data, error } = await getOkruhy(supabase, objektId);
  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================================
// Upload fotodokumentace
// ============================================================

/**
 * Nahraje fotku k protokolu do Storage bucketu `protokol-fotky`.
 * Path: {userId}/{protokolId}/{randomUUID}.{ext}
 * RLS policy vyžaduje, aby path začínal user.id.
 */
export async function uploadProtokolFotoAction(
  protokolId: string,
  formData: FormData,
) {
  if (!UUID_REGEX.test(protokolId)) {
    throw new Error("Neplatný formát ID protokolu");
  }

  const { supabase, user } = await requireTechnik();

  // Ověření vlastnictví + status
  const { data: protokol } = await getProtokol(supabase, protokolId);
  if (!protokol) throw new Error("Protokol nenalezen");
  if (protokol.technik_id !== user.id) {
    throw new Error("Nemáte oprávnění k tomuto protokolu");
  }
  if (protokol.status !== "rozpracovany") {
    throw new Error("Protokol nelze editovat (status: " + protokol.status + ")");
  }

  const file = formData.get("file") as File;
  if (!file) throw new Error("Soubor nebyl vybrán");

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Soubor je příliš velký (max 5 MB)");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Povoleny jsou pouze obrázky");
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/${protokolId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("protokol-fotky")
    .upload(path, file, { upsert: false });

  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage
    .from("protokol-fotky")
    .getPublicUrl(path);

  const { data: fotka, error: createErr } = await createProtokolFotka(supabase, {
    protokol_id: protokolId,
    soubor_url: urlData.publicUrl,
    popis: null,
  });

  if (createErr || !fotka) {
    throw new Error(createErr?.message || "Nepodařilo se uložit záznam fotky");
  }

  return { id: fotka.id, soubor_url: urlData.publicUrl };
}

// ============================================================
// Smazání fotky
// ============================================================

/**
 * Smaže fotku z protokolu (soft-delete v DB + fyzické smazání ze Storage).
 */
export async function deleteProtokolFotoAction(
  fotoId: string,
  protokolId: string,
) {
  if (!UUID_REGEX.test(fotoId) || !UUID_REGEX.test(protokolId)) {
    throw new Error("Neplatný formát ID");
  }

  const { supabase, user } = await requireTechnik();

  // Ověření vlastnictví + status
  const { data: protokol } = await getProtokol(supabase, protokolId);
  if (!protokol) throw new Error("Protokol nenalezen");
  if (protokol.technik_id !== user.id) {
    throw new Error("Nemáte oprávnění k tomuto protokolu");
  }
  if (protokol.status !== "rozpracovany") {
    throw new Error("Protokol nelze editovat (status: " + protokol.status + ")");
  }

  // Načíst foto záznam pro získání storage cesty
  const { data: foto } = await supabase
    .from("protokol_fotky")
    .select("id, soubor_url")
    .eq("id", fotoId)
    .eq("protokol_id", protokolId)
    .is("deleted_at", null)
    .single();

  if (!foto) throw new Error("Fotka nenalezena");

  // Extrahovat storage path z URL
  const storagePath = foto.soubor_url.split("/protokol-fotky/")[1];
  if (storagePath) {
    await supabase.storage.from("protokol-fotky").remove([storagePath]);
  }

  // Soft-delete v DB
  const { error } = await deleteProtokolFotka(supabase, fotoId);
  if (error) throw new Error(error.message);
}

// ============================================================
// Upload podpisu klienta
// ============================================================

/**
 * Nahraje podpis klienta (PNG z canvas) do Storage a aktualizuje protokol.
 * Path: {userId}/{protokolId}/podpis.png (upsert: true — přepisuje starý)
 */
export async function uploadPodpisAction(
  protokolId: string,
  formData: FormData,
) {
  if (!UUID_REGEX.test(protokolId)) {
    throw new Error("Neplatný formát ID protokolu");
  }

  const { supabase, user } = await requireTechnik();

  // Ověření vlastnictví + status
  const { data: protokol } = await getProtokol(supabase, protokolId);
  if (!protokol) throw new Error("Protokol nenalezen");
  if (protokol.technik_id !== user.id) {
    throw new Error("Nemáte oprávnění k tomuto protokolu");
  }
  if (protokol.status !== "rozpracovany") {
    throw new Error("Protokol nelze editovat (status: " + protokol.status + ")");
  }

  const file = formData.get("file") as File;
  if (!file) throw new Error("Podpis nebyl vybrán");

  if (file.size > 1 * 1024 * 1024) {
    throw new Error("Podpis je příliš velký (max 1 MB)");
  }

  if (file.type !== "image/png") {
    throw new Error("Podpis musí být PNG obrázek");
  }

  const path = `${user.id}/${protokolId}/podpis.png`;

  const { error: uploadError } = await supabase.storage
    .from("protokol-fotky")
    .upload(path, file, { upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage
    .from("protokol-fotky")
    .getPublicUrl(path);

  // Přidat timestamp k URL pro cache-busting
  const podpisUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const { error: updateErr } = await updateProtokol(supabase, protokolId, {
    podpis_klient_url: podpisUrl,
  });

  if (updateErr) throw new Error(updateErr.message);

  return podpisUrl;
}

// ============================================================
// Uložení věty o účinnosti
// ============================================================

/**
 * Uloží větu o účinnosti do protokolu.
 */
export async function saveVetaUcinnostiAction(
  protokolId: string,
  vetaUcinnosti: string,
) {
  if (!UUID_REGEX.test(protokolId)) {
    throw new Error("Neplatný formát ID protokolu");
  }

  const { supabase } = await requireProtokolEditor(protokolId);

  const { error } = await updateProtokol(supabase, protokolId, {
    veta_ucinnosti: vetaUcinnosti || null,
  });

  if (error) throw new Error(error.message);
}

// ============================================================
// Odeslání ke schválení
// ============================================================

/**
 * Odešle protokol ke schválení.
 * Validace: alespoň 1 záznam (derat body / dezins body / postřik).
 */
export async function submitProtokolKeSchvaleniAction(protokolId: string) {
  if (!UUID_REGEX.test(protokolId)) {
    throw new Error("Neplatný formát ID protokolu");
  }

  const { supabase, user } = await requireTechnik();

  // Ověření vlastnictví + status
  const { data: protokol } = await getProtokol(supabase, protokolId);
  if (!protokol) throw new Error("Protokol nenalezen");
  if (protokol.technik_id !== user.id) {
    throw new Error("Nemáte oprávnění k tomuto protokolu");
  }
  if (protokol.status !== "rozpracovany") {
    throw new Error("Protokol lze odeslat pouze ze stavu rozpracovaný");
  }

  // Validace: alespoň 1 záznam musí existovat
  const [deratResult, dezinsResult, postrikResult] = await Promise.all([
    getProtokolDeratBody(supabase, protokolId),
    getProtokolDezinsBody(supabase, protokolId),
    getProtokolPostrik(supabase, protokolId),
  ]);

  const deratCount = deratResult.data?.length || 0;
  const dezinsCount = dezinsResult.data?.length || 0;
  const postrikCount = postrikResult.data?.length || 0;

  if (deratCount + dezinsCount + postrikCount === 0) {
    throw new Error("Protokol musí mít alespoň jeden záznam (deratizace, dezinsekce nebo postřik)");
  }

  const { error } = await updateProtokol(supabase, protokolId, {
    status: "ke_schvaleni",
  });

  if (error) throw new Error(error.message);

  // Fire-and-forget: generování AI hodnocení (non-blocking)
  generateAiHodnoceniAction(protokolId).catch(() => {
    // AI failure should not block submit
  });
}

// ============================================================
// Admin: schválení protokolu
// ============================================================

/**
 * Admin schválí protokol (status ke_schvaleni → schvaleny).
 * Vymaže případný admin_komentar.
 */
export async function adminApproveProtokolAction(protokolId: string) {
  if (!UUID_REGEX.test(protokolId)) {
    throw new Error("Neplatný formát ID protokolu");
  }

  const { supabase } = await requireAdmin();

  const { data: protokol } = await getProtokol(supabase, protokolId);
  if (!protokol) throw new Error("Protokol nenalezen");
  if (protokol.status !== "ke_schvaleni") {
    throw new Error("Schválit lze pouze protokol ve stavu ke schválení");
  }

  const { error } = await updateProtokol(supabase, protokolId, {
    status: "schvaleny",
    admin_komentar: null,
  });

  if (error) throw new Error(error.message);
}

// ============================================================
// Admin: vrácení protokolu technikovi
// ============================================================

/**
 * Admin vrátí protokol technikovi (status ke_schvaleni → rozpracovany).
 * Komentář min 10 znaků je povinný.
 */
export async function adminRejectProtokolAction(
  protokolId: string,
  komentar: string,
) {
  if (!UUID_REGEX.test(protokolId)) {
    throw new Error("Neplatný formát ID protokolu");
  }

  if (!komentar || komentar.trim().length < 10) {
    throw new Error("Komentář musí mít alespoň 10 znaků");
  }

  const { supabase } = await requireAdmin();

  const { data: protokol } = await getProtokol(supabase, protokolId);
  if (!protokol) throw new Error("Protokol nenalezen");
  if (protokol.status !== "ke_schvaleni") {
    throw new Error("Vrátit lze pouze protokol ve stavu ke schválení");
  }

  const { error } = await updateProtokol(supabase, protokolId, {
    status: "rozpracovany",
    admin_komentar: komentar.trim(),
  });

  if (error) throw new Error(error.message);
}

// ============================================================
// Admin: odeslání protokolu klientovi emailem
// ============================================================

/**
 * Admin odešle protokol klientovi emailem (status schvaleny → odeslany).
 * Generuje PDF, přiloží BL přípravků, odešle přes Resend.
 */
export async function sendProtokolEmailAction(
  protokolId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!UUID_REGEX.test(protokolId)) {
    return { success: false, error: "Neplatný formát ID protokolu" };
  }

  const { supabase } = await requireAdmin();

  // Načtení protokolu
  const { data: protokol } = await getProtokol(supabase, protokolId);
  if (!protokol) {
    return { success: false, error: "Protokol nenalezen" };
  }
  if (protokol.status !== "schvaleny") {
    return {
      success: false,
      error: "Odeslat lze pouze schválený protokol",
    };
  }

  // Extrakce klient dat
  const zasahy = protokol.zasahy as Record<string, unknown> | null;
  const zakazky = zasahy?.zakazky as Record<string, unknown> | null;
  const objekty = zakazky?.objekty as Record<string, unknown> | null;
  const klienti = objekty?.klienti as Record<string, unknown> | null;

  const klientEmail = klienti?.email as string | null;
  if (!klientEmail) {
    return {
      success: false,
      error: "Klient nemá zadaný email. Doplňte email v kartě klienta.",
    };
  }

  const klientName =
    (klienti?.nazev as string) ||
    `${(klienti?.prijmeni as string) || ""} ${(klienti?.jmeno as string) || ""}`.trim() ||
    "Klient";
  const objektNazev = (objekty?.nazev as string) || "";
  const datumZasahu = (zasahy?.datum as string) || "";

  try {
    // Dynamické importy — nechceme zatěžovat cold start pro ostatní akce
    const [
      { renderToBuffer },
      { DezinsekniProtokolPdf, buildDezinsekniPdfData },
      { renderProtokolEmailHtml },
      { sendProtokolEmail },
      { createEmailLog },
      { getBezpecnostniListy },
      pathModule,
    ] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/lib/pdf/dezinsekniProtokol"),
      import("@/lib/email/templates/ProtokolEmail"),
      import("@/lib/email/resend"),
      import("@/lib/supabase/queries/email_log"),
      import("@/lib/supabase/queries/bezpecnostni_listy"),
      import("path"),
    ]);

    // Načtení dat pro PDF (stejný pattern jako API route)
    const [{ data: postrikData }, { data: deratData }, { data: dezinsData }] =
      await Promise.all([
        getProtokolPostrik(supabase, protokolId),
        getProtokolDeratBody(supabase, protokolId),
        getProtokolDezinsBody(supabase, protokolId),
      ]);

    const postriky = (postrikData || []).map((p) => {
      const pripravkyArr =
        (
          (p as Record<string, unknown>).protokol_postrik_pripravky as
            | {
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

    // Unikátní přípravky pro BL sekci + fetch BL souborů
    const pripravekIds = new Set<string>();
    const pripravekNames: string[] = [];

    for (const p of postriky) {
      for (const pp of p.pripravky) {
        if (!pripravekNames.includes(pp.nazev)) {
          pripravekNames.push(pp.nazev);
        }
      }
    }

    // Získat ID přípravků pro BL fetch
    for (const p of postrikData || []) {
      const pripravkyArr =
        (
          (p as Record<string, unknown>).protokol_postrik_pripravky as
            | { pripravky: { id: string } }[]
            | null
        ) || [];
      for (const pp of pripravkyArr) {
        pripravekIds.add(pp.pripravky.id);
      }
    }

    // Fetch BL souborů
    const blAttachments: { filename: string; content: Buffer }[] = [];
    for (const pripravekId of pripravekIds) {
      const { data: blData } = await getBezpecnostniListy(
        supabase,
        pripravekId,
      );
      for (const bl of blData || []) {
        try {
          const res = await fetch(bl.soubor_url);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            blAttachments.push({
              filename: bl.nazev_souboru,
              content: Buffer.from(arrayBuffer),
            });
          }
        } catch {
          // Skip broken BL files silently
        }
      }
    }

    const bezpecnostniListyNames = pripravekNames.map(
      (name) => `Bezpečnostní list: ${name}`,
    );

    // Build + render PDF
    const pdfData = buildDezinsekniPdfData({
      protokol: {
        cislo_protokolu: protokol.cislo_protokolu,
        poznamka: protokol.poznamka,
        veta_ucinnosti: protokol.veta_ucinnosti,
        zodpovedny_technik: protokol.zodpovedny_technik,
      },
      zasah: { datum: datumZasahu },
      klient: {
        nazev: (klienti?.nazev as string) ?? null,
        jmeno: (klienti?.jmeno as string) ?? null,
        prijmeni: (klienti?.prijmeni as string) ?? null,
        ico: (klienti?.ico as string) ?? null,
        dic: (klienti?.dic as string) ?? null,
        adresa: (klienti?.adresa as string) ?? null,
        email: klientEmail,
        telefon: (klienti?.telefon as string) ?? null,
      },
      objekt: {
        nazev: objektNazev,
        adresa: (objekty?.adresa as string) ?? null,
      },
      postriky,
      deratBody,
      dezinsBody,
      bezpecnostniListy: bezpecnostniListyNames,
      dalsiZasah: null,
    });

    const logoPath = pathModule.join(process.cwd(), "public", "logo.png");
    const pdfBuffer = await renderToBuffer(
      DezinsekniProtokolPdf({ data: pdfData, logoPath }),
    );

    const pdfFilename = `${pdfData.cislo_protokolu || "protokol"}.pdf`;

    // Render email HTML
    const formattedDate = datumZasahu
      ? new Date(datumZasahu).toLocaleDateString("cs-CZ")
      : "—";

    const html = renderProtokolEmailHtml({
      cisloProtokolu: protokol.cislo_protokolu || "—",
      datumZasahu: formattedDate,
      klientName,
      objektNazev: objektNazev || "—",
      bezpecnostniListy: blAttachments.map((a) => a.filename),
    });

    const subject = `Protokol ${protokol.cislo_protokolu || ""} — Deraplus`;

    // Odeslání emailu
    const resendId = await sendProtokolEmail({
      to: klientEmail,
      subject,
      html,
      attachments: [
        { filename: pdfFilename, content: Buffer.from(pdfBuffer) },
        ...blAttachments,
      ],
    });

    // Záznam do email_log
    await createEmailLog(supabase, {
      protokol_id: protokolId,
      prijemce: klientEmail,
      predmet: subject,
      typ: "protokol",
      stav: "odeslano",
      resend_id: resendId,
      odeslano_at: new Date().toISOString(),
    });

    // Update status na odeslany
    await updateProtokol(supabase, protokolId, {
      status: "odeslany",
    });

    return { success: true };
  } catch (err) {
    // Log chyby do email_log
    try {
      const { createEmailLog: createLog } = await import(
        "@/lib/supabase/queries/email_log"
      );
      await createLog(supabase, {
        protokol_id: protokolId,
        prijemce: klientEmail,
        predmet: `Protokol ${protokol.cislo_protokolu || ""} — Deraplus`,
        typ: "protokol",
        stav: "chyba",
        chyba_detail:
          err instanceof Error ? err.message : "Neznámá chyba",
      });
    } catch {
      // Ignore logging error
    }

    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Nepodařilo se odeslat email",
    };
  }
}

// ============================================================
// Fakturace: automatická faktura po schválení protokolu
// ============================================================

/**
 * Vytvoří fakturu ve Fakturoidu po schválení protokolu.
 * Non-throwing: vrací { success, fakturaId?, error? }.
 *
 * Flow:
 * 1. Najde/vytvoří kontakt v Fakturoidu (dle IČO klienta)
 * 2. Načte položky zakázky (zakazka_polozky)
 * 3. Vytvoří fakturu s řádky, DPH, splatností
 * 4. Uloží do DB tabulky faktury
 */
export async function createFakturaAction(
  protokolId: string,
): Promise<{ success: boolean; fakturaId?: string; error?: string }> {
  if (!UUID_REGEX.test(protokolId)) {
    return { success: false, error: "Neplatný formát ID protokolu" };
  }

  try {
    const { supabase } = await requireAdmin();

    // Načtení protokolu s vazbami
    const { data: protokol } = await getProtokol(supabase, protokolId);
    if (!protokol) {
      return { success: false, error: "Protokol nenalezen" };
    }
    if (protokol.status !== "schvaleny" && protokol.status !== "odeslany") {
      return {
        success: false,
        error: "Fakturu lze vystavit pouze pro schválený/odeslaný protokol",
      };
    }

    // Dynamické importy — nechceme zatěžovat cold start
    const [
      { getFakturaByProtokol, createFaktura, updateKlientFakturoidId },
      { getPolozkyForZakazka },
      { findOrCreateSubject, buildInvoiceLines, createInvoice },
    ] = await Promise.all([
      import("@/lib/supabase/queries/faktury"),
      import("@/lib/supabase/queries/zakazka_polozky"),
      import("@/lib/fakturoid"),
    ]);

    // Kontrola duplicity
    const { data: existingFaktura } = await getFakturaByProtokol(
      supabase,
      protokolId,
    );
    if (existingFaktura) {
      return {
        success: false,
        error: "Pro tento protokol již existuje faktura",
      };
    }

    // Extrakce dat z vazeb
    const zasahy = protokol.zasahy as Record<string, unknown> | null;
    const zakazky = zasahy?.zakazky as Record<string, unknown> | null;
    const objekty = zakazky?.objekty as Record<string, unknown> | null;
    const klienti = objekty?.klienti as Record<string, unknown> | null;

    if (!zakazky || !klienti) {
      return {
        success: false,
        error: "Nepodařilo se načíst data zakázky/klienta",
      };
    }

    const zakazkaId = zakazky.id as string;
    const klientId = klienti.id as string;

    // Klient data
    const klientData = {
      nazev: (klienti.nazev as string) || "",
      jmeno: (klienti.jmeno as string) || "",
      prijmeni: (klienti.prijmeni as string) || "",
      typ: (klienti.typ as "firma" | "fyzicka_osoba") || "firma",
      ico: (klienti.ico as string | null) || null,
      dic: (klienti.dic as string | null) || null,
      email: (klienti.email as string | null) || null,
      telefon: null as string | null,
      adresa: (objekty?.adresa as string) || "",
      fakturoid_subject_id:
        (klienti.fakturoid_subject_id as number | null) || null,
    };

    // 1. Find/create Fakturoid subject
    const subjectId = await findOrCreateSubject(klientData);

    // Uložit fakturoid_subject_id pokud nový
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

    // 3. DPH sazba a výpočet
    const dphSazba =
      (zakazky.dph_sazba_snapshot as number) ||
      (klienti.dph_sazba as number) ||
      21;
    const cenaZaklad =
      (zakazky.cena_po_sleve as number) || (zakazky.cena_zaklad as number) || 0;
    const cenaSdph = (zakazky.cena_s_dph as number) || cenaZaklad * (1 + dphSazba / 100);

    // 4. Build invoice lines
    const lines = buildInvoiceLines(polozky, dphSazba);

    // 5. Create invoice in Fakturoid
    const splatnostDnu = 14;
    const fakturoidInvoice = await createInvoice({
      subject_id: subjectId,
      lines,
      due: splatnostDnu,
      payment_method: "bank",
      language: "cz",
      note: `Protokol: ${protokol.cislo_protokolu || ""}`,
    });

    // 6. Save to our DB
    const datumSplatnosti = fakturoidInvoice.due_on;

    const { data: faktura, error: insertError } = await createFaktura(
      supabase,
      {
        zakazka_id: zakazkaId,
        protokol_id: protokolId,
        fakturoid_id: fakturoidInvoice.id,
        cislo: fakturoidInvoice.number,
        castka_bez_dph: parseFloat(fakturoidInvoice.subtotal) || cenaZaklad,
        castka_s_dph: parseFloat(fakturoidInvoice.total) || cenaSdph,
        dph_sazba: dphSazba,
        splatnost_dnu: splatnostDnu,
        datum_splatnosti: datumSplatnosti,
        stav: "vytvorena",
        fakturoid_url: fakturoidInvoice.html_url || null,
        fakturoid_pdf_url: fakturoidInvoice.pdf_url || null,
      },
    );

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    revalidatePath(`/protokoly/${protokolId}`);
    revalidatePath("/faktury");

    return { success: true, fakturaId: faktura?.id };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Nepodařilo se vytvořit fakturu",
    };
  }
}

/**
 * Odešle fakturu přes Fakturoid (mark_as_sent → stav odeslana).
 */
export async function sendFakturaAction(
  fakturaId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!UUID_REGEX.test(fakturaId)) {
    return { success: false, error: "Neplatný formát ID faktury" };
  }

  try {
    const { supabase } = await requireAdmin();

    const [{ getFaktura: getFakturaQuery, updateFaktura }, { fireInvoiceEvent }] =
      await Promise.all([
        import("@/lib/supabase/queries/faktury"),
        import("@/lib/fakturoid"),
      ]);

    const { data: faktura } = await getFakturaQuery(supabase, fakturaId);
    if (!faktura) {
      return { success: false, error: "Faktura nenalezena" };
    }
    if (faktura.stav !== "vytvorena") {
      return {
        success: false,
        error: "Odeslat lze pouze fakturu ve stavu vytvořena",
      };
    }
    if (!faktura.fakturoid_id) {
      return {
        success: false,
        error: "Faktura nemá napojení na Fakturoid",
      };
    }

    // Fire event in Fakturoid
    await fireInvoiceEvent(faktura.fakturoid_id, "deliver");

    // Update our DB
    await updateFaktura(supabase, fakturaId, { stav: "odeslana" });

    revalidatePath("/faktury");
    revalidatePath(`/faktury/${fakturaId}`);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Nepodařilo se odeslat fakturu",
    };
  }
}

// ============================================================
// AI: doporučení přípravků pro postřik
// ============================================================

export type AiDoporuceniResult = {
  pripravek_id: string;
  nazev: string;
  duvod: string;
  priorita: number;
};

/**
 * AI doporučí přípravky pro daného škůdce v kontextu protokolu.
 * Non-throwing: vrací { doporuceni } nebo { error }.
 */
export async function getAiPripravkyDoporuceniAction(
  protokolId: string,
  skudceNazev: string,
): Promise<{ doporuceni?: AiDoporuceniResult[]; error?: string }> {
  try {
    if (!UUID_REGEX.test(protokolId)) {
      return { error: "Neplatný formát ID protokolu" };
    }
    if (!skudceNazev || skudceNazev.trim().length === 0) {
      return { error: "Škůdce nebyl zadán" };
    }

    const { supabase, protokol } = await requireProtokolEditor(protokolId);

    // Načíst typObjektu přes chain: protokol → zasah → zakázka → objekt
    const zasahy = protokol.zasahy as Record<string, unknown> | null;
    const zakazky = zasahy?.zakazky as Record<string, unknown> | null;
    const objekty = zakazky?.objekty as Record<string, unknown> | null;
    const typObjektu = (objekty?.typ_objektu as string) || null;

    // Načíst aktivní přípravky a filtrovat
    const { data: allPripravky } = await getAktivniPripravky(supabase);
    const filtered = filterPripravkyForPostrik(
      (allPripravky || []).map((p) => ({
        id: p.id,
        nazev: p.nazev,
        ucinna_latka: p.ucinna_latka,
        protilatka: p.protilatka,
        typ: p.typ,
        cilovy_skudce: p.cilovy_skudce,
        omezeni_prostor: p.omezeni_prostor,
      })),
      skudceNazev,
      typObjektu,
    );

    if (filtered.length === 0) {
      return { doporuceni: [] };
    }

    // Dynamický import AI modulu (nechceme zatěžovat cold start)
    const { getAiDoporuceniPripravku } = await import(
      "@/lib/ai/doporuceniPripravku"
    );

    const doporuceni = await getAiDoporuceniPripravku({
      skudceNazev,
      typObjektu,
      dostupnePripravky: filtered.map((p) => ({
        id: p.id,
        nazev: p.nazev,
        ucinna_latka: p.ucinna_latka,
        typ: p.typ,
        cilovy_skudce: p.cilovy_skudce,
        omezeni_prostor: p.omezeni_prostor,
      })),
    });

    return { doporuceni };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "AI doporučení selhalo",
    };
  }
}

// ============================================================
// AI: generování hodnocení trendu
// ============================================================

/**
 * Generuje AI hodnocení situace na objektu a uloží do protokolu.
 * Non-throwing: vrací { hodnoceni } nebo { error }.
 */
export async function generateAiHodnoceniAction(
  protokolId: string,
): Promise<{ hodnoceni?: string; error?: string }> {
  try {
    if (!UUID_REGEX.test(protokolId)) {
      return { error: "Neplatný formát ID protokolu" };
    }

    const { supabase, protokol } = await requireProtokolEditor(protokolId);

    // Načíst data pro hodnocení
    const zasahy = protokol.zasahy as Record<string, unknown> | null;
    const zakazky = zasahy?.zakazky as Record<string, unknown> | null;
    const objekty = zakazky?.objekty as Record<string, unknown> | null;
    const objektNazev = (objekty?.nazev as string) || "Neznámý objekt";
    const typObjektu = (objekty?.typ_objektu as string) || null;
    const objektId = (objekty?.id as string) || null;

    // Načíst aktuální body
    const [deratResult, dezinsResult] = await Promise.all([
      getProtokolDeratBody(supabase, protokolId),
      getProtokolDezinsBody(supabase, protokolId),
    ]);

    const currentDeratBody = (deratResult.data || []).map((d) => ({
      cislo_bodu: d.cislo_bodu,
      pozer_procent: d.pozer_procent,
      typ_stanicky: d.typ_stanicky,
    }));

    const currentDezinsBody = (dezinsResult.data || []).map((d) => ({
      cislo_bodu: d.cislo_bodu,
      pocet: d.pocet,
      druh_hmyzu: d.druh_hmyzu,
    }));

    // Načíst předchozí body pro statistiky
    let previousDeratBody: { pozer_procent: number }[] | null = null;
    let previousDezinsBody: { pocet: number }[] | null = null;

    if (objektId) {
      const { data: recentProtokoly } = await getLatestProtokolForObjekt(
        supabase,
        objektId,
      );

      if (recentProtokoly && recentProtokoly.length > 0) {
        // Najdi předchozí protokol (ne ten aktuální)
        const prevProtokol = recentProtokoly.find((p) => {
          const z = p.zasahy as Record<string, unknown> | null;
          const zk = z?.zakazky as Record<string, unknown> | null;
          const o = zk?.objekty as { id: string } | null;
          return o?.id === objektId && p.id !== protokolId;
        });

        if (prevProtokol) {
          const [prevDerat, prevDezins] = await Promise.all([
            getProtokolDeratBody(supabase, prevProtokol.id),
            getProtokolDezinsBody(supabase, prevProtokol.id),
          ]);
          previousDeratBody = (prevDerat.data || []).map((d) => ({
            pozer_procent: d.pozer_procent,
          }));
          previousDezinsBody = (prevDezins.data || []).map((d) => ({
            pocet: d.pocet,
          }));
        }
      }
    }

    // Compute statistiky
    const deratStatistiky =
      currentDeratBody.length > 0
        ? computeDeratStatistiky(currentDeratBody, previousDeratBody || [])
        : null;
    const dezinsStatistiky =
      currentDezinsBody.length > 0
        ? computeDezinsStatistiky(currentDezinsBody, previousDezinsBody || [])
        : null;

    // Dynamický import AI modulu
    const { generateAiHodnoceni } = await import("@/lib/ai/analyzaTrendu");

    const hodnoceni = await generateAiHodnoceni({
      objektNazev,
      typObjektu,
      deratStatistiky,
      dezinsStatistiky,
      currentDeratBody,
      currentDezinsBody,
      previousDeratBody,
      previousDezinsBody,
    });

    // Uložit do DB
    await updateProtokol(supabase, protokolId, {
      ai_hodnoceni: hodnoceni,
    });

    return { hodnoceni };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "AI hodnocení selhalo",
    };
  }
}

// ============================================================
// AI: uložení editovaného hodnocení
// ============================================================

/**
 * Uloží ručně editované AI hodnocení do protokolu.
 */
export async function saveAiHodnoceniAction(
  protokolId: string,
  hodnoceni: string,
) {
  if (!UUID_REGEX.test(protokolId)) {
    throw new Error("Neplatný formát ID protokolu");
  }

  const { supabase } = await requireProtokolEditor(protokolId);

  const { error } = await updateProtokol(supabase, protokolId, {
    ai_hodnoceni: hodnoceni || null,
  });

  if (error) throw new Error(error.message);
}

// ============================================================
// Živá kalkulace ceny z protokolu
// ============================================================

export type LivePriceResult = {
  polozky: { nazev: string; pocet: number; cena_za_kus: number; cena_celkem: number }[];
  cena_zaklad: number;
  cena_s_dph: number;
  dph_sazba: number;
  pocet_bodu_mys: number;
  pocet_bodu_potkan: number;
  pocet_bodu_zivolovna: number;
  pocet_bodu_sklopna_mys: number;
  pocet_bodu_sklopna_potkan: number;
};

/**
 * Vypočítá živou cenu zakázky na základě aktuálních bodů v protokolu.
 * Dostupné pro technika i admina — read-only výpočet.
 */
export async function computeLivePriceAction(
  protokolId: string,
): Promise<{ success: boolean; data?: LivePriceResult; error?: string }> {
  if (!UUID_REGEX.test(protokolId)) {
    return { success: false, error: "Neplatný formát ID protokolu" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Nepřihlášen" };

    // Načtení protokolu s vazbami
    const { data: protokol } = await getProtokol(supabase, protokolId);
    if (!protokol) return { success: false, error: "Protokol nenalezen" };

    // Extrakce zakázky
    const zasahy = protokol.zasahy as Record<string, unknown> | null;
    const zakazky = zasahy?.zakazky as Record<string, unknown> | null;
    if (!zakazky) return { success: false, error: "Zakázka nenalezena" };

    const objekty = zakazky.objekty as Record<string, unknown> | null;
    const klienti = objekty?.klienti as Record<string, unknown> | null;

    const zakazkaId = zakazky.id as string;
    const typZakazky = (zakazky.typ_zakazky as string) || "smluvni";
    const typyZasahu = (zakazky.typy_zasahu as string[]) || [];
    const doprava_km = (zakazky.doprava_km as number) || 0;
    const je_prvni_navsteva = (zakazky.je_prvni_navsteva as boolean) ?? true;
    const je_vikend = (zakazky.je_vikend as boolean) ?? false;
    const je_nocni = (zakazky.je_nocni as boolean) ?? false;
    const pocet_bytu = (zakazky.pocet_bytu as number) || undefined;
    const sleva_typ = (zakazky.sleva_typ as string) || null;
    const sleva_hodnota = (zakazky.sleva_hodnota as number) || 0;
    const individualni_sleva =
      (klienti?.individualni_sleva_procent as number) || 0;
    const dph_sazba = (klienti?.dph_sazba as number) || 21;

    // Škůdci ze zakázky
    const zakazkaSkudci = (zakazky.skudci_nazvy as string[]) || [];

    // Načtení aktuálních bodů z protokolu
    const { data: deratBody } = await getProtokolDeratBody(supabase, protokolId);
    const body = deratBody || [];

    // Spočítat body dle typu
    const pocet_bodu_mys = body.filter((b) => b.typ_stanicky === "mys").length;
    const pocet_bodu_potkan = body.filter(
      (b) => b.typ_stanicky === "potkan",
    ).length;
    const pocet_bodu_zivolovna = body.filter(
      (b) => b.typ_stanicky === "zivolovna",
    ).length;
    const pocet_bodu_sklopna_mys = body.filter(
      (b) => b.typ_stanicky === "sklopna_mys",
    ).length;
    const pocet_bodu_sklopna_potkan = body.filter(
      (b) => b.typ_stanicky === "sklopna_potkan",
    ).length;

    // Načtení ceníku (dynamic import)
    const [
      { getCenikObecne, getCenikPostriky, getCenikGely, getCenikSpecialni, getCenikDeratizace, getCenikDezinfekce },
      { vypocetCeny },
    ] = await Promise.all([
      import("@/lib/supabase/queries/cenik"),
      import("@/lib/kalkulacka/vypocetCeny"),
    ]);

    const [obecneR, postrikyR, gelyR, specialniR, deratizaceR, dezinfekceR] =
      await Promise.all([
        getCenikObecne(supabase),
        getCenikPostriky(supabase),
        getCenikGely(supabase),
        getCenikSpecialni(supabase),
        getCenikDeratizace(supabase),
        getCenikDezinfekce(supabase),
      ]);

    const cenikData = {
      obecne: (obecneR.data || []).map((r) => ({
        nazev: r.nazev,
        hodnota: Number(r.hodnota),
        jednotka: r.jednotka || "",
      })),
      postriky: (postrikyR.data || []).map((r) => ({
        kategorie: r.kategorie,
        plocha_od: Number(r.plocha_od),
        plocha_do: r.plocha_do != null ? Number(r.plocha_do) : null,
        cena: Number(r.cena),
      })),
      gely: (gelyR.data || []).map((r) => ({
        kategorie: r.kategorie,
        bytu_od: Number(r.bytu_od),
        bytu_do: r.bytu_do != null ? Number(r.bytu_do) : null,
        cena: Number(r.cena),
      })),
      specialni: (specialniR.data || []).map((r) => ({
        nazev: r.nazev,
        cena_od: Number(r.cena_od),
        cena_do: r.cena_do != null ? Number(r.cena_do) : null,
      })),
      deratizace: (deratizaceR.data || []).map((r) => ({
        nazev: r.nazev,
        cena_za_kus: Number(r.cena_za_kus),
      })),
      dezinfekce: (dezinfekceR.data || []).map((r) => ({
        typ: r.typ,
        plocha_od: Number(r.plocha_od),
        plocha_do: r.plocha_do != null ? Number(r.plocha_do) : null,
        cena_za_m: Number(r.cena_za_m),
      })),
    };

    const plocha_m2 = (objekty?.plocha_m2 as number) || 0;

    const vysledek = vypocetCeny(cenikData, {
      typ_zakazky: typZakazky as "jednorazova" | "smluvni",
      typy_zasahu: typyZasahu,
      skudci: zakazkaSkudci,
      plocha_m2,
      pocet_bytu,
      doprava_km,
      je_prvni_navsteva: je_prvni_navsteva,
      je_vikend,
      je_nocni,
      pocet_bodu_mys,
      pocet_bodu_potkan,
      pocet_bodu_zivolovna_mys: pocet_bodu_zivolovna,
      pocet_bodu_zivolovna_potkan: 0,
      pocet_bodu_sklopna_mys,
      pocet_bodu_sklopna_potkan,
      sleva_typ: sleva_typ as "procenta" | "castka" | null,
      sleva_hodnota,
      individualni_sleva_procent: individualni_sleva,
      dph_sazba,
    });

    return {
      success: true,
      data: {
        polozky: vysledek.polozky,
        cena_zaklad: vysledek.cena_zaklad,
        cena_s_dph: vysledek.cena_s_dph,
        dph_sazba: vysledek.dph_sazba,
        pocet_bodu_mys,
        pocet_bodu_potkan,
        pocet_bodu_zivolovna: pocet_bodu_zivolovna,
        pocet_bodu_sklopna_mys,
        pocet_bodu_sklopna_potkan,
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Nepodařilo se vypočítat cenu",
    };
  }
}

// ============================================================
// Sync protokol → zakázka: aktualizace ceny a polozek
// ============================================================

/**
 * Po uložení protokolu přepočítá cenu zakázky z aktuálních bodů
 * a uloží ji zpět do zakázky + zakazka_polozky.
 * Admin only.
 */
export async function syncProtocolPriceToZakazkaAction(
  protokolId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!UUID_REGEX.test(protokolId)) {
    return { success: false, error: "Neplatný formát ID" };
  }

  try {
    const { supabase } = await requireAdmin();

    // Compute live price
    const result = await computeLivePriceAction(protokolId);
    if (!result.success || !result.data) {
      return { success: false, error: result.error || "Chyba výpočtu" };
    }

    // Najít zakázku
    const { data: protokol } = await getProtokol(supabase, protokolId);
    if (!protokol) return { success: false, error: "Protokol nenalezen" };

    const zasahy = protokol.zasahy as Record<string, unknown> | null;
    const zakazky = zasahy?.zakazky as Record<string, unknown> | null;
    if (!zakazky) return { success: false, error: "Zakázka nenalezena" };

    const zakazkaId = zakazky.id as string;
    const klienti = (zakazky.objekty as Record<string, unknown> | null)
      ?.klienti as Record<string, unknown> | null;
    const dph_sazba = (klienti?.dph_sazba as number) || 21;

    const { updateZakazka } = await import(
      "@/lib/supabase/queries/zakazky"
    );
    const { replacePolozky } = await import(
      "@/lib/supabase/queries/zakazka_polozky"
    );

    // Update zakázka pricing
    const { error: updateError } = await updateZakazka(supabase, zakazkaId, {
      cena_zaklad: result.data.cena_zaklad,
      cena_po_sleve: result.data.cena_zaklad,
      cena_s_dph: result.data.cena_s_dph,
      dph_sazba_snapshot: dph_sazba,
    });
    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Replace polozky
    const { error: polozkyError } = await replacePolozky(
      supabase,
      zakazkaId,
      result.data.polozky.map((p, i) => ({
        nazev: p.nazev,
        pocet: p.pocet,
        cena_za_kus: p.cena_za_kus,
        cena_celkem: p.cena_celkem,
        poradi: i,
      })),
    );
    if (polozkyError) {
      return { success: false, error: polozkyError.message };
    }

    revalidatePath(`/protokoly/${protokolId}`);
    revalidatePath(`/zakazky/${zakazkaId}`);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Nepodařilo se synchronizovat cenu",
    };
  }
}
