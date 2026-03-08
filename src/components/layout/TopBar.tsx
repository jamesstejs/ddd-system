"use client";

import { usePathname } from "next/navigation";
import { RoleSwitch } from "./RoleSwitch";
import { UserMenu } from "./UserMenu";
import { PAGE_TITLES } from "@/types/roles";
import type { Tables } from "@/lib/supabase/database.types";

type Profile = Tables<"profiles">;

export function TopBar({ profile }: { profile: Profile }) {
  const pathname = usePathname();

  const title =
    PAGE_TITLES[pathname] ||
    PAGE_TITLES[
      Object.keys(PAGE_TITLES).find(
        (k) => k !== "/" && pathname.startsWith(k)
      ) || "/"
    ] ||
    "DDD Systém";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-1">
        {profile.role.length > 1 && (
          <RoleSwitch
            roles={profile.role}
            aktivniRole={profile.aktivni_role}
          />
        )}
        <UserMenu profile={profile} />
      </div>
    </header>
  );
}
