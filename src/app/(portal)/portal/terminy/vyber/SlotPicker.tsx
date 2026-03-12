"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAvailableSlotsAction, bookSlotAction } from "../actions";
import { useRouter } from "next/navigation";

type Slot = {
  datum: string;
  cas_od: string;
  cas_do: string;
};

export default function SlotPicker({
  pripominkaId,
  zakazkaId,
  technikId,
  objektNazev,
}: {
  pripominkaId: string;
  zakazkaId: string;
  technikId: string;
  objektNazev: string;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isPending, startTransition] = useTransition();
  const [booked, setBooked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadSlots() {
      try {
        setLoading(true);
        const result = await getAvailableSlotsAction(technikId);
        setSlots(result);
      } catch (e) {
        setError("Nepodařilo se načíst dostupné termíny.");
      } finally {
        setLoading(false);
      }
    }
    loadSlots();
  }, [technikId]);

  const handleBook = () => {
    if (!selectedSlot) return;
    setError(null);

    startTransition(async () => {
      try {
        await bookSlotAction({
          pripominkaId,
          zakazkaId,
          technikId,
          datum: selectedSlot.datum,
          casOd: selectedSlot.cas_od,
          casDo: selectedSlot.cas_do,
        });
        setBooked(true);
        setTimeout(() => router.push("/portal/terminy"), 2000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Nepodařilo se zarezervovat termín.");
      }
    });
  };

  const formatDatum = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("cs-CZ", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const formatCas = (c: string) => c.substring(0, 5);

  // Group slots by date
  const slotsByDate = new Map<string, Slot[]>();
  for (const s of slots) {
    const existing = slotsByDate.get(s.datum) ?? [];
    existing.push(s);
    slotsByDate.set(s.datum, existing);
  }

  if (booked) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-6 text-center">
          <p className="text-lg font-semibold text-green-800">✓ Termín úspěšně zarezervován!</p>
          <p className="mt-1 text-sm text-green-700">
            Přesměrování na přehled termínů...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">Načítání dostupných termínů...</p>
        </CardContent>
      </Card>
    );
  }

  if (slots.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Momentálně nejsou k dispozici žádné volné termíny.
            Technik ještě nevyplnil svou dostupnost.
            Budeme vás informovat, jakmile budou termíny k dispozici.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {Array.from(slotsByDate.entries()).map(([datum, daySlots]) => (
        <div key={datum} className="space-y-2">
          <p className="text-sm font-medium capitalize">{formatDatum(datum)}</p>
          <div className="flex flex-wrap gap-2">
            {daySlots.map((s) => {
              const isSelected =
                selectedSlot?.datum === s.datum &&
                selectedSlot?.cas_od === s.cas_od;
              return (
                <button
                  key={`${s.datum}-${s.cas_od}`}
                  onClick={() => setSelectedSlot(s)}
                  className={`min-h-[44px] rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-gray-200 bg-white text-foreground hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  {formatCas(s.cas_od)} – {formatCas(s.cas_do)}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selectedSlot && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Vybraný termín:</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {formatDatum(selectedSlot.datum)}, {formatCas(selectedSlot.cas_od)} – {formatCas(selectedSlot.cas_do)}
                </p>
              </div>
              <Button
                onClick={handleBook}
                disabled={isPending}
                className="min-h-[44px]"
              >
                {isPending ? "Rezervuji..." : "Potvrdit termín"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
