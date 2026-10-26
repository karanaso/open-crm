import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { ThemePicker } from "@/components/settings/theme-picker";
import type { Theme, ThemeMode } from "@/lib/theme/config";
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

function renderPicker(theme: Theme = "default", themeMode: ThemeMode = "system") {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ThemePicker theme={theme} themeMode={themeMode} />
    </NextIntlClientProvider>,
  );
}

describe("ThemePicker", () => {
  beforeEach(() => {
    mocks.setThemeAction.mockReset();
    mocks.refresh.mockClear();
    mocks.setThemeAction.mockResolvedValue({ theme: "violet", mode: "dark" });
  });

  it("shows every palette and mode with the current selection checked", () => {
    renderPicker("violet", "dark");

    expect(screen.getAllByRole("radio")).toHaveLength(8);
    expect(screen.getByRole("radio", { name: /Violet/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Default/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Light" })).not.toBeChecked();
    expect(screen.getByText("Color theme")).toBeInTheDocument();
    expect(screen.getByText("Color mode")).toBeInTheDocument();
  });

  it("saves a palette change and refreshes the route", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("radio", { name: /Violet/ }));

    await waitFor(() => expect(mocks.setThemeAction).toHaveBeenCalledWith("violet", "system"));
    expect(mocks.refresh).toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("Theme updated.");
  });

  it("saves a mode change against the chosen palette", async () => {
    const user = userEvent.setup();
    renderPicker("amber", "system");

    await user.click(screen.getByRole("radio", { name: "Dark" }));

    await waitFor(() => expect(mocks.setThemeAction).toHaveBeenCalledWith("amber", "dark"));
  });

  it("shows a translated error and restores the previous selection", async () => {
    mocks.setThemeAction.mockResolvedValue({ error: { key: "errors.INVALID_THEME" } });
    const user = userEvent.setup();
    renderPicker("default", "light");

    await user.click(screen.getByRole("radio", { name: /Rose/ }));

    expect(await screen.findByText("That theme is not available.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Default/ })).toBeChecked();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
