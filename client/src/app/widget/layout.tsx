export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`html, body { background: transparent !important; margin: 0; padding: 0; }`}</style>
      {children}
    </>
  );
}
