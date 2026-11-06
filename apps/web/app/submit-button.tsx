"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

/** Submit button that dims while its form's server action is running. */
export function SubmitButton({ className = "", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`cursor-pointer transition-opacity disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
