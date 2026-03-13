"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type SkudceItem = {
  id: string;
  nazev: string;
  typ: string;
};

type Props = {
  skudciList: SkudceItem[];
  selected: string[];
  onSelectedChange: (names: string[]) => void;
};

const TYP_LABELS: Record<string, string> = {
  hlodavci: "Hlodavci",
  lezouci_hmyz: "Lezoucí hmyz",
  letajici_hmyz: "Létající hmyz",
  ostatni: "Ostatní",
};

export function SkudceMultiSelect({
  skudciList,
  selected,
  onSelectedChange,
}: Props) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = skudciList.filter(
    (s) =>
      !selected.includes(s.nazev) &&
      s.nazev.toLowerCase().includes(query.toLowerCase()),
  );

  // Group by typ
  const grouped = filtered.reduce<Record<string, SkudceItem[]>>((acc, s) => {
    const key = s.typ || "ostatni";
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const handleSelect = (nazev: string) => {
    onSelectedChange([...selected, nazev]);
    setQuery("");
  };

  const handleRemove = (nazev: string) => {
    onSelectedChange(selected.filter((s) => s !== nazev));
  };

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      {/* Selected badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((name) => (
            <Badge
              key={name}
              variant="secondary"
              className="h-7 gap-1 px-2.5 text-sm"
            >
              {name}
              <button
                type="button"
                onClick={() => handleRemove(name)}
                className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-foreground/10"
                aria-label={`Odebrat ${name}`}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <Input
        placeholder={
          selected.length > 0 ? "Přidat dalšího škůdce..." : "Vyberte škůdce..."
        }
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="min-h-[44px] text-base"
      />

      {/* Dropdown — show all when focused, filter when typing */}
      {isOpen && skudciList.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-background p-3 text-center text-sm text-muted-foreground shadow-lg">
          Žádní škůdci v databázi
        </div>
      )}

      {isOpen && skudciList.length > 0 && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border bg-background shadow-lg">
          {Object.entries(grouped).map(([typ, items]) => (
            <div key={typ}>
              <div className="sticky top-0 bg-muted/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur-sm">
                {TYP_LABELS[typ] || typ}
              </div>
              {items.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelect(s.nazev)}
                  className="flex w-full items-center px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent active:bg-accent/70"
                  style={{ minHeight: 44 }}
                >
                  {s.nazev}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {isOpen && skudciList.length > 0 && filtered.length === 0 && query.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-background p-3 text-center text-sm text-muted-foreground shadow-lg">
          Žádný škůdce nenalezen
        </div>
      )}
    </div>
  );
}
