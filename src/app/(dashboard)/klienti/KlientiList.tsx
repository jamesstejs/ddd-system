"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BottomSheet } from "@/components/layout/BottomSheet";
import {
  Search,
  Building2,
  User,
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  createKlientAction,
  updateKlientAction,
  deleteKlientAction,
  fetchAresAction,
  checkDuplicateIcoAction,
} from "./actions";
import type { Tables } from "@/lib/supabase/database.types";
import type { Database } from "@/lib/supabase/database.types";

type Klient = Tables<"klienti">;
type TypKlienta = Database["public"]["Enums"]["typ_klienta"];
type TypFilter = "all" | "firma" | "fyzicka_osoba";

const PAGE_SIZE = 20;

const TYP_LABELS: Record<TypFilter, string> = {
  all: "Všichni",
  firma: "Firmy",
  fyzicka_osoba: "Fyzické osoby",
};

const TYP_ICONS: Record<TypFilter, React.ReactNode> = {
  all: <Users className="size-4" />,
  firma: <Building2 className="size-4" />,
  fyzicka_osoba: <User className="size-4" />,
};

function getDisplayName(k: Klient): string {
  if (k.typ === "firma") return k.nazev || "Bez názvu";
  const name = [k.jmeno, k.prijmeni].filter(Boolean).join(" ");
  return name || "Bez jména";
}

function matchesSearch(k: Klient, query: string): boolean {
  const q = query.toLowerCase();
  return [k.nazev, k.jmeno, k.prijmeni, k.ico, k.email, k.telefon]
    .filter(Boolean)
    .some((field) => field!.toLowerCase().includes(q));
}

