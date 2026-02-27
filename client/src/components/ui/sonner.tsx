"use client";

import hotToast, { Toaster as HotToaster } from "react-hot-toast";

const Toaster = () => {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        className: [
          "!bg-white !text-neutral-800",
          "!border !border-neutral-150 !shadow-lg",
          "!rounded-lg !text-sm !font-medium",
          "dark:!bg-neutral-850 dark:!text-neutral-200",
          "dark:!border-neutral-850",
        ].join(" "),
        success: {
          iconTheme: {
            primary: "#10b981",
            secondary: "#fff",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
        },
      }}
    />
  );
};

const toast = Object.assign(
  (message: string) => hotToast(message),
  {
    success: (message: string) => hotToast.success(message),
    error: (message: string) => hotToast.error(message),
    info: (message: string) =>
      hotToast(message, {
        icon: "ℹ️",
      }),
    dismiss: (id?: string) => hotToast.dismiss(id),
    custom: hotToast.custom,
  }
);

export { Toaster, toast };
