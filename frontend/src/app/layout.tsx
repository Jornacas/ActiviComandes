import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Container } from '@mui/material'
import CustomThemeProvider from '../components/ThemeProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Comanda de Materiales',
  description: 'Sistema de gestión de pedidos de materiales educativos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <CustomThemeProvider>
          <Container maxWidth="xl" sx={{ py: 4 }}>
            {children}
          </Container>
        </CustomThemeProvider>
      </body>
    </html>
  )
}