export function KlientiList({ klienti }: { klienti: Klient[] }) {
  const [search, setSearch] = useState("");
  const [typFilter, setTypFilter] = useState<TypFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [showCreate, setShowCreate] = useState(false);
  const [editKlient, setEditKlient] = useState<Klient | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Klient | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ARES state
  const [aresLoading, setAresLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Create form typ
  const [createTyp, setCreateTyp] = useState<TypKlienta>("firma");

  const filtered = useMemo(() => {
    let result = klienti;
    if (typFilter !== "all") {
      result = result.filter((k) => k.typ === typFilter);
    }
    if (search.trim()) {
      result = result.filter((k) => matchesSearch(k, search.trim()));
    }
    return result;
  }, [klienti, typFilter, search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  async function handleAresLookup(form: HTMLFormElement) {
    const ico = (form.elements.namedItem("ico") as HTMLInputElement)?.value;
    if (!ico || ico.length !== 8) return;

    setAresLoading(true);
    try {
      const data = await fetchAresAction(ico);
      const nazevInput = form.elements.namedItem("nazev") as HTMLInputElement;
      const adresaInput = form.elements.namedItem("adresa") as HTMLInputElement;
      const dicInput = form.elements.namedItem("dic") as HTMLInputElement;

      if (nazevInput && data.nazev) nazevInput.value = data.nazev;
      if (adresaInput && data.adresa) adresaInput.value = data.adresa;
      if (dicInput && data.dic) dicInput.value = data.dic;
    } catch {
      setError("Subjekt nebyl nalezen v ARES");
    } finally {
      setAresLoading(false);
    }
  }

  async function handleIcoBlur(ico: string) {
    setDuplicateWarning(null);
    if (!ico || ico.length !== 8) return;

    try {
      const existing = await checkDuplicateIcoAction(ico);
      if (existing) {
        setDuplicateWarning(`Klient s tímto IČO již existuje: ${existing.nazev}`);
      }
    } catch {
      // ignore
    }
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const typ = form.get("typ") as TypKlienta;

    startTransition(async () => {
      try {
        await createKlientAction({
          typ,
          nazev: (form.get("nazev") as string) || "",
          jmeno: (form.get("jmeno") as string) || "",
          prijmeni: (form.get("prijmeni") as string) || "",
          ico: (form.get("ico") as string) || null,
          dic: (form.get("dic") as string) || null,
          email: (form.get("email") as string) || null,
          telefon: (form.get("telefon") as string) || null,
          adresa: (form.get("adresa") as string) || "",
          poznamka: (form.get("poznamka") as string) || null,
          dph_sazba: Number(form.get("dph_sazba")) || 21,
          individualni_sleva_procent: Number(form.get("individualni_sleva_procent")) || 0,
          platba_predem: form.get("platba_predem") === "on",
        });
        setShowCreate(false);
        setDuplicateWarning(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editKlient) return;
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateKlientAction(editKlient.id, {
          typ: form.get("typ") as TypKlienta,
          nazev: (form.get("nazev") as string) || "",
          jmeno: (form.get("jmeno") as string) || "",
          prijmeni: (form.get("prijmeni") as string) || "",
          ico: (form.get("ico") as string) || null,
          dic: (form.get("dic") as string) || null,
          email: (form.get("email") as string) || null,
          telefon: (form.get("telefon") as string) || null,
          adresa: (form.get("adresa") as string) || "",
          poznamka: (form.get("poznamka") as string) || null,
          dph_sazba: Number(form.get("dph_sazba")) || 21,
          individualni_sleva_procent: Number(form.get("individualni_sleva_procent")) || 0,
          platba_predem: form.get("platba_predem") === "on",
        });
        setEditKlient(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleDelete() {
    if (!deleteConfirm) return;
    startTransition(async () => {
      try {
        await deleteKlientAction(deleteConfirm.id);
        setDeleteConfirm(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function renderKlientForm(defaults?: Klient) {
    const typ = defaults?.typ || createTyp;
    const isFirma = typ === "firma";

    return (
      <div className="space-y-4">
        {/* Typ selection */}
        <div className="space-y-2">
          <Label>Typ klienta</Label>
          <div className="flex gap-2">
            {(["firma", "fyzicka_osoba"] as TypKlienta[]).map((t) => (
              <label
                key={t}
                className={`flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm transition-colors ${
                  typ === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name="typ"
                  value={t}
                  defaultChecked={typ === t}
                  onChange={() => !defaults && setCreateTyp(t)}
                  className="sr-only"
                />
                {t === "firma" ? <Building2 className="size-4" /> : <User className="size-4" />}
                {t === "firma" ? "Firma" : "Fyzická osoba"}
              </label>
            ))}
          </div>
        </div>

        {/* Fields based on typ */}
        {isFirma ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="nazev">Název firmy *</Label>
              <Input id="nazev" name="nazev" required defaultValue={defaults?.nazev || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ico">IČO</Label>
              <div className="flex gap-2">
                <Input
                  id="ico"
                  name="ico"
                  defaultValue={defaults?.ico || ""}
                  maxLength={8}
                  onBlur={(e) => handleIcoBlur(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] shrink-0"
                  disabled={aresLoading}
                  onClick={(e) => {
                    const form = (e.target as HTMLElement).closest("form");
                    if (form) handleAresLookup(form);
                  }}
                >
                  {aresLoading ? <Loader2 className="size-4 animate-spin" /> : "ARES"}
                </Button>
              </div>
              {duplicateWarning && (
                <p className="text-sm text-amber-600">{duplicateWarning}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dic">DIČ</Label>
              <Input id="dic" name="dic" defaultValue={defaults?.dic || ""} />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="jmeno">Jméno *</Label>
              <Input id="jmeno" name="jmeno" required defaultValue={defaults?.jmeno || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prijmeni">Příjmení *</Label>
              <Input id="prijmeni" name="prijmeni" required defaultValue={defaults?.prijmeni || ""} />
            </div>
          </>
        )}

        {/* Hidden fields for the other typ */}
        {isFirma ? (
          <>
            <input type="hidden" name="jmeno" value="" />
            <input type="hidden" name="prijmeni" value="" />
          </>
        ) : (
          <>
            <input type="hidden" name="nazev" value="" />
            <input type="hidden" name="ico" value="" />
            <input type="hidden" name="dic" value="" />
          </>
        )}

        {/* Common fields */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={defaults?.email || ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefon">Telefon</Label>
          <Input id="telefon" name="telefon" type="tel" defaultValue={defaults?.telefon || ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adresa">Adresa</Label>
          <Input id="adresa" name="adresa" defaultValue={defaults?.adresa || ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="poznamka">Poznámka</Label>
          <textarea
            id="poznamka"
            name="poznamka"
            rows={2}
            defaultValue={defaults?.poznamka || ""}
            className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="dph_sazba">DPH %</Label>
            <Input
              id="dph_sazba"
              name="dph_sazba"
              type="number"
              step="0.01"
              defaultValue={defaults?.dph_sazba ?? 21}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="individualni_sleva_procent">Sleva %</Label>
            <Input
              id="individualni_sleva_procent"
              name="individualni_sleva_procent"
              type="number"
              step="0.01"
              defaultValue={defaults?.individualni_sleva_procent ?? 0}
            />
          </div>
        </div>
        <label className="flex min-h-[44px] items-center gap-3">
          <input
            type="checkbox"
            name="platba_predem"
            className="size-5"
            defaultChecked={defaults?.platba_predem || false}
          />
          <span className="text-sm">Platba předem</span>
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <Button
          onClick={() => {
            setShowCreate(true);
            setError(null);
            setDuplicateWarning(null);
            setCreateTyp("firma");
          }}
          size="sm"
          className="min-h-[44px] gap-2"
        >
          <Plus className="size-4" />
          Přidat
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Hledat klienta..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className="min-h-[44px] pl-9"
        />
      </div>

      {/* Type filter */}
      <div className="flex gap-2">
        {(["all", "firma", "fyzicka_osoba"] as TypFilter[]).map((typ) => (
          <button
            key={typ}
            onClick={() => {
              setTypFilter(typ);
              setVisibleCount(PAGE_SIZE);
            }}
            className={`flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
              typFilter === typ
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {TYP_ICONS[typ]}
            {TYP_LABELS[typ]}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length}{" "}
        {filtered.length === 1
          ? "klient"
          : filtered.length >= 2 && filtered.length <= 4
            ? "klienti"
            : "klientů"}
      </p>

      {/* List */}
      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              {klienti.length === 0
                ? "Zatím žádní klienti"
                : "Žádní klienti neodpovídají filtru"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((k) => (
            <Link key={k.id} href={`/klienti/${k.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between pt-4 pb-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {getDisplayName(k)}
                    </p>
                    {k.ico && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        IČO: {k.ico}
                      </Badge>
                    )}
                    <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                      {k.email && <p className="truncate">{k.email}</p>}
                      {k.telefon && <p>{k.telefon}</p>}
                      {k.adresa && <p className="truncate">{k.adresa}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {k.typ === "firma" ? "Firma" : "FO"}
                    </Badge>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditKlient(k);
                        setError(null);
                      }}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteConfirm(k);
                      }}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <Button
          variant="outline"
          className="w-full min-h-[44px]"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
        >
          Zobrazit další ({filtered.length - visibleCount} zbývá)
        </Button>
      )}

      {/* Create BottomSheet */}
      <BottomSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Nový klient"
        description="Vytvořte nového klienta"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {renderKlientForm()}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full min-h-[44px]"
            disabled={isPending}
          >
            {isPending ? "Vytvářím..." : "Vytvořit klienta"}
          </Button>
        </form>
      </BottomSheet>

      {/* Edit BottomSheet */}
      <BottomSheet
        open={!!editKlient}
        onOpenChange={(open) => !open && setEditKlient(null)}
        title="Upravit klienta"
        description={editKlient ? getDisplayName(editKlient) : ""}
      >
        {editKlient && (
          <form onSubmit={handleEdit} className="space-y-4">
            {renderKlientForm(editKlient)}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full min-h-[44px]"
              disabled={isPending}
            >
              {isPending ? "Ukládám..." : "Uložit změny"}
            </Button>
          </form>
        )}
      </BottomSheet>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat klienta?</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat klienta{" "}
              <strong>{deleteConfirm ? getDisplayName(deleteConfirm) : ""}</strong>?
              Klient bude deaktivován.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="min-h-[44px]"
            >
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="min-h-[44px]"
            >
              {isPending ? "Mažu..." : "Smazat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
