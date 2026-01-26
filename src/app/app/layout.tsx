'use client';

import { AppShellNew } from '@/components/layout/app-shell-new';
import { SplashScreen, useSplashScreen } from '@/components/splash/splash-screen';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { showSplash, completeSplash, hasChecked } = useSplashScreen();

  // Don't render anything until we've checked localStorage
  if (!hasChecked) {
    return null;
  }

  return (
    <>
      {showSplash && <SplashScreen onComplete={completeSplash} />}
      <AppShellNew>{children}</AppShellNew>
    </>
  );
}
