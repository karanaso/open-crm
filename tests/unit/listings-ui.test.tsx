import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../messages/en.json";
import el from "../../messages/el.json";

vi.mock("@/actions/listing-photos", () => ({
  uploadListingPhotoAction: vi.fn(),
  reorderListingPhotosAction: vi.fn(),
  deleteListingPhotoAction: vi.fn(),
}));

import { FeaturePicker } from "@/components/listings/listing-feature-picker";
import { ListingForm } from "@/components/listings/listing-form";
import { movePhoto } from "@/components/listings/listing-photo-manager";
import {
  dateKeyInTimeZone,
  datePartsInTimeZone,
  wallTimeToUtc,
} from "@/components/listings/zoned-datetime";

function renderWithCatalog(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function hiddenFeaturesInput(container: HTMLElement) {
  return container.querySelector<HTMLInputElement>('input[type="hidden"][name="features"]');
}

describe("listing feature picker", () => {
  it("serializes selected nested features into the hidden JSON input", () => {
    const { container } = renderWithCatalog(<FeaturePicker name="features" />);
    const hidden = hiddenFeaturesInput(container);
    expect(hidden).not.toBeNull();
    expect(JSON.parse(hidden!.value)).toEqual({});

    fireEvent.click(screen.getByRole("checkbox", { name: "View of Coast" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Swimming Pool" }));

    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(JSON.parse(hidden!.value)).toEqual({
      location: { viewOfCoast: true },
      yard: { swimmingPool: true },
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "View of Coast" }));

    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(JSON.parse(hidden!.value)).toEqual({ yard: { swimmingPool: true } });
  });

  it("restores selected features from stored groups", () => {
    const { container } = renderWithCatalog(
      <FeaturePicker
        name="features"
        initialFeatures={{
          yard: { swimmingPool: true },
          location: { viewOfCoast: true },
        }}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "View of Coast" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Swimming Pool" })).toBeChecked();
    expect(JSON.parse(hiddenFeaturesInput(container)!.value)).toEqual({
      location: { viewOfCoast: true },
      yard: { swimmingPool: true },
    });
  });

  it("renders localized group and feature labels without changing stored keys", () => {
    const { container } = render(
      <NextIntlClientProvider locale="el" messages={el}>
        <FeaturePicker
          name="features"
          initialFeatures={{ location: { viewOfCoast: true } }}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Χαρακτηριστικά")).toBeInTheDocument();
    expect(screen.getByText("Τοποθεσία")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Θέα στην ακτή" })).toBeChecked();
    expect(JSON.parse(hiddenFeaturesInput(container)!.value)).toEqual({
      location: { viewOfCoast: true },
    });
  });
});

describe("listing form", () => {
  function renderForm() {
    return renderWithCatalog(
      <ListingForm
        action={vi.fn(async () => null)}
        sellers={[{ id: "seller-1", firstName: "Sofia", lastName: "Seller" }]}
        owners={[{ id: "user-1", name: "Alex Morgan", status: "active" }]}
        defaultOwnerId="user-1"
        defaultCurrency="USD"
        submitLabel="Create listing"
        cancelHref="/listings"
      />,
    );
  }

  it("requires a seller and only shows the rent period for rent listings", () => {
    renderForm();

    const seller = document.querySelector<HTMLSelectElement>("#sellerContactId");
    expect(seller).not.toBeNull();
    expect(seller).toBeRequired();

    expect(screen.queryByLabelText(/Price period/)).not.toBeInTheDocument();

    fireEvent.change(document.querySelector("#transaction")!, { target: { value: "rent" } });

    const pricePeriod = screen.getByLabelText(/Price period/);
    expect(pricePeriod).toBeVisible();
    expect(pricePeriod).toBeRequired();
    expect(pricePeriod).toHaveValue("month");

    fireEvent.change(document.querySelector("#transaction")!, { target: { value: "sale" } });

    expect(screen.queryByLabelText(/Price period/)).not.toBeInTheDocument();
  });

  it("submits the selected features and currency through the form", () => {
    renderForm();

    fireEvent.change(document.querySelector("#currency")!, { target: { value: "eur" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "View of Coast" }));

    const form = document.querySelector("form")!;
    const hidden = form.querySelector<HTMLInputElement>('input[name="features"]')!;
    expect(JSON.parse(hidden.value)).toEqual({ location: { viewOfCoast: true } });
    expect(document.querySelector<HTMLInputElement>("#currency")!.value).toBe("eur");
    expect(screen.getByRole("button", { name: "Create listing" })).toBeInTheDocument();
  });
});

describe("listing photo order", () => {
  it("moves a photo without mutating the input", () => {
    const photos = ["front", "kitchen", "garden"];

    expect(movePhoto(photos, 2, 0)).toEqual(["garden", "front", "kitchen"]);
    expect(movePhoto(photos, 0, 2)).toEqual(["kitchen", "garden", "front"]);
    expect(photos).toEqual(["front", "kitchen", "garden"]);
  });

  it("ignores no-op and out-of-range moves", () => {
    const photos = ["front", "kitchen"];

    expect(movePhoto(photos, 0, 0)).toBe(photos);
    expect(movePhoto(photos, -1, 1)).toBe(photos);
    expect(movePhoto(photos, 0, 5)).toBe(photos);
    expect(movePhoto(photos, 5, 0)).toBe(photos);
  });
});

describe("workspace zoned datetime conversion", () => {
  it("converts wall times to UTC in winter and summer", () => {
    expect(wallTimeToUtc("2026-01-15T12:00", "Europe/Athens")?.toISOString()).toBe(
      "2026-01-15T10:00:00.000Z",
    );
    expect(wallTimeToUtc("2026-07-15T12:00", "Europe/Athens")?.toISOString()).toBe(
      "2026-07-15T09:00:00.000Z",
    );
  });

  it("handles the spring-forward DST boundary", () => {
    expect(wallTimeToUtc("2026-03-29T01:30", "Europe/Athens")?.toISOString()).toBe(
      "2026-03-28T23:30:00.000Z",
    );
    expect(wallTimeToUtc("2026-03-29T04:30", "Europe/Athens")?.toISOString()).toBe(
      "2026-03-29T01:30:00.000Z",
    );
  });

  it("handles the fall-back DST boundary", () => {
    expect(wallTimeToUtc("2026-10-25T04:30", "Europe/Athens")?.toISOString()).toBe(
      "2026-10-25T02:30:00.000Z",
    );
    expect(wallTimeToUtc("2026-10-25T12:00", "Europe/Athens")?.toISOString()).toBe(
      "2026-10-25T10:00:00.000Z",
    );
  });

  it("rejects malformed wall times and unknown time zones", () => {
    for (const value of [
      "",
      "2026-02-30T10:00",
      "2026-13-01T10:00",
      "2026-01-01 10:00",
      "2026-01-01T24:00",
      "not-a-date",
    ]) {
      expect(wallTimeToUtc(value, "Europe/Athens")).toBeNull();
    }
    expect(wallTimeToUtc("2026-01-01T10:00", "Mars/Olympus")).toBeNull();
  });

  it("groups instants by the workspace-local day", () => {
    expect(dateKeyInTimeZone("2026-03-29T23:30:00.000Z", "Europe/Athens")).toBe("2026-03-30");
    expect(dateKeyInTimeZone("2026-10-25T22:30:00.000Z", "Europe/Athens")).toBe("2026-10-26");
    expect(dateKeyInTimeZone("2026-01-15T22:30:00.000Z", "Europe/Athens")).toBe("2026-01-16");
    expect(dateKeyInTimeZone("2026-01-15T22:30:00.000Z", "UTC")).toBe("2026-01-15");
  });

  it("returns the workspace-local date parts", () => {
    expect(datePartsInTimeZone("2026-10-25T22:30:00.000Z", "Europe/Athens")).toEqual({
      year: 2026,
      month: 10,
      day: 26,
      hour: 0,
      minute: 30,
    });
    expect(datePartsInTimeZone("not-a-date", "Europe/Athens")).toBeNull();
    expect(datePartsInTimeZone("2026-01-01T00:00:00.000Z", "Mars/Olympus")).toBeNull();
  });
});
