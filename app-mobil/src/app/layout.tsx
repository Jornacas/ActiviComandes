import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Box } from '@mui/material'
import CustomThemeProvider from '../components/ThemeProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sol·licitud de Materials - v2.1',
  description: 'App per sol·licitar materials educatius - Sistema de carret',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#1976d2" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className} style={{ margin: 0, padding: 0 }}>
        <CustomThemeProvider>
          <Box sx={{ 
            width: '100%', 
            minHeight: '100vh', 
            px: { xs: 1, sm: 2 }, 
            py: { xs: 1, sm: 2 },
            backgroundColor: '#f5f5f5'
          }}>
            {children}
          </Box>
        </CustomThemeProvider>
      </body>
    </html>
  )
}