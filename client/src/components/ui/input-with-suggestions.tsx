"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface SuggestionOption {
  value: string;
  label?: string;
}

interface InputWithSuggestionsProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestions: SuggestionOption[];
  onValueChange?: (value: string) => void;
}

export const InputWithSuggestions = React.forwardRef<HTMLInputElement, InputWithSuggestionsProps>(
  ({ suggestions, onValueChange, className, value: controlledValue, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState("");
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    // Use controlled value if provided, otherwise use internal state
    const value = controlledValue !== undefined ? controlledValue : internalValue;

    const filteredSuggestions = suggestions.filter(suggestion =>
      suggestion.value.toLowerCase().includes(String(value).toLowerCase())
    );

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
      props.onChange?.(e);
      setOpen(true);
    };

    const handleSuggestionClick = (suggestion: string) => {
      if (controlledValue === undefined) {
        setInternalValue(suggestion);
      }
      onValueChange?.(suggestion);
      if (props.onChange) {
        const syntheticEvent = {
          target: { value: suggestion },
        } as React.ChangeEvent<HTMLInputElement>;
        props.onChange(syntheticEvent);
      }
      setOpen(false);
    };

    return (
      <div ref={wrapperRef} className="relative">
        <Input
          ref={ref}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          className={className}
          {...props}
        />
        {open && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border border-neutral-200 bg-white shadow-md dark:border-neutral-800 dark:bg-neutral-900">
            {filteredSuggestions.map(suggestion => (
              <div
                key={suggestion.value}
                className="relative cursor-pointer px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => handleSuggestionClick(suggestion.value)}
              >
                {suggestion.label || suggestion.value}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

InputWithSuggestions.displayName = "InputWithSuggestions";
