import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { getMessages } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const messages = await getMessages()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <Navbar />
        <main className="flex-1 flex flex-col pb-16 lg:pb-0">{children}</main>
        <BottomNav isLoggedIn={!!user} />
      </NextIntlClientProvider>
    </>
  )
}
