'use client';

import { AppShellNew } from '@/components/layout/app-shell-new';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShellNew>{children}</AppShellNew>;
}
