"use client";

import { useState, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  uploadProtokolFotoAction,
  deleteProtokolFotoAction,
} from "./protokolActions";

type FotoData = {
  id: string;
  soubor_url: string;
  popis: string | null;
};

type Props = {
  protokolId: string;
  initialFotky: FotoData[];
  isReadonly: boolean;
};

/**
 * Fotodokumentace — upload fotek z kamery / galerie, zobrazení thumbnails, mazání.
 */
export function FotoSection({ protokolId, initialFotky, isReadonly }: Props) {
  const [fotky, setFotky] = useState<FotoData[]>(initialFotky);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert("Soubor je příliš velký (max 5 MB)");
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("Povoleny jsou pouze obrázky");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadProtokolFotoAction(protokolId, formData);
        setFotky((prev) => [
          ...prev,
          { id: result.id, soubor_url: result.soubor_url, popis: null },
        ]);
      } catch (err) {
        console.error("Chyba při nahrávání fotky:", err);
        alert(err instanceof Error ? err.message : "Chyba při nahrávání");
      }
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    // Upload each file
    Array.from(files).forEach((file) => handleUpload(file));
    // Reset input
    e.target.value = "";
  }

  function handleDelete(fotoId: string) {
    setDeletingId(fotoId);
    startTransition(async () => {
      try {
        await deleteProtokolFotoAction(fotoId, protokolId);
        setFotky((prev) => prev.filter((f) => f.id !== fotoId));
      } catch (err) {
        console.error("Chyba při mazání fotky:", err);
        alert(err instanceof Error ? err.message : "Chyba při mazání");
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        Fotodokumentace
      </h3>

      {/* Upload tlačítka */}
      {!isReadonly && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] flex-1 active:bg-muted/70"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isPending}
          >
            📷 Vyfotit
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] flex-1 active:bg-muted/70"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
          >
            📁 Nahrát
          </Button>

          {/* Skryté inputy */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Uploading indicator */}
      {isPending && !deletingId && (
        <p className="text-xs text-muted-foreground animate-pulse">
          Nahrávám…
        </p>
      )}

      {/* Gallery */}
      {fotky.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {fotky.map((foto) => (
            <div key={foto.id} className="relative group">
              <img
                src={foto.soubor_url}
                alt={foto.popis || "Fotodokumentace"}
                className="w-full aspect-square object-cover rounded-lg border border-muted"
                loading="lazy"
              />
              {!isReadonly && (
                <button
                  type="button"
                  onClick={() => handleDelete(foto.id)}
                  disabled={deletingId === foto.id}
                  className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white text-xs font-bold active:bg-black/80 min-h-[44px] min-w-[44px] -mt-2 -mr-2"
                  aria-label="Smazat fotku"
                >
                  {deletingId === foto.id ? "…" : "✕"}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Žádné fotky.
        </p>
      )}
    </div>
  );
}
