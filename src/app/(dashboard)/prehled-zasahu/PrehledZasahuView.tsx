"use client";

import { useState, useMemo, useTransition, useCallback } from "react";
import { POBOCKY, type Pobocka } from "@/types/pobocky";
import { Input } from "@/components/ui/input";
import { getPrehledDataAction } from "./actions";
import { PripominkyTab } from "./PripominkyTab";
import { ZpozdeneTab } from "./ZpozdeneTab";
import { FakturaceTab } from "./FakturaceTab";
import type { PrehledData } from "./types";

type TabId = "pripominky" | "overdue" | "fakturace";

const TABS: { id: TabId; label: string }[] = [
  { id: "pripominky", label: "K domluvení" },
  { id: "overdue", label: "Zpožděné" },
  { id: "fakturace", label: "Fakturace" },
];

type Props = {
  initialData: PrehledData;
};

export function PrehledZasahuView({ initialData }: Props) {
  const [data, setData] = useState<PrehledData>(initialData);
  const [activeTab, setActiveTab] = useState<TabId>("pripominky");
  const [regionFilter, setRegionFilter] = useState<Pobocka | "vse">("vse");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const reload = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await getPrehledDataAction();
        setData(result);
      } catch {
        // Keep current data
      }
    });
  }, []);

  // Filter by region
  const filterByRegion = useCallback(
    <T extends { technik: { pobocka: string | null } | null }>(
      items: T[],
    ): T[] => {
      if (regionFilter === "vse") return items;
      return items.filter(
        (item) => item.technik?.pobocka === regionFilter,
      );
    },
    [regionFilter],
  );

  // Search by klient name
  const filterBySearch = useCallback(
    <
      T extends {
        zakazka: {
          objekt: {
            klient: {
              nazev: string | null;
              jmeno: string;
              prijmeni: string;
            };
            nazev: string;
          };
        } | null;
      },
    >(
      items: T[],
    ): T[] => {
      if (!searchQuery.trim()) return items;
      const q = searchQuery.toLowerCase();
      return items.filter((item) => {
        const k = item.zakazka?.objekt?.klient;
        if (!k) return false;
        const fullName = k.nazev
          ? k.nazev.toLowerCase()
          : `${k.jmeno} ${k.prijmeni}`.toLowerCase();
        const objName = item.zakazka?.objekt?.nazev?.toLowerCase() || "";
        return fullName.includes(q) || objName.includes(q);
      });
    },
    [searchQuery],
  );

  // Filtered data for each tab
  const filteredPripominky = useMemo(
    () => filterBySearch(filterByRegion(data.pripominky)),
    [data.pripominky, filterByRegion, filterBySearch],
  );
  const filteredOverdue = useMemo(
    () => filterBySearch(filterByRegion(data.overdue)),
    [data.overdue, filterByRegion, filterBySearch],
  );
  const filteredFakturace = useMemo(
    () => filterBySearch(filterByRegion(data.fakturace)),
    [data.fakturace, filterByRegion, filterBySearch],
  );

  return (
    <div className="flex flex-col gap-3 pb-24">
      {/* Tabs with counts */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((tab) => {
          const count =
            tab.id === "pripominky"
              ? data.counts.pripominky
              : tab.id === "overdue"
                ? data.counts.overdue
                : data.counts.fakturace;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground active:bg-muted/70"
              }`}
              style={{ minHeight: 44 }}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Region filter */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <button
          type="button"
          onClick={() => setRegionFilter("vse")}
          className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            regionFilter === "vse"
              ? "bg-blue-600 text-white"
              : "bg-muted text-muted-foreground active:bg-muted/70"
          }`}
          style={{ minHeight: 36 }}
        >
          Vše
        </button>
        {POBOCKY.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setRegionFilter(p.value)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              regionFilter === p.value
                ? "bg-blue-600 text-white"
                : "bg-muted text-muted-foreground active:bg-muted/70"
            }`}
            style={{ minHeight: 36 }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <Input
        placeholder="Hledat klienta nebo objekt..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="min-h-[44px] text-base"
      />

      {/* Loading */}
      {isPending && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Načítám...
        </div>
      )}

      {/* Tab content */}
      {activeTab === "pripominky" && (
        <PripominkyTab items={filteredPripominky} onReload={reload} />
      )}
      {activeTab === "overdue" && (
        <ZpozdeneTab items={filteredOverdue} onReload={reload} />
      )}
      {activeTab === "fakturace" && (
        <FakturaceTab items={filteredFakturace} />
      )}
    </div>
  );
}
