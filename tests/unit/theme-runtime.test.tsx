import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { ThemeRuntime } from "@/components/theme/theme-runtime";

type Listener = (event: MediaQueryListEvent) => void;

function installMatchMedia(matches: boolean) {
  const listeners = new Set<Listener>();
  const media = {
    matches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: vi.fn((_event: string, listener: Listener) => listeners.add(listener)),
    removeEventListener: vi.fn((_event: string, listener: Listener) => listeners.delete(listener)),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };

  vi.stubGlobal("matchMedia", vi.fn(() => media));
  return { media, listeners };
}

describe("ThemeRuntime", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    vi.unstubAllGlobals();
  });

  it("applies a dark operating system preference in system mode", () => {
    const { media, listeners } = installMatchMedia(true);

    render(<ThemeRuntime mode="system" />);

    expect(document.documentElement).toHaveClass("dark");
    expect(media.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));

    act(() => {
      for (const listener of listeners) listener({ matches: false } as MediaQueryListEvent);
    });

    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("cleans up the media listener", () => {
    const { media } = installMatchMedia(true);

    const { unmount } = render(<ThemeRuntime mode="system" />);
    unmount();

    expect(media.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("applies an explicit dark mode without listening to the system", () => {
    installMatchMedia(false);

    render(<ThemeRuntime mode="dark" />);

    expect(document.documentElement).toHaveClass("dark");
    expect(window.matchMedia).not.toHaveBeenCalled();
  });

  it("removes the dark class for explicit light mode", () => {
    document.documentElement.classList.add("dark");
    installMatchMedia(true);

    render(<ThemeRuntime mode="light" />);

    expect(document.documentElement).not.toHaveClass("dark");
    expect(window.matchMedia).not.toHaveBeenCalled();
  });
});
