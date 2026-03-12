"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NastaveniBonusu } from "@/lib/supabase/queries/bonusy";
import { updateAllBonusNastaveniAction } from "./actions";

interface BonusyNastaveniProps {
  nastaveni: NastaveniBonusu;
}

export function BonusyNastaveni({ nastaveni }: BonusyNastaveniProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [bonusZaZakazku, setBonusZaZakazku] = useState(
    String(nastaveni.bonus_za_zakazku),
  );
  const [bonusZaOpakovanou, setBonusZaOpakovanou] = useState(
    String(nastaveni.bonus_za_opakovanou),
  );
  const [fixniOdmenaAdmin, setFixniOdmenaAdmin] = useState(
    String(nastaveni.fixni_odmena_admin),
  );

  function handleSave() {
    const data: Partial<NastaveniBonusu> = {
      bonus_za_zakazku: Number(bonusZaZakazku) || 0,
      bonus_za_opakovanou: Number(bonusZaOpakovanou) || 0,
      fixni_odmena_admin: Number(fixniOdmenaAdmin) || 0,
    };

    startTransition(async () => {
      try {
        await updateAllBonusNastaveniAction(data);
        setMessage("Nastavení uloženo");
      } catch (e) {
        setMessage(
          `Chyba: ${e instanceof Error ? e.message : "Neznámá chyba"}`,
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sazby bonusů</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bonus_za_zakazku">
              Bonus za dokončenou zakázku (Kč)
            </Label>
            <Input
              id="bonus_za_zakazku"
              type="number"
              min={0}
              max={100000}
              value={bonusZaZakazku}
              onChange={(e) => setBonusZaZakazku(e.target.value)}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              Technik dostane tento bonus za každou dokončenou zakázku
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bonus_za_opakovanou">
              Bonus za opakovanou zakázku (Kč)
            </Label>
            <Input
              id="bonus_za_opakovanou"
              type="number"
              min={0}
              max={100000}
              value={bonusZaOpakovanou}
              onChange={(e) => setBonusZaOpakovanou(e.target.value)}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              Technik dostane tento bonus za domluvenou opakovanou zakázku
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fixni_odmena_admin">
              Fixní odměna admin (Kč/měsíc)
            </Label>
            <Input
              id="fixni_odmena_admin"
              type="number"
              min={0}
              max={100000}
              value={fixniOdmenaAdmin}
              onChange={(e) => setFixniOdmenaAdmin(e.target.value)}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              Měsíční fixní odměna pro adminy (generuje se přes „Přehled bonusů")
            </p>
          </div>

          {message && (
            <p className="text-sm text-center text-muted-foreground">
              {message}
            </p>
          )}

          <Button
            onClick={handleSave}
            disabled={isPending}
            className="w-full min-h-[44px]"
          >
            {isPending ? "Ukládám…" : "Uložit nastavení"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
