"use client";

import { Badge } from "@/components/ui/badge";
import { TYP_LAPACE_LABELS } from "@/lib/utils/protokolUtils";
import type { DezinsBodFormData } from "./DezinsBodForm";

type Props = {
  bod: DezinsBodFormData;
  onChange: (updated: DezinsBodFormData) => void;
  onSettingsTap: () => void;
  readonly?: boolean;
};

// Quick-increment buttons for count
const COUNT_BUTTONS = [0, 1, 2, 5, 10] as const;

export function DezinsInlineRow({
  bod,
  onChange,
  onSettingsTap,
  readonly,
}: Props) {
  return (
    <div
      className="flex min-h-[52px] w-full items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5"
      aria-label={`Bod ${bod.cislo_bodu}, ${TYP_LAPACE_LABELS[bod.typ_lapace]}, ${bod.pocet} ks`}
    >
      {/* Číslo bodu */}
      <span className="min-w-[32px] text-center text-xs font-bold text-foreground leading-tight">
        {bod.cislo_bodu}
      </span>

      {/* Typ lapače (short) */}
      <span className="min-w-[28px] text-[11px] text-muted-foreground leading-tight truncate">
        {TYP_LAPACE_LABELS[bod.typ_lapace]}
      </span>

      {/* Druh hmyzu badge */}
      {bod.druh_hmyzu && (
        <Badge className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0 shrink-0">
          {bod.druh_hmyzu}
        </Badge>
      )}

      {/* Count input — inline numeric stepper */}
      <div className="flex flex-1 items-center justify-end gap-1">
        {!readonly ? (
          <>
            <button
              type="button"
              onClick={() =>
                onChange({ ...bod, pocet: Math.max(0, bod.pocet - 1) })
              }
              className="flex h-[36px] w-[36px] items-center justify-center rounded-md border border-muted text-sm font-bold text-muted-foreground active:bg-muted/50"
              aria-label="Snížit počet"
            >
              -
            </button>
            <input
              type="number"
              min={0}
              value={bod.pocet}
              onChange={(e) =>
                onChange({
                  ...bod,
                  pocet: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              className="h-[36px] w-[48px] rounded-md border border-muted text-center text-sm font-bold text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Počet kusů"
            />
            <button
              type="button"
              onClick={() => onChange({ ...bod, pocet: bod.pocet + 1 })}
              className="flex h-[36px] w-[36px] items-center justify-center rounded-md border border-muted text-sm font-bold text-muted-foreground active:bg-muted/50"
              aria-label="Zvýšit počet"
            >
              +
            </button>
          </>
        ) : (
          <Badge className="min-w-[52px] justify-center text-xs font-semibold bg-blue-100 text-blue-800">
            {bod.pocet} ks
          </Badge>
        )}
      </div>

      {/* Settings button */}
      {!readonly && (
        <button
          type="button"
          onClick={onSettingsTap}
          className="flex h-[36px] w-[36px] items-center justify-center rounded-md text-sm text-muted-foreground active:bg-muted/50"
          aria-label={`Nastavení bodu ${bod.cislo_bodu}`}
        >
          {"\u2699\uFE0F"}
        </button>
      )}
    </div>
  );
}
