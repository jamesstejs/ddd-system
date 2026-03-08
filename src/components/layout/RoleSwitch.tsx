"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppRole } from "@/lib/auth";
import { ROLE_LABELS } from "@/types/roles";
import { switchRoleAction } from "@/app/(dashboard)/actions";

export function RoleSwitch({
  roles,
  aktivniRole,
}: {
  roles: AppRole[];
  aktivniRole: AppRole;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSwitch(role: AppRole) {
    if (role === aktivniRole) return;
    startTransition(async () => {
      await switchRoleAction(role);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex min-h-[44px] min-w-[44px] items-center justify-center">
          <Badge variant="secondary" className="cursor-pointer">
            {isPending ? "..." : ROLE_LABELS[aktivniRole]}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {roles.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => handleSwitch(role)}
            className="min-h-[44px]"
            disabled={role === aktivniRole}
          >
            {ROLE_LABELS[role]}
            {role === aktivniRole && " ✓"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
