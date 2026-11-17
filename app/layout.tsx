import type { Metadata, Viewport } from 'next'
import { Red_Hat_Display, Red_Hat_Text, Red_Hat_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const redHatDisplay = Red_Hat_Display({ subsets: ["latin"], variable: "--font-red-hat-display" });
const redHatText = Red_Hat_Text({ subsets: ["latin"], variable: "--font-red-hat-text" });
const redHatMono = Red_Hat_Mono({ subsets: ["latin"], variable: "--font-red-hat-mono" });

export const viewport: Viewport = {
  themeColor: '#04040b',
  colorScheme: 'dark',
}

export const metadata: Metadata = {
  title: 'Compound Reporting | Enterprise DeFi Accounting',
  description: 'Enterprise-grade Compound protocol loan and collateral activity reporting for Ethereum addresses',
  generator: 'v0.app',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${redHatDisplay.variable} ${redHatText.variable} ${redHatMono.variable} dark`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
