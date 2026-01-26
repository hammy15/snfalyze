import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth/context';
import { AppShell } from '@/components/layout/app-shell';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import './globals.css';

export const metadata: Metadata = {
  title: 'SNFalyze | Cascadia Healthcare',
  description: 'AI-driven underwriting and deal intelligence platform for skilled nursing, assisted living, and independent living facilities.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SNFalyze',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'SNFalyze',
    title: 'SNFalyze - Cascadia Healthcare',
    description: 'Intelligent deal analysis platform for healthcare facility acquisitions',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SNFalyze - Intelligent Deal Analysis Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SNFalyze - Cascadia Healthcare',
    description: 'Intelligent deal analysis platform for healthcare facility acquisitions',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#14B8A6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme initialization */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('SNFalyze SW registered:', registration.scope);
                  }, function(err) {
                    console.log('SNFalyze SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
        {/* iOS-specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SNFalyze" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {/* Splash screens for iOS */}
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />
      </head>
      <body className="transition-colors duration-300">
        <AuthProvider>
          <AppShell>{children}</AppShell>
          <InstallPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}
