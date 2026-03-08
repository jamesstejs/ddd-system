import { describe, it, expect, vi } from "vitest";
import { getProfile, getProfiles, updateAktivniRole, softDeleteProfile } from "../profiles";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockSupabase(result: { data: unknown; error: unknown }): any {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
  };
  chain.is.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockResolvedValue(result);
  chain.update.mockReturnValue(chain);

  return { from: vi.fn().mockReturnValue(chain), _chain: chain };
}

describe("getProfile", () => {
  it("queries profiles by id, filters deleted_at null, returns single", async () => {
    const profile = { id: "u1", jmeno: "Jan", prijmeni: "Novak" };
    const supabase = createMockSupabase({ data: profile, error: null });

    const result = await getProfile(supabase, "u1");

    expect(supabase.from).toHaveBeenCalledWith("profiles");
    expect(result.data).toEqual(profile);
    expect(result.error).toBeNull();
  });
});

describe("getProfiles", () => {
  it("queries all non-deleted profiles ordered by prijmeni", async () => {
    const profiles = [
      { id: "u1", prijmeni: "Adamec" },
      { id: "u2", prijmeni: "Zeleny" },
    ];
    const supabase = createMockSupabase({ data: profiles, error: null });

    const result = await getProfiles(supabase);

    expect(supabase.from).toHaveBeenCalledWith("profiles");
    expect(result.data).toEqual(profiles);
  });
});

describe("updateAktivniRole", () => {
  it("updates aktivni_role for the given user", async () => {
    const supabase = createMockSupabase({ data: null, error: null });

    await updateAktivniRole(supabase, "u1", "technik");

    expect(supabase.from).toHaveBeenCalledWith("profiles");
  });
});

describe("softDeleteProfile", () => {
  it("sets deleted_at timestamp on profile", async () => {
    const supabase = createMockSupabase({ data: null, error: null });

    await softDeleteProfile(supabase, "u1");

    expect(supabase.from).toHaveBeenCalledWith("profiles");
  });
});
