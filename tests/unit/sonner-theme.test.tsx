import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Toaster } from "@/components/ui/sonner";

vi.mock("sonner", () => ({
  Toaster: ({ theme }: { theme?: string }) => (
    <div data-testid="sonner" data-theme={theme} />
  ),
}));

describe("Toaster", () => {
  it("passes the active mode to Sonner", () => {
    render(<Toaster mode="dark" />);
    expect(screen.getByTestId("sonner")).toHaveAttribute("data-theme", "dark");
  });

  it("defaults to system mode", () => {
    render(<Toaster />);
    expect(screen.getByTestId("sonner")).toHaveAttribute("data-theme", "system");
  });
});
