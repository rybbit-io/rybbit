import type { ReactNode } from 'react';
import { CustomHeader } from '@/components/CustomHeader';
import { Footer } from '@/components/Footer';

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CustomHeader />
      <main className="flex-1 min-h-screen">
        {children}
      </main>
      <Footer />
    </>
  );
}