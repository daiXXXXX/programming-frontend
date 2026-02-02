import { createContext, useContext } from 'react'
import { Language, Translations } from '@/lib/i18n'

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: Translations
}

export const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
