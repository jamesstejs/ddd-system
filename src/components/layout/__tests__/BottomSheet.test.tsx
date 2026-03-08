import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BottomSheet } from "../BottomSheet";

describe("BottomSheet", () => {
  it("renders title and children when open", () => {
    render(
      <BottomSheet open={true} onOpenChange={vi.fn()} title="Test Sheet">
        <p>Sheet content</p>
      </BottomSheet>
    );

    expect(screen.getByText("Test Sheet")).toBeInTheDocument();
    expect(screen.getByText("Sheet content")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <BottomSheet
        open={true}
        onOpenChange={vi.fn()}
        title="Test"
        description="A description"
      >
        <p>Content</p>
      </BottomSheet>
    );

    expect(screen.getByText("A description")).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(
      <BottomSheet open={false} onOpenChange={vi.fn()} title="Hidden Sheet">
        <p>Hidden content</p>
      </BottomSheet>
    );

    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
  });
});
