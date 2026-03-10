"use client";

import { useState, useMemo, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { ConfirmDeleteSheet } from "@/components/layout/ConfirmDeleteSheet";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  FlaskConical,
  Bug,
  Shield,
  Droplets,
  BirdIcon,
} from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";
import {
  createPripravekAction,
  updatePripravekAction,
  deletePripravekAction,
} from "./actions";

type Pripravek = Database["public"]["Tables"]["pripravky"]["Row"];
type TypPripravku = Database["public"]["Enums"]["typ_pripravku"];
type FormaPripravku = Database["public"]["Enums"]["forma_pripravku"];

// --- Konstanty ---

const TYP_LABELS: Record<TypPripravku, string> = {
  rodenticid: "Rodenticid",
  insekticid: "Insekticid",
  biocid: "Biocid",
  dezinfekce: "Dezinfekce",
  repelent: "Repelent",
};

const TYP_COLORS: Record<TypPripravku, string> = {
  rodenticid: "bg-red-100 text-red-800",
  insekticid: "bg-blue-100 text-blue-800",
  biocid: "bg-purple-100 text-purple-800",
  dezinfekce: "bg-emerald-100 text-emerald-800",
  repelent: "bg-amber-100 text-amber-800",
};

const TYP_ICONS: Record<TypPripravku, typeof FlaskConical> = {
  rodenticid: FlaskConical,
  insekticid: Bug,
  biocid: Shield,
  dezinfekce: Droplets,
  repelent: BirdIcon,
};

const FORMA_LABELS: Record<FormaPripravku, string> = {
  pasta: "Pasta",
  granule: "Granule",
  gel: "Gel",
  kapalina: "Kapalina",
  prasek: "Prášek",
  aerosol: "Aerosol",
  pena: "Pěna",
  tablety: "Tablety",
  voskovy_blok: "Voskový blok",
  mikrokapsule: "Mikrokapsule",
  jiny: "Jiný",
};

const PROSTOR_LABELS: Record<string, string> = {
  potravinarsky: "Potravinářský",
  domacnost: "Domácnost",
  prumysl: "Průmysl",
  venkovni: "Venkovní",
  zemedelsky: "Zemědělský",
  chov_zvirat: "Chov zvířat",
};

const ALL_PROSTORY = Object.keys(PROSTOR_LABELS);

// --- Komponent ---

interface PripravkyListProps {
  pripravky: Pripravek[];
  isAdmin: boolean;
}

