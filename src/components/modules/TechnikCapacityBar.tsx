"use client";

import { type TechnikCapacity, formatCapacity } from "@/lib/utils/capacityUtils";
import { cn } from "@/lib/utils";

interface TechnikWithCapacity {
  id: string;
  jmeno: string | null;
  prijmeni: string | null;
  capacity: TechnikCapacity;
}

interface Props {
  technici: TechnikWithCapacity[];
  selectedId: string | null;
  onSelect: (technikId: string, nextSlot: { casOd: string; casDo: string } | null) => void;
}

export default function TechnikCapacityBar({ technici, selectedId, onSelect }: Props) {
  // Seřadíme: dostupní (s volným časem) nahoře, pak plně obsazení, pak bez směny
  const sorted = [...technici].sort((a, b) => {
    if (a.capacity.totalMinutes === 0 && b.capacity.totalMinutes > 0) return 1;
    if (a.capacity.totalMinutes > 0 && b.capacity.totalMinutes === 0) return -1;
    return b.capacity.freeMinutes - a.capacity.freeMinutes;
  });

  return (
    <div className="space-y-2">
      {sorted.map((t) => {
        const cap = t.capacity;
        const pct = cap.totalMinutes > 0 ? Math.round((cap.usedMinutes / cap.totalMinutes) * 100) : 0;
        const hasFreeTime = cap.freeMinutes > 0;
        const hasShift = cap.totalMinutes > 0;
        const isSelected = selectedId === t.id;

        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id, cap.nextFreeSlot)}
            disabled={!hasShift}
            className={cn(
              "w-full text-left p-3 rounded-lg border transition-colors min-h-[44px]",
              isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-accent",
              !hasShift && "opacity-50 cursor-not-allowed",
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">
                {t.jmeno} {t.prijmeni?.charAt(0)}.
              </span>
              <span className={cn(
                "text-xs font-medium",
                hasFreeTime ? "text-green-700" : hasShift ? "text-red-600" : "text-muted-foreground",
              )}>
                {hasShift ? formatCapacity(cap) : "Bez směny"}
              </span>
            </div>

            {/* Capacity bar */}
            {hasShift && (
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    pct >= 90 ? "bg-red-400" : pct >= 60 ? "bg-amber-400" : "bg-green-400",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}

            {/* Next free slot */}
            {cap.nextFreeSlot && (
              <p className="text-xs text-muted-foreground mt-1">
                Další slot: {cap.nextFreeSlot.casOd}–{cap.nextFreeSlot.casDo}
              </p>
            )}
          </button>
        );
      })}

      {technici.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Žádní technici k dispozici
        </p>
      )}
    </div>
  );
}
