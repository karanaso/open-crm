"use client";

import { useActionState, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Papa from "papaparse";
import { FileUp } from "lucide-react";
import { importCsvAction } from "@/actions/import";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ActionState } from "@/lib/action-state";
import type { MessageDescriptor } from "@/lib/errors";
import { MAX_CSV_BYTES, MAX_CSV_ROWS } from "@/lib/constants";
import { useMessageTranslator } from "@/i18n/messages";
import { formatNumber } from "@/lib/utils";

type Target = "companies" | "contacts";

const fieldDefinitions: Record<
  Target,
  ReadonlyArray<{ key: string; labelKey: string; header: string; required?: boolean }>
> = {
  companies: [
    { key: "name", labelKey: "directory.companyName", header: "Company name", required: true },
    { key: "domain", labelKey: "directory.domain", header: "Domain" },
    { key: "industry", labelKey: "directory.industry", header: "Industry" },
    { key: "employeeCount", labelKey: "directory.employeeCount", header: "Employee count" },
    { key: "phone", labelKey: "common.phone", header: "Phone" },
    { key: "website", labelKey: "directory.website", header: "Website" },
    { key: "city", labelKey: "directory.city", header: "City" },
    { key: "region", labelKey: "directory.region", header: "State / region" },
    { key: "postalCode", labelKey: "directory.postalCode", header: "Postal code" },
    { key: "country", labelKey: "directory.country", header: "Country" },
    { key: "description", labelKey: "common.description", header: "Description" },
  ],
  contacts: [
    { key: "firstName", labelKey: "directory.firstName", header: "First name", required: true },
    { key: "lastName", labelKey: "directory.lastName", header: "Last name", required: true },
    { key: "email", labelKey: "common.email", header: "Email", required: true },
    { key: "phone", labelKey: "common.phone", header: "Phone" },
    { key: "jobTitle", labelKey: "directory.jobTitle", header: "Job title" },
    { key: "companyName", labelKey: "directory.companyName", header: "Company name" },
    { key: "companyDomain", labelKey: "directory.companyDomain", header: "Company domain" },
    { key: "notes", labelKey: "directory.notes", header: "Notes" },
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
      normalize(field.header),
      ...(aliases[field.key] ?? []),
    ]);
    const header = headers.find((item) => candidates.has(normalize(item)));
    if (header) mapping[field.key] = header;
  }
  return mapping;
}

export function CsvImportForm({ defaultTarget = "companies" }: { defaultTarget?: Target }) {
  const translate = useMessageTranslator();
  const t = useTranslations("directory");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [target, setTarget] = useState<Target>(defaultTarget);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Array<Record<string, string>>>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState<MessageDescriptor | null>(null);
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
      setFileError({ key: "directory.importChooseFile" });
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      setFileError({ key: "directory.importFileSize" });
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
      setFileError({ key: "directory.importParseError" });
      return;
    }
    if (parsed.data.length > MAX_CSV_ROWS) {
      setFileError({
        key: "directory.importTooManyRows",
        params: { max: formatNumber(MAX_CSV_ROWS, locale) },
      });
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
        <FormField label={t("importType")} htmlFor="import-target">
          <select
            id="import-target"
            value={target}
            onChange={(event) => changeTarget(event.target.value as Target)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="companies">{t("companies")}</option>
            <option value="contacts">{t("contacts")}</option>
          </select>
        </FormField>
        <FormField label={t("csvFile")} htmlFor="import-file" hint={t("csvFileHint")}>
          <Input
            id="import-file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void onFileChange(event.target.files?.[0])}
          />
        </FormField>
      </div>

      {fileError ? <p className="text-sm text-destructive">{translate(fileError)}</p> : null}

      {headers.length > 0 ? (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t("mapColumns")}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((field) => (
                <FormField
                  key={field.key}
                  label={translate(field.labelKey)}
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
                    <option value="">{t("doNotImport")}</option>
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
            <h3 className="text-sm font-medium">{t("preview")}</h3>
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
            <FileUp className="size-4" /> {pending ? t("importing") : t("import")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("importContactsHint")}</p>
        </>
      ) : null}

      {state?.report ? (
        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="font-medium">{t("importComplete")}</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-md bg-success/10 px-2 py-1 text-success">
              {t("importedCount", { count: state.report.imported })}
            </span>
            <span className="rounded-md bg-warning/10 px-2 py-1 text-warning">
              {t("duplicatesSkipped", { count: state.report.duplicates })}
            </span>
            <span className="rounded-md bg-destructive/5 px-2 py-1 text-destructive">
              {t("invalidRows", { count: state.report.skipped })}
            </span>
          </div>
          {state.report.errors.length > 0 ? (
            <div className="max-h-72 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tCommon("row")}</TableHead>
                    <TableHead>{tCommon("reason")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.report.errors.map((error, index) => (
                    <TableRow key={`${error.row}-${index}`}>
                      <TableCell className="align-top">{error.row}</TableCell>
                      <TableCell className="text-xs">{translate(error.message)}</TableCell>
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
