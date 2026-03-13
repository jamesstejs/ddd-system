"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { ROLE_LABELS } from "@/types/roles";
import { POBOCKY, POBOCKA_LABELS } from "@/types/pobocky";
import {
  createUserAction,
  updateUserAction,
  deleteUserAction,
  getPobockyForTechnikAction,
} from "./actions";
import { DostupnostSheet } from "./DostupnostSheet";
import type { Tables } from "@/lib/supabase/database.types";
import type { AppRole } from "@/lib/auth";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";

type Profile = Tables<"profiles">;

const ALL_ROLES: AppRole[] = ["super_admin", "admin", "technik", "klient"];

export function UserList({ profiles }: { profiles: Profile[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Profile | null>(null);
  const [smenyTechnik, setSmenyTechnik] = useState<Profile | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Multi-region state for create/edit forms
  const [selectedPobocky, setSelectedPobocky] = useState<string[]>([]);

  // Load pobocky when editing
  useEffect(() => {
    if (editUser && editUser.role.includes("technik")) {
      getPobockyForTechnikAction(editUser.id).then(setSelectedPobocky).catch(() => {
        setSelectedPobocky(editUser.pobocka ? [editUser.pobocka] : []);
      });
    } else {
      setSelectedPobocky([]);
    }
  }, [editUser]);

  const togglePobocka = useCallback((value: string) => {
    setSelectedPobocky((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value],
    );
  }, []);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const selectedRoles = ALL_ROLES.filter(
      (r) => form.get(`role_${r}`) === "on",
    );

    if (selectedRoles.length === 0) {
      setError("Vyberte alespoň jednu roli");
      return;
    }

    const isTechnik = selectedRoles.includes("technik");
    const koefRaw = form.get("koeficient_rychlosti") as string;
    const hodinyRaw = form.get("pozadovane_hodiny_tyden") as string;
    const dnyRaw = form.get("pozadovane_dny_tyden") as string;

    startTransition(async () => {
      try {
        await createUserAction({
          email: form.get("email") as string,
          password: form.get("password") as string,
          jmeno: form.get("jmeno") as string,
          prijmeni: form.get("prijmeni") as string,
          telefon: form.get("telefon") as string,
          role: selectedRoles,
          pobocka: selectedPobocky[0] || null,
          pobocky: selectedPobocky,
          koeficient_rychlosti: isTechnik && koefRaw ? parseFloat(koefRaw) : 1.0,
          pozadovane_hodiny_tyden: isTechnik && hodinyRaw ? parseFloat(hodinyRaw) : null,
          pozadovane_dny_tyden: isTechnik && dnyRaw ? parseInt(dnyRaw) : null,
        });
        setShowCreate(false);
        setSelectedPobocky([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editUser) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    const selectedRoles = ALL_ROLES.filter(
      (r) => form.get(`role_${r}`) === "on",
    );

    if (selectedRoles.length === 0) {
      setError("Vyberte alespoň jednu roli");
      return;
    }

    const isTechnik = selectedRoles.includes("technik");
    const koefRaw = form.get("koeficient_rychlosti") as string;
    const hodinyRaw = form.get("pozadovane_hodiny_tyden") as string;
    const dnyRaw = form.get("pozadovane_dny_tyden") as string;

    startTransition(async () => {
      try {
        await updateUserAction(editUser.id, {
          jmeno: form.get("jmeno") as string,
          prijmeni: form.get("prijmeni") as string,
          telefon: form.get("telefon") as string,
          role: selectedRoles,
          pobocka: selectedPobocky[0] || null,
          pobocky: selectedPobocky,
          koeficient_rychlosti: isTechnik && koefRaw ? parseFloat(koefRaw) : undefined,
          pozadovane_hodiny_tyden: isTechnik && hodinyRaw ? parseFloat(hodinyRaw) : null,
          pozadovane_dny_tyden: isTechnik && dnyRaw ? parseInt(dnyRaw) : null,
        });
        setEditUser(null);
        setSelectedPobocky([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleDelete() {
    if (!deleteConfirm) return;
    startTransition(async () => {
      try {
        await deleteUserAction(deleteConfirm.id);
        setDeleteConfirm(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  const isTechnikRole = (roles: AppRole[]) => roles.includes("technik");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {profiles.length} uživatelů
        </p>
        <Button
          onClick={() => {
            setShowCreate(true);
            setSelectedPobocky([]);
          }}
          size="sm"
          className="min-h-[44px] gap-2"
        >
          <Plus className="size-4" />
          Přidat
        </Button>
      </div>

      <div className="space-y-3">
        {profiles.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-center justify-between pt-4 pb-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {p.jmeno} {p.prijmeni}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {p.email}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.role.map((r) => (
                    <Badge key={r} variant="secondary" className="text-xs">
                      {ROLE_LABELS[r]}
                    </Badge>
                  ))}
                  {p.pobocka && (
                    <Badge variant="outline" className="text-xs">
                      {POBOCKA_LABELS[p.pobocka as keyof typeof POBOCKA_LABELS] || p.pobocka}
                    </Badge>
                  )}
                  {p.role.includes("technik") && p.pozadovane_hodiny_tyden && (
                    <Badge variant="outline" className="text-xs text-blue-600">
                      {p.pozadovane_hodiny_tyden}h/týden
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                {p.role.includes("technik") && (
                  <button
                    onClick={() => setSmenyTechnik(p)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center text-blue-600 hover:text-blue-800"
                    title="Směny"
                  >
                    <CalendarDays className="size-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditUser(p);
                    setError(null);
                  }}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(p)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create User BottomSheet */}
      <BottomSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Nový uživatel"
        description="Vytvořte nový uživatelský účet"
      >
        <CreateEditForm
          mode="create"
          onSubmit={handleCreate}
          isPending={isPending}
          error={error}
          selectedPobocky={selectedPobocky}
          onTogglePobocka={togglePobocka}
        />
      </BottomSheet>

      {/* Edit User BottomSheet */}
      <BottomSheet
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
        title="Upravit uživatele"
        description={editUser ? `${editUser.jmeno} ${editUser.prijmeni}` : ""}
      >
        {editUser && (
          <CreateEditForm
            mode="edit"
            profile={editUser}
            onSubmit={handleEdit}
            isPending={isPending}
            error={error}
            selectedPobocky={selectedPobocky}
            onTogglePobocka={togglePobocka}
          />
        )}
      </BottomSheet>

      {/* Směny Sheet */}
      {smenyTechnik && (
        <DostupnostSheet
          open={!!smenyTechnik}
          onOpenChange={(open) => !open && setSmenyTechnik(null)}
          technik={smenyTechnik}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat uživatele?</DialogTitle>
            <DialogDescription>
              Opravdu chcete deaktivovat uživatele{" "}
              <strong>
                {deleteConfirm?.jmeno} {deleteConfirm?.prijmeni}
              </strong>
              ? Uživatel se nebude moci přihlásit.
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

// ---------------------------------------------------------------
// Shared Create/Edit form
// ---------------------------------------------------------------
function CreateEditForm({
  mode,
  profile,
  onSubmit,
  isPending,
  error,
  selectedPobocky,
  onTogglePobocka,
}: {
  mode: "create" | "edit";
  profile?: Profile;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  error: string | null;
  selectedPobocky: string[];
  onTogglePobocka: (value: string) => void;
}) {
  const [showTechnikFields, setShowTechnikFields] = useState(
    profile ? profile.role.includes("technik") : true,
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "create" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="create-email">Email</Label>
            <Input
              id="create-email"
              name="email"
              type="email"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-password">Heslo</Label>
            <Input
              id="create-password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor={`${mode}-jmeno`}>Jméno</Label>
        <Input
          id={`${mode}-jmeno`}
          name="jmeno"
          required
          defaultValue={profile?.jmeno}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${mode}-prijmeni`}>Příjmení</Label>
        <Input
          id={`${mode}-prijmeni`}
          name="prijmeni"
          required
          defaultValue={profile?.prijmeni}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${mode}-telefon`}>Telefon</Label>
        <Input
          id={`${mode}-telefon`}
          name="telefon"
          type="tel"
          defaultValue={profile?.telefon || ""}
        />
      </div>

      {/* Role checkboxes */}
      <div className="space-y-2">
        <Label>Role</Label>
        <div className="space-y-2">
          {ALL_ROLES.map((role) => (
            <label
              key={role}
              className="flex min-h-[44px] items-center gap-3"
            >
              <input
                type="checkbox"
                name={`role_${role}`}
                className="size-5"
                defaultChecked={
                  profile ? profile.role.includes(role) : role === "technik"
                }
                onChange={(e) => {
                  if (role === "technik") setShowTechnikFields(e.target.checked);
                }}
              />
              <span className="text-sm">{ROLE_LABELS[role]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Multi-region checkboxes */}
      <div className="space-y-2">
        <Label>Kraje (pobočky)</Label>
        <p className="text-xs text-muted-foreground">
          Technik bude viditelný v dispečinku pro vybrané kraje
        </p>
        <div className="grid grid-cols-2 gap-1">
          {POBOCKY.map((p) => (
            <label
              key={p.value}
              className="flex min-h-[40px] items-center gap-2 rounded-lg border px-2 py-1"
            >
              <input
                type="checkbox"
                className="size-4"
                checked={selectedPobocky.includes(p.value)}
                onChange={() => onTogglePobocka(p.value)}
              />
              <span className="text-xs">{p.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Technik-specific fields */}
      {showTechnikFields && (
        <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-medium text-blue-800">
            Nastavení technika
          </p>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-koeficient`}>
              Koeficient rychlosti
            </Label>
            <Input
              id={`${mode}-koeficient`}
              name="koeficient_rychlosti"
              type="number"
              step="0.1"
              min="0.1"
              max="3.0"
              defaultValue={profile?.koeficient_rychlosti ?? 1.0}
              className="bg-white"
            />
            <p className="text-xs text-muted-foreground">
              1.0 = standard, 0.5 = pomalejší, 1.5 = rychlejší
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-hodiny`}>
              Požadované hodiny/týden
            </Label>
            <Input
              id={`${mode}-hodiny`}
              name="pozadovane_hodiny_tyden"
              type="number"
              step="0.5"
              min="0"
              max="60"
              defaultValue={profile?.pozadovane_hodiny_tyden ?? ""}
              placeholder="např. 16"
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-dny`}>
              Požadované dny/týden
            </Label>
            <Input
              id={`${mode}-dny`}
              name="pozadovane_dny_tyden"
              type="number"
              min="1"
              max="7"
              defaultValue={profile?.pozadovane_dny_tyden ?? ""}
              placeholder="např. 3"
              className="bg-white"
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        className="w-full min-h-[44px]"
        disabled={isPending}
      >
        {isPending
          ? mode === "create"
            ? "Vytvářím..."
            : "Ukládám..."
          : mode === "create"
            ? "Vytvořit uživatele"
            : "Uložit změny"}
      </Button>
    </form>
  );
}
