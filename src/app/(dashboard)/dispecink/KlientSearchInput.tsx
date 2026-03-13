"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, Plus, User } from "lucide-react";
import { searchKlientiAction } from "@/app/(dashboard)/rychle-pridani/actions";

export type KlientResult = {
  id: string;
  nazev: string | null;
  jmeno: string;
  prijmeni: string;
  typ: string;
  telefon: string | null;
  email: string | null;
  adresa: string | null;
};

type Props = {
  onSelect: (klient: KlientResult) => void;
  onCreateNew: () => void;
  placeholder?: string;
};

export function KlientSearchInput({
  onSelect,
  onCreateNew,
  placeholder = "Hledat klienta...",
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KlientResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchKlientiAction(query.trim());
        setResults(data as KlientResult[]);
        setShowDropdown(true);
      } catch (err) {
        console.error("[KlientSearchInput] Search error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getKlientLabel = (k: KlientResult) => {
    if (k.typ === "firma" && k.nazev) return k.nazev;
    return `${k.jmeno} ${k.prijmeni}`;
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          className="min-h-[44px] pl-9 text-base"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[300px] overflow-auto rounded-lg border bg-white shadow-lg">
          {results.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => {
                onSelect(k);
                setQuery(getKlientLabel(k));
                setShowDropdown(false);
              }}
              className="flex w-full items-start gap-2.5 border-b px-3 py-2.5 text-left last:border-b-0 active:bg-muted/50"
              style={{ minHeight: 48 }}
            >
              <User className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {getKlientLabel(k)}
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {k.telefon && <span>{k.telefon}</span>}
                  {k.adresa && (
                    <span className="truncate">{k.adresa}</span>
                  )}
                </div>
              </div>
            </button>
          ))}

          {results.length === 0 && query.trim().length >= 2 && !loading && (
            <div className="px-3 py-3 text-center text-sm text-muted-foreground">
              Žádné výsledky
            </div>
          )}

          {/* New client button */}
          <button
            type="button"
            onClick={() => {
              onCreateNew();
              setShowDropdown(false);
            }}
            className="flex w-full items-center gap-2 border-t bg-muted/30 px-3 py-2.5 text-sm font-medium text-blue-600 active:bg-muted/50"
            style={{ minHeight: 44 }}
          >
            <Plus className="h-4 w-4" />
            Nový klient
          </button>
        </div>
      )}
    </div>
  );
}
