import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Digital Flipbook',
  description: 'Experience GIFs the way they deserve - frame by frame, like flipping through a physical flipbook. A tactile way to slow down and appreciate animation.',
  keywords: ['GIF', 'flipbook', 'animation', 'frame viewer', 'GIF player', 'frame by frame'],
  authors: [{ name: 'Digital Flipbook' }],
  openGraph: {
    title: 'Digital Flipbook',
    description: 'Experience GIFs the way they deserve - frame by frame, like flipping through a physical flipbook.',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1568,
        height: 778,
        alt: 'Digital Flipbook - A tactile way to experience GIFs',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Digital Flipbook',
    description: 'Experience GIFs the way they deserve - frame by frame, like flipping through a physical flipbook.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.jpg',
    apple: '/favicon.jpg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
