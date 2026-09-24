import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { SkipLink } from '@/components/layout/SkipLink';
import { RouteAnnouncer } from '@/components/layout/RouteAnnouncer';
import { AccessibilityBar } from '@/components/accessibility/AccessibilityBar';
import { AccessibilityProvider } from '@/components/accessibility/AccessibilityProvider';
import { ServerPreferencesSync } from '@/components/accessibility/ServerPreferencesSync';
import { VLibrasWidgetLoader } from '@/components/accessibility/VLibrasWidgetLoader';
import { SessionProvider } from '@/components/session/SessionProvider';
import 'katex/dist/katex.min.css';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'SINA_IA — Plataforma Educacional Inclusiva e Adaptativa',
    template: '%s | SINA_IA',
  },
  description:
    'Ambiente inclusivo e universal para apoio à aprendizagem em engenharia, ciências e tecnologia com suporte UDL e WCAG 2.2 AAA.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)] flex flex-col">
        <AccessibilityProvider>
          <SessionProvider>
            <ServerPreferencesSync />
            <SkipLink />
            <RouteAnnouncer />
            <AccessibilityBar />
            <AppHeader />
            <main
              id="main-content"
              tabIndex={-1}
              className="flex min-h-0 flex-1 flex-col outline-none w-full"
            >
              {children}
            </main>
            <AppFooter />
            <VLibrasWidgetLoader />
          </SessionProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
