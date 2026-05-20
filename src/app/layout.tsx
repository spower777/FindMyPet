import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import 'leaflet/dist/leaflet.css'
import './globals.css'

const geist = Geist({ subsets: ['latin', 'latin-ext'], variable: '--font-geist' })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://findmypet-kohl.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'FindMyPet — znajdź swojego pupila',
    template: '%s | FindMyPet',
  },
  description: 'Społecznościowa mapa zagubionych i znalezionych zwierząt domowych. AI automatycznie dopasowuje zgłoszenia.',
  manifest: '/manifest.webmanifest',
  keywords: ['zaginiony pies', 'zaginiony kot', 'znalezione zwierzę', 'zgubiony pies', 'mapa zwierząt'],
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    url: APP_URL,
    siteName: 'FindMyPet',
    title: 'FindMyPet — znajdź swojego pupila',
    description: 'Społecznościowa mapa zagubionych i znalezionych zwierząt domowych. AI automatycznie dopasowuje zgłoszenia.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'FindMyPet' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FindMyPet — znajdź swojego pupila',
    description: 'Społecznościowa mapa zagubionych i znalezionych zwierząt domowych.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" suppressHydrationWarning className={`${geist.variable} h-full`}>
      <head>
        {/* Dark mode — prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
        <meta name="theme-color" content="#f97316" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased font-sans transition-colors duration-200">
        {children}
      </body>
    </html>
  )
}
