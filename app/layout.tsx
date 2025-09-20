import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './styles/main.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SubliMaroc - Plateforme de Sublimation au Maroc',
  description: 'Découvrez nos services de sublimation de haute qualité au Maroc',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  )
} 