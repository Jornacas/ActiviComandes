import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Container } from '@mui/material'
import CustomThemeProvider from '../components/ThemeProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Panell d\'Administració - Comandes de Materials',
  description: 'Sistema de gestió de comandes de materials educatius - Eixos Creativa',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ca">
      <body className={inter.className}>
        <CustomThemeProvider>
          {children}
        </CustomThemeProvider>
      </body>
    </html>
  )
}