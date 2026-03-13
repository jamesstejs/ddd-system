"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { Button } from "@/components/ui/button";
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
} from "@/lib/utils/protokolUtils";
import type { DeratBodFormData } from "./DeratBodForm";
import type { Database } from "@/lib/supabase/database.types";

type TypStanicky = Database["public"]["Enums"]["typ_stanicky"];
type StavStanicky = Database["public"]["Enums"]["stav_stanicky"];

type Okruh = { id: string; nazev: string };
type Pripravek = {
  id: string;
  nazev: string;
  ucinna_latka: string | null;
  protilatka: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bod: DeratBodFormData;
  okruhy: Okruh[];
  pripravky: Pripravek[];
  onChange: (updated: DeratBodFormData) => void;
  onDelete: () => void;
};

const TYP_STANICKY_OPTIONS = Object.entries(TYP_STANICKY_LABELS) as [
  TypStanicky,
  string,
][];

const STAV_STANICKY_OPTIONS = Object.entries(STAV_STANICKY_LABELS) as [
  StavStanicky,
  string,
][];

export function StavSheet({
  open,
  onOpenChange,
  bod,
  okruhy,
  pripravky,
  onChange,
  onDelete,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function update(partial: Partial<DeratBodFormData>) {
    onChange({ ...bod, ...partial });
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(v) => {
        if (!v) setConfirmDelete(false);
        onOpenChange(v);
      }}
      title={`Bod ${bod.cislo_bodu}`}
      description="Nastavení monitorovacího bodu"
    >
      <div className="space-y-4">
        {/* Stav staničky — large buttons */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Stav staničky</Label>
          <div className="grid grid-cols-2 gap-2">
            {STAV_STANICKY_OPTIONS.map(([value, label]) => {
              const isActive = bod.stav_stanicky === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => update({ stav_stanicky: value })}
                  className={`flex min-h-[44px] items-center justify-center rounded-lg border-2 px-3 text-sm font-medium transition-all ${
                    isActive
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-muted bg-white text-foreground active:bg-muted/50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Typ staničky */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Typ staničky</Label>
          <Select
            value={bod.typ_stanicky}
            onValueChange={(v) => update({ typ_stanicky: v as TypStanicky })}
          >
            <SelectTrigger className="min-h-[44px] text-base">
              <SelectValue />
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

        {/* Delete */}
        <div className="pt-2 border-t">
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
                    onOpenChange(false);
                  }}
                >
                  Ano, smazat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
