"use client"

import React from "react"
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react"
import { sampleSentences, translations, type Language } from "@/lib/i18n"

interface I18nContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, variables?: Record<string, string | number>) => string
  sampleSentences: string[]
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

function format(template: string, variables?: Record<string, string | number>) {
  if (!variables) return template
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const value = variables[key]
    return value === undefined ? `{{${key}}}` : String(value)
  })
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Initialize with a deterministic default that matches the server render.
  // Avoid reading `window` or using randomness during initial render to prevent
  // React hydration mismatches (server rendered 'zh' but client randomly picks 'en').
  const [language, setLanguageState] = useState<Language>(() => {
    return "zh"
  })

  // On client hydration, read stored preference (if any) and update language.
  // Read stored preference exactly once on hydration; run only on mount.
  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem("tts:language")
    if (stored === "en" || stored === "zh") {
      // setLanguageState on mount if a stored preference exists. Setting the
      // same value is harmless and avoids referencing `language` here, so the
      // effect can remain mount-only without triggering the exhaustive-deps rule.
      setLanguageState(stored as Language)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("tts:language", language)
    }
  }, [language])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
  }, [])

  const t = useMemo(() => {
    return (key: string, variables?: Record<string, string | number>) => {
      const table = translations[language]
      const fallback = translations.en
      const template = table[key] ?? fallback[key] ?? key
      return format(template, variables)
    }
  }, [language])

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t, sampleSentences: sampleSentences[language] }),
    [language, setLanguage, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}