export default function PripravkyList({
  pripravky,
  isAdmin,
}: PripravkyListProps) {
  const [search, setSearch] = useState("");
  const [filterTyp, setFilterTyp] = useState<TypPripravku | "all">("all");
  const [filterAktivni, setFilterAktivni] = useState<
    "all" | "aktivni" | "neaktivni"
  >("all");

  // CRUD state
  const [editItem, setEditItem] = useState<Pripravek | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Pripravek | null>(null);

  const filtered = useMemo(() => {
    let result = pripravky;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.nazev.toLowerCase().includes(q) ||
          p.ucinna_latka?.toLowerCase().includes(q) ||
          (p.cilovy_skudce as string[] | null)?.some((s) =>
            s.toLowerCase().includes(q),
          ),
      );
    }

    if (filterTyp !== "all") {
      result = result.filter((p) => p.typ === filterTyp);
    }

    if (filterAktivni === "aktivni") {
      result = result.filter((p) => p.aktivni);
    } else if (filterAktivni === "neaktivni") {
      result = result.filter((p) => !p.aktivni);
    }

    return result;
  }, [pripravky, search, filterTyp, filterAktivni]);

  const countText = `${filtered.length} ${
    filtered.length === 1
      ? "přípravek"
      : filtered.length < 5
        ? "přípravky"
        : "přípravků"
  }`;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat přípravek, účinnou látku, škůdce..."
          className="min-h-[44px] pl-10 text-base"
        />
      </div>

      {/* Filtry */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterTyp === "all" ? "default" : "outline"}
          size="sm"
          className="min-h-[36px]"
          onClick={() => setFilterTyp("all")}
        >
          Vše
        </Button>
        {(Object.keys(TYP_LABELS) as TypPripravku[]).map((typ) => (
          <Button
            key={typ}
            variant={filterTyp === typ ? "default" : "outline"}
            size="sm"
            className="min-h-[36px]"
            onClick={() => setFilterTyp(typ)}
          >
            {TYP_LABELS[typ]}
          </Button>
        ))}
      </div>

      {/* Aktivní / neaktivní filtr (jen admin) */}
      {isAdmin && (
        <div className="flex gap-2">
          {(["all", "aktivni", "neaktivni"] as const).map((val) => (
            <Button
              key={val}
              variant={filterAktivni === val ? "default" : "outline"}
              size="sm"
              className="min-h-[36px] text-xs"
              onClick={() => setFilterAktivni(val)}
            >
              {val === "all"
                ? "Všechny"
                : val === "aktivni"
                  ? "Aktivní"
                  : "Neaktivní"}
            </Button>
          ))}
        </div>
      )}

      {/* Počet + přidat */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{countText}</p>
        {isAdmin && (
          <Button
            size="sm"
            className="min-h-[44px] gap-1"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Přidat
          </Button>
        )}
      </div>

      {/* Seznam */}
      <div className="space-y-3">
        {filtered.map((p) => {
          const Icon = TYP_ICONS[p.typ];
          const prostory = (p.omezeni_prostor as string[] | null) || [];
          const skudci = (p.cilovy_skudce as string[] | null) || [];

          return (
            <Card
              key={p.id}
              className={!p.aktivni ? "opacity-60" : undefined}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium leading-tight">{p.nazev}</p>
                      {p.ucinna_latka && (
                        <p className="text-sm text-muted-foreground">
                          {p.ucinna_latka}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        <Badge className={TYP_COLORS[p.typ]} variant="secondary">
                          {TYP_LABELS[p.typ]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {FORMA_LABELS[p.forma]}
                        </Badge>
                        {!p.aktivni && (
                          <Badge variant="secondary" className="text-xs">
                            Neaktivní
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setEditItem(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => setDeleteItem(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Detail rozbalení */}
                {(skudci.length > 0 || prostory.length > 0 || p.protilatka || p.baleni) && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    {p.protilatka && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Protilátka:</span>{" "}
                        {p.protilatka}
                      </p>
                    )}
                    {p.baleni && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Balení:</span> {p.baleni}
                      </p>
                    )}
                    {skudci.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Cílový škůdce:
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {skudci.map((s) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="text-xs"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {prostory.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Povolené prostory:
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {prostory.map((pr) => (
                            <Badge
                              key={pr}
                              variant="outline"
                              className="text-xs"
                            >
                              {PROSTOR_LABELS[pr] || pr}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {p.poznamka && (
                      <p className="text-xs italic text-muted-foreground">
                        {p.poznamka}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {search || filterTyp !== "all"
              ? "Žádné přípravky neodpovídají filtru"
              : "Zatím žádné přípravky"}
          </p>
        )}
      </div>

      {/* Create / Edit Bottom Sheet */}
      {isAdmin && (
        <>
          <PripravekFormSheet
            open={createOpen}
            onOpenChange={setCreateOpen}
            pripravek={null}
          />
          <PripravekFormSheet
            open={!!editItem}
            onOpenChange={(open) => !open && setEditItem(null)}
            pripravek={editItem}
          />
          <ConfirmDeleteSheet
            open={!!deleteItem}
            onOpenChange={(open) => !open && setDeleteItem(null)}
            title="Smazat přípravek"
            description={`Opravdu chcete smazat přípravek "${deleteItem?.nazev}"?`}
            onConfirm={async () => {
              if (deleteItem) {
                await deletePripravekAction(deleteItem.id);
                setDeleteItem(null);
              }
            }}
          />
        </>
      )}
    </div>
  );
}

// --- Form Sheet ---

function PripravekFormSheet({
  open,
  onOpenChange,
  pripravek,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pripravek: Pripravek | null;
}) {
  const isEdit = !!pripravek;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [nazev, setNazev] = useState("");
  const [ucinnaLatka, setUcinnaLatka] = useState("");
  const [protilatka, setProtilatka] = useState("");
  const [typ, setTyp] = useState<TypPripravku>("insekticid");
  const [forma, setForma] = useState<FormaPripravku>("kapalina");
  const [baleni, setBaleni] = useState("");
  const [cilovySkudce, setCilovySkudce] = useState("");
  const [prostory, setProstory] = useState<string[]>([]);
  const [aktivni, setAktivni] = useState(true);
  const [poznamka, setPoznamka] = useState("");

  // Reset form when opening
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      if (pripravek) {
        setNazev(pripravek.nazev);
        setUcinnaLatka(pripravek.ucinna_latka || "");
        setProtilatka(pripravek.protilatka || "");
        setTyp(pripravek.typ);
        setForma(pripravek.forma);
        setBaleni(pripravek.baleni || "");
        setCilovySkudce(
          ((pripravek.cilovy_skudce as string[] | null) || []).join(", "),
        );
        setProstory((pripravek.omezeni_prostor as string[] | null) || []);
        setAktivni(pripravek.aktivni);
        setPoznamka(pripravek.poznamka || "");
      } else {
        setNazev("");
        setUcinnaLatka("");
        setProtilatka("");
        setTyp("insekticid");
        setForma("kapalina");
        setBaleni("");
        setCilovySkudce("");
        setProstory([]);
        setAktivni(true);
        setPoznamka("");
      }
      setError(null);
    }
    onOpenChange(newOpen);
  };

  function toggleProstor(p: string) {
    setProstory((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function handleSubmit() {
    if (!nazev.trim()) {
      setError("Název je povinný");
      return;
    }

    const skudceArr = cilovySkudce
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const data = {
      nazev: nazev.trim(),
      ucinna_latka: ucinnaLatka.trim() || null,
      protilatka: protilatka.trim() || null,
      typ,
      forma,
      baleni: baleni.trim() || null,
      cilovy_skudce: skudceArr,
      omezeni_prostor: prostory,
      aktivni,
      poznamka: poznamka.trim() || null,
    };

    startTransition(async () => {
      try {
        if (isEdit && pripravek) {
          await updatePripravekAction(pripravek.id, data);
        } else {
          await createPripravekAction(data);
        }
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba při ukládání");
      }
    });
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={isEdit ? "Upravit přípravek" : "Nový přípravek"}
    >
      <div className="space-y-4 pb-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Název */}
        <div>
          <Label htmlFor="nazev">Název *</Label>
          <Input
            id="nazev"
            value={nazev}
            onChange={(e) => setNazev(e.target.value)}
            placeholder="Název přípravku"
            className="min-h-[44px] text-base"
          />
        </div>

        {/* Účinná látka */}
        <div>
          <Label htmlFor="ucinna_latka">Účinná látka</Label>
          <Input
            id="ucinna_latka"
            value={ucinnaLatka}
            onChange={(e) => setUcinnaLatka(e.target.value)}
            placeholder="např. Brodifacoum 0,005%"
            className="min-h-[44px] text-base"
          />
        </div>

        {/* Protilátka */}
        <div>
          <Label htmlFor="protilatka">Protilátka</Label>
          <Input
            id="protilatka"
            value={protilatka}
            onChange={(e) => setProtilatka(e.target.value)}
            placeholder="např. Vitamin K1 (Fytomenadion)"
            className="min-h-[44px] text-base"
          />
        </div>

        {/* Typ */}
        <div>
          <Label htmlFor="typ">Typ přípravku</Label>
          <select
            id="typ"
            value={typ}
            onChange={(e) => setTyp(e.target.value as TypPripravku)}
            className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {(Object.keys(TYP_LABELS) as TypPripravku[]).map((t) => (
              <option key={t} value={t}>
                {TYP_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {/* Forma */}
        <div>
          <Label htmlFor="forma">Forma</Label>
          <select
            id="forma"
            value={forma}
            onChange={(e) => setForma(e.target.value as FormaPripravku)}
            className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {(Object.keys(FORMA_LABELS) as FormaPripravku[]).map((f) => (
              <option key={f} value={f}>
                {FORMA_LABELS[f]}
              </option>
            ))}
          </select>
        </div>

        {/* Balení */}
        <div>
          <Label htmlFor="baleni">Balení</Label>
          <Input
            id="baleni"
            value={baleni}
            onChange={(e) => setBaleni(e.target.value)}
            placeholder="např. 250ml, 30g stříkačka"
            className="min-h-[44px] text-base"
          />
        </div>

        {/* Cílový škůdce */}
        <div>
          <Label htmlFor="cilovy_skudce">Cílový škůdce (oddělte čárkou)</Label>
          <Input
            id="cilovy_skudce"
            value={cilovySkudce}
            onChange={(e) => setCilovySkudce(e.target.value)}
            placeholder="Potkan obecný, Myš domácí"
            className="min-h-[44px] text-base"
          />
        </div>

        {/* Omezení prostoru — chip toggle */}
        <div>
          <Label>Povolené prostory</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALL_PROSTORY.map((p) => (
              <Button
                key={p}
                type="button"
                variant={prostory.includes(p) ? "default" : "outline"}
                size="sm"
                className="min-h-[36px]"
                onClick={() => toggleProstor(p)}
              >
                {PROSTOR_LABELS[p]}
              </Button>
            ))}
          </div>
        </div>

        {/* Aktivní */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="aktivni"
            checked={aktivni}
            onChange={(e) => setAktivni(e.target.checked)}
            className="h-5 w-5"
          />
          <Label htmlFor="aktivni" className="cursor-pointer">
            Aktivní (viditelný pro techniky)
          </Label>
        </div>

        {/* Poznámka */}
        <div>
          <Label htmlFor="poznamka">Poznámka</Label>
          <textarea
            id="poznamka"
            value={poznamka}
            onChange={(e) => setPoznamka(e.target.value)}
            placeholder="Interní poznámka..."
            rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Tlačítka */}
        <div className="space-y-2 pt-2">
          <Button
            className="min-h-[44px] w-full"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending
              ? "Ukládám..."
              : isEdit
                ? "Uložit změny"
                : "Vytvořit přípravek"}
          </Button>
          <Button
            variant="outline"
            className="min-h-[44px] w-full"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Zrušit
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
