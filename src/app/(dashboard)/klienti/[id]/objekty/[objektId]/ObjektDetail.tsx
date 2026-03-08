"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  MapPin,
  Pencil,
  Trash2,
  Plus,
  Upload,
  X,
  Image as ImageIcon,
  Calculator,
} from "lucide-react";
import {
  updateObjektAction,
  deleteObjektAction,
  uploadPlanekAction,
  deletePlanekAction,
  createOkruhAction,
  updateOkruhAction,
  deleteOkruhAction,
} from "../actions";
import { vypocitejBodyAction } from "../kalkulacka-actions";
import type { VysledekKalkulacky } from "@/lib/kalkulacka/vypocetBodu";
import type { Tables } from "@/lib/supabase/database.types";
import type { Database } from "@/lib/supabase/database.types";

type Klient = Tables<"klienti">;
type Objekt = Tables<"objekty">;
type Okruh = Tables<"okruhy">;
type TypObjektu = Database["public"]["Enums"]["typ_objektu"];
type TypZasahuKalkulacka = Database["public"]["Enums"]["typ_zasahu_kalkulacka"];

const TYP_OBJEKTU_LABELS: Record<TypObjektu, string> = {
  gastro: "Gastro",
  sklad_nevyzivocisna: "Sklad (neživočišný)",
  sklad_zivocisna: "Sklad (živočišný)",
  domacnost: "Domácnost",
  kancelar: "Kancelář",
  skola: "Škola",
  hotel: "Hotel",
  nemocnice: "Nemocnice",
  ubytovna: "Ubytovna",
  vyrobni_hala: "Výrobní hala",
  jiny: "Jiný",
};

const TYP_ZASAHU_LABELS: Record<TypZasahuKalkulacka, string> = {
  vnitrni_deratizace: "Vnitřní deratizace",
  vnejsi_deratizace: "Vnější deratizace",
  vnitrni_dezinsekce: "Vnitřní dezinsekce",
  postrik: "Postřik",
};

function getKlientDisplayName(k: Klient): string {
  if (k.typ === "firma") return k.nazev || "Bez názvu";
  return [k.jmeno, k.prijmeni].filter(Boolean).join(" ") || "Bez jména";
}

