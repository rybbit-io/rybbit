"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReactNode } from "react";

interface AuthInputProps {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  /** Lets password managers tell sign-in from sign-up, e.g. "current-password" or "new-password". */
  autoComplete?: string;
  className?: string;
  rightElement?: ReactNode;
}

export function AuthInput({
  id,
  label,
  type,
  placeholder,
  value,
  onChange,
  required = false,
  autoComplete,
  className = "",
  rightElement,
}: AuthInputProps) {
  return (
    <div className={`grid gap-2 ${className}`}>
      <div className="flex justify-between items-center">
        <Label htmlFor={id}>{label}</Label>
        {rightElement && <div>{rightElement}</div>}
      </div>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        minLength={type === "password" ? 8 : undefined}
      />
    </div>
  );
}
