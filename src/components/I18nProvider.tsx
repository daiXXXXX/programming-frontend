'use client'

import { ReactNode, useState, useEffect } from 'react'
import { I18nContext } from '@/hooks/use-i18n'
import { Language, getTranslation } from '@/lib/i18n'

interface I18nProviderProps {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>('zh')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // 从 localStorage 读取语言设置
    const stored = localStorage.getItem('app-language')
    if (stored === 'zh' || stored === 'en') {
      setLanguageState(stored)
    }
    setMounted(true)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('app-language', lang)
  }

  const t = getTranslation(language)

  // 防止SSR水合不匹配
  if (!mounted) {
    return (
      <I18nContext.Provider value={{ language: 'zh', setLanguage, t: getTranslation('zh') }}>
        {children}
      </I18nContext.Provider>
    )
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}
