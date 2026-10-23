import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";
import {
  GlobalErrorContent,
  GlobalErrorView,
} from "@/components/error-pages/global-error-view";
import { NotFoundContent } from "@/components/error-pages/not-found-content";
import en from "../../messages/en.json";
import el from "../../messages/el.json";

function renderError(locale: "en" | "el", reset = vi.fn()) {
  const error = Object.assign(new Error("SECRET_INTERNAL_DETAIL"), {
    digest: "digest-secret-123",
  });

  render(
    <NextIntlClientProvider locale={locale} messages={locale === "el" ? el : en}>
      <ErrorPage error={error} reset={reset} />
    </NextIntlClientProvider>,
  );

  return { reset };
}

describe("localized error boundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Greek copy without exposing the diagnostic", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { reset } = renderError("el");

    expect(screen.getByRole("heading", { name: "Κάτι πήγε στραβά" })).toBeVisible();
    expect(
      screen.getByText(
        "Κάτι απρόσμενο διέκοψε αυτή τη σελίδα. Δοκιμάστε ξανά ή επιστρέψτε στον πίνακα ελέγχου.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/SECRET_INTERNAL_DETAIL/)).not.toBeInTheDocument();
    expect(screen.queryByText(/digest-secret-123/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Επιστροφή στον πίνακα ελέγχου" })).toHaveAttribute(
      "href",
      "/dashboard",
    );

    fireEvent.click(screen.getByRole("button", { name: "Δοκιμάστε ξανά" }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("Page error", "digest-secret-123");
  });

  it("renders English copy", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderError("en");

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});

describe("localized not-found page", () => {
  it("renders Greek copy and the dashboard link", () => {
    render(
      <NotFoundContent
        title={el.errorPages.notFoundTitle}
        description={el.errorPages.notFoundDescription}
        backLabel={el.errorPages.backToDashboard}
      />,
    );

    expect(screen.getByRole("heading", { name: el.errorPages.notFoundTitle })).toBeVisible();
    expect(screen.getByText(el.errorPages.notFoundDescription)).toBeVisible();
    expect(screen.getByRole("link", { name: el.errorPages.backToDashboard })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("renders English copy and the dashboard link", () => {
    render(
      <NotFoundContent
        title={en.errorPages.notFoundTitle}
        description={en.errorPages.notFoundDescription}
        backLabel={en.errorPages.backToDashboard}
      />,
    );

    expect(screen.getByRole("heading", { name: en.errorPages.notFoundTitle })).toBeVisible();
    expect(screen.getByText(en.errorPages.notFoundDescription)).toBeVisible();
    expect(screen.getByRole("link", { name: en.errorPages.backToDashboard })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});

describe("root-layout error fallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = "opencrm_locale=; Max-Age=0; path=/";
  });

  it("renders a self-contained Greek document", () => {
    const html = renderToStaticMarkup(
      <GlobalErrorView locale="el">
        <GlobalErrorContent
          title={el.errorPages.title}
          description={el.errorPages.description}
          retryLabel={el.errorPages.retry}
          onRetry={() => undefined}
        />
      </GlobalErrorView>,
    );

    expect(html).toContain('lang="el"');
    expect(html).toContain("<html");
    expect(html).toContain("<body");
    expect(html).toContain(el.errorPages.title);
    expect(html).toContain(el.errorPages.description);
    expect(html).toContain(el.errorPages.retry);
  });

  it("retries from the fallback content", () => {
    const onRetry = vi.fn();
    render(
      <GlobalErrorContent
        title={el.errorPages.title}
        description={el.errorPages.description}
        retryLabel={el.errorPages.retry}
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: el.errorPages.retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("reads the Greek cookie and logs without rendering diagnostics", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    document.cookie = "opencrm_locale=el; path=/";
    const reset = vi.fn();
    const error = Object.assign(new Error("SECRET_GLOBAL_DETAIL"), {
      digest: "global-digest",
    });

    render(<GlobalError error={error} reset={reset} />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: el.errorPages.title })).toBeVisible(),
    );
    expect(screen.queryByText(/SECRET_GLOBAL_DETAIL/)).not.toBeInTheDocument();
    expect(screen.queryByText(/global-digest/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: el.errorPages.retry }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("Page error", "global-digest");
  });

  it("falls back to English when no supported preference exists", async () => {
    render(<GlobalError error={new Error("x")} reset={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: en.errorPages.title })).toBeVisible(),
    );
  });
});
