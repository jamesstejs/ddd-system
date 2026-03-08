"use client";

import dynamic from "next/dynamic";
import type { Tables } from "@/lib/supabase/database.types";

type Profile = Tables<"profiles">;

const TopBar = dynamic(
  () => import("@/components/layout/TopBar").then((m) => m.TopBar),
  {
    ssr: false,
    loading: () => (
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="flex items-center gap-1">
          <div className="size-8 animate-pulse rounded-full bg-muted" />
        </div>
      </header>
    ),
  }
);

export function TopBarWrapper({ profile }: { profile: Profile }) {
  return <TopBar profile={profile} />;
}
