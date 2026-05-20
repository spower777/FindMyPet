'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4" />
      <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" fill="#34A853" />
      <path d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" fill="#FBBC05" />
      <path d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z" fill="#EA4335" />
    </svg>
  )
}

function LoginForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const errorParam = searchParams.get('error')
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'info' } | null>(() =>
    errorParam ? { text: decodeURIComponent(errorParam), type: 'error' } : null
  )
  const [loading, setLoading] = useState(false)

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage({ text: error.message, type: 'error' })
      setLoading(false)
    } else {
      router.push(next)
      router.refresh()
    }
  }

  async function signUp() {
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) {
      setMessage({ text: error.message, type: 'error' })
    } else {
      setMessage({ text: 'Sprawdź skrzynkę email — wysłaliśmy link potwierdzający.', type: 'info' })
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-8">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg dark:shadow-none border border-gray-100 dark:border-gray-800 p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-4xl mb-3">🐾</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">FindMyPet</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('login_title')}</p>
        </div>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-2xl py-3.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition mb-5 min-h-[48px]"
        >
          <GoogleIcon />
          {t('google')}
        </button>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100 dark:border-gray-800" />
          </div>
          <div className="relative text-center">
            <span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400">lub email</span>
          </div>
        </div>

        <form onSubmit={signIn} className="space-y-3">
          <input
            type="email"
            placeholder={t('email')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="input-field"
          />
          <input
            type="password"
            placeholder={`${t('password')} (min. 6)`}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="input-field"
          />

          {message && (
            <div className={`text-sm rounded-2xl px-4 py-3 ${
              message.type === 'error'
                ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3.5 rounded-2xl text-sm transition min-h-[48px]"
          >
            {loading ? '⏳' : t('login')}
          </button>
          <button
            type="button"
            onClick={signUp}
            disabled={loading}
            className="w-full border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 font-semibold py-3.5 rounded-2xl text-sm hover:bg-orange-50 dark:hover:bg-orange-950 transition min-h-[48px]"
          >
            {t('register')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
