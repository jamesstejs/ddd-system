"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { Coins, Calculator, Loader2, Info } from "lucide-react";
import {
  vypocetCeny,
  type CenikData,
  type Polozka,
  type VypocetCenyInput,
  type VysledekCeny,
} from "@/lib/kalkulacka/vypocetCeny";
import { saveKalkulaceAction } from "../actions";
import type { Database } from "@/lib/supabase/database.types";

// ----- Types -----

type ZakazkaRow = Database["public"]["Tables"]["zakazky"]["Row"];

interface KlientData {
  dph_sazba: number;
  individualni_sleva_procent: number;
}

interface ObjektData {
  plocha_m2: number | null;
}

interface CenovaKalkulaceProps {
  zakazka: ZakazkaRow & {
    objekty: ObjektData & { klienti: KlientData };
  };
  isAdmin: boolean;
  cenikData: CenikData;
  existujiciPolozky: Polozka[] | null;
}

// ----- Helpers -----

function formatCena(cena: number): string {
  return new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cena);
}

// ----- Component -----

export function CenovaKalkulace({
  zakazka,
  isAdmin,
  cenikData,
  existujiciPolozky,
}: CenovaKalkulaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCalc, setShowCalc] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<VysledekCeny | null>(null);

  // Form state
  const [doprava, setDoprava] = useState(Number(zakazka.doprava_km) || 0);
  const [jePrvni, setJePrvni] = useState(zakazka.je_prvni_navsteva ?? true);
  const [jeVikend, setJeVikend] = useState(zakazka.je_vikend ?? false);
  const [jeNocni, setJeNocni] = useState(zakazka.je_nocni ?? false);
  const [pocetBytu, setPocetBytu] = useState(zakazka.pocet_bytu ?? 0);
  const [slevaTyp, setSlevaTyp] = useState<"procenta" | "castka" | "zadna">(
    (zakazka.sleva_typ as "procenta" | "castka") || "zadna",
  );
  const [slevaHodnota, setSlevaHodnota] = useState(
    Number(zakazka.sleva_hodnota) || 0,
  );

  // Monitorovací body (for smluvní)
  const [bodyMys, setBodyMys] = useState(0);
  const [bodyPotkan, setBodyPotkan] = useState(0);
  const [bodyZivolovnaMys, setBodyZivolovnaMys] = useState(0);
  const [bodyZivolovnaPotkan, setBodyZivolovnaPotkan] = useState(0);
  const [bodySklopnaMys, setBodySklopnaMys] = useState(0);

  const klient = zakazka.objekty.klienti;
  const hasKalkulace = zakazka.cena_zaklad !== null && existujiciPolozky !== null && existujiciPolozky.length > 0;

  function buildInput(): VypocetCenyInput {
    return {
      typ_zakazky: zakazka.typ,
      typy_zasahu: Array.isArray(zakazka.typy_zasahu) ? (zakazka.typy_zasahu as string[]) : [],
      skudci: Array.isArray(zakazka.skudci) ? (zakazka.skudci as string[]) : [],
      plocha_m2: zakazka.objekty.plocha_m2 || 0,
      pocet_bytu: pocetBytu > 0 ? pocetBytu : undefined,
      doprava_km: doprava,
      je_prvni_navsteva: jePrvni,
      je_vikend: jeVikend,
      je_nocni: jeNocni,
      pocet_bodu_mys: bodyMys > 0 ? bodyMys : undefined,
      pocet_bodu_potkan: bodyPotkan > 0 ? bodyPotkan : undefined,
      pocet_bodu_zivolovna_mys: bodyZivolovnaMys > 0 ? bodyZivolovnaMys : undefined,
      pocet_bodu_zivolovna_potkan: bodyZivolovnaPotkan > 0 ? bodyZivolovnaPotkan : undefined,
      pocet_bodu_sklopna_mys: bodySklopnaMys > 0 ? bodySklopnaMys : undefined,
      sleva_typ: slevaTyp === "zadna" ? null : slevaTyp,
      sleva_hodnota: slevaTyp === "zadna" ? 0 : slevaHodnota,
      individualni_sleva_procent: klient.individualni_sleva_procent,
      dph_sazba: klient.dph_sazba,
    };
  }

  function handlePreview() {
    const input = buildInput();
    const result = vypocetCeny(cenikData, input);
    setPreview(result);
  }

  function handleSave() {
    if (!preview) return;
    setError(null);
    startTransition(async () => {
      try {
        await saveKalkulaceAction(zakazka.id, {
          polozky: preview.polozky,
          doprava_km: doprava,
          je_prvni_navsteva: jePrvni,
          je_vikend: jeVikend,
          je_nocni: jeNocni,
          pocet_bytu: pocetBytu > 0 ? pocetBytu : undefined,
          sleva_typ: slevaTyp === "zadna" ? null : slevaTyp,
          sleva_hodnota: slevaTyp === "zadna" ? 0 : slevaHodnota,
          sleva_zadal: "admin",
          cena_zaklad: preview.cena_zaklad,
          cena_po_sleve: preview.cena_po_sleve,
          cena_s_dph: preview.cena_s_dph,
          dph_sazba_snapshot: preview.dph_sazba,
        });
        setShowCalc(false);
        setPreview(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba při ukládání");
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="size-4" />
            Cenová kalkulace
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasKalkulace ? (
            <div className="space-y-3">
              {/* Položky */}
              <div className="space-y-1.5">
                {existujiciPolozky!.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{p.nazev}</span>
                    <span className="font-medium tabular-nums">
                      {p.pocet > 1 && (
                        <span className="text-xs text-muted-foreground mr-1">
                          {formatCena(p.pocet)} × {formatCena(p.cena_za_kus)} Kč
                        </span>
                      )}
                      {formatCena(p.cena_celkem)} Kč
                    </span>
                  </div>
                ))}
              </div>

              {/* Separator */}
              <div className="border-t pt-2 space-y-1.5">
                {/* Příplatky */}
                {zakazka.je_vikend && (
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">
                      Víkendový příplatek (+10%)
                    </span>
                    <span className="font-medium tabular-nums text-amber-600">
                      viz celkem
                    </span>
                  </div>
                )}
                {zakazka.je_nocni && (
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">
                      Noční příplatek (+20%)
                    </span>
                    <span className="font-medium tabular-nums text-amber-600">
                      viz celkem
                    </span>
                  </div>
                )}

                {/* Sleva */}
                {zakazka.sleva_typ && Number(zakazka.sleva_hodnota) > 0 && (
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">
                      Sleva{" "}
                      {zakazka.sleva_typ === "procenta"
                        ? `${Number(zakazka.sleva_hodnota)}%`
                        : `${formatCena(Number(zakazka.sleva_hodnota))} Kč`}
                    </span>
                    <span className="font-medium tabular-nums text-green-600">
                      sleva
                    </span>
                  </div>
                )}

                {klient.individualni_sleva_procent > 0 && (
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">
                      Individuální sleva ({klient.individualni_sleva_procent}%)
                    </span>
                    <span className="font-medium tabular-nums text-green-600">
                      sleva
                    </span>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t pt-2 space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">Základ</span>
                  <span className="font-semibold tabular-nums">
                    {formatCena(Number(zakazka.cena_zaklad))} Kč
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">
                    DPH {Number(zakazka.dph_sazba_snapshot)}%
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatCena(
                      Number(zakazka.cena_s_dph) - Number(zakazka.cena_zaklad),
                    )}{" "}
                    Kč
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t pt-1">
                  <span className="font-semibold">Celkem s DPH</span>
                  <span className="text-lg font-bold tabular-nums">
                    {formatCena(Number(zakazka.cena_s_dph))} Kč
                  </span>
                </div>
              </div>

              {isAdmin && (
                <Button
                  variant="outline"
                  className="min-h-[44px] w-full gap-2"
                  onClick={() => {
                    setShowCalc(true);
                    setPreview(null);
                    setError(null);
                  }}
                >
                  <Calculator className="size-4" />
                  Přepočítat
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Cenová kalkulace zatím nebyla provedena.
              </p>
              {isAdmin && (
                <Button
                  className="min-h-[44px] gap-2"
                  onClick={() => {
                    setShowCalc(true);
                    setPreview(null);
                    setError(null);
                  }}
                >
                  <Calculator className="size-4" />
                  Vypočítat cenu
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== CALCULATION BOTTOMSHEET ========== */}
      <BottomSheet
        open={showCalc}
        onOpenChange={setShowCalc}
        title="Cenová kalkulace"
        description="Nastavte parametry a vypočítejte cenu"
      >
        <div className="space-y-4">
          {/* Doprava */}
          <div className="space-y-2">
            <Label htmlFor="calc_doprava">Doprava (km od pobočky)</Label>
            <Input
              id="calc_doprava"
              type="number"
              min={0}
              value={doprava}
              onChange={(e) => setDoprava(Number(e.target.value) || 0)}
            />
          </div>

          {/* Smluvní options */}
          {zakazka.typ === "smluvni" && (
            <>
              <label className="flex min-h-[44px] items-center gap-3">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={jePrvni}
                  onChange={(e) => setJePrvni(e.target.checked)}
                />
                <span className="text-sm">První návštěva (zavedení bodů)</span>
              </label>

              {/* Monitorovací body */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Monitorovací body</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="body_mys" className="text-sm">
                      Staničky MYŠ
                    </Label>
                    <Input
                      id="body_mys"
                      type="number"
                      min={0}
                      value={bodyMys}
                      onChange={(e) => setBodyMys(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="body_potkan" className="text-sm">
                      Stanice POTKAN
                    </Label>
                    <Input
                      id="body_potkan"
                      type="number"
                      min={0}
                      value={bodyPotkan}
                      onChange={(e) =>
                        setBodyPotkan(Number(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="body_ziv_mys" className="text-sm">
                      Živolovka MYŠ
                    </Label>
                    <Input
                      id="body_ziv_mys"
                      type="number"
                      min={0}
                      value={bodyZivolovnaMys}
                      onChange={(e) =>
                        setBodyZivolovnaMys(Number(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="body_ziv_potkan" className="text-sm">
                      Živolovka POTKAN
                    </Label>
                    <Input
                      id="body_ziv_potkan"
                      type="number"
                      min={0}
                      value={bodyZivolovnaPotkan}
                      onChange={(e) =>
                        setBodyZivolovnaPotkan(Number(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="body_skl_mys" className="text-sm">
                      Sklapovací MYŠ
                    </Label>
                    <Input
                      id="body_skl_mys"
                      type="number"
                      min={0}
                      value={bodySklopnaMys}
                      onChange={(e) =>
                        setBodySklopnaMys(Number(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Počet bytů (for gely) */}
          {zakazka.typ === "jednorazova" && (
            <div className="space-y-2">
              <Label htmlFor="calc_byty">
                Počet bytů <span className="text-xs text-muted-foreground">(pro gelové nástrahy)</span>
              </Label>
              <Input
                id="calc_byty"
                type="number"
                min={0}
                value={pocetBytu}
                onChange={(e) => setPocetBytu(Number(e.target.value) || 0)}
              />
            </div>
          )}

          {/* Příplatky */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Příplatky</p>
            <label className="flex min-h-[44px] items-center gap-3">
              <input
                type="checkbox"
                className="size-5"
                checked={jeVikend}
                onChange={(e) => setJeVikend(e.target.checked)}
              />
              <span className="text-sm">Víkendový zásah (+10%)</span>
            </label>
            <label className="flex min-h-[44px] items-center gap-3">
              <input
                type="checkbox"
                className="size-5"
                checked={jeNocni}
                onChange={(e) => setJeNocni(e.target.checked)}
              />
              <span className="text-sm">Noční zásah (+20%)</span>
            </label>
          </div>

          {/* Sleva */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Sleva</p>
            <div className="flex gap-2">
              {(
                [
                  ["zadna", "Žádná"],
                  ["procenta", "%"],
                  ["castka", "Kč"],
                ] as const
              ).map(([val, label]) => (
                <label
                  key={val}
                  className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
                >
                  <input
                    type="radio"
                    name="sleva_typ"
                    value={val}
                    checked={slevaTyp === val}
                    onChange={() => setSlevaTyp(val)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
            {slevaTyp !== "zadna" && (
              <Input
                type="number"
                min={0}
                max={slevaTyp === "procenta" ? 50 : undefined}
                value={slevaHodnota}
                onChange={(e) =>
                  setSlevaHodnota(Number(e.target.value) || 0)
                }
                placeholder={
                  slevaTyp === "procenta" ? "Max 50%" : "Částka v Kč"
                }
              />
            )}
          </div>

          {/* Info o klientovi */}
          {(klient.individualni_sleva_procent > 0 ||
            klient.dph_sazba !== 21) && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex items-center gap-1 font-medium">
                <Info className="size-3.5" />
                Nastavení klienta
              </div>
              {klient.individualni_sleva_procent > 0 && (
                <p className="text-muted-foreground">
                  Individuální sleva: {klient.individualni_sleva_procent}%
                </p>
              )}
              <p className="text-muted-foreground">
                DPH: {klient.dph_sazba}%
              </p>
            </div>
          )}

          {/* Calculate button */}
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full gap-2"
            onClick={handlePreview}
          >
            <Calculator className="size-4" />
            Vypočítat
          </Button>

          {/* Preview */}
          {preview && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-semibold">Náhled kalkulace</p>

              {/* Položky */}
              <div className="space-y-1">
                {preview.polozky.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between text-sm"
                  >
                    <span className="text-muted-foreground truncate mr-2">
                      {p.nazev}
                    </span>
                    <span className="font-medium tabular-nums whitespace-nowrap">
                      {formatCena(p.cena_celkem)} Kč
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-1 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mezisoučet</span>
                  <span className="tabular-nums">
                    {formatCena(preview.mezisouce)} Kč
                  </span>
                </div>
                {preview.priplatek_vikend > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Víkend +10%</span>
                    <span className="tabular-nums">
                      +{formatCena(preview.priplatek_vikend)} Kč
                    </span>
                  </div>
                )}
                {preview.priplatek_nocni > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Noční +20%</span>
                    <span className="tabular-nums">
                      +{formatCena(preview.priplatek_nocni)} Kč
                    </span>
                  </div>
                )}
                {preview.sleva_klient > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>
                      Klient sleva ({klient.individualni_sleva_procent}%)
                    </span>
                    <span className="tabular-nums">
                      -{formatCena(preview.sleva_klient)} Kč
                    </span>
                  </div>
                )}
                {preview.sleva_rucni > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Sleva</span>
                    <span className="tabular-nums">
                      -{formatCena(preview.sleva_rucni)} Kč
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t pt-1 space-y-1 text-sm">
                {preview.minimum_aplikovano && (
                  <Badge variant="outline" className="text-xs bg-amber-50">
                    Minimální cena 2 500 Kč aplikována
                  </Badge>
                )}
                <div className="flex justify-between font-medium">
                  <span>Základ</span>
                  <span className="tabular-nums">
                    {formatCena(preview.cena_zaklad)} Kč
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    DPH {preview.dph_sazba}%
                  </span>
                  <span className="tabular-nums">
                    {formatCena(preview.dph_castka)} Kč
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-1">
                  <span>Celkem s DPH</span>
                  <span className="tabular-nums">
                    {formatCena(preview.cena_s_dph)} Kč
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Save button */}
          {preview && (
            <Button
              type="button"
              className="min-h-[44px] w-full"
              disabled={isPending}
              onClick={handleSave}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Ukládám...
                </>
              ) : (
                "Uložit kalkulaci"
              )}
            </Button>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
