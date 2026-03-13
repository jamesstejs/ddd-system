"use client";

import { useState, useMemo } from "react";
import { BottomSheet } from "@/components/layout/BottomSheet";
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
  getNextCisloBodu,
} from "@/lib/utils/protokolUtils";
import type { DeratBodFormData } from "./DeratBodForm";
import type { Database } from "@/lib/supabase/database.types";

type TypStanicky = Database["public"]["Enums"]["typ_stanicky"];

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
  existingBody: DeratBodFormData[];
  okruhy: Okruh[];
  pripravky: Pripravek[];
  onAdd: (newBod: DeratBodFormData) => void;
};

const TYP_STANICKY_OPTIONS = Object.entries(TYP_STANICKY_LABELS) as [
  TypStanicky,
  string,
][];

export function AddBodSheet({
  open,
  onOpenChange,
  existingBody,
  okruhy,
  pripravky,
  onAdd,
}: Props) {
  // Smart defaults from last existing bod
  const lastBod = existingBody[existingBody.length - 1];

  // Detect prefix
  const prefix = useMemo(() => {
    if (existingBody.length === 0) return "";
    const match = existingBody[0].cislo_bodu.match(/^([A-Za-z]+)/);
    return match ? match[1] : "";
  }, [existingBody]);

  const nextCislo = useMemo(
    () => getNextCisloBodu(existingBody, prefix),
    [existingBody, prefix],
  );

  const [cislo_bodu, setCisloBodu] = useState(nextCislo);
  const [typ_stanicky, setTypStanicky] = useState<TypStanicky>(
    lastBod?.typ_stanicky || "mys",
  );
  const [okruh_id, setOkruhId] = useState<string | null>(
    lastBod?.okruh_id || null,
  );
  const [pripravek_id, setPripravekId] = useState<string | null>(
    lastBod?.pripravek_id || null,
  );

  // Reset form when opened
  const handleOpenChange = (v: boolean) => {
    if (v) {
      // Recalculate on open
      const newCislo = getNextCisloBodu(existingBody, prefix);
      setCisloBodu(newCislo);
      setTypStanicky(lastBod?.typ_stanicky || "mys");
      setOkruhId(lastBod?.okruh_id || null);
      setPripravekId(lastBod?.pripravek_id || null);
    }
    onOpenChange(v);
  };

  const handleSubmit = () => {
    const newBod: DeratBodFormData = {
      cislo_bodu: cislo_bodu.trim() || nextCislo,
      okruh_id,
      typ_stanicky,
      pripravek_id,
      pozer_procent: 0,
      stav_stanicky: "ok",
    };
    onAdd(newBod);
    onOpenChange(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Nový bod"
      description="Přidejte nový monitorovací bod"
    >
      <div className="space-y-4">
        {/* Číslo bodu */}
        <div className="space-y-1.5">
          <Label htmlFor="new-cislo" className="text-sm font-medium">
            Číslo bodu
          </Label>
          <Input
            id="new-cislo"
            value={cislo_bodu}
            onChange={(e) => setCisloBodu(e.target.value)}
            placeholder={nextCislo}
            className="min-h-[44px] text-base"
          />
        </div>

        {/* Typ staničky — large buttons */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Typ staničky</Label>
          <div className="grid grid-cols-2 gap-2">
            {TYP_STANICKY_OPTIONS.map(([value, label]) => {
              const isActive = typ_stanicky === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTypStanicky(value)}
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

        {/* Okruh */}
        {okruhy.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Okruh</Label>
            <Select
              value={okruh_id || "__none__"}
              onValueChange={(v) => setOkruhId(v === "__none__" ? null : v)}
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

        {/* Přípravek */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Přípravek</Label>
          <Select
            value={pripravek_id || "__none__"}
            onValueChange={(v) =>
              setPripravekId(v === "__none__" ? null : v)
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

        {/* Submit */}
        <Button
          className="min-h-[48px] w-full bg-blue-600 text-base font-semibold text-white hover:bg-blue-700 active:bg-blue-800"
          onClick={handleSubmit}
        >
          Přidat bod
        </Button>
      </div>
    </BottomSheet>
  );
}
