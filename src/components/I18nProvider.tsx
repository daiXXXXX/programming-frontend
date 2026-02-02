import { ReactNode } from 'react'
import { useKV } from '@github/spark/hooks'
import { I18nContext } from '@/hooks/use-i18n'
import { Language, getTranslation } from '@/lib/i18n'

interface I18nProviderProps {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguage] = useKV<Language>('app-language', 'zh')

  const t = getTranslation(language || 'zh')

  return (
    <I18nContext.Provider value={{ language: language || 'zh', setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}
