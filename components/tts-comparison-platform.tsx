"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { ConfigurationPanel } from "./configuration-panel"
import { ResultsDisplay } from "./results-display"
import { Header } from "./header"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, TimerReset } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"
import { getProviderLabel } from "@/lib/providers"

export interface TTSConfig {
  text: string
  language: string
  providers: string[]
  configurations: TTSConfiguration[]
}

export interface TTSConfiguration {
  id: string // unique id for each configuration
  provider: string
  model: string
  voice: string
}

export interface TTSResult {
  provider: string
  configId: string // unique identifier for this specific configuration
  configLabel: string // display label like "豆包火山 #1", "豆包火山 #2"
  metrics: {
    frontend: { ttfbMs: number }
    backend: { ttfbMs: number }
  }
  audioUrl: string
  audioMimeType?: string
  audioBytes?: number
  audioDurationSeconds?: number
  error?: string
  status: "pending" | "success" | "error"
}

export function TTSComparisonPlatform() {
  const [config, setConfig] = useState<TTSConfig>({
    text: "",
    language: "zh-CN",
    providers: [],
    configurations: [],
  })

  const [results, setResults] = useState<TTSResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  // lastRunAt removed: not used in UI currently
  const [columns, setColumns] = useState<1 | 2 | 3>(() => {
    if (typeof window === "undefined") return 3
    const saved = window.localStorage.getItem("tts:results:columns")
    return (saved === "1" || saved === "2" || saved === "3" ? Number(saved) : 3) as 1 | 2 | 3
  })
  const configSectionRef = useRef<HTMLDivElement>(null)
  const resultsSectionRef = useRef<HTMLDivElement>(null)
  const spotlightTimeoutRef = useRef<number | null>(null)
  const [spotlight, setSpotlight] = useState<"panel" | "results" | null>(null)
  const [textAreaElement, setTextAreaElement] = useState<HTMLTextAreaElement | null>(null)
  const { t, language } = useI18n()

  useEffect(() => {
    try {
      window.localStorage.setItem("tts:results:columns", String(columns))
    } catch {}
  }, [columns])

  useEffect(() => {
    return () => {
      if (spotlightTimeoutRef.current) {
        window.clearTimeout(spotlightTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const mapped = language === "zh" ? "zh-CN" : "en-US"
    setConfig((prev) => (prev.language === mapped ? prev : { ...prev, language: mapped }))
  }, [language])

  const triggerSpotlight = useCallback(
    (section: "panel" | "results", duration = 1200) => {
      setSpotlight(section)
      if (spotlightTimeoutRef.current) {
        window.clearTimeout(spotlightTimeoutRef.current)
      }
      spotlightTimeoutRef.current = window.setTimeout(() => setSpotlight(null), duration)
    },
    [],
  )

  const scrollToRef = useCallback((ref: RefObject<HTMLElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const handleStartComparison = useCallback(async () => {
    // Prefer the live textarea value (if present) to avoid a race where
    // a user types and immediately clicks Start before React state updates.
    const currentText = textAreaElement?.value ?? config.text
    if (!currentText.trim() || config.configurations.length === 0) {
      return
    }

  setIsRunning(true)

    // Get provider configurations for label generation
    const getProviderConfigCount = (providerId: string) => {
      return config.configurations.filter(c => c.provider === providerId).length
    }

    const getProviderConfigIndex = (configId: string) => {
      const providerConfigs = config.configurations.filter(c => c.provider === config.configurations.find(cf => cf.id === configId)?.provider)
      return providerConfigs.findIndex(c => c.id === configId) + 1
    }

    const initialResults: TTSResult[] = config.configurations.map((configItem) => {
      const providerLabel = getProviderLabel(configItem.provider)
      const configIndex = getProviderConfigIndex(configItem.id)
      return {
        provider: configItem.provider,
        configId: configItem.id,
        configLabel: `${providerLabel} #${configIndex}`,
        metrics: {
          frontend: { ttfbMs: 0 },
          backend: { ttfbMs: 0 },
        },
        audioUrl: "",
        status: "pending",
      }
    })

    setResults(initialResults)

    // Create an effective config object that uses the live text value so
    // downstream requests use the most recent user input.
    const effectiveConfig: TTSConfig = { ...config, text: currentText }

    try {
      await Promise.allSettled(
        config.configurations.map((configItem) =>
          runConfigurationComparison(configItem, effectiveConfig, setResults)
        ),
      )
    } finally {
      setIsRunning(false)
    }
  }, [config, textAreaElement])

  // completedCount and fastestTTFB removed; not currently used in UI
  // Note: lastRunLabel and runStatusText were unused in the UI; remove them to avoid lint warnings.

  const handlePrimaryAction = useCallback(() => {
    scrollToRef(configSectionRef)
    triggerSpotlight("panel")
    window.setTimeout(() => {
      textAreaElement?.focus({ preventScroll: true })
    }, 500)
  }, [scrollToRef, textAreaElement, triggerSpotlight])

  const handlePanelStart = useCallback(async () => {
    const currentText = textAreaElement?.value ?? config.text
    if (!currentText.trim() || config.configurations.length === 0) {
      triggerSpotlight("panel")
      scrollToRef(configSectionRef)
      return
    }

    scrollToRef(resultsSectionRef)
    triggerSpotlight("results", 1500)
    await handleStartComparison()
    triggerSpotlight("results", 1500)
  }, [config.configurations.length, config.text, handleStartComparison, scrollToRef, triggerSpotlight, textAreaElement])

  return (
    <div className="flex min-h-screen flex-col">
      <Header results={results} config={config} />

    <section className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
  <div className="mx-auto grid max-w-7xl gap-6 lg:min-h-[calc(100vh-160px)] lg:grid-cols-2 lg:grid-rows-[minmax(420px,auto)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative z-10 overflow-visible md:min-h-[420px] lg:min-h-[420px] rounded-2xl border border-white/6 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_45%,transparent_100%)] p-5 pb-2 text-foreground shadow-[0_12px_40px_rgba(59,130,246,0.12)] lg:col-span-2">
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35)_0%,_transparent_65%)]" aria-hidden="true" />
            <div className="relative flex flex-col gap-8 items-center text-center">
              <div className="max-w-5xl space-y-6 mx-auto">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm font-medium text-foreground backdrop-blur">
                  <Sparkles className="h-4 w-4" />
                  {t("hero.tagline")}
                </div>
                <div className="space-y-4">
                  <h1 className="text-4xl font-extrabold leading-tight text-foreground sm:text-5xl lg:text-6xl">
                    {t("hero.title")}
                  </h1>
                  <p className="mx-auto max-w-3xl text-lg text-foreground/70">{t("hero.description")}</p>
                </div>

                <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  <Button
                    size="lg"
                    onClick={handlePrimaryAction}
                    className="gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-fuchsia-500 px-6 text-foreground shadow-[0_20px_60px_rgba(37,99,235,0.35)] hover:from-indigo-400 hover:to-sky-300 hover:text-white"
                  >
                    {isRunning ? (
                      <>
                        <TimerReset className="h-5 w-5 animate-spin" />
                        {t("hero.cta.running")}
                      </>
                    ) : (
                      <>
                        让我们开始吧
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </Button>
                
                </div>

                {/* show last run label under hero for context */}
              </div>
            </div>
          </div>

          <div
            ref={configSectionRef}
            className={cn(
              "min-h-0 lg:col-span-2 lg:row-start-2 mt-6 lg:mt-10",
              "spotlight",
              spotlight === "panel" && "spotlight-active",
            )}
          >
            <ConfigurationPanel
              className="h-full w-full"
              config={config}
              onConfigChange={setConfig}
              onStartComparison={handlePanelStart}
              isRunning={isRunning}
              hideHeader
              onTextInputRef={setTextAreaElement}
            />
          </div>

          <div
            ref={resultsSectionRef}
            className={cn(
              "min-h-0 lg:col-span-2 lg:row-start-3",
              "spotlight",
              spotlight === "results" && "spotlight-active",
            )}
          >
            <ResultsDisplay
              className="h-full w-full"
              results={results}
              isRunning={isRunning}
              columns={columns}
              onSetColumns={(n) => setColumns(n)}
              text={config.text}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

async function runConfigurationComparison(
  configuration: TTSConfiguration,
  config: TTSConfig,
  setResults: (updater: (prev: TTSResult[]) => TTSResult[]) => void,
) {
  const startTime = performance.now()
  let frontendTTFB: number | null = null

  const requestBody = {
    text: config.text,
    language: config.language,
    providers: [configuration.provider],
    models: { [configuration.provider]: configuration.model },
    voices: { [configuration.provider]: configuration.voice },
  }

  // Debug log
  try {
    // eslint-disable-next-line no-console
    console.debug(`[client] runConfigurationComparison -> provider=${configuration.provider} model=${configuration.model} voice=${configuration.voice}`)
  } catch {}

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    frontendTTFB = Math.round(performance.now() - startTime)

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    const endTime = Math.round(performance.now() - startTime)

    const backendResult = data?.results?.find((r: TTSResult) => r.provider === configuration.provider)
    if (!backendResult) {
      throw new Error("No result returned for provider")
    }

    setResults((prev) =>
      prev.map((result) => {
        if (result.configId !== configuration.id) {
          return result
        }

        return {
          ...result,
          metrics: {
            frontend: {
              ttfbMs: frontendTTFB ?? endTime,
            },
            backend: backendResult.metrics.backend,
          },
          audioUrl: backendResult.audioUrl,
          ...(backendResult.audioMimeType ? { audioMimeType: backendResult.audioMimeType } : {}),
          audioBytes: backendResult.audioBytes,
          ...(typeof backendResult.audioDurationSeconds === "number" ? { audioDurationSeconds: backendResult.audioDurationSeconds } : {}),
          error: backendResult.error,
          status: backendResult.status ?? "success",
        }
      }),
    )
  } catch (error) {
    const elapsed = Math.round(performance.now() - startTime)
    setResults((prev) =>
      prev.map((result) =>
        result.configId === configuration.id
          ? {
              ...result,
              status: "error",
              error: error instanceof Error ? error.message : "Unknown error",
              metrics: {
                frontend: {
                  ttfbMs: frontendTTFB ?? elapsed,
                },
                backend: { ttfbMs: 0 },
              },
              audioMimeType: undefined,
            }
          : result,
      ),
    )
  }
}
