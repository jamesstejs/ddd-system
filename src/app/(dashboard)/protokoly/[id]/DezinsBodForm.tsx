"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TYP_LAPACE_LABELS } from "@/lib/utils/protokolUtils";
import type { Database } from "@/lib/supabase/database.types";

type TypLapace = Database["public"]["Enums"]["typ_lapace"];

export type DezinsBodFormData = {
  id?: string;
  cislo_bodu: string;
  okruh_id: string | null;
  typ_lapace: TypLapace;
  druh_hmyzu: string | null;
  pocet: number;
};

type Okruh = { id: string; nazev: string };
type Skudce = {
  id: string;
  nazev: string;
  typ: string;
};

type Props = {
  bod: DezinsBodFormData;
  okruhy: Okruh[];
  skudci: Skudce[];
  onChange: (updated: DezinsBodFormData) => void;
  onDelete: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onBack: () => void;
  bodIndex: number;
  totalCount: number;
};

const TYP_LAPACE_OPTIONS = Object.entries(TYP_LAPACE_LABELS) as [
  TypLapace,
  string,
][];

/**
 * Filtruje škůdce dle typu lapače:
 * - lezouci_hmyz → jen lezouci_hmyz
 * - letajici_hmyz → jen letajici_hmyz
 * - lepova/elektronicka → oba typy hmyzu
 */
function filterSkudciByLapac(skudci: Skudce[], typLapace: TypLapace): Skudce[] {
  if (typLapace === "lezouci_hmyz") {
    return skudci.filter((s) => s.typ === "lezouci_hmyz");
  }
  if (typLapace === "letajici_hmyz") {
    return skudci.filter((s) => s.typ === "letajici_hmyz");
  }
  // lepova, elektronicka → oba typy
  return skudci.filter(
    (s) => s.typ === "lezouci_hmyz" || s.typ === "letajici_hmyz",
  );
}

export function DezinsBodForm({
  bod,
  okruhy,
  skudci,
  onChange,
  onDelete,
  onPrev,
  onNext,
  onBack,
  bodIndex,
  totalCount,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function update(partial: Partial<DezinsBodFormData>) {
    onChange({ ...bod, ...partial });
  }

  const filteredSkudci = filterSkudciByLapac(skudci, bod.typ_lapace);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-[44px] items-center gap-1 text-sm font-medium text-blue-600 active:opacity-70"
          aria-label="Zpět na přehled"
        >
          <span aria-hidden="true">←</span> Přehled
        </button>
        <span className="text-sm font-semibold text-foreground">
          Bod {bod.cislo_bodu || "?"} ({bodIndex + 1} z {totalCount})
        </span>
      </div>

      {/* Číslo bodu */}
      <div className="space-y-1.5">
        <Label htmlFor="dezins_cislo_bodu" className="text-sm font-medium">
          Číslo bodu
        </Label>
        <Input
          id="dezins_cislo_bodu"
          value={bod.cislo_bodu}
          onChange={(e) => update({ cislo_bodu: e.target.value })}
          placeholder="např. D1, D2"
          className="min-h-[44px] text-base"
        />
      </div>

      {/* Okruh */}
      {okruhy.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Okruh</Label>
          <Select
            value={bod.okruh_id || "__none__"}
            onValueChange={(v) =>
              update({ okruh_id: v === "__none__" ? null : v })
            }
          >
            <SelectTrigger className="min-h-[44px] text-base active:bg-muted/30">
              <SelectValue placeholder="Bez okruhu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Bez okruhu</SelectItem>
              {okruhy.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.nazev}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Typ lapače */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Typ lapače</Label>
        <Select
          value={bod.typ_lapace}
          onValueChange={(v) => {
            update({ typ_lapace: v as TypLapace, druh_hmyzu: null });
          }}
        >
          <SelectTrigger className="min-h-[44px] text-base active:bg-muted/30">
            <SelectValue placeholder="Vyberte typ" />
          </SelectTrigger>
          <SelectContent>
            {TYP_LAPACE_OPTIONS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Druh hmyzu */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Druh hmyzu</Label>
        <Select
          value={bod.druh_hmyzu || "__none__"}
          onValueChange={(v) =>
            update({ druh_hmyzu: v === "__none__" ? null : v })
          }
        >
          <SelectTrigger className="min-h-[44px] text-base active:bg-muted/30">
            <SelectValue placeholder="Neurčeno" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Neurčeno</SelectItem>
            {filteredSkudci.map((s) => (
              <SelectItem key={s.id} value={s.nazev}>
                {s.nazev}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Počet */}
      <div className="space-y-1.5">
        <Label htmlFor="dezins_pocet" className="text-sm font-medium">
          Počet kusů
        </Label>
        <Input
          id="dezins_pocet"
          type="number"
          min={0}
          value={bod.pocet}
          onChange={(e) =>
            update({ pocet: Math.max(0, parseInt(e.target.value, 10) || 0) })
          }
          className="min-h-[44px] text-base"
        />
      </div>

      {/* Prev / Next navigace */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          className="min-h-[44px] flex-1 active:bg-muted/70"
          onClick={onPrev ?? undefined}
          disabled={!onPrev}
        >
          <span aria-hidden="true">←</span> Předchozí
        </Button>
        <Button
          variant="outline"
          className="min-h-[44px] flex-1 active:bg-muted/70"
          onClick={onNext ?? undefined}
          disabled={!onNext}
        >
          Další <span aria-hidden="true">→</span>
        </Button>
      </div>

      {/* Delete bod */}
      <div className="pt-2">
        {!confirmDelete ? (
          <Button
            variant="ghost"
            className="min-h-[44px] w-full text-destructive hover:bg-destructive/10 active:bg-destructive/15"
            onClick={() => setConfirmDelete(true)}
          >
            Smazat bod
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-sm text-destructive font-medium">
              Opravdu smazat bod {bod.cislo_bodu}?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="min-h-[44px] flex-1"
                onClick={() => setConfirmDelete(false)}
              >
                Zrušit
              </Button>
              <Button
                variant="destructive"
                className="min-h-[44px] flex-1"
                onClick={() => {
                  setConfirmDelete(false);
                  onDelete();
                }}
              >
                Ano, smazat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
