import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['pl', 'en', 'de', 'es', 'zh'],
  defaultLocale: 'pl',
  localePrefix: 'as-needed',
  localeDetection: false,
})
