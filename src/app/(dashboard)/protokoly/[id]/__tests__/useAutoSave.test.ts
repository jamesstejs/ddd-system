import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoSave } from "../useAutoSave";

// Helper to create test data
function makeBod(overrides: Record<string, unknown> = {}) {
  return {
    id: "bod-1",
    cislo_bodu: "L1",
    okruh_id: null,
    typ_stanicky: "mys" as const,
    pripravek_id: null,
    pozer_procent: 0,
    stav_stanicky: "ok" as const,
    ...overrides,
  };
}

describe("useAutoSave", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let saveFn: any;

  beforeEach(() => {
    vi.useFakeTimers();
    saveFn = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with 'saved' status when no changes", () => {
    const data = [makeBod()];
    const { result } = renderHook(() =>
      useAutoSave({
        protokolId: "proto-1",
        data,
        poznamka: "",
        originalIds: new Set(["bod-1"]),
        saveFn,
        enabled: true,
        debounceMs: 1000,
      }),
    );

    // Initial render — snapshot saved as initial, so status should be saved
    expect(result.current.status).toBe("saved");
    expect(result.current.error).toBeNull();
  });

  it("debounces save after data change", async () => {
    const data1 = [makeBod({ pozer_procent: 0 })];
    const data2 = [makeBod({ pozer_procent: 25 })];

    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          protokolId: "proto-1",
          data,
          poznamka: "",
          originalIds: new Set(["bod-1"]),
          saveFn,
          enabled: true,
          debounceMs: 1000,
        }),
      { initialProps: { data: data1 } },
    );

    // Change data
    rerender({ data: data2 });

    // Should be unsaved
    expect(result.current.status).toBe("unsaved");
    expect(saveFn).not.toHaveBeenCalled();

    // Advance timer past debounce
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Should have called save
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith("proto-1", data2, "");
  });

  it("does not save when disabled", async () => {
    const data1 = [makeBod({ pozer_procent: 0 })];
    const data2 = [makeBod({ pozer_procent: 50 })];

    const { rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          protokolId: "proto-1",
          data,
          poznamka: "",
          originalIds: new Set(["bod-1"]),
          saveFn,
          enabled: false,
          debounceMs: 1000,
        }),
      { initialProps: { data: data1 } },
    );

    rerender({ data: data2 });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(saveFn).not.toHaveBeenCalled();
  });

  it("only saves the latest state on rapid changes", async () => {
    const data1 = [makeBod({ pozer_procent: 0 })];
    const data2 = [makeBod({ pozer_procent: 25 })];
    const data3 = [makeBod({ pozer_procent: 75 })];

    const { rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          protokolId: "proto-1",
          data,
          poznamka: "",
          originalIds: new Set(["bod-1"]),
          saveFn,
          enabled: true,
          debounceMs: 1000,
        }),
      { initialProps: { data: data1 } },
    );

    // Rapid changes
    rerender({ data: data2 });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    rerender({ data: data3 });

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Should only have saved once with latest data
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith("proto-1", data3, "");
  });

  it("sets error status on save failure", async () => {
    saveFn.mockRejectedValueOnce(new Error("Network error"));

    const data1 = [makeBod({ pozer_procent: 0 })];
    const data2 = [makeBod({ pozer_procent: 50 })];

    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          protokolId: "proto-1",
          data,
          poznamka: "",
          originalIds: new Set(["bod-1"]),
          saveFn,
          enabled: true,
          debounceMs: 1000,
        }),
      { initialProps: { data: data1 } },
    );

    rerender({ data: data2 });

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Network error");
  });

  it("saveNow triggers immediate save", async () => {
    const data1 = [makeBod({ pozer_procent: 0 })];
    const data2 = [makeBod({ pozer_procent: 100 })];

    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          protokolId: "proto-1",
          data,
          poznamka: "test",
          originalIds: new Set(["bod-1"]),
          saveFn,
          enabled: true,
          debounceMs: 5000,
        }),
      { initialProps: { data: data1 } },
    );

    rerender({ data: data2 });

    // Don't wait for debounce — call saveNow
    await act(async () => {
      await result.current.saveNow();
    });

    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("saved");
  });
});
