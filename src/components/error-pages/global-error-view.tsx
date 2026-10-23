import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";

const bodyStyle: React.CSSProperties = {
  alignItems: "center",
  background: "#ffffff",
  color: "#111827",
  display: "flex",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  justifyContent: "center",
  margin: 0,
  minHeight: "100vh",
};

const mainStyle: React.CSSProperties = {
  maxWidth: 420,
  padding: 24,
  textAlign: "center",
};

const headingStyle: React.CSSProperties = {
  fontSize: 24,
  margin: "0 0 8px",
};

const descriptionStyle: React.CSSProperties = {
  color: "#4b5563",
  fontSize: 14,
  margin: "0 0 20px",
};

const buttonStyle: React.CSSProperties = {
  background: "#111827",
  border: 0,
  borderRadius: 6,
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 14,
  padding: "10px 16px",
};

export function GlobalErrorView({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <html lang={locale}>
      <body style={bodyStyle}>
        <main style={mainStyle}>{children}</main>
      </body>
    </html>
  );
}

export function GlobalErrorContent({
  title,
  description,
  retryLabel,
  onRetry,
}: {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <>
      <h1 style={headingStyle}>{title}</h1>
      <p style={descriptionStyle}>{description}</p>
      <button type="button" style={buttonStyle} onClick={onRetry}>
        {retryLabel}
      </button>
    </>
  );
}
