"use client";

import {
  POZER_OPTIONS,
  POZER_COLORS,
  TYP_STANICKY_LABELS,
  STAV_STANICKY_LABELS,
} from "@/lib/utils/protokolUtils";
import type { DeratBodFormData } from "./DeratBodForm";
import type { Database } from "@/lib/supabase/database.types";

type StavStanicky = Database["public"]["Enums"]["stav_stanicky"];

const STAV_ICONS: Partial<Record<StavStanicky, string>> = {
  odcizena: "\u{1F6AB}",
  poskozena: "\u26A0\uFE0F",
  znovu_zavedena: "\u{1F504}",
  zavedena: "\u{1F195}",
};

// Short labels for mobile inline view
const TYP_SHORT: Record<string, string> = {
  zivolovna: "Živ",
  mys: "Myš",
  potkan: "Pot",
  sklopna_mys: "SkM",
  sklopna_potkan: "SkP",
};

type Props = {
  bod: DeratBodFormData;
  onChange: (updated: DeratBodFormData) => void;
  onSettingsTap: () => void;
  readonly?: boolean;
};

export function DeratInlineRow({
  bod,
  onChange,
  onSettingsTap,
  readonly,
}: Props) {
  const stavIcon = STAV_ICONS[bod.stav_stanicky];
  const shortTyp = TYP_SHORT[bod.typ_stanicky] || TYP_STANICKY_LABELS[bod.typ_stanicky];

  return (
    <div
      className="flex min-h-[52px] w-full items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5"
      aria-label={`Bod ${bod.cislo_bodu}, ${TYP_STANICKY_LABELS[bod.typ_stanicky]}, požer ${bod.pozer_procent}%`}
    >
      {/* Číslo bodu */}
      <span className="min-w-[32px] text-center text-xs font-bold text-foreground leading-tight">
        {bod.cislo_bodu}
      </span>

      {/* Typ staničky (short) */}
      <span className="min-w-[28px] text-center text-[11px] text-muted-foreground leading-tight">
        {shortTyp}
      </span>

      {/* Stav icon */}
      {stavIcon && (
        <span
          className="text-sm leading-none"
          title={STAV_STANICKY_LABELS[bod.stav_stanicky]}
        >
          {stavIcon}
        </span>
      )}

      {/* Požer buttons — 5 inline */}
      <div className="flex flex-1 gap-1 justify-center">
        {POZER_OPTIONS.map((value) => {
          const isActive = bod.pozer_procent === value;
          const colors = POZER_COLORS[value];
          return (
            <button
              key={value}
              type="button"
              disabled={readonly}
              onClick={() => {
                if (!readonly) {
                  onChange({ ...bod, pozer_procent: value });
                }
              }}
              className={`flex h-[36px] min-w-[36px] flex-1 max-w-[48px] items-center justify-center rounded-md text-xs font-bold transition-all ${
                isActive
                  ? `${colors.bg} ${colors.text} ring-1 ring-current`
                  : readonly
                    ? "border border-muted bg-muted/30 text-muted-foreground"
                    : "border border-muted bg-white text-muted-foreground active:bg-muted/50"
              }`}
              aria-label={`Požer ${value}%`}
              aria-pressed={isActive}
            >
              {value}
            </button>
          );
        })}
      </div>

      {/* Settings button */}
      {!readonly && (
        <button
          type="button"
          onClick={onSettingsTap}
          className="flex h-[36px] w-[36px] items-center justify-center rounded-md text-sm text-muted-foreground active:bg-muted/50"
          aria-label={`Nastavení bodu ${bod.cislo_bodu}`}
        >
          \u2699\uFE0F
        </button>
      )}
    </div>
  );
}
