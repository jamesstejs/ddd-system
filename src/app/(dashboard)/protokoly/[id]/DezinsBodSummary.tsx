"use client";

import { Badge } from "@/components/ui/badge";
import { TYP_LAPACE_LABELS } from "@/lib/utils/protokolUtils";
import type { Database } from "@/lib/supabase/database.types";

type TypLapace = Database["public"]["Enums"]["typ_lapace"];

type Props = {
  cislo_bodu: string;
  typ_lapace: TypLapace;
  druh_hmyzu: string | null;
  pocet: number;
  onTap: () => void;
  readonly?: boolean;
};

export function DezinsBodSummary({
  cislo_bodu,
  typ_lapace,
  druh_hmyzu,
  pocet,
  onTap,
  readonly,
}: Props) {
  const content = (
    <>
      {/* Číslo bodu */}
      <span className="min-w-[36px] text-center text-sm font-bold text-foreground">
        {cislo_bodu}
      </span>

      {/* Typ lapače */}
      <span className="text-sm text-muted-foreground truncate">
        {TYP_LAPACE_LABELS[typ_lapace]}
      </span>

      {/* Druh hmyzu */}
      {druh_hmyzu && (
        <span className="flex-1 text-sm text-foreground truncate">
          {druh_hmyzu}
        </span>
      )}
      {!druh_hmyzu && <span className="flex-1" />}

      {/* Počet badge */}
      <Badge
        className="min-w-[52px] justify-center text-xs font-semibold bg-blue-100 text-blue-800"
      >
        {pocet} ks
      </Badge>

      {/* Arrow — only when interactive */}
      {!readonly && <span className="text-muted-foreground">›</span>}
    </>
  );

  if (readonly) {
    return (
      <div
        className="flex min-h-[44px] w-full items-center gap-3 rounded-lg border bg-white p-3 text-left opacity-70"
        aria-label={`Bod ${cislo_bodu}, ${TYP_LAPACE_LABELS[typ_lapace]}, ${pocet} ks`}
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
      aria-label={`Bod ${cislo_bodu}, ${TYP_LAPACE_LABELS[typ_lapace]}, ${pocet} ks`}
    >
      {content}
    </button>
  );
}
