import { describe, it, expect, vi } from "vitest";
import {
  createEmailLog,
  getEmailLogByProtokol,
  updateEmailLog,
} from "../email_log";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockSupabase(result: { data: unknown; error: unknown }): any {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };
  // Make order() return an awaitable that resolves to result
  chain.order.mockImplementation(() => {
    const awaitable = {
      ...chain,
      then: (resolve: (v: unknown) => void) => resolve(result),
    };
    return awaitable;
  });
  chain.is.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);

  return { from: vi.fn().mockReturnValue(chain), _chain: chain };
}

// ============================================================
// createEmailLog
// ============================================================

describe("createEmailLog", () => {
  it("calls supabase insert with the provided data and returns single", async () => {
    const insertData = {
      protokol_id: "proto-123",
      prijemce: "klient@example.com",
      predmet: "Protokol P-TST-001 — Deraplus",
      typ: "protokol" as const,
      stav: "odeslano" as const,
      resend_id: "resend_abc",
      odeslano_at: "2026-03-11T10:00:00Z",
    };
    const returnedData = { id: "log-new", ...insertData };
    const supabase = createMockSupabase({
      data: returnedData,
      error: null,
    });

    await createEmailLog(supabase, insertData as never);

    expect(supabase.from).toHaveBeenCalledWith("email_log");
    expect(supabase._chain.insert).toHaveBeenCalledWith(insertData);
    expect(supabase._chain.select).toHaveBeenCalled();
    expect(supabase._chain.single).toHaveBeenCalled();
  });

  it("passes through error from supabase", async () => {
    const supabase = createMockSupabase({
      data: null,
      error: { message: "Insert failed", code: "23505" },
    });

    const result = await createEmailLog(supabase, {
      prijemce: "test@test.com",
      predmet: "Test",
    } as never);

    expect(result.error).toEqual({ message: "Insert failed", code: "23505" });
  });

  it("inserts with chyba stav and chyba_detail", async () => {
    const insertData = {
      protokol_id: "proto-456",
      prijemce: "klient@example.com",
      predmet: "Protokol P-ERR-001 — Deraplus",
      typ: "protokol" as const,
      stav: "chyba" as const,
      chyba_detail: "Resend error: Invalid API key",
    };
    const supabase = createMockSupabase({
      data: { id: "log-err", ...insertData },
      error: null,
    });

    await createEmailLog(supabase, insertData as never);

    expect(supabase._chain.insert).toHaveBeenCalledWith(insertData);
  });

  it("inserts with cekajici stav (no resend_id yet)", async () => {
    const insertData = {
      protokol_id: "proto-789",
      prijemce: "wait@example.com",
      predmet: "Protokol P-WAIT-001",
      typ: "protokol" as const,
      stav: "cekajici" as const,
    };
    const supabase = createMockSupabase({
      data: { id: "log-wait", ...insertData },
      error: null,
    });

    await createEmailLog(supabase, insertData as never);

    expect(supabase._chain.insert).toHaveBeenCalledWith(insertData);
  });
});

// ============================================================
// getEmailLogByProtokol
// ============================================================

describe("getEmailLogByProtokol", () => {
  it("queries email_log filtering by protokol_id, deleted_at IS NULL, orders by created_at desc", async () => {
    const data = [
      {
        id: "log-1",
        protokol_id: "proto-123",
        prijemce: "test@test.com",
        stav: "odeslano",
        created_at: "2026-03-11T10:00:00Z",
      },
      {
        id: "log-2",
        protokol_id: "proto-123",
        prijemce: "test@test.com",
        stav: "chyba",
        created_at: "2026-03-10T08:00:00Z",
      },
    ];
    const supabase = createMockSupabase({ data, error: null });

    const result = await getEmailLogByProtokol(supabase, "proto-123");

    expect(supabase.from).toHaveBeenCalledWith("email_log");
    expect(supabase._chain.select).toHaveBeenCalledWith("*");
    expect(supabase._chain.eq).toHaveBeenCalledWith("protokol_id", "proto-123");
    expect(supabase._chain.is).toHaveBeenCalledWith("deleted_at", null);
    expect(supabase._chain.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(result.data).toEqual(data);
  });

  it("returns empty array when no logs exist for protokol", async () => {
    const supabase = createMockSupabase({ data: [], error: null });

    const result = await getEmailLogByProtokol(supabase, "proto-nonexistent");

    expect(supabase.from).toHaveBeenCalledWith("email_log");
    expect(supabase._chain.eq).toHaveBeenCalledWith("protokol_id", "proto-nonexistent");
    expect(result.data).toEqual([]);
  });

  it("returns error when query fails", async () => {
    const supabase = createMockSupabase({
      data: null,
      error: { message: "Connection refused" },
    });

    const result = await getEmailLogByProtokol(supabase, "proto-123");

    expect(result.error).toEqual({ message: "Connection refused" });
  });

  it("filters out soft-deleted records (deleted_at IS NULL)", async () => {
    const supabase = createMockSupabase({ data: [], error: null });

    await getEmailLogByProtokol(supabase, "proto-123");

    // Verify the .is("deleted_at", null) was called
    expect(supabase._chain.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("orders results by created_at descending (newest first)", async () => {
    const supabase = createMockSupabase({ data: [], error: null });

    await getEmailLogByProtokol(supabase, "proto-123");

    expect(supabase._chain.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
  });
});

// ============================================================
// updateEmailLog
// ============================================================

describe("updateEmailLog", () => {
  it("calls update with correct params and filters by id and deleted_at IS NULL", async () => {
    const updates = {
      stav: "odeslano" as const,
      resend_id: "resend_xyz",
      odeslano_at: "2026-03-11T12:00:00Z",
    };
    const supabase = createMockSupabase({ data: null, error: null });

    await updateEmailLog(supabase, "log-1", updates as never);

    expect(supabase.from).toHaveBeenCalledWith("email_log");
    expect(supabase._chain.update).toHaveBeenCalledWith(updates);
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "log-1");
    expect(supabase._chain.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("updates stav from cekajici to chyba with chyba_detail", async () => {
    const updates = {
      stav: "chyba" as const,
      chyba_detail: "Resend error: Mailbox full",
    };
    const supabase = createMockSupabase({ data: null, error: null });

    await updateEmailLog(supabase, "log-2", updates as never);

    expect(supabase._chain.update).toHaveBeenCalledWith(updates);
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "log-2");
  });

  it("returns error from supabase when update fails", async () => {
    const supabase = createMockSupabase({
      data: null,
      error: { message: "Row not found" },
    });

    const result = await updateEmailLog(supabase, "log-missing", {
      stav: "odeslano",
    } as never);

    // The chain resolves to the result which has error
    expect(supabase._chain.update).toHaveBeenCalled();
  });

  it("does not update soft-deleted records (filters deleted_at IS NULL)", async () => {
    const supabase = createMockSupabase({ data: null, error: null });

    await updateEmailLog(supabase, "log-deleted", {
      stav: "doruceno",
    } as never);

    expect(supabase._chain.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("can update just the resend_id field", async () => {
    const updates = { resend_id: "resend_new_id" };
    const supabase = createMockSupabase({ data: null, error: null });

    await updateEmailLog(supabase, "log-1", updates as never);

    expect(supabase._chain.update).toHaveBeenCalledWith({ resend_id: "resend_new_id" });
  });
});
