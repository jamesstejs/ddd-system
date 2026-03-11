"use client";

import { useState, useCallback, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveVetaUcinnostiAction } from "./protokolActions";

type Sablona = {
  id: string;
  nazev: string;
  obsah: string;
};

type Props = {
  protokolId: string;
  initialVetaUcinnosti: string | null;
  sablony: Sablona[];
  isReadonly: boolean;
};

/**
 * Výběr věty o účinnosti ze šablon.
 * Admin spravuje šablony v DB (sablony_pouceni s typ_zasahu = 'ucinnost').
 */
export function VetaUcinnostiSection({
  protokolId,
  initialVetaUcinnosti,
  sablony,
  isReadonly,
}: Props) {
  const [vetaUcinnosti, setVetaUcinnosti] = useState(
    initialVetaUcinnosti || "",
  );
  const [savedVeta, setSavedVeta] = useState(initialVetaUcinnosti || "");
  const [isPending, startTransition] = useTransition();

  const isDirty = vetaUcinnosti !== savedVeta;

  // Najdi vybranou šablonu dle obsahu
  const selectedSablonaId =
    sablony.find((s) => s.obsah === vetaUcinnosti)?.id || "__none__";

  const handleSablonaChange = useCallback(
    (value: string) => {
      if (value === "__none__") {
        setVetaUcinnosti("");
      } else {
        const sablona = sablony.find((s) => s.id === value);
        if (sablona) {
          setVetaUcinnosti(sablona.obsah);
        }
      }
    },
    [sablony],
  );

  const handleSave = useCallback(() => {
    startTransition(async () => {
      try {
        await saveVetaUcinnostiAction(protokolId, vetaUcinnosti);
        setSavedVeta(vetaUcinnosti);
      } catch (err) {
        console.error("Chyba při ukládání věty o účinnosti:", err);
      }
    });
  }, [protokolId, vetaUcinnosti]);

  // Nerender nic pokud nemáme šablony
  if (sablony.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        Věta o účinnosti
      </h3>

      {!isReadonly ? (
        <>
          <Select
            value={selectedSablonaId}
            onValueChange={handleSablonaChange}
          >
            <SelectTrigger className="min-h-[44px] text-base active:bg-muted/30">
              <SelectValue placeholder="Vyberte šablonu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Bez věty</SelectItem>
              {sablony.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nazev}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {vetaUcinnosti && (
            <p className="text-sm text-muted-foreground italic rounded-md bg-muted/30 p-3">
              &ldquo;{vetaUcinnosti}&rdquo;
            </p>
          )}

          <Button
            onClick={handleSave}
            disabled={!isDirty || isPending}
            className="min-h-[44px] w-full"
            variant={isDirty ? "default" : "outline"}
          >
            {isPending
              ? "Ukládám…"
              : isDirty
                ? "Uložit větu"
                : "Uloženo"}
          </Button>
        </>
      ) : (
        /* Readonly: jen zobrazení textu */
        vetaUcinnosti ? (
          <p className="text-sm text-muted-foreground italic rounded-md bg-muted/30 p-3">
            &ldquo;{vetaUcinnosti}&rdquo;
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Věta o účinnosti nebyla zadána.
          </p>
        )
      )}
    </div>
  );
}
