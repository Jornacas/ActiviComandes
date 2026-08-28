import type { Metadata, Viewport } from 'next';
import { Fredoka, Nunito_Sans } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from 'sonner';
import './globals.css';

/**
 * Tipografia del design system d'Eixos, la mateixa que l'app del monitor:
 * Fredoka per als títols, Nunito Sans per al text.
 */
const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-fredoka',
  display: 'swap',
});

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Materials · Eixos Creativa',
  description: 'Sol·licitud de materials per a les activitats',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Materials',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F9FA' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1117' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ca" suppressHydrationWarning>
      <body
        className={`${fredoka.variable} ${nunitoSans.variable} font-[family-name:var(--font-body)] bg-page text-fg1 antialiased`}
      >
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
