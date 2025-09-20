import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Container } from '@mui/material'
import CustomThemeProvider from '../components/ThemeProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sol·licitud de Materials',
  description: 'App per sol·licitar materials educatius',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#1976d2',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ca">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1976d2" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <CustomThemeProvider>
          <Container maxWidth="md" sx={{ py: 2, minHeight: '100vh' }}>
            {children}
          </Container>
        </CustomThemeProvider>
      </body>
    </html>
  )
}