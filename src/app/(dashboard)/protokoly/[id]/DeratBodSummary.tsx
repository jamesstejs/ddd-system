"use client";

import { Badge } from "@/components/ui/badge";
import {
  TYP_STANICKY_LABELS,
  STAV_STANICKY_LABELS,
  POZER_COLORS,
} from "@/lib/utils/protokolUtils";
import type { Database } from "@/lib/supabase/database.types";

type TypStanicky = Database["public"]["Enums"]["typ_stanicky"];
type StavStanicky = Database["public"]["Enums"]["stav_stanicky"];

type Props = {
  cislo_bodu: string;
  typ_stanicky: TypStanicky;
  pozer_procent: number;
  stav_stanicky: StavStanicky;
  onTap: () => void;
  readonly?: boolean;
};

const STAV_ICONS: Partial<Record<StavStanicky, string>> = {
  odcizena: "🚫",
  poskozena: "⚠️",
  znovu_zavedena: "🔄",
  zavedena: "🆕",
};

export function DeratBodSummary({
  cislo_bodu,
  typ_stanicky,
  pozer_procent,
  stav_stanicky,
  onTap,
  readonly,
}: Props) {
  const pozerColor = POZER_COLORS[pozer_procent] || POZER_COLORS[0];
  const stavIcon = STAV_ICONS[stav_stanicky];

  const content = (
    <>
      {/* Číslo bodu */}
      <span className="min-w-[36px] text-center text-sm font-bold text-foreground">
        {cislo_bodu}
      </span>

      {/* Typ staničky */}
      <span className="flex-1 text-sm text-muted-foreground truncate">
        {TYP_STANICKY_LABELS[typ_stanicky]}
      </span>

      {/* Stav ikona (jen pokud != ok) */}
      {stavIcon && (
        <span className="text-base" title={STAV_STANICKY_LABELS[stav_stanicky]}>
          {stavIcon}
        </span>
      )}

      {/* Požer badge */}
      <Badge
        className={`${pozerColor.bg} ${pozerColor.text} min-w-[52px] justify-center text-xs font-semibold`}
      >
        {pozer_procent}%
      </Badge>

      {/* Arrow — only when interactive */}
      {!readonly && <span className="text-muted-foreground">›</span>}
    </>
  );

  if (readonly) {
    return (
      <div
        className="flex min-h-[44px] w-full items-center gap-3 rounded-lg border bg-white p-3 text-left opacity-70"
        aria-label={`Bod ${cislo_bodu}, ${TYP_STANICKY_LABELS[typ_stanicky]}, požer ${pozer_procent}%`}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onTap}
      className="flex min-h-[44px] w-full items-center gap-3 rounded-lg border bg-white p-3 text-left transition-colors active:bg-muted/50"
      aria-label={`Bod ${cislo_bodu}, ${TYP_STANICKY_LABELS[typ_stanicky]}, požer ${pozer_procent}%`}
    >
      {content}
    </button>
  );
}
