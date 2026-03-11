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
