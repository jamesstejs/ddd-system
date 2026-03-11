"use client";

import {
  TREND_LABELS,
  TREND_ICONS,
  TREND_COLORS,
  type DeratStatistiky,
  type DezinsStatistiky,
} from "@/lib/utils/protokolUtils";

type Props = {
  deratStatistiky?: DeratStatistiky | null;
  dezinsStatistiky?: DezinsStatistiky | null;
};

/**
 * Prezentační komponenta — porovnání s předchozím protokolem.
 * Zobrazuje trend požeru (derat) a počtu hmyzu (dezins).
 * Pokud žádná data → nic nerenderuje.
 */
export function StatistikySection({ deratStatistiky, dezinsStatistiky }: Props) {
  const hasDerat = !!deratStatistiky;
  const hasDezins = !!dezinsStatistiky;

  if (!hasDerat && !hasDezins) return null;

  const isFirstProtokol =
    (hasDerat && deratStatistiky.previousAvgPozer === null) &&
    (hasDezins && dezinsStatistiky.previousTotalPocet === null);

  const isDeratFirst = hasDerat && deratStatistiky.previousAvgPozer === null && !hasDezins;
  const isDezinsFirst = hasDezins && dezinsStatistiky.previousTotalPocet === null && !hasDerat;

  if (isFirstProtokol || isDeratFirst || isDezinsFirst) {
    return (
      <div className="rounded-lg border border-muted bg-muted/30 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Porovnání s předchozím
        </h3>
        <p className="text-sm text-muted-foreground">
          První protokol pro tento objekt — žádná předchozí data k porovnání.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-muted bg-muted/30 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        Porovnání s předchozím
      </h3>

      {/* Deratizace stats */}
      {hasDerat && deratStatistiky.previousAvgPozer !== null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-sm text-foreground">
              <span className="font-medium">Průměrný požer:</span>{" "}
              {Math.round(deratStatistiky.currentAvgPozer)}%
              <span className="text-muted-foreground ml-1">
                (dříve {Math.round(deratStatistiky.previousAvgPozer)}%)
              </span>
            </div>
            {deratStatistiky.trend && (
              <TrendBadge trend={deratStatistiky.trend} />
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Počet bodů: {deratStatistiky.currentBodyCount}
            {deratStatistiky.previousBodyCount !== null && (
              <span> (dříve {deratStatistiky.previousBodyCount})</span>
            )}
          </div>
        </div>
      )}

      {/* Dezinsekce stats */}
      {hasDezins && dezinsStatistiky.previousTotalPocet !== null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-sm text-foreground">
              <span className="font-medium">Celkem hmyzu:</span>{" "}
              {dezinsStatistiky.currentTotalPocet} ks
              <span className="text-muted-foreground ml-1">
                (dříve {dezinsStatistiky.previousTotalPocet} ks)
              </span>
            </div>
            {dezinsStatistiky.trend && (
              <TrendBadge trend={dezinsStatistiky.trend} />
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Počet bodů: {dezinsStatistiky.currentBodyCount}
            {dezinsStatistiky.previousBodyCount !== null && (
              <span> (dříve {dezinsStatistiky.previousBodyCount})</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TrendBadge({ trend }: { trend: "klesajici" | "stoupajici" | "stabilni" }) {
  const colors = TREND_COLORS[trend];
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text}`}
    >
      {TREND_ICONS[trend]} {TREND_LABELS[trend]}
    </span>
  );
}
