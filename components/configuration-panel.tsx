"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCcw, Settings, Zap } from "lucide-react"
import { DOUYIN_LLM_VOICE_OPTIONS, PROVIDER_MODELS, PROVIDERS, VOICE_OPTIONS, type ProviderId } from "@/lib/providers"
import type { TTSConfig } from "./tts-comparison-platform"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/i18n-provider"
import { sampleSentences as allSampleSentences, type Language } from "@/lib/i18n"

interface ConfigurationPanelProps {
  config: TTSConfig
  onConfigChange: (config: TTSConfig) => void
  onStartComparison: () => void
  isRunning: boolean
  hideHeader?: boolean
  hideActionButton?: boolean
  className?: string
  onTextInputRef?: (ref: HTMLTextAreaElement | null) => void
}

export function ConfigurationPanel({
  config,
  onConfigChange,
  onStartComparison,
  isRunning,
  hideHeader = false,
  hideActionButton = false,
  className,
  onTextInputRef,
}: ConfigurationPanelProps) {
  const [randomSpinning, setRandomSpinning] = useState(false)
  const updateConfig = (updates: Partial<TTSConfig>) => {
    onConfigChange({ ...config, ...updates })
  }
  const { t, language } = useI18n()
  // local control for which language's sample sentences to show in the Samples dropdown
  const [samplesLang, setSamplesLang] = useState<Language>(language)

  useEffect(() => {
    // when global language changes, keep the samples language in sync by default
    setSamplesLang(language)
  }, [language])

  const localSampleSentences = allSampleSentences[samplesLang] || []
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const [voiceFilters, setVoiceFilters] = useState<Record<string, string>>({})
  const [voiceFiltersDebounced, setVoiceFiltersDebounced] = useState<Record<string, string>>({})

  // global debounce for voice filters (simple): copy voiceFilters into debounced after timeout
  useEffect(() => {
    const t = setTimeout(() => setVoiceFiltersDebounced(voiceFilters), 200)
    return () => clearTimeout(t)
  }, [voiceFilters])

  useEffect(() => {
    onTextInputRef?.(textAreaRef.current)
    return () => onTextInputRef?.(null)
  }, [onTextInputRef])

  const toggleProvider = (providerId: ProviderId) => {
    const isSelected = config.providers.includes(providerId)
    const providerModels = PROVIDER_MODELS[providerId] || []
    const providerVoices = VOICE_OPTIONS[providerId] || []

    if (isSelected) {
      const newProviders = config.providers.filter((p) => p !== providerId)
      const newModels = { ...(config.models || {}) }
      const newVoices = { ...(config.voices || {}) }
      delete newModels[providerId]
      delete newVoices[providerId]

      updateConfig({ providers: newProviders, models: newModels, voices: newVoices })
      return
    }

    const newProviders = [...config.providers, providerId]
    const newModels = { ...(config.models || {}) }
    const newVoices = { ...(config.voices || {}) }

    if (!newModels[providerId] && providerModels.length > 0) {
      // Filter out lunalabs0 for Luna provider
      const availableModels = providerId === 'luna'
        ? providerModels.filter(m => m.value !== 'lunalabs0')
        : providerModels
      newModels[providerId] = availableModels[0]?.value || providerModels[0].value
    }

    if (!newVoices[providerId] && providerVoices.length > 0) {
      newVoices[providerId] = providerVoices[0].value
    }

    updateConfig({ providers: newProviders, models: newModels, voices: newVoices })
  }

  const setProviderVoice = (providerId: ProviderId, value: string) => {
    const newVoices = { ...(config.voices || {}) }
    const trimmed = value.trim()

    if (trimmed.length === 0) {
      delete newVoices[providerId]
    } else {
      newVoices[providerId] = trimmed
    }

    updateConfig({ voices: newVoices })
  }

  const canStart = config.text.trim().length > 0 && config.providers.length > 0

  return (
    <div
      className={cn(
        "glass-panel flex min-h-0 flex-col gap-6 rounded-3xl border border-white/10 p-6 text-foreground",
        className,
      )}
    >
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10">
              <Settings className="h-4 w-4 text-sky-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">{t("config.title")}</h2>
              <p className="text-xs text-foreground/60">{t("config.subtitle")}</p>
            </div>
          </div>
          <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-foreground/60">
            {config.providers.length > 0
              ? t("config.providers.count", { count: config.providers.length })
              : t("config.providers.none")}
          </div>
        </div>
      )}

  <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid lg:[grid-template-columns:minmax(240px,30%)_1fr] lg:gap-6 lg:items-stretch">
    <div className="flex h-full flex-col gap-6">
  <Card className="border border-white/10 bg-white/[0.03] shadow-none" >
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">{t("config.textSection.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text-input" className="text-xs uppercase tracking-wider text-foreground/60">
                {t("config.textSection.title")}
              </Label>
              <Textarea
                id="text-input"
                placeholder={t("config.textSection.placeholder")}
                value={config.text}
                onChange={(e) => updateConfig({ text: e.target.value })}
                className="min-h-[120px] resize-none border-white/10 bg-white/5 text-sm text-foreground placeholder:text-foreground/30"
                ref={textAreaRef}
              />
              <div className="flex items-center justify-between text-xs text-foreground/60">
                <span>{t("config.textCounter", { count: config.text.length })}</span>
                <button
                  type="button"
                  onClick={() => {
                    const randomSentence = localSampleSentences[Math.floor(Math.random() * localSampleSentences.length)]
                    updateConfig({ text: randomSentence })
                    setRandomSpinning(true)
                    setTimeout(() => setRandomSpinning(false), 500)
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-foreground transition hover:bg-white/20"
                  aria-label={t("config.samples.placeholder")}
                  title={t("config.samples.placeholder")}
                >
                  <RefreshCcw className={cn("h-4 w-4", randomSpinning && "animate-spin")} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-foreground/50">{t("config.samples.label")}</Label>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Select
                    onValueChange={(value) => {
                      if (!value) return
                      updateConfig({ text: value })
                    }}
                  >
                    <SelectTrigger className="h-9 border-white/10 bg-white/5 text-sm text-foreground min-w-0">
                      <SelectValue asChild>
                        <span className="min-w-0 truncate block">{t("config.samples.placeholder") as string}</span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-72 border border-white/10 bg-slate-950/95 text-foreground">
                      {localSampleSentences.map((sentence, index) => (
                        <SelectItem key={index} value={sentence}>
                          {sentence}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="ml-3 inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSamplesLang("zh")}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs",
                      samplesLang === "zh" ? "bg-white/90 text-slate-900" : "bg-transparent text-foreground/70 hover:bg-white/5",
                    )}
                  >
                    中
                  </button>
                  <button
                    type="button"
                    onClick={() => setSamplesLang("en")}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs",
                      samplesLang === "en" ? "bg-white/90 text-slate-900" : "bg-transparent text-foreground/70 hover:bg-white/5",
                    )}
                  >
                    EN
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-foreground/50">{t("config.advanced.label")}</Label>
              <p className="rounded-2xl border border-dashed border-white/15 px-4 py-3 text-xs text-foreground/45">
                {t("config.advanced.desc")}
              </p>
            </div>
          </CardContent>
        </Card>
        </div>

  <div className="flex h-full flex-1">
  <Card className="border border-white/10 bg-white/[0.03] shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base text-foreground">{t("config.providers.title")}</CardTitle>
              <p className="text-xs text-foreground/60">{t("config.providers.subtitle")}</p>
            </div>
            <div className="text-xs text-foreground/60">{t("config.providers.count", { count: config.providers.length })}</div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <div
              className="grid max-h-[min(480px,calc(100vh-360px))] min-h-[min(480px,calc(100vh-360px))] gap-4 overflow-y-auto"
            >
              {PROVIDERS.filter((provider) => !['elevenlabs', 'siliconflow'].includes(provider.id)).map((provider) => {
                const isSelected = config.providers.includes(provider.id)
                const providerModels = PROVIDER_MODELS[provider.id] || []
                const selectedModel = (config.models || {})[provider.id]
                const providerVoices =
                  provider.id === "douyin"
                    ? selectedModel === "volcano_llm"
                      ? DOUYIN_LLM_VOICE_OPTIONS
                      : VOICE_OPTIONS.douyin || []
                    : provider.id === "luna"
                      ? selectedModel === "lunalabs0"
                        ? VOICE_OPTIONS.luna?.filter(v =>
                            ["female", "male", "child", "youngmale", "youngfemale"].includes(v.value)
                          ) || []
                        : VOICE_OPTIONS.luna?.filter(v =>
                            !["female", "male", "child", "youngmale", "youngfemale"].includes(v.value)
                          ) || []
                      : VOICE_OPTIONS[provider.id] || []
                const filter = (voiceFiltersDebounced[provider.id] || "").trim().toLowerCase()
                const filteredProviderVoices = filter
                  ? providerVoices.filter(
                      (v) => v.label.toLowerCase().includes(filter) || v.value.toLowerCase().includes(filter),
                    )
                  : providerVoices
                const currentVoice = (config.voices || {})[provider.id] || ""
                const hasPresetVoice = providerVoices.some((voice) => voice.value === currentVoice)
                const selectVoiceValue = hasPresetVoice ? currentVoice : "custom"
                const showCustomInput = selectVoiceValue === "custom"

                return (
                  <div
                    key={provider.id}
                    className="w-full space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 overflow-x-auto"
                    // keep a stable gutter for scrollbars inside the card
                    style={{ scrollbarGutter: "stable" ,overflow: 'hidden'
                    }}
                  >
                   
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={provider.id}
                        checked={isSelected}
                        onCheckedChange={() => toggleProvider(provider.id)}
                        className="mt-0.5 border-white/40 data-[state=checked]:border-transparent data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-indigo-500 data-[state=checked]:to-sky-400"
                      />
                      <div className="flex-1 space-y-1 min-w-0">
                        <Label htmlFor={provider.id} className="cursor-pointer text-sm font-medium text-foreground truncate">
                          {provider.label}
                        </Label>
                        <p className="text-xs text-foreground/60 truncate">{provider.description}</p>
                      </div>
                    </div>

                    {isSelected && (
                        <div className="pt-4">
                        <div className="flex gap-4 md:items-end min-w-0" style={{alignItems: 'start',display:'flex'}} >
                          <div className="space-y-2" style={{width:'40%',marginRight:'10%'}} >
                            <Label className="text-xs uppercase tracking-wider text-foreground/50">{t("config.model.label")}</Label>
                            {providerModels.length > 0 ? (
                              <Select
                                value={(config.models || {})[provider.id] || (provider.id === 'luna' ? 'lunalabs1' : providerModels[0]?.value)}
                                onValueChange={(value) => {
                                  const newModels = { ...(config.models || {}), [provider.id]: value }
                                  const availableVoices =
                                    provider.id === "douyin" && value === "volcano_llm"
                                      ? DOUYIN_LLM_VOICE_OPTIONS
                                      : provider.id === "luna" && value === "lunalabs0"
                                        ? VOICE_OPTIONS.luna?.filter(v =>
                                            ["female", "male", "child", "youngmale", "youngfemale"].includes(v.value)
                                          ) || []
                                        : provider.id === "luna" && value === "lunalabs1"
                                          ? VOICE_OPTIONS.luna?.filter(v =>
                                              !["female", "male", "child", "youngmale", "youngfemale"].includes(v.value)
                                            ) || []
                                          : VOICE_OPTIONS[provider.id] || []
                                  const defaultVoice = availableVoices[0]?.value
                                  const newVoices = { ...(config.voices || {}) }
                                  if (defaultVoice) {
                                    newVoices[provider.id] = defaultVoice
                                  } else {
                                    delete newVoices[provider.id]
                                  }
                                  updateConfig({ models: newModels, voices: newVoices })
                                }}
                              >
                                <SelectTrigger className="h-10 rounded-lg border-white/10 bg-white/5 text-sm text-foreground min-w-[160px] flex-shrink-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border border-white/10 bg-slate-950/95 text-foreground">
                                  {providerModels.filter((model) => model.value !== 'lunalabs0').map((model) => (
                                    <SelectItem key={model.value} value={model.value}>
                                      {model.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-xs text-foreground/50">{t("config.providers.noModel")}</p>
                            )}
                          </div>
                          <div className="space-y-2" >
                            <Label className="text-xs uppercase tracking-wider text-foreground/50">{t("config.voice.label")}</Label>
                            {providerVoices.length > 0 ? (
                             <>
                                <Select
                                value={providerVoices.length > 0 ? selectVoiceValue : undefined}
                                onValueChange={(value) => {
                                  if (value === "custom") {
                                    setProviderVoice(provider.id, "")
                                    return
                                  }
                                  setProviderVoice(provider.id, value)
                                }}
                              >
                  <SelectTrigger className="h-10 rounded-lg border-white/10 bg-white/5 text-sm text-foreground min-w-[160px] flex-shrink-0">
                                  <SelectValue placeholder={t("config.voice.label")} />
                                </SelectTrigger>
                                <SelectContent className="border border-white/10 bg-slate-950/95 text-foreground">
                                  {/* inline search inside dropdown */}
                                  <div className="px-3 py-2">
                                    <Input
                                      value={voiceFilters[provider.id] || ''}
                                      onChange={(e) => setVoiceFilters({ ...voiceFilters, [provider.id]: e.target.value })}
                                      placeholder={`搜索 ${provider.label} 的声线 / search voices`}
                                      className="h-9 rounded-md border-white/10 bg-white/5 text-sm text-foreground placeholder:text-foreground/30"
                                    />
                                  </div>
                                  {provider.id === "douyin" && selectedModel === "volcano_llm" && (
                                    <div className="px-3 py-1 text-xs text-foreground/50 border-b border-white/5">
                                      💡 智能音色：支持多情感、多语种、角色扮演
                                    </div>
                                  )}
                                  {provider.id === "douyin" && selectedModel === "volcano_standard" && (
                                    <div className="px-3 py-1 text-xs text-foreground/50 border-b border-white/5">
                                      🎯 标准音色：通用场景，音色稳定
                                    </div>
                                  )}
                                  {(filteredProviderVoices.length > 0 ? filteredProviderVoices : []).map((voice) => (
                                    <SelectItem key={voice.value} value={voice.value}>
                                      {voice.label}
                                    </SelectItem>
                                  ))}
                                  {filteredProviderVoices.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-foreground/60">暂无匹配的声线</div>
                                  )}
                                  <SelectItem value="custom">{t("config.customVoice.label")}</SelectItem>
                                </SelectContent>
                              </Select>
                                {!showCustomInput && (
                          <p className="text-[11px] text-foreground/60" style={{marginLeft:4,marginTop:8}}>{t("config.providers.customHint")}</p>
                        )}
                             </>  
                              
                             
                             
                            ) : (
                              <p className="text-xs text-foreground/50">{t("config.providers.noVoice")}</p>
                          )}
                          </div>

                          {showCustomInput && (
                            <div className="space-y-2">
                              <Label className="text-xs uppercase tracking-wider text-foreground/50">{t("config.customVoice.label")}</Label>
                              <Input
                                value={currentVoice}
                                onChange={(event) => setProviderVoice(provider.id, event.target.value)}
                                placeholder={t("config.customVoice.placeholder")}
                                className="h-10 rounded-lg border-white/10 bg-white/5 text-sm text-foreground placeholder:text-foreground/30 min-w-[160px] flex-shrink-0"
                              />
                            
                            </div>

                          )}
                        </div>

                        
                      </div>
                    )}
                  </div>
                )
              })}

              {config.providers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/15 h-full flex items-center justify-center px-4 text-center text-sm text-foreground/60">
                  {t("config.providers.empty")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {!hideActionButton && (
        <div className="border-t border-white/10 pt-4">
          <div className="flex w-full flex-col items-center justify-center gap-3 md:flex-row">
            <Button
              onClick={onStartComparison}
              disabled={!canStart || isRunning}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-fuchsia-500 px-6 py-3 text-foreground shadow-[0_15px_45px_rgba(37,99,235,0.35)] transition hover:opacity-95 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              size="lg"
            >
              {isRunning ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {t("hero.cta.running")}
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  {t("hero.cta.ready")}
                </>
              )}
            </Button>

            {config.providers.length > 0 && (
              <p className="mt-2 text-center text-xs text-foreground/60 md:mt-0">
                {t("config.providers.count", { count: config.providers.length })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
