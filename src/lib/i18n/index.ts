import zh from './zh'
import en from './en'

export type Language = 'zh' | 'en'

const translations: Record<Language, Record<string, string>> = {
  zh,
  en,
}

export function getTranslations(lang: Language): Record<string, string> {
  return translations[lang]
}

export function createT(lang: Language) {
  const messages = translations[lang]
  return function t(key: string): string {
    return messages[key] || key
  }
}
