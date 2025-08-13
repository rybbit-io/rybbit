import { AppSidebar } from "./AppSidebar";

export function StandardPage({ children, showSidebar = true }: { children: React.ReactNode; showSidebar?: boolean }) {
  return (
    <div className="h-full flex w-full">
      {showSidebar && <AppSidebar />}
      <main className="flex flex-col items-center px-4 py-4 w-full h-dvh overflow-y-auto">
        <div className="w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
