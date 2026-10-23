"use client";

import type { ButtonHTMLAttributes } from "react";
import { useTranslations } from "next-intl";

export function ConfirmSubmit({
  message,
  children,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { message?: string }) {
  const t = useTranslations("common");
  const prompt = message ?? t("confirmPrompt");

  return (
    <button
      {...props}
      onClick={(event) => {
        if (!window.confirm(prompt)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}
