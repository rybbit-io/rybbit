import type { ReactNode } from 'react';
import { CustomHeader } from '@/components/CustomHeader';
import { Footer } from '@/components/Footer';

export default function PricingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <CustomHeader />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}