export function ObjektDetail({
  klient,
  objekt,
  okruhy,
}: {
  klient: Klient;
  objekt: Objekt;
  okruhy: Okruh[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Objekt edit/delete
  const [showEditObjekt, setShowEditObjekt] = useState(false);
  const [showDeleteObjekt, setShowDeleteObjekt] = useState(false);

  // Okruhy
  const [showCreateOkruh, setShowCreateOkruh] = useState(false);
  const [editOkruh, setEditOkruh] = useState<Okruh | null>(null);
  const [deleteOkruhState, setDeleteOkruhState] = useState<Okruh | null>(null);

  // Kalkulačka bodů
  const [kalkulackaTypZasahu, setKalkulackaTypZasahu] = useState<TypZasahuKalkulacka>("vnitrni_deratizace");
  const [kalkulackaPlocha, setKalkulackaPlocha] = useState<string>(
    objekt.plocha_m2 ? String(objekt.plocha_m2) : ""
  );
  const [kalkulackaVysledek, setKalkulackaVysledek] = useState<VysledekKalkulacky | null>(null);
  const [kalkulackaError, setKalkulackaError] = useState<string | null>(null);

  // --- Objekt handlers ---

  function handleEditObjekt(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateObjektAction(objekt.id, klient.id, {
          nazev: (form.get("nazev") as string) || "",
          adresa: (form.get("adresa") as string) || "",
          typ_objektu: (form.get("typ_objektu") as TypObjektu) || "jiny",
          plocha_m2: form.get("plocha_m2") ? Number(form.get("plocha_m2")) : null,
          poznamka: (form.get("poznamka") as string) || null,
        });
        setShowEditObjekt(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleDeleteObjekt() {
    startTransition(async () => {
      try {
        await deleteObjektAction(objekt.id, klient.id);
        router.push(`/klienti/${klient.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  // --- Kalkulačka handler ---

  function handleVypocitatBody() {
    const plocha = Number(kalkulackaPlocha);
    if (!plocha || plocha <= 0) {
      setKalkulackaError("Zadejte platnou plochu v m²");
      setKalkulackaVysledek(null);
      return;
    }
    setKalkulackaError(null);
    startTransition(async () => {
      try {
        const result = await vypocitejBodyAction(
          objekt.typ_objektu,
          plocha,
          kalkulackaTypZasahu,
        );
        setKalkulackaVysledek(result);
        if (!result) {
          setKalkulackaError("Pro tento typ objektu a zásahu nejsou šablony");
        }
      } catch (err) {
        setKalkulackaError(err instanceof Error ? err.message : "Chyba výpočtu");
        setKalkulackaVysledek(null);
      }
    });
  }

  // --- Plánek handlers ---

  function handleUploadPlanek(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      try {
        await uploadPlanekAction(objekt.id, klient.id, formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleDeletePlanek() {
    setError(null);
    startTransition(async () => {
      try {
        await deletePlanekAction(objekt.id, klient.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  // --- Okruhy handlers ---

  function handleCreateOkruh(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createOkruhAction(
          {
            objekt_id: objekt.id,
            nazev: (form.get("nazev") as string) || "",
          },
          klient.id
        );
        setShowCreateOkruh(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleEditOkruh(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editOkruh) return;
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateOkruhAction(
          editOkruh.id,
          objekt.id,
          klient.id,
          { nazev: (form.get("nazev") as string) || "" }
        );
        setEditOkruh(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleDeleteOkruh() {
    if (!deleteOkruhState) return;
    startTransition(async () => {
      try {
        await deleteOkruhAction(deleteOkruhState.id, objekt.id, klient.id);
        setDeleteOkruhState(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href="/klienti"
          className="inline-flex min-h-[44px] items-center hover:text-foreground"
        >
          Klienti
        </Link>
        <span>/</span>
        <Link
          href={`/klienti/${klient.id}`}
          className="inline-flex min-h-[44px] items-center hover:text-foreground truncate max-w-[150px]"
        >
          {getKlientDisplayName(klient)}
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[150px]">{objekt.nazev || "Objekt"}</span>
      </div>

      <Link
        href={`/klienti/${klient.id}`}
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Zpět na klienta
      </Link>

      {/* Objekt info card */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <MapPin className="size-5" />
            <CardTitle className="text-lg">{objekt.nazev || "Bez názvu"}</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {TYP_OBJEKTU_LABELS[objekt.typ_objektu as TypObjektu] || objekt.typ_objektu}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {objekt.adresa && (
            <p className="text-sm text-muted-foreground">{objekt.adresa}</p>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {objekt.plocha_m2 && (
              <Badge variant="outline" className="text-xs">{objekt.plocha_m2} m²</Badge>
            )}
          </div>

          {objekt.poznamka && (
            <p className="text-sm text-muted-foreground italic">{objekt.poznamka}</p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] gap-2"
              onClick={() => { setShowEditObjekt(true); setError(null); }}
            >
              <Pencil className="size-4" />
              Upravit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] gap-2 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteObjekt(true)}
            >
              <Trash2 className="size-4" />
              Smazat
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plánek */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Plánek objektu</CardTitle>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadPlanek}
            />
            <Button
              size="sm"
              variant="outline"
              className="min-h-[44px] gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
            >
              <Upload className="size-4" />
              {objekt.planek_url ? "Nahradit" : "Nahrát"}
            </Button>
            {objekt.planek_url && (
              <Button
                size="sm"
                variant="outline"
                className="min-h-[44px] gap-2 text-destructive hover:text-destructive"
                onClick={handleDeletePlanek}
                disabled={isPending}
              >
                <X className="size-4" />
                Smazat
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {objekt.planek_url ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
              <Image
                src={objekt.planek_url}
                alt={`Plánek - ${objekt.nazev}`}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-muted-foreground">
              <ImageIcon className="size-8 mb-2" />
              <p className="text-sm">Žádný plánek</p>
              <p className="text-xs mt-1">Nahrajte obrázek plánku objektu</p>
            </div>
          )}
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* Kalkulačka bodů */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="size-4" />
            Kalkulačka bodů
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {TYP_OBJEKTU_LABELS[objekt.typ_objektu]}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kalkulacka-typ-zasahu">Typ zásahu</Label>
            <Select
              value={kalkulackaTypZasahu}
              onValueChange={(v) => {
                setKalkulackaTypZasahu(v as TypZasahuKalkulacka);
                setKalkulackaVysledek(null);
                setKalkulackaError(null);
              }}
            >
              <SelectTrigger id="kalkulacka-typ-zasahu" className="min-h-[44px]">
                <SelectValue placeholder="Vyberte typ zásahu" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(TYP_ZASAHU_LABELS) as [TypZasahuKalkulacka, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kalkulacka-plocha">Plocha (m²)</Label>
            <Input
              id="kalkulacka-plocha"
              type="number"
              min="1"
              step="1"
              value={kalkulackaPlocha}
              onChange={(e) => {
                setKalkulackaPlocha(e.target.value);
                setKalkulackaVysledek(null);
                setKalkulackaError(null);
              }}
              placeholder="Zadejte plochu v m²"
              className="min-h-[44px]"
            />
          </div>

          <Button
            className="w-full min-h-[44px] gap-2"
            onClick={handleVypocitatBody}
            disabled={isPending}
          >
            <Calculator className="size-4" />
            Spočítat body
          </Button>

          {kalkulackaError && (
            <p className="text-sm text-muted-foreground text-center">
              {kalkulackaError}
            </p>
          )}

          {kalkulackaVysledek && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <p className="text-sm font-medium text-center">
                Doporučený počet bodů
                {kalkulackaVysledek.pouzit_vzorec && (
                  <span className="text-muted-foreground font-normal"> (vzorec)</span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {kalkulackaVysledek.bod_s_mys > 0 && (
                  <div className="rounded-md border bg-background p-3 text-center">
                    <p className="text-2xl font-bold">{kalkulackaVysledek.bod_s_mys}</p>
                    <p className="text-xs text-muted-foreground">Bod S (myš)</p>
                  </div>
                )}
                {kalkulackaVysledek.bod_l_potkan > 0 && (
                  <div className="rounded-md border bg-background p-3 text-center">
                    <p className="text-2xl font-bold">{kalkulackaVysledek.bod_l_potkan}</p>
                    <p className="text-xs text-muted-foreground">Bod L (potkan)</p>
                  </div>
                )}
                {kalkulackaVysledek.zivolovna > 0 && (
                  <div className="rounded-md border bg-background p-3 text-center">
                    <p className="text-2xl font-bold">{kalkulackaVysledek.zivolovna}</p>
                    <p className="text-xs text-muted-foreground">Živolovná past</p>
                  </div>
                )}
                {kalkulackaVysledek.letajici > 0 && (
                  <div className="rounded-md border bg-background p-3 text-center">
                    <p className="text-2xl font-bold">{kalkulackaVysledek.letajici}</p>
                    <p className="text-xs text-muted-foreground">Létající hmyz</p>
                  </div>
                )}
                {kalkulackaVysledek.lezouci > 0 && (
                  <div className="rounded-md border bg-background p-3 text-center">
                    <p className="text-2xl font-bold">{kalkulackaVysledek.lezouci}</p>
                    <p className="text-xs text-muted-foreground">Lezoucí hmyz</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Okruhy */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Okruhy</CardTitle>
          <Button
            size="sm"
            className="min-h-[44px] gap-2"
            onClick={() => { setShowCreateOkruh(true); setError(null); }}
          >
            <Plus className="size-4" />
            Přidat
          </Button>
        </CardHeader>
        <CardContent>
          {okruhy.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Žádné okruhy
            </p>
          ) : (
            <div className="space-y-3">
              {okruhy.map((okruh) => (
                <div
                  key={okruh.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <p className="font-medium text-sm truncate">{okruh.nazev || "Bez názvu"}</p>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => { setEditOkruh(okruh); setError(null); }}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => setDeleteOkruhState(okruh)}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Objekt BottomSheet */}
      <BottomSheet
        open={showEditObjekt}
        onOpenChange={setShowEditObjekt}
        title="Upravit objekt"
        description={objekt.nazev || "Objekt"}
      >
        <form onSubmit={handleEditObjekt} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-obj-nazev">Název objektu *</Label>
              <Input id="edit-obj-nazev" name="nazev" required defaultValue={objekt.nazev || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-obj-adresa">Adresa *</Label>
              <Input id="edit-obj-adresa" name="adresa" required defaultValue={objekt.adresa || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-obj-typ">Typ objektu</Label>
              <select
                id="edit-obj-typ"
                name="typ_objektu"
                defaultValue={objekt.typ_objektu}
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base"
              >
                {Object.entries(TYP_OBJEKTU_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-obj-plocha">Plocha (m²)</Label>
              <Input
                id="edit-obj-plocha"
                name="plocha_m2"
                type="number"
                step="0.01"
                min="0"
                defaultValue={objekt.plocha_m2 ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-obj-poznamka">Poznámka</Label>
              <textarea
                id="edit-obj-poznamka"
                name="poznamka"
                rows={2}
                defaultValue={objekt.poznamka || ""}
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
            {isPending ? "Ukládám..." : "Uložit změny"}
          </Button>
        </form>
      </BottomSheet>

      {/* Delete Objekt Dialog */}
      <Dialog open={showDeleteObjekt} onOpenChange={setShowDeleteObjekt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat objekt?</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat objekt <strong>{objekt.nazev}</strong>?
              Objekt bude deaktivován.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteObjekt(false)} className="min-h-[44px]">
              Zrušit
            </Button>
            <Button variant="destructive" onClick={handleDeleteObjekt} disabled={isPending} className="min-h-[44px]">
              {isPending ? "Mažu..." : "Smazat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Okruh BottomSheet */}
      <BottomSheet
        open={showCreateOkruh}
        onOpenChange={setShowCreateOkruh}
        title="Nový okruh"
        description="Přidejte okruh k objektu"
      >
        <form onSubmit={handleCreateOkruh} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="okruh-nazev">Název okruhu *</Label>
            <Input id="okruh-nazev" name="nazev" required placeholder="např. Kuchyně, Sklad, Venkovní" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
            {isPending ? "Vytvářím..." : "Přidat okruh"}
          </Button>
        </form>
      </BottomSheet>

      {/* Edit Okruh BottomSheet */}
      <BottomSheet
        open={!!editOkruh}
        onOpenChange={(open) => !open && setEditOkruh(null)}
        title="Upravit okruh"
        description={editOkruh?.nazev || ""}
      >
        {editOkruh && (
          <form onSubmit={handleEditOkruh} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-okruh-nazev">Název okruhu *</Label>
              <Input
                id="edit-okruh-nazev"
                name="nazev"
                required
                defaultValue={editOkruh.nazev || ""}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
              {isPending ? "Ukládám..." : "Uložit změny"}
            </Button>
          </form>
        )}
      </BottomSheet>

      {/* Delete Okruh Dialog */}
      <Dialog open={!!deleteOkruhState} onOpenChange={(open) => !open && setDeleteOkruhState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat okruh?</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat okruh <strong>{deleteOkruhState?.nazev}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOkruhState(null)} className="min-h-[44px]">
              Zrušit
            </Button>
            <Button variant="destructive" onClick={handleDeleteOkruh} disabled={isPending} className="min-h-[44px]">
              {isPending ? "Mažu..." : "Smazat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
