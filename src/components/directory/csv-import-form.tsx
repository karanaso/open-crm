"use client";

import { useActionState, useMemo, useState } from "react";
import Papa from "papaparse";
import { FileUp } from "lucide-react";
import { importCsvAction } from "@/actions/import";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ActionState } from "@/lib/action-state";
import { MAX_CSV_BYTES, MAX_CSV_ROWS } from "@/lib/constants";
import { useMessageTranslator } from "@/i18n/messages";

type Target = "companies" | "contacts";

const fieldDefinitions: Record<
  Target,
  Array<{ key: string; label: string; required?: boolean }>
> = {
  companies: [
    { key: "name", label: "Company name", required: true },
    { key: "domain", label: "Domain" },
    { key: "industry", label: "Industry" },
    { key: "employeeCount", label: "Employee count" },
    { key: "phone", label: "Phone" },
    { key: "website", label: "Website" },
    { key: "city", label: "City" },
    { key: "region", label: "State / region" },
    { key: "postalCode", label: "Postal code" },
    { key: "country", label: "Country" },
    { key: "description", label: "Description" },
  ],
  contacts: [
    { key: "firstName", label: "First name", required: true },
    { key: "lastName", label: "Last name", required: true },
    { key: "email", label: "Email", required: true },
    { key: "phone", label: "Phone" },
    { key: "jobTitle", label: "Job title" },
    { key: "companyName", label: "Company name" },
    { key: "companyDomain", label: "Company domain" },
    { key: "notes", label: "Notes" },
  ],
};

const aliases: Record<string, string[]> = {
  name: ["companyname", "company", "organization", "account"],
  domain: ["companydomain", "website", "url", "web"],
  employeeCount: ["employees", "employeecount", "headcount", "size"],
  firstName: ["firstname", "first", "givenname"],
  lastName: ["lastname", "last", "surname", "familyname"],
  email: ["email", "emailaddress", "workemail"],
  jobTitle: ["title", "jobtitle", "position", "role"],
  companyName: ["company", "companyname", "organization", "account"],
  companyDomain: ["domain", "companydomain", "website", "url"],
  phone: ["phone", "phonenumber", "telephone", "mobile"],
  city: ["city", "town"],
  region: ["state", "region", "province"],
  postalCode: ["postalcode", "zip", "zipcode"],
  country: ["country"],
  notes: ["notes", "note", "comments"],
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function guessMapping(headers: string[], target: Target) {
  const mapping: Record<string, string> = {};
  for (const field of fieldDefinitions[target]) {
    const candidates = new Set([
      normalize(field.key),
      normalize(field.label),
      ...(aliases[field.key] ?? []),
    ]);
    const header = headers.find((item) => candidates.has(normalize(item)));
    if (header) mapping[field.key] = header;
  }
  return mapping;
}

export function CsvImportForm({ defaultTarget = "companies" }: { defaultTarget?: Target }) {
  const translate = useMessageTranslator();
  const [target, setTarget] = useState<Target>(defaultTarget);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Array<Record<string, string>>>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(importCsvAction, null);

  const fields = fieldDefinitions[target];
  const requiredReady = fields
    .filter((field) => field.required)
    .every((field) => Boolean(mapping[field.key]));
  const canSubmit = Boolean(fileName) && requiredReady && fields.length > 0;

  const previewHeaders = useMemo(() => headers.slice(0, 6), [headers]);

  async function onFileChange(file: File | undefined) {
    setFileError(null);
    setHeaders([]);
    setPreview([]);
    setMapping({});
    setFileName(file?.name ?? "");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Choose a .csv file.");
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      setFileError("The file is larger than 5 MB.");
      return;
    }
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: "greedy",
      preview: 6,
      transformHeader: (header) => header.trim(),
    });
    const fatalErrors = parsed.errors.filter((error) => error.code !== "UndetectableDelimiter");
  if (fatalErrors.length > 0) {
      setFileError(fatalErrors[0]?.message ?? "Could not parse the CSV.");
      return;
    }
    if (parsed.data.length > MAX_CSV_ROWS) {
      setFileError(`The file contains more than ${MAX_CSV_ROWS.toLocaleString()} data rows.`);
      return;
    }
    const nextHeaders = (parsed.meta.fields ?? []).filter(Boolean);
    setHeaders(nextHeaders);
    setPreview(parsed.data.slice(0, 5));
    setMapping(guessMapping(nextHeaders, target));
  }

  function changeTarget(next: Target) {
    setTarget(next);
    setHeaders([]);
    setPreview([]);
    setMapping({});
    setFileName("");
    setFileError(null);
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="mapping" value={JSON.stringify(mapping)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Import type" htmlFor="import-target">
          <select
            id="import-target"
            value={target}
            onChange={(event) => changeTarget(event.target.value as Target)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="companies">Companies</option>
            <option value="contacts">Contacts</option>
          </select>
        </FormField>
        <FormField label="CSV file" htmlFor="import-file" hint="Up to 5 MB and 5,000 data rows.">
          <Input
            id="import-file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void onFileChange(event.target.files?.[0])}
          />
        </FormField>
      </div>

      {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}

      {headers.length > 0 ? (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Map columns</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((field) => (
                <FormField
                  key={field.key}
                  label={field.label}
                  htmlFor={`map-${field.key}`}
                  required={field.required}
                >
                  <select
                    id={`map-${field.key}`}
                    value={mapping[field.key] ?? ""}
                    onChange={(event) =>
                      setMapping((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Do not import</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </FormField>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Preview</h3>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewHeaders.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, index) => (
                    <TableRow key={index}>
                      {previewHeaders.map((header) => (
                        <TableCell key={header} className="text-xs">
                          {row[header] || "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <FormError message={state?.error} />
          <Button type="submit" disabled={!canSubmit || pending}>
            <FileUp className="size-4" /> {pending ? "Importing…" : "Import CSV"}
          </Button>
          <p className="text-xs text-muted-foreground">
            For contacts, import companies first. Rows whose company cannot be matched are skipped.
          </p>
        </>
      ) : null}

      {state?.report ? (
        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="font-medium">Import complete</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
              {state.report.imported} imported
            </span>
            <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">
              {state.report.duplicates} duplicates skipped
            </span>
            <span className="rounded-md bg-destructive/5 px-2 py-1 text-destructive">
              {state.report.skipped} invalid rows
            </span>
          </div>
          {state.report.errors.length > 0 ? (
            <div className="max-h-72 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.report.errors.map((error, index) => (
                    <TableRow key={`${error.row}-${index}`}>
                      <TableCell className="align-top">{error.row}</TableCell>
                      <TableCell className="text-xs">
                        {typeof error.message === "string"
                          ? error.message
                          : translate(error.message)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
