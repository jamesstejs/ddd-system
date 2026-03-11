"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TYP_ZAKROKU_LABELS,
  filterPripravkyForPostrik,
} from "@/lib/utils/protokolUtils";
import { savePostrikAction } from "./protokolActions";
import type { Database } from "@/lib/supabase/database.types";

// ---------- Types ----------

type TypZakroku = Database["public"]["Enums"]["typ_zakroku"];
type StatusProtokolu = Database["public"]["Enums"]["status_protokolu"];

type PripravekData = {
  id: string;
  nazev: string;
  ucinna_latka: string | null;
  protilatka: string | null;
  typ: Database["public"]["Enums"]["typ_pripravku"];
  cilovy_skudce: unknown;
  omezeni_prostor: unknown;
};

type Skudce = { id: string; nazev: string; typ: string };

type PostrikPripravekLocal = {
  id?: string;
  pripravek_id: string;
  spotreba: string;
  koncentrace_procent: string;
};

type PostrikLocal = {
  id?: string;
  skudce: string | null;
  plocha_m2: string;
  typ_zakroku: TypZakroku | null;
  poznamka_postriku: string;
  pripravky: PostrikPripravekLocal[];
};

type PostrikDataFromDB = {
  id: string;
  skudce: string | null;
  plocha_m2: number | null;
  typ_zakroku: TypZakroku | null;
  poznamka: string | null;
  protokol_postrik_pripravky: {
    id: string;
    spotreba: string | null;
    koncentrace_procent: number | null;
    pripravky: {
      id: string;
      nazev: string;
      ucinna_latka: string | null;
      protilatka: string | null;
    };
  }[];
};

type Props = {
  protokolId: string;
  status: StatusProtokolu;
  initialPostriky: PostrikDataFromDB[];
  pripravky: PripravekData[];
  skudci: Skudce[];
  typObjektu: string | null;
  poznamka: string;
  onPoznamkaChange: (v: string) => void;
  forceEditable?: boolean;
};

const TYP_ZAKROKU_OPTIONS = Object.entries(TYP_ZAKROKU_LABELS) as [
  TypZakroku,
  string,
][];

// ---------- Helpers ----------

function dbToLocal(db: PostrikDataFromDB): PostrikLocal {
  return {
    id: db.id,
    skudce: db.skudce,
    plocha_m2: db.plocha_m2?.toString() || "",
    typ_zakroku: db.typ_zakroku,
    poznamka_postriku: db.poznamka || "",
    pripravky: db.protokol_postrik_pripravky.map((pp) => ({
      id: pp.id,
      pripravek_id: pp.pripravky.id,
      spotreba: pp.spotreba || "",
      koncentrace_procent: pp.koncentrace_procent?.toString() || "",
    })),
  };
}

function createEmptyPostrik(): PostrikLocal {
  return {
    skudce: null,
    plocha_m2: "",
    typ_zakroku: "postrik" as TypZakroku,
    poznamka_postriku: "",
    pripravky: [],
  };
}

// ---------- Component ----------

