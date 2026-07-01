"use client";

import * as React from "react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  initialFocus,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
  initialFocus?: boolean;
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      autoFocus={initialFocus ?? props.autoFocus}
      className={cn(
        "group/calendar bg-white p-3 [--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent dark:bg-neutral-850",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: date => date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1", defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-[--cell-size] w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-md border border-neutral-150 shadow-xs has-focus:border-neutral-500 has-focus:ring-[3px] has-focus:ring-neutral-500/50 dark:border-neutral-800 dark:has-focus:border-neutral-400 dark:has-focus:ring-neutral-400/50",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn("absolute inset-0 bg-white opacity-0 dark:bg-neutral-900", defaultClassNames.dropdown),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5 [&>svg]:text-neutral-500 dark:[&>svg]:text-neutral-400",
          defaultClassNames.caption_label
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 select-none rounded-md text-[0.8rem] font-normal text-neutral-500 dark:text-neutral-400",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn("w-[--cell-size] select-none", defaultClassNames.week_number_header),
        week_number: cn(
          "select-none text-[0.8rem] text-neutral-500 dark:text-neutral-400",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
          defaultClassNames.day
        ),
        range_start: cn("rounded-l-md bg-neutral-50 dark:bg-neutral-700", defaultClassNames.range_start),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-neutral-50 dark:bg-neutral-700", defaultClassNames.range_end),
        today: cn(
          "rounded-md bg-neutral-50 text-neutral-900 data-[selected=true]:rounded-none dark:bg-neutral-700 dark:text-neutral-50",
          defaultClassNames.today
        ),
        outside: cn(
          "text-neutral-500 aria-selected:text-neutral-500 dark:text-neutral-400 dark:aria-selected:text-neutral-400",
          defaultClassNames.outside
        ),
        disabled: cn("text-neutral-500 opacity-50 dark:text-neutral-400", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />;
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className={cn("size-4", className)} {...props} />;
          }

          if (orientation === "right") {
            return <ChevronRightIcon className={cn("size-4", className)} {...props} />;
          }

          return <ChevronDownIcon className={cn("size-4", className)} {...props} />;
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">{children}</div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

const dayButtonBaseClasses = cn(
  "data-[selected-single=true]:bg-neutral-700 data-[selected-single=true]:text-neutral-50",
  "dark:data-[selected-single=true]:bg-neutral-200 dark:data-[selected-single=true]:text-neutral-900",
  "data-[range-middle=true]:bg-neutral-50 data-[range-middle=true]:text-neutral-900",
  "dark:data-[range-middle=true]:bg-neutral-700 dark:data-[range-middle=true]:text-neutral-50",
  "data-[range-start=true]:bg-neutral-700 data-[range-start=true]:text-neutral-50",
  "dark:data-[range-start=true]:bg-neutral-200 dark:data-[range-start=true]:text-neutral-900",
  "data-[range-end=true]:bg-neutral-700 data-[range-end=true]:text-neutral-50",
  "dark:data-[range-end=true]:bg-neutral-200 dark:data-[range-end=true]:text-neutral-900",
  "group-data-[focused=true]/day:border-neutral-700 group-data-[focused=true]/day:ring-neutral-700/50",
  "dark:group-data-[focused=true]/day:border-neutral-400 dark:group-data-[focused=true]/day:ring-neutral-400/50",
  "flex aspect-square h-auto w-full min-w-[--cell-size] flex-col gap-1 font-normal leading-none",
  "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px]",
  "data-[range-end=true]:rounded-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md",
  "[&>span]:text-xs [&>span]:opacity-70"
);

function CalendarDayButton({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(dayButtonBaseClasses, defaultClassNames.day, className)}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
