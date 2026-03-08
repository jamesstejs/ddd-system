import { describe, it, expect, vi, beforeEach } from "vitest";
import { hasRole, hasAnyRole } from "../index";
import type { AppRole } from "../index";

// Mock the Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  })),
}));

describe("Auth: hasRole", () => {
  it("returns true when user has the required role", () => {
    expect(hasRole(["super_admin", "admin"], "super_admin")).toBe(true);
  });

  it("returns true for technik role", () => {
    expect(hasRole(["technik"], "technik")).toBe(true);
  });

  it("returns false when user does not have the required role", () => {
    expect(hasRole(["technik"], "admin")).toBe(false);
  });

  it("returns false for null roles", () => {
    expect(hasRole(null, "admin")).toBe(false);
  });

  it("returns false for undefined roles", () => {
    expect(hasRole(undefined, "admin")).toBe(false);
  });

  it("returns false for empty role array", () => {
    expect(hasRole([], "admin")).toBe(false);
  });
});

describe("Auth: hasAnyRole", () => {
  it("returns true when user has at least one required role", () => {
    expect(hasAnyRole(["technik", "admin"], ["admin", "super_admin"])).toBe(
      true
    );
  });

  it("returns false when user has none of the required roles", () => {
    expect(hasAnyRole(["technik"], ["admin", "super_admin"])).toBe(false);
  });

  it("returns false for null roles", () => {
    expect(hasAnyRole(null, ["admin"])).toBe(false);
  });

  it("returns false for undefined roles", () => {
    expect(hasAnyRole(undefined, ["admin"])).toBe(false);
  });

  it("returns false for empty user roles", () => {
    expect(hasAnyRole([], ["admin"])).toBe(false);
  });

  it("returns false for empty required roles", () => {
    expect(hasAnyRole(["admin"], [])).toBe(false);
  });

  it("returns true for klient role check", () => {
    expect(hasAnyRole(["klient"], ["klient", "technik"])).toBe(true);
  });
});

describe("Auth: signIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls supabase signInWithPassword with correct credentials", async () => {
    const mockSignIn = vi.fn().mockResolvedValue({
      data: { user: { id: "test-id" }, session: { access_token: "token" } },
      error: null,
    });

    const { createClient } = await import("@/lib/supabase/client");
    vi.mocked(createClient).mockReturnValue({
      auth: {
        signInWithPassword: mockSignIn,
        signOut: vi.fn(),
        getUser: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        updateUser: vi.fn(),
      },
      from: vi.fn(),
    } as never);

    const { signIn } = await import("../index");
    const result = await signIn({
      email: "test@deraplus.cz",
      password: "password123",
    });

    expect(mockSignIn).toHaveBeenCalledWith({
      email: "test@deraplus.cz",
      password: "password123",
    });
    expect(result.error).toBeNull();
  });

  it("returns error on invalid credentials", async () => {
    const mockSignIn = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    const { createClient } = await import("@/lib/supabase/client");
    vi.mocked(createClient).mockReturnValue({
      auth: {
        signInWithPassword: mockSignIn,
        signOut: vi.fn(),
        getUser: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        updateUser: vi.fn(),
      },
      from: vi.fn(),
    } as never);

    const { signIn } = await import("../index");
    const result = await signIn({
      email: "test@deraplus.cz",
      password: "wrong",
    });

    expect(result.error).toBeTruthy();
    expect(result.error?.message).toBe("Invalid login credentials");
  });
});

describe("Auth: signOut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls supabase signOut", async () => {
    const mockSignOut = vi.fn().mockResolvedValue({ error: null });

    const { createClient } = await import("@/lib/supabase/client");
    vi.mocked(createClient).mockReturnValue({
      auth: {
        signInWithPassword: vi.fn(),
        signOut: mockSignOut,
        getUser: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        updateUser: vi.fn(),
      },
      from: vi.fn(),
    } as never);

    const { signOut } = await import("../index");
    const result = await signOut();

    expect(mockSignOut).toHaveBeenCalled();
    expect(result.error).toBeNull();
  });
});
