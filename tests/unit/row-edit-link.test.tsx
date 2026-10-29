import type { Route } from "next";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RowEditLink } from "@/components/ui/row-edit-link";

describe("RowEditLink", () => {
  it("renders an accessible edit link with a hidden pencil icon", () => {
    render(<RowEditLink href={"/companies/company-1/edit" as Route} label="Edit Acme Software" />);

    const link = screen.getByRole("link", { name: "Edit Acme Software" });
    expect(link).toHaveAttribute("href", "/companies/company-1/edit");
    expect(link).toHaveAttribute("title", "Edit Acme Software");

    const icon = link.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});
