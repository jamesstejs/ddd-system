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
import {
  TYP_STANICKY_LABELS,
  STAV_STANICKY_LABELS,
  POZER_OPTIONS,
  POZER_COLORS,
} from "@/lib/utils/protokolUtils";
import type { Database } from "@/lib/supabase/database.types";

type TypStanicky = Database["public"]["Enums"]["typ_stanicky"];
type StavStanicky = Database["public"]["Enums"]["stav_stanicky"];

export type DeratBodFormData = {
  id?: string;
  cislo_bodu: string;
  okruh_id: string | null;
  typ_stanicky: TypStanicky;
  pripravek_id: string | null;
  pozer_procent: number;
  stav_stanicky: StavStanicky;
};

type Okruh = { id: string; nazev: string };
type Pripravek = {
  id: string;
  nazev: string;
  ucinna_latka: string | null;
  protilatka: string | null;
};

type Props = {
  bod: DeratBodFormData;
  okruhy: Okruh[];
  pripravky: Pripravek[];
  onChange: (updated: DeratBodFormData) => void;
  onDelete: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onBack: () => void;
  bodIndex: number;
  totalCount: number;
};

const TYP_STANICKY_OPTIONS = Object.entries(TYP_STANICKY_LABELS) as [
  TypStanicky,
  string,
][];

const STAV_STANICKY_OPTIONS = Object.entries(STAV_STANICKY_LABELS) as [
  StavStanicky,
  string,
][];

export function DeratBodForm({
  bod,
  okruhy,
  pripravky,
  onChange,
  onDelete,
  onPrev,
  onNext,
  onBack,
  bodIndex,
  totalCount,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function update(partial: Partial<DeratBodFormData>) {
    onChange({ ...bod, ...partial });
  }

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
          ← Přehled
        </button>
        <span className="text-sm font-semibold text-foreground">
          Bod {bod.cislo_bodu || "?"} ({bodIndex + 1} z {totalCount})
        </span>
      </div>

      {/* Číslo bodu */}
      <div className="space-y-1.5">
        <Label htmlFor="cislo_bodu" className="text-sm font-medium">
          Číslo bodu
        </Label>
        <Input
          id="cislo_bodu"
          value={bod.cislo_bodu}
          onChange={(e) => update({ cislo_bodu: e.target.value })}
          placeholder="např. L1, H3, P5"
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
            <SelectTrigger className="min-h-[44px] text-base">
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

      {/* Typ staničky */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Typ staničky</Label>
        <Select
          value={bod.typ_stanicky}
          onValueChange={(v) => update({ typ_stanicky: v as TypStanicky })}
        >
          <SelectTrigger className="min-h-[44px] text-base">
            <SelectValue placeholder="Vyberte typ" />
          </SelectTrigger>
          <SelectContent>
            {TYP_STANICKY_OPTIONS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Přípravek */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Přípravek</Label>
        <Select
          value={bod.pripravek_id || "__none__"}
          onValueChange={(v) =>
            update({ pripravek_id: v === "__none__" ? null : v })
          }
        >
          <SelectTrigger className="min-h-[44px] text-base">
            <SelectValue placeholder="Bez přípravku" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Bez přípravku</SelectItem>
            {pripravky.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nazev}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stav staničky */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Stav</Label>
        <Select
          value={bod.stav_stanicky}
          onValueChange={(v) => update({ stav_stanicky: v as StavStanicky })}
        >
          <SelectTrigger className="min-h-[44px] text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAV_STANICKY_OPTIONS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Požer — 5 velkých tlačítek */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Požer</Label>
        <div className="grid grid-cols-5 gap-2">
          {POZER_OPTIONS.map((value) => {
            const isActive = bod.pozer_procent === value;
            const colors = POZER_COLORS[value];
            return (
              <button
                key={value}
                type="button"
                onClick={() => update({ pozer_procent: value })}
                className={`flex min-h-[52px] items-center justify-center rounded-lg border-2 text-base font-bold transition-all ${
                  isActive
                    ? `${colors.bg} ${colors.text} border-current ring-2 ring-current ring-offset-1`
                    : "border-muted bg-white text-muted-foreground hover:border-muted-foreground/30"
                }`}
                aria-label={`Požer ${value}%`}
                aria-pressed={isActive}
              >
                {value}%
              </button>
            );
          })}
        </div>
      </div>

      {/* Prev / Next navigace */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          className="min-h-[44px] flex-1"
          onClick={onPrev ?? undefined}
          disabled={!onPrev}
        >
          ← Předchozí
        </Button>
        <Button
          variant="outline"
          className="min-h-[44px] flex-1"
          onClick={onNext ?? undefined}
          disabled={!onNext}
        >
          Další →
        </Button>
      </div>

      {/* Delete bod */}
      <div className="pt-2">
        {!confirmDelete ? (
          <Button
            variant="ghost"
            className="min-h-[44px] w-full text-destructive hover:bg-destructive/10"
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
