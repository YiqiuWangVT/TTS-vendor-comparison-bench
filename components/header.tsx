"use client"

import { useEffect, useState } from "react"
import { Activity, Download, Moon, Sun } from "lucide-react"
import { getProviderLabel } from "@/lib/providers"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/components/i18n-provider"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

interface Result {
  provider: string
  status?: 'pending' | 'success' | 'error' | string
  metrics?: {
    frontend?: { ttfbMs?: number }
    backend?: { ttfbMs?: number }
  }
  audioUrl?: string
  error?: string
}

interface Config {
  text?: string
  language?: string
  models?: Record<string, string>
  voices?: Record<string, string>
}

export function Header({ results = [], config }: { results?: Result[]; config?: Config }) {
  const { toast } = useToast()
  const { t, language, setLanguage } = useI18n()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleExportCSV = () => {
    if (results.length === 0) {
      toast({
        title: t("results.empty.title"),
        description: t("config.providers.empty"),
        variant: "destructive",
      })
      return
    }

    try {
      const csvData = generateCSV(results, config)
      downloadCSV(csvData, `tts-comparison-${new Date().toISOString().split("T")[0]}.csv`)

      toast({
        title: t("header.export"),
        description: t("results.summary.title"),
      })
    } catch {
      toast({
        title: "Export failed",
        description: "There was an error generating the CSV file.",
        variant: "destructive",
      })
    }
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <header className="sticky top-0 z-20 px-4 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 px-6 py-4 text-foreground">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <Activity className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{t("header.title")}</h1>
              <p className="text-xs text-foreground/60 sm:text-sm">{t("header.subtitle")}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1 text-xs">
              {["zh", "en"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang as "zh" | "en")}
                  className={cn(
                    "rounded-full px-3 py-1 transition",
                    language === lang ? "bg-white/90 text-slate-900" : "text-foreground/70 hover:bg-white/10",
                  )}
                >
                  {t(`header.lang.${lang}`)}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-full border-white/20 bg-white/10 text-foreground hover:bg-white/20"
              aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {mounted ? (
                resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
              ) : (
                <span className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2 rounded-full border-white/20 bg-white/10 text-foreground hover:bg-white/20"
              disabled={results.length === 0}
            >
              <Download className="h-4 w-4" />
              {t("header.export")}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

function generateCSV(results: Result[], config?: Config) {
  const headers = [
    "Provider",
    "Status",
    "Text",
    "Language",
    "Model",
    "Voice",
    "Frontend TTFB (ms)",
    "Backend TTFB (ms)",
    "Audio URL",
    "Error",
    "Timestamp",
  ]

  const rows = results.map((result) => [
    getProviderLabel(result.provider),
    result.status ?? '',
    config?.text ?? "",
    config?.language ?? "",
    config?.models?.[result.provider] ?? "",
    config?.voices?.[result.provider] ?? "",
    result.metrics?.frontend?.ttfbMs ?? 0,
    result.metrics?.backend?.ttfbMs ?? 0,
    result.audioUrl ?? "",
    result.error ?? "",
    new Date().toISOString(),
  ])

  const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

  return csvContent
}

function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
