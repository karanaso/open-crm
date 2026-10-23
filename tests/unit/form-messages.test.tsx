import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { FormError, FormField, FormSuccess } from "@/components/ui/form-field";
import el from "../../messages/el.json";

function GreekProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="el" messages={el}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("form messages", () => {
  it("renders a Greek field error", () => {
    render(
      <GreekProvider>
        <FormField label="Email" error={{ key: "validation.required" }}>
          <input />
        </FormField>
      </GreekProvider>,
    );

    expect(screen.getByText("Αυτό το πεδίο είναι υποχρεωτικό.")).toBeInTheDocument();
  });

  it("renders a Greek error banner", () => {
    render(
      <GreekProvider>
        <FormError message={{ key: "errors.NOT_FOUND" }} />
      </GreekProvider>,
    );

    expect(screen.getByText("Η εγγραφή δεν βρέθηκε.")).toBeInTheDocument();
  });

  it("renders a Greek success banner", () => {
    render(
      <GreekProvider>
        <FormSuccess message={{ key: "settings.profileUpdated" }} />
      </GreekProvider>,
    );

    expect(screen.getByText("Το προφίλ ενημερώθηκε.")).toBeInTheDocument();
  });
});
