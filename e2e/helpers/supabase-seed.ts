/**
 * E2E test helper: seed + cleanup test data via Supabase service role.
 * Vytvoří chain: klient → objekt → zakázka → zásah → protokol
 * s vazbou na existujícího technika.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type SeedData = {
  klientId: string;
  objektId: string;
  zakazkaId: string;
  zasahId: string;
  protokolId: string;
  technikId: string;
};

/**
 * Najde technika dle emailu a vytvoří celý chain testovacích dat.
 */
export async function seedProtokolData(
  technikEmail: string,
  options?: {
    typyZasahu?: string[];
  },
): Promise<SeedData> {
  const sb = adminClient();

  // 1. Najdi technika
  const { data: technik, error: tErr } = await sb
    .from("profiles")
    .select("id")
    .eq("email", technikEmail)
    .single();
  if (tErr || !technik) throw new Error(`Technik ${technikEmail} not found: ${tErr?.message}`);

  const technikId = technik.id;

  // 2. Vytvoř klienta
  const { data: klient, error: kErr } = await sb
    .from("klienti")
    .insert({
      typ: "firma",
      nazev: "E2E Test Klient s.r.o.",
      ico: "99999999",
      adresa: "Testovací 123, Praha",
      email: "e2e@test.cz",
      telefon: "800111222",
    })
    .select("id")
    .single();
  if (kErr || !klient) throw new Error(`Klient insert failed: ${kErr?.message}`);

  // 3. Vytvoř objekt
  const { data: objekt, error: oErr } = await sb
    .from("objekty")
    .insert({
      klient_id: klient.id,
      nazev: "E2E Provozovna",
      adresa: "Testovací 123, Praha",
      plocha_m2: 200,
      typ_objektu: "gastro",
    })
    .select("id")
    .single();
  if (oErr || !objekt) throw new Error(`Objekt insert failed: ${oErr?.message}`);

  // 4. Vytvoř zakázku
  const typyZasahu = options?.typyZasahu || ["vnitrni_deratizace"];
  const { data: zakazka, error: zErr } = await sb
    .from("zakazky")
    .insert({
      objekt_id: objekt.id,
      typ: "smluvni",
      status: "aktivni",
      typy_zasahu: typyZasahu,
      skudci: ["Potkan obecný"],
    })
    .select("id")
    .single();
  if (zErr || !zakazka) throw new Error(`Zakázka insert failed: ${zErr?.message}`);

  // 5. Vytvoř zásah
  const { data: zasah, error: zaErr } = await sb
    .from("zasahy")
    .insert({
      zakazka_id: zakazka.id,
      technik_id: technikId,
      datum: new Date().toISOString().split("T")[0],
      cas_od: "08:00",
      cas_do: "10:00",
      status: "hotovo",
    })
    .select("id")
    .single();
  if (zaErr || !zasah) throw new Error(`Zásah insert failed: ${zaErr?.message}`);

  // 6. Vytvoř protokol (cislo_protokolu musí vygenerovat DB funkce, proto NULL)
  const { data: protokol, error: pErr } = await sb
    .from("protokoly")
    .insert({
      zasah_id: zasah.id,
      technik_id: technikId,
      status: "rozpracovany",
      cislo_protokolu: `P-E2E-${Date.now()}`,
    })
    .select("id")
    .single();
  if (pErr || !protokol) throw new Error(`Protokol insert failed: ${pErr?.message}`);

  return {
    klientId: klient.id,
    objektId: objekt.id,
    zakazkaId: zakazka.id,
    zasahId: zasah.id,
    protokolId: protokol.id,
    technikId,
  };
}

/**
 * Soft-delete testovací data (chain v opačném pořadí).
 */
export async function cleanupSeedData(data: SeedData) {
  const sb = adminClient();
  const now = new Date().toISOString();

  // Soft delete in reverse order (child → parent)
  await sb.from("protokol_deratizacni_body").update({ deleted_at: now }).eq("protokol_id", data.protokolId);
  await sb.from("protokol_dezinsekci_body").update({ deleted_at: now }).eq("protokol_id", data.protokolId);
  await sb.from("protokol_postrik").update({ deleted_at: now }).eq("protokol_id", data.protokolId);
  await sb.from("protokoly").update({ deleted_at: now }).eq("id", data.protokolId);
  await sb.from("zasahy").update({ deleted_at: now }).eq("id", data.zasahId);
  await sb.from("zakazky").update({ deleted_at: now }).eq("id", data.zakazkaId);
  await sb.from("objekty").update({ deleted_at: now }).eq("id", data.objektId);
  await sb.from("klienti").update({ deleted_at: now }).eq("id", data.klientId);
}
