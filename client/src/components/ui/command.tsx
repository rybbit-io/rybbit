"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command as CommandPrimitive } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { FADE_IN, FADE_OUT, SPRING_PANEL } from "@/lib/motion";
import { Dialog, DialogPortal } from "@/components/ui/dialog";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    data-slot="command"
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-transparent text-neutral-950 dark:text-neutral-50",
      className
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

type CommandDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Names the dialog for screen readers; not shown. */
  title: string;
  description: string;
  className?: string;
  /** The menu itself, usually a <Command>. */
  children: React.ReactNode;
} & Pick<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
  "onCloseAutoFocus" | "onEscapeKeyDown" | "onKeyDown"
>;

/**
 * A command menu in a Radix Dialog, which supplies the dialog role, focus trap,
 * scroll lock and Escape. The panel sits near the top of the viewport so the
 * input stays put while results change, and floats in on the shared panel
 * spring. Controlled only: the exit animation needs to know when `open` drops.
 */
const CommandDialog = ({
  open,
  onOpenChange,
  title,
  description,
  className,
  children,
  ...contentProps
}: CommandDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <AnimatePresence>
      {open && (
        <DialogPortal key="command-dialog" forceMount>
          <DialogPrimitive.Overlay asChild forceMount>
            <motion.div
              className="fixed inset-0 z-50 bg-black/25 dark:bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: FADE_IN }}
              exit={{ opacity: 0, transition: FADE_OUT }}
            />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content asChild forceMount {...contentProps}>
            <motion.div
              className={cn(
                "fixed inset-x-0 top-[12vh] z-50 mx-auto flex w-[calc(100%-2rem)] max-w-xl flex-col overflow-hidden rounded-lg border border-neutral-150 bg-white text-neutral-950 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18),0_1px_2px_rgba(0,0,0,0.06)] outline-none dark:border-neutral-750 dark:bg-neutral-800 dark:text-neutral-50 dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.65),0_1px_2px_rgba(0,0,0,0.4)]",
                className
              )}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: { ...SPRING_PANEL, opacity: FADE_IN } }}
              exit={{ opacity: 0, scale: 0.98, y: 6, transition: FADE_OUT }}
            >
              <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
              {children}
            </motion.div>
          </DialogPrimitive.Content>
        </DialogPortal>
      )}
    </AnimatePresence>
  </Dialog>
);

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & {
    wrapperClassName?: string;
    /** Rendered after the input, e.g. a key hint. */
    children?: React.ReactNode;
  }
>(({ className, wrapperClassName, children, ...props }, ref) => (
  <div
    data-slot="command-input-wrapper"
    className={cn(
      "flex h-9 items-center gap-2 border-b border-neutral-200 px-3 dark:border-neutral-700",
      wrapperClassName
    )}
  >
    <SearchIcon className="h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      data-slot="command-input"
      className={cn(
        "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-neutral-400",
        className
      )}
      {...props}
    />
    {children}
  </div>
));

CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    data-slot="command-list"
    className={cn("max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto p-1", className)}
    {...props}
  />
));

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    data-slot="command-empty"
    className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400"
    {...props}
  />
));

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    data-slot="command-group"
    className={cn(
      "overflow-hidden text-neutral-950 dark:text-neutral-50 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-neutral-500 dark:[&_[cmdk-group-heading]]:text-neutral-400",
      className
    )}
    {...props}
  />
));

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    data-slot="command-separator"
    className={cn("-mx-1 my-1 h-px bg-neutral-100 dark:bg-neutral-700", className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    data-slot="command-item"
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-neutral-100 data-[selected=true]:text-neutral-900 data-[disabled=true]:opacity-50 dark:data-[selected=true]:bg-neutral-750 dark:data-[selected=true]:text-neutral-50",
      className
    )}
    {...props}
  />
));

CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      data-slot="command-shortcut"
      className={cn("ml-auto text-xs tracking-widest text-neutral-500 dark:text-neutral-400", className)}
      {...props}
    />
  );
};
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
