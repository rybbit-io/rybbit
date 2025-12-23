import { forwardRef } from "react";
import { GroupBase, Props as ReactSelectProps } from "react-select";

import Creatable from "react-select/creatable";

import { cn } from "@/lib/utils";

export type MultiSelectProps<
  Option,
  IsMulti extends boolean = true,
  Group extends GroupBase<Option> = GroupBase<Option>,
> = Omit<ReactSelectProps<Option, IsMulti, Group>, "theme" | "classNames"> & {
  error?: boolean;
};

export const MultiSelect = forwardRef<any, MultiSelectProps<any>>(({ className, error, ...props }, ref) => {
  return (
    <Creatable
      ref={ref}
      isMulti
      unstyled
      closeMenuOnSelect={false}
      className={cn(className)}
      classNames={{
        control: ({ isFocused }) =>
          cn(
            "flex h-[36px] box-border rounded-md px-3 py-[3px] text-sm transition-colors border border-neutral-200 dark:border-neutral-750",
            "placeholder:text-muted-foreground ",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isFocused && "ring-1 ring-ring",
            error && "border-destructive ring-destructive"
          ),
        placeholder: () => "text-muted-foreground",
        input: () => "text-sm",
        menu: () =>
          "mt-2 rounded-md border border-neutral-150 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 shadow-md py-1",
        menuList: () => "text-sm",
        option: ({ isFocused, isSelected }) =>
          cn(
            "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 outline-none transition-colors",
            isSelected && "bg-primary text-primary-foreground",
            isFocused && !isSelected && "bg-accent text-accent-foreground",
            !isFocused && !isSelected && "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
          ),
        multiValue: () =>
          "inline-flex items-center bg-neutral-200 dark:bg-neutral-750 rounded-md text-secondary-foreground mr-1",
        multiValueLabel: () => "px-2 text-xs leading-none",
        multiValueRemove: () =>
          cn("flex items-center justify-center p-1", "hover:bg-destructive hover:text-destructive-foreground"),
        valueContainer: () => "gap-1 flex flex-wrap items-center",
        clearIndicator: () => "p-1 text-muted-foreground hover:text-foreground",
        dropdownIndicator: () => "p-1 text-muted-foreground hover:text-foreground",
        indicatorSeparator: () => "bg-input mx-2 my-2 w-px",
        noOptionsMessage: () => "text-muted-foreground p-2 text-sm",
      }}
      {...props}
    />
  );
});

MultiSelect.displayName = "MultiSelect";
