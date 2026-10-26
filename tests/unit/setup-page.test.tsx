import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  countUsers: vi.fn(),
  getCurrentUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/db/ensure-default-pipeline", () => ({
  countUsers: mocks.countUsers,
}));

vi.mock("@/lib/auth/guards", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/redirect", () => ({
  redirect: mocks.redirect,
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

vi.mock("@/components/auth/setup-form", () => ({
  SetupForm: () => <form data-testid="setup-form" />,
}));

import SetupPage from "@/app/(auth)/setup/page";

describe("SetupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders setup when the database has no user, even with a stale browser session", async () => {
    mocks.countUsers.mockResolvedValue(0);
    mocks.getCurrentUser.mockResolvedValue(null);

    const html = renderToStaticMarkup(await SetupPage());

    expect(html).toContain("setup-form");
    expect(mocks.getCurrentUser).toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects to login when setup is already complete", async () => {
    mocks.countUsers.mockResolvedValue(1);

    await expect(SetupPage()).rejects.toThrow("redirect:/login");
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
  });

  it("redirects a real signed-in user to the dashboard", async () => {
    mocks.countUsers.mockResolvedValue(0);
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });

    await expect(SetupPage()).rejects.toThrow("redirect:/dashboard");
  });
});
