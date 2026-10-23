import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import el from "../../messages/el.json";

vi.mock("@/actions/locale", () => ({
  setLocaleAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("LanguageSwitcher", () => {
  it("shows the active locale", () => {
    render(
      <NextIntlClientProvider locale="el" messages={el}>
        <LanguageSwitcher />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("combobox", { name: "Γλώσσα" })).toHaveTextContent("Ελληνικά");
  });
});
