"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { MessageDescriptor } from "@/lib/errors";
import { useMessageTranslator } from "@/i18n/messages";

type Message = string | MessageDescriptor;

function useMessageText(message?: Message | null) {
  const translate = useMessageTranslator();
  return message ? translate(message) : null;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: Message;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const errorText = useMessageText(error);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
      {hint && !errorText ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {errorText ? <p className="text-xs text-destructive">{errorText}</p> : null}
    </div>
  );
}

export function FormError({ message }: { message?: Message | null }) {
  const text = useMessageText(message);
  if (!text) return null;
  return (
    <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {text}
    </p>
  );
}

export function FormSuccess({ message }: { message?: MessageDescriptor | null }) {
  const text = useMessageText(message);
  if (!text) return null;
  return (
    <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
      {text}
    </p>
  );
}

export function FieldError({ message }: { message?: Message | null }) {
  const text = useMessageText(message);
  if (!text) return null;
  return <p className="text-xs text-destructive">{text}</p>;
}
