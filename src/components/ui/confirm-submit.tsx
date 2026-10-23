"use client";

import type { ButtonHTMLAttributes } from "react";

export function ConfirmSubmit({
  message = "Are you sure?",
  children,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { message?: string }) {
  return (
    <button
      {...props}
      onClick={(event) => {
        if (!window.confirm(message)) {
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
