"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  ArrowLeft,
  Building2,
  User,
  Pencil,
  Trash2,
  Plus,
  Star,
  Phone,
  Mail,
} from "lucide-react";
import {
  updateKlientAction,
  deleteKlientAction,
  createKontaktniOsobaAction,
  updateKontaktniOsobaAction,
  deleteKontaktniOsobaAction,
} from "../actions";
import type { Tables } from "@/lib/supabase/database.types";
import type { Database } from "@/lib/supabase/database.types";

type Klient = Tables<"klienti">;
type KontaktniOsoba = Tables<"kontaktni_osoby">;
type TypKlienta = Database["public"]["Enums"]["typ_klienta"];

function getDisplayName(k: Klient): string {
  if (k.typ === "firma") return k.nazev || "Bez názvu";
  return [k.jmeno, k.prijmeni].filter(Boolean).join(" ") || "Bez jména";
}

export function KlientDetail({
  klient,
  kontaktniOsoby,
}: {
  klient: Klient;
  kontaktniOsoby: KontaktniOsoba[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Klient edit/delete
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteKlient, setShowDeleteKlient] = useState(false);

  // Kontaktní osoby
  const [showCreateOsoba, setShowCreateOsoba] = useState(false);
  const [editOsoba, setEditOsoba] = useState<KontaktniOsoba | null>(null);
  const [deleteOsoba, setDeleteOsoba] = useState<KontaktniOsoba | null>(null);

  function handleEditKlient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateKlientAction(klient.id, {
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
        setShowEdit(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleDeleteKlient() {
    startTransition(async () => {
      try {
        await deleteKlientAction(klient.id);
        router.push("/klienti");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleCreateOsoba(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createKontaktniOsobaAction({
          klient_id: klient.id,
          jmeno: (form.get("jmeno") as string) || "",
          funkce: (form.get("funkce") as string) || null,
          telefon: (form.get("telefon") as string) || null,
          email: (form.get("email") as string) || null,
          poznamka: (form.get("poznamka") as string) || null,
          je_primarni: form.get("je_primarni") === "on",
        });
        setShowCreateOsoba(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleEditOsoba(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editOsoba) return;
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateKontaktniOsobaAction(editOsoba.id, klient.id, {
          jmeno: (form.get("jmeno") as string) || "",
          funkce: (form.get("funkce") as string) || null,
          telefon: (form.get("telefon") as string) || null,
          email: (form.get("email") as string) || null,
          poznamka: (form.get("poznamka") as string) || null,
          je_primarni: form.get("je_primarni") === "on",
        });
        setEditOsoba(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleDeleteOsoba() {
    if (!deleteOsoba) return;
    startTransition(async () => {
      try {
        await deleteKontaktniOsobaAction(deleteOsoba.id, klient.id);
        setDeleteOsoba(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function renderOsobaForm(defaults?: KontaktniOsoba) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="osoba-jmeno">Jméno *</Label>
          <Input id="osoba-jmeno" name="jmeno" required defaultValue={defaults?.jmeno || ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="osoba-funkce">Funkce</Label>
          <Input id="osoba-funkce" name="funkce" defaultValue={defaults?.funkce || ""} placeholder="např. Provozní, Jednatel" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="osoba-telefon">Telefon</Label>
          <Input id="osoba-telefon" name="telefon" type="tel" defaultValue={defaults?.telefon || ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="osoba-email">Email</Label>
          <Input id="osoba-email" name="email" type="email" defaultValue={defaults?.email || ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="osoba-poznamka">Poznámka</Label>
          <textarea
            id="osoba-poznamka"
            name="poznamka"
            rows={2}
            defaultValue={defaults?.poznamka || ""}
            className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <label className="flex min-h-[44px] items-center gap-3">
          <input
            type="checkbox"
            name="je_primarni"
            className="size-5"
            defaultChecked={defaults?.je_primarni || false}
          />
          <span className="text-sm">Primární kontakt</span>
        </label>
      </div>
    );
  }

  const isFirma = klient.typ === "firma";

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href="/klienti"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Zpět na seznam
      </Link>

      {/* Klient info card */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            {isFirma ? <Building2 className="size-5" /> : <User className="size-5" />}
            <CardTitle className="text-lg">{getDisplayName(klient)}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {isFirma ? "Firma" : "FO"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {klient.ico && (
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">IČO: {klient.ico}</Badge>
              {klient.dic && <Badge variant="secondary" className="text-xs">DIČ: {klient.dic}</Badge>}
            </div>
          )}

          <div className="space-y-1 text-sm">
            {klient.email && (
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                <a href={`mailto:${klient.email}`} className="text-primary">{klient.email}</a>
              </div>
            )}
            {klient.telefon && (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                <a href={`tel:${klient.telefon}`} className="text-primary">{klient.telefon}</a>
              </div>
            )}
            {klient.adresa && (
              <p className="text-muted-foreground">{klient.adresa}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>DPH: {klient.dph_sazba}%</span>
            {klient.individualni_sleva_procent > 0 && (
              <span>Sleva: {klient.individualni_sleva_procent}%</span>
            )}
            {klient.platba_predem && (
              <Badge variant="outline" className="text-xs">Platba předem</Badge>
            )}
          </div>

          {klient.poznamka && (
            <p className="text-sm text-muted-foreground italic">{klient.poznamka}</p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] gap-2"
              onClick={() => { setShowEdit(true); setError(null); }}
            >
              <Pencil className="size-4" />
              Upravit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] gap-2 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteKlient(true)}
            >
              <Trash2 className="size-4" />
              Smazat
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kontaktní osoby */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Kontaktní osoby</CardTitle>
          <Button
            size="sm"
            className="min-h-[44px] gap-2"
            onClick={() => { setShowCreateOsoba(true); setError(null); }}
          >
            <Plus className="size-4" />
            Přidat
          </Button>
        </CardHeader>
        <CardContent>
          {kontaktniOsoby.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Žádné kontaktní osoby
            </p>
          ) : (
            <div className="space-y-3">
              {kontaktniOsoby.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{o.jmeno}</p>
                      {o.je_primarni && (
                        <Star className="size-4 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </div>
                    {o.funkce && (
                      <p className="text-xs text-muted-foreground">{o.funkce}</p>
                    )}
                    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {o.telefon && (
                        <a href={`tel:${o.telefon}`} className="block text-primary">{o.telefon}</a>
                      )}
                      {o.email && (
                        <a href={`mailto:${o.email}`} className="block text-primary truncate">{o.email}</a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => { setEditOsoba(o); setError(null); }}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => setDeleteOsoba(o)}
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

      {/* Edit Klient BottomSheet */}
      <BottomSheet
        open={showEdit}
        onOpenChange={setShowEdit}
        title="Upravit klienta"
        description={getDisplayName(klient)}
      >
        <form onSubmit={handleEditKlient} className="space-y-4">
          <div className="space-y-4">
            {/* Typ */}
            <input type="hidden" name="typ" value={klient.typ} />

            {isFirma ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-nazev">Název firmy *</Label>
                  <Input id="edit-nazev" name="nazev" required defaultValue={klient.nazev || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-ico">IČO</Label>
                  <Input id="edit-ico" name="ico" defaultValue={klient.ico || ""} maxLength={8} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-dic">DIČ</Label>
                  <Input id="edit-dic" name="dic" defaultValue={klient.dic || ""} />
                </div>
                <input type="hidden" name="jmeno" value="" />
                <input type="hidden" name="prijmeni" value="" />
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-jmeno">Jméno *</Label>
                  <Input id="edit-jmeno" name="jmeno" required defaultValue={klient.jmeno || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-prijmeni">Příjmení *</Label>
                  <Input id="edit-prijmeni" name="prijmeni" required defaultValue={klient.prijmeni || ""} />
                </div>
                <input type="hidden" name="nazev" value="" />
                <input type="hidden" name="ico" value="" />
                <input type="hidden" name="dic" value="" />
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" name="email" type="email" defaultValue={klient.email || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-telefon">Telefon</Label>
              <Input id="edit-telefon" name="telefon" type="tel" defaultValue={klient.telefon || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-adresa">Adresa</Label>
              <Input id="edit-adresa" name="adresa" defaultValue={klient.adresa} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-poznamka">Poznámka</Label>
              <textarea
                id="edit-poznamka"
                name="poznamka"
                rows={2}
                defaultValue={klient.poznamka || ""}
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="edit-dph">DPH %</Label>
                <Input id="edit-dph" name="dph_sazba" type="number" step="0.01" defaultValue={klient.dph_sazba} />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="edit-sleva">Sleva %</Label>
                <Input id="edit-sleva" name="individualni_sleva_procent" type="number" step="0.01" defaultValue={klient.individualni_sleva_procent} />
              </div>
            </div>
            <label className="flex min-h-[44px] items-center gap-3">
              <input type="checkbox" name="platba_predem" className="size-5" defaultChecked={klient.platba_predem} />
              <span className="text-sm">Platba předem</span>
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
            {isPending ? "Ukládám..." : "Uložit změny"}
          </Button>
        </form>
      </BottomSheet>

      {/* Delete Klient Dialog */}
      <Dialog open={showDeleteKlient} onOpenChange={setShowDeleteKlient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat klienta?</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat klienta <strong>{getDisplayName(klient)}</strong>?
              Klient bude deaktivován.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteKlient(false)} className="min-h-[44px]">
              Zrušit
            </Button>
            <Button variant="destructive" onClick={handleDeleteKlient} disabled={isPending} className="min-h-[44px]">
              {isPending ? "Mažu..." : "Smazat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Kontaktní osoba BottomSheet */}
      <BottomSheet
        open={showCreateOsoba}
        onOpenChange={setShowCreateOsoba}
        title="Nová kontaktní osoba"
        description="Přidejte kontaktní osobu ke klientovi"
      >
        <form onSubmit={handleCreateOsoba} className="space-y-4">
          {renderOsobaForm()}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
            {isPending ? "Vytvářím..." : "Přidat kontakt"}
          </Button>
        </form>
      </BottomSheet>

      {/* Edit Kontaktní osoba BottomSheet */}
      <BottomSheet
        open={!!editOsoba}
        onOpenChange={(open) => !open && setEditOsoba(null)}
        title="Upravit kontakt"
        description={editOsoba?.jmeno || ""}
      >
        {editOsoba && (
          <form onSubmit={handleEditOsoba} className="space-y-4">
            {renderOsobaForm(editOsoba)}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
              {isPending ? "Ukládám..." : "Uložit změny"}
            </Button>
          </form>
        )}
      </BottomSheet>

      {/* Delete Kontaktní osoba Dialog */}
      <Dialog open={!!deleteOsoba} onOpenChange={(open) => !open && setDeleteOsoba(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat kontakt?</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat kontaktní osobu <strong>{deleteOsoba?.jmeno}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOsoba(null)} className="min-h-[44px]">
              Zrušit
            </Button>
            <Button variant="destructive" onClick={handleDeleteOsoba} disabled={isPending} className="min-h-[44px]">
              {isPending ? "Mažu..." : "Smazat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
