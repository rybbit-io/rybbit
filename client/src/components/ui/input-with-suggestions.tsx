"use client";

import { Input } from "@/components/ui/input";
import * as React from "react";
import { createPortal } from "react-dom";

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
    const inputRef = React.useRef<HTMLInputElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);
    const [dropdownStyle, setDropdownStyle] = React.useState<{
      top: number;
      left: number;
      width: number;
    } | null>(null);

    // Find the best container to portal into (dialog content or body)
    React.useEffect(() => {
      if (wrapperRef.current) {
        // Look for a Radix dialog content container
        const dialogContent = wrapperRef.current.closest("[role='dialog']");
        setPortalContainer((dialogContent as HTMLElement) || document.body);
      }
    }, []);

    // Use controlled value if provided, otherwise use internal state
    const value = controlledValue !== undefined ? controlledValue : internalValue;

    const filteredSuggestions = suggestions.filter(suggestion =>
      suggestion.value.toLowerCase().includes(String(value).toLowerCase())
    );

    const updateDropdownPosition = React.useCallback(() => {
      if (inputRef.current && portalContainer) {
        const inputRect = inputRef.current.getBoundingClientRect();
        const containerRect = portalContainer.getBoundingClientRect();

        // Calculate position relative to the portal container
        setDropdownStyle({
          top: inputRect.bottom - containerRect.top + 4,
          left: inputRect.left - containerRect.left,
          width: inputRect.width,
        });
      }
    }, [portalContainer]);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        const clickedInWrapper = wrapperRef.current?.contains(target);
        const clickedInDropdown = dropdownRef.current?.contains(target);

        if (!clickedInWrapper && !clickedInDropdown) {
          setOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    React.useEffect(() => {
      if (open) {
        updateDropdownPosition();
        window.addEventListener("scroll", updateDropdownPosition, true);
        window.addEventListener("resize", updateDropdownPosition);
        return () => {
          window.removeEventListener("scroll", updateDropdownPosition, true);
          window.removeEventListener("resize", updateDropdownPosition);
        };
      }
    }, [open, updateDropdownPosition]);

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
          ref={node => {
            inputRef.current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          className={className}
          {...props}
        />
        {open &&
          filteredSuggestions.length > 0 &&
          dropdownStyle &&
          portalContainer &&
          createPortal(
            <div
              ref={dropdownRef}
              className="absolute z-[100] max-h-60 overflow-y-auto overflow-x-hidden rounded-lg border border-neutral-150 bg-white shadow-md dark:border-neutral-800 dark:bg-neutral-900"
              style={{
                top: dropdownStyle.top,
                left: dropdownStyle.left,
                width: dropdownStyle.width,
              }}
            >
              {filteredSuggestions.map(suggestion => (
                <div
                  key={suggestion.value}
                  className="relative cursor-pointer mx-1 px-2 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleSuggestionClick(suggestion.value)}
                >
                  {suggestion.label || suggestion.value}
                </div>
              ))}
            </div>,
            portalContainer
          )}
      </div>
    );
  }
);

InputWithSuggestions.displayName = "InputWithSuggestions";
