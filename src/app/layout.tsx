import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Sattvic — Nourish your family. Honour your roots.',
  description: 'Personalised Indian meal planning with Ayurvedic wisdom, ' +
               'lunar fasting calendar, and family health profiles.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-cream text-charcoal antialiased">
        {children}
      </body>
    </html>
  )
}
