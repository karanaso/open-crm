import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { ThemeMenu } from "@/components/layout/theme-menu";
import en from "../../messages/en.json";

const mocks = vi.hoisted(() => ({
  setThemeAction: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/actions/theme", () => ({
  setThemeAction: mocks.setThemeAction,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, "hasPointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window.HTMLElement.prototype, "releasePointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function renderMenu() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ThemeMenu theme="default" themeMode="system" />
    </NextIntlClientProvider>,
  );
}

describe("ThemeMenu", () => {
  beforeEach(() => {
    mocks.setThemeAction.mockReset();
    mocks.refresh.mockClear();
    mocks.setThemeAction.mockResolvedValue({ theme: "violet", mode: "dark" });
  });

  it("opens with every mode and palette", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Change theme" }));

    expect(await screen.findByRole("menu")).toBeInTheDocument();
    for (const mode of ["Light", "Dark", "System"]) {
      expect(screen.getByRole("menuitemradio", { name: mode })).toBeInTheDocument();
    }
    for (const theme of ["Default", "Violet", "Emerald", "Amber", "Rose"]) {
      expect(screen.getByRole("menuitemradio", { name: theme })).toBeInTheDocument();
    }
    expect(screen.getByRole("menuitemradio", { name: "Default" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemradio", { name: "Violet" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("menuitem", { name: "Theme settings" })).toBeInTheDocument();
  });

  it("changes the mode from the header", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Change theme" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Dark" }));

    await waitFor(() => expect(mocks.setThemeAction).toHaveBeenCalledWith("default", "dark"));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("changes the palette from the header", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Change theme" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Violet" }));

    await waitFor(() => expect(mocks.setThemeAction).toHaveBeenCalledWith("violet", "system"));
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
