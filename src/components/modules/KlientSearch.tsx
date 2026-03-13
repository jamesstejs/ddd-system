"use client";

import { useState, useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Phone, MapPin } from "lucide-react";
import { searchKlientiAction, quickCreateKlientAction } from "@/app/(dashboard)/rychle-pridani/actions";

interface KlientResult {
  id: string;
  nazev: string | null;
  jmeno: string | null;
  prijmeni: string | null;
  typ: string;
  telefon: string | null;
  email: string | null;
  adresa: string | null;
  ico: string | null;
}

interface Props {
  onSelect: (klient: KlientResult, objekty: Array<{ id: string; nazev: string; adresa: string; typ_objektu: string; plocha_m2: number | null }>) => void;
}

export default function KlientSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KlientResult[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [searched, setSearched] = useState(false);

  // Nový klient form
  const [newJmeno, setNewJmeno] = useState("");
  const [newTelefon, setNewTelefon] = useState("");
  const [newAdresa, setNewAdresa] = useState("");
  const [createError, setCreateError] = useState("");

  const debounceRef = useCallback(() => {
    let timer: NodeJS.Timeout;
    return (value: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (value.length >= 2) {
          startTransition(async () => {
            try {
              const data = await searchKlientiAction(value);
              setResults(data as KlientResult[]);
              setSearched(true);
            } catch {
              setResults([]);
            }
          });
        } else {
          setResults([]);
          setSearched(false);
        }
      }, 300);
    };
  }, [])();

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setShowCreate(false);
    debounceRef(value);
  };

  const handleSelectKlient = async (klient: KlientResult) => {
    // Load objekty for this klient
    const { getObjektyForKlientAction } = await import("@/app/(dashboard)/rychle-pridani/actions");
    startTransition(async () => {
      try {
        const objekty = await getObjektyForKlientAction(klient.id);
        onSelect(klient, objekty);
      } catch {
        onSelect(klient, []);
      }
    });
  };

  const handleCreateKlient = () => {
    setCreateError("");
    if (!newJmeno.trim() || !newTelefon.trim()) {
      setCreateError("Jméno a telefon jsou povinné");
      return;
    }

    startTransition(async () => {
      try {
        const { klient, objekt } = await quickCreateKlientAction({
          jmeno: newJmeno.trim(),
          telefon: newTelefon.trim(),
          adresa: newAdresa.trim(),
        });
        onSelect(
          {
            id: klient.id,
            nazev: null,
            jmeno: klient.jmeno,
            prijmeni: klient.prijmeni,
            typ: "fyzicka_osoba",
            telefon: klient.telefon,
            email: null,
            adresa: klient.adresa,
            ico: null,
          },
          [{ id: objekt.id, nazev: objekt.nazev || "", adresa: objekt.adresa || "", typ_objektu: objekt.typ_objektu || "domacnost", plocha_m2: null }],
        );
      } catch (e) {
        setCreateError(e instanceof Error ? e.message : "Chyba při vytváření");
      }
    });
  };

  const getDisplayName = (k: KlientResult) => {
    if (k.typ === "firma") return k.nazev || "Bez názvu";
    return [k.jmeno, k.prijmeni].filter(Boolean).join(" ") || "Bez jména";
  };

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Hledat klienta (jméno, telefon, IČO)..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="pl-10 min-h-[44px] text-base"
          autoFocus
        />
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
          {results.map((k) => (
            <button
              key={k.id}
              onClick={() => handleSelectKlient(k)}
              disabled={isPending}
              className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors min-h-[44px]"
            >
              <p className="font-medium text-sm">{getDisplayName(k)}</p>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                {k.telefon && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {k.telefon}
                  </span>
                )}
                {k.adresa && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {k.adresa}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results + Create */}
      {searched && results.length === 0 && query.length >= 2 && !showCreate && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-2">Klient nenalezen</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreate(true)}
            className="min-h-[44px]"
          >
            <Plus className="h-4 w-4 mr-1" /> Nový klient
          </Button>
        </div>
      )}

      {/* Quick create form */}
      {showCreate && (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
          <p className="text-sm font-medium">Nový klient</p>
          <Input
            placeholder="Jméno *"
            value={newJmeno}
            onChange={(e) => setNewJmeno(e.target.value)}
            className="min-h-[44px] text-base"
          />
          <Input
            placeholder="Telefon *"
            type="tel"
            value={newTelefon}
            onChange={(e) => setNewTelefon(e.target.value)}
            className="min-h-[44px] text-base"
          />
          <Input
            placeholder="Adresa"
            value={newAdresa}
            onChange={(e) => setNewAdresa(e.target.value)}
            className="min-h-[44px] text-base"
          />
          {createError && <p className="text-xs text-red-600">{createError}</p>}
          <Button
            onClick={handleCreateKlient}
            disabled={isPending}
            className="w-full min-h-[44px]"
          >
            {isPending ? "Vytvářím..." : "Vytvořit a pokračovat"}
          </Button>
        </div>
      )}

      {isPending && !showCreate && (
        <p className="text-xs text-muted-foreground text-center py-2">Načítám...</p>
      )}
    </div>
  );
}