export function PostrikFormView({
  protokolId,
  status,
  initialPostriky,
  pripravky,
  skudci,
  typObjektu,
  poznamka,
  onPoznamkaChange,
  forceEditable,
}: Props) {
  const [postriky, setPostriky] = useState<PostrikLocal[]>(
    initialPostriky.length > 0
      ? initialPostriky.map(dbToLocal)
      : [createEmptyPostrik()],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tracked IDs for delete detection
  const [originalPostrikIds] = useState<Set<string>>(
    new Set(initialPostriky.map((p) => p.id)),
  );
  const [originalPripravekIds] = useState<Set<string>>(
    new Set(
      initialPostriky.flatMap((p) =>
        p.protokol_postrik_pripravky.map((pp) => pp.id),
      ),
    ),
  );

  const isReadonly = forceEditable ? false : status !== "rozpracovany";

  // ---------- Postrik operations ----------

  const updatePostrik = useCallback(
    (index: number, partial: Partial<PostrikLocal>) => {
      setPostriky((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], ...partial };
        return next;
      });
    },
    [],
  );

  const addPostrik = useCallback(() => {
    setPostriky((prev) => [...prev, createEmptyPostrik()]);
  }, []);

  const removePostrik = useCallback((index: number) => {
    setPostriky((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ---------- Pripravek operations ----------

  const addPripravek = useCallback((postrikIndex: number) => {
    setPostriky((prev) => {
      const next = [...prev];
      next[postrikIndex] = {
        ...next[postrikIndex],
        pripravky: [
          ...next[postrikIndex].pripravky,
          {
            pripravek_id: "",
            spotreba: "",
            koncentrace_procent: "",
          },
        ],
      };
      return next;
    });
  }, []);

  const updatePripravek = useCallback(
    (postrikIndex: number, pripIndex: number, partial: Partial<PostrikPripravekLocal>) => {
      setPostriky((prev) => {
        const next = [...prev];
        const pripravkyList = [...next[postrikIndex].pripravky];
        pripravkyList[pripIndex] = { ...pripravkyList[pripIndex], ...partial };
        next[postrikIndex] = { ...next[postrikIndex], pripravky: pripravkyList };
        return next;
      });
    },
    [],
  );

  const removePripravek = useCallback(
    (postrikIndex: number, pripIndex: number) => {
      setPostriky((prev) => {
        const next = [...prev];
        next[postrikIndex] = {
          ...next[postrikIndex],
          pripravky: next[postrikIndex].pripravky.filter((_, i) => i !== pripIndex),
        };
        return next;
      });
    },
    [],
  );

  // ---------- Save ----------

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      // Build payload
      const currentPostrikIds = new Set(
        postriky.filter((p) => p.id).map((p) => p.id!),
      );
      const deletedPostrikIds = [...originalPostrikIds].filter(
        (id) => !currentPostrikIds.has(id),
      );

      // Gather all current pripravek ids
      const currentPripravekIds = new Set(
        postriky.flatMap((p) => p.pripravky.filter((pp) => pp.id).map((pp) => pp.id!)),
      );
      const deletedPripravekIds = [...originalPripravekIds].filter(
        (id) => !currentPripravekIds.has(id),
      );

      const payload = [
        ...postriky.map((p) => ({
          id: p.id,
          skudce: p.skudce,
          plocha_m2: p.plocha_m2 ? parseFloat(p.plocha_m2) : null,
          typ_zakroku: p.typ_zakroku,
          poznamka_postriku: p.poznamka_postriku || null,
          pripravky: [
            ...p.pripravky
              .filter((pp) => pp.pripravek_id) // skip empty rows
              .map((pp) => ({
                id: pp.id,
                pripravek_id: pp.pripravek_id,
                spotreba: pp.spotreba || null,
                koncentrace_procent: pp.koncentrace_procent
                  ? parseFloat(pp.koncentrace_procent)
                  : null,
              })),
            // Add deleted pripravky within existing postriky
            ...(p.id
              ? deletedPripravekIds
                  .filter((ppId) => {
                    // Check if this pripravek belonged to this postrik
                    const origP = initialPostriky.find((op) => op.id === p.id);
                    return origP?.protokol_postrik_pripravky.some(
                      (opp) => opp.id === ppId,
                    );
                  })
                  .map((ppId) => ({
                    id: ppId,
                    _deleted: true as const,
                    pripravek_id: "",
                    spotreba: null,
                    koncentrace_procent: null,
                  }))
              : []),
          ],
        })),
        // Add deleted postriky
        ...deletedPostrikIds.map((id) => ({
          id,
          _deleted: true as const,
          skudce: null,
          plocha_m2: null,
          typ_zakroku: null,
          poznamka_postriku: null,
          pripravky: [] as { id?: string; _deleted?: true; pripravek_id: string; spotreba: string | null; koncentrace_procent: number | null }[],
        })),
      ];

      await savePostrikAction(protokolId, payload, poznamka);

      setSaveMessage("Uloženo");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při ukládání");
    } finally {
      setIsSaving(false);
    }
  }, [postriky, poznamka, protokolId, originalPostrikIds, originalPripravekIds, initialPostriky]);

  // ---------- Computed ----------

  const isDirty = (() => {
    const origLen = initialPostriky.length > 0 ? initialPostriky.length : 1;
    if (postriky.length !== origLen) return true;
    return postriky.some((p, i) => {
      const orig = initialPostriky[i];
      if (!orig) return true;
      if (
        p.skudce !== orig.skudce ||
        p.plocha_m2 !== (orig.plocha_m2?.toString() || "") ||
        p.typ_zakroku !== orig.typ_zakroku ||
        p.poznamka_postriku !== (orig.poznamka || "")
      ) return true;
      // Check pripravky changes
      const origPP = orig.protokol_postrik_pripravky;
      if (p.pripravky.length !== origPP.length) return true;
      return p.pripravky.some((pp, j) => {
        const oPP = origPP[j];
        if (!oPP) return true;
        return (
          pp.pripravek_id !== oPP.pripravky.id ||
          pp.spotreba !== (oPP.spotreba || "") ||
          pp.koncentrace_procent !== (oPP.koncentrace_procent?.toString() || "")
        );
      });
    });
  })();

  // ---------- Render ----------

  return (
    <div className="space-y-4">
      {postriky.map((postrik, pIdx) => {
        // Filter pripravky dle škůdce
        const filteredPripravky = filterPripravkyForPostrik(
          pripravky,
          postrik.skudce,
          typObjektu,
        );

        return (
          <Card key={postrik.id || `new-${pIdx}`}>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">
                  Postřik {pIdx + 1}
                </h3>
                {!isReadonly && postriky.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px] text-destructive hover:bg-destructive/10 active:bg-destructive/15"
                    onClick={() => removePostrik(pIdx)}
                  >
                    Odebrat
                  </Button>
                )}
              </div>

              {/* Škůdce */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Škůdce</Label>
                <Select
                  value={postrik.skudce || "__none__"}
                  onValueChange={(v) =>
                    updatePostrik(pIdx, {
                      skudce: v === "__none__" ? null : v,
                    })
                  }
                  disabled={isReadonly}
                >
                  <SelectTrigger className="min-h-[44px] text-base active:bg-muted/30">
                    <SelectValue placeholder="Vyberte škůdce" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Neurčeno</SelectItem>
                    {skudci.map((s) => (
                      <SelectItem key={s.id} value={s.nazev}>
                        {s.nazev}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Plocha */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Plocha (m²)</Label>
                <Input
                  type="number"
                  min={0}
                  value={postrik.plocha_m2}
                  onChange={(e) =>
                    updatePostrik(pIdx, { plocha_m2: e.target.value })
                  }
                  placeholder="např. 120"
                  className="min-h-[44px] text-base"
                  disabled={isReadonly}
                />
              </div>

              {/* Typ zákroku */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Typ zákroku</Label>
                <Select
                  value={postrik.typ_zakroku || "__none__"}
                  onValueChange={(v) =>
                    updatePostrik(pIdx, {
                      typ_zakroku: v === "__none__" ? null : (v as TypZakroku),
                    })
                  }
                  disabled={isReadonly}
                >
                  <SelectTrigger className="min-h-[44px] text-base active:bg-muted/30">
                    <SelectValue placeholder="Typ zákroku" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Neurčeno</SelectItem>
                    {TYP_ZAKROKU_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Přípravky */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Přípravky</Label>

                {postrik.pripravky.map((pp, ppIdx) => {
                  const selectedPripravek = pripravky.find(
                    (p) => p.id === pp.pripravek_id,
                  );

                  return (
                    <div
                      key={pp.id || `pp-${ppIdx}`}
                      className="space-y-2 rounded-lg border bg-muted/20 p-3"
                    >
                      {/* Přípravek select */}
                      <Select
                        value={pp.pripravek_id || "__none__"}
                        onValueChange={(v) =>
                          updatePripravek(pIdx, ppIdx, {
                            pripravek_id: v === "__none__" ? "" : v,
                          })
                        }
                        disabled={isReadonly}
                      >
                        <SelectTrigger className="min-h-[44px] text-base active:bg-muted/30">
                          <SelectValue placeholder="Vyberte přípravek" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Vyberte přípravek</SelectItem>
                          {filteredPripravky.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nazev}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Spotřeba + koncentrace */}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Spotřeba
                          </Label>
                          <Input
                            value={pp.spotreba}
                            onChange={(e) =>
                              updatePripravek(pIdx, ppIdx, {
                                spotreba: e.target.value,
                              })
                            }
                            placeholder="např. 2 litry"
                            className="min-h-[44px] text-base"
                            disabled={isReadonly}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Koncentrace (%)
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={pp.koncentrace_procent}
                            onChange={(e) =>
                              updatePripravek(pIdx, ppIdx, {
                                koncentrace_procent: e.target.value,
                              })
                            }
                            placeholder="0.05"
                            className="min-h-[44px] text-base"
                            disabled={isReadonly}
                          />
                        </div>
                      </div>

                      {/* Readonly info z DB */}
                      {selectedPripravek && (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>
                            Účinná látka:{" "}
                            <span className="font-medium text-foreground">
                              {selectedPripravek.ucinna_latka || "—"}
                            </span>
                          </p>
                          <p>
                            Protilátka:{" "}
                            <span className="font-medium text-foreground">
                              {selectedPripravek.protilatka || "—"}
                            </span>
                          </p>
                        </div>
                      )}

                      {/* Odebrat přípravek */}
                      {!isReadonly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px] w-full text-destructive hover:bg-destructive/10 active:bg-destructive/15"
                          onClick={() => removePripravek(pIdx, ppIdx)}
                        >
                          Odebrat přípravek
                        </Button>
                      )}
                    </div>
                  );
                })}

                {/* Přidat přípravek */}
                {!isReadonly && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] w-full border-dashed"
                    onClick={() => addPripravek(pIdx)}
                  >
                    + Přidat přípravek
                  </Button>
                )}
              </div>

              {/* Poznámka k postřiku */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Poznámka k postřiku
                </Label>
                <Textarea
                  value={postrik.poznamka_postriku}
                  onChange={(e) =>
                    updatePostrik(pIdx, { poznamka_postriku: e.target.value })
                  }
                  placeholder="Poznámka..."
                  rows={2}
                  className="text-base"
                  disabled={isReadonly}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Přidat další postřik */}
      {!isReadonly && (
        <Button
          variant="outline"
          className="min-h-[44px] w-full border-dashed"
          onClick={addPostrik}
        >
          + Přidat další postřik
        </Button>
      )}

      {/* Save section */}
      {!isReadonly && (
        <div className="space-y-2 pt-2">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3" role="alert">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {saveMessage && (
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-sm font-medium text-emerald-800">
                {saveMessage}
              </p>
            </div>
          )}

          <Button
            className={`min-h-[48px] w-full text-base font-semibold ${
              isDirty
                ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving
              ? "Ukládám..."
              : isDirty
                ? "Uložit změny"
                : "Uloženo"}
          </Button>

          {isDirty && !isSaving && !saveMessage && (
            <p className="text-center text-xs text-muted-foreground">
              Máte neuložené změny
            </p>
          )}
        </div>
      )}
    </div>
  );
}
