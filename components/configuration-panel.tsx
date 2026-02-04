"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCcw, Zap, Plus, Trash2, ArrowRight } from "lucide-react"
import { DOUYIN_LLM_VOICE_OPTIONS, PROVIDER_MODELS, PROVIDERS, VOICE_OPTIONS, type ProviderId, getProviderLabel } from "@/lib/providers"
import type { TTSConfig, TTSConfiguration } from "./tts-comparison-platform"
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
  const [samplesLang, setSamplesLang] = useState<Language>(language)

  useEffect(() => {
    setSamplesLang(language)
  }, [language])

  const localSampleSentences = allSampleSentences[samplesLang] || []
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const [voiceFilters, setVoiceFilters] = useState<Record<string, string>>({})
  const [voiceFiltersDebounced, setVoiceFiltersDebounced] = useState<Record<string, string>>({})

  useEffect(() => {
    const t = setTimeout(() => setVoiceFiltersDebounced(voiceFilters), 200)
    return () => clearTimeout(t)
  }, [voiceFilters])

  useEffect(() => {
    onTextInputRef?.(textAreaRef.current)
    return () => onTextInputRef?.(null)
  }, [onTextInputRef])

  // Generate unique ID for configurations
  const generateConfigId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Get configurations for a specific provider
  const getProviderConfigurations = (providerId: string): TTSConfiguration[] => {
    return config.configurations.filter(c => c.provider === providerId)
  }

  // Toggle provider selection
  const toggleProvider = (providerId: ProviderId) => {
    const isSelected = config.providers.includes(providerId)
    const providerModels = PROVIDER_MODELS[providerId] || []
    const providerVoices = VOICE_OPTIONS[providerId] || []

    if (isSelected) {
      // Remove provider and all its configurations
      const newProviders = config.providers.filter((p) => p !== providerId)
      const newConfigurations = config.configurations.filter(c => c.provider !== providerId)
      updateConfig({ providers: newProviders, configurations: newConfigurations })
      return
    }

    // Add provider with one default configuration
    const newProviders = [...config.providers, providerId]

    // Filter out lunalabs0 for Luna provider
    const availableModels = providerId === 'luna'
      ? providerModels.filter(m => m.value !== 'lunalabs0')
      : providerModels

    const defaultModel = availableModels[0]?.value || providerModels[0]?.value || ""
    const defaultVoice = providerVoices[0]?.value || ""

    const newConfigurations: TTSConfiguration[] = [
      ...config.configurations,
      {
        id: generateConfigId(),
        provider: providerId,
        model: defaultModel,
        voice: defaultVoice,
      }
    ]

    updateConfig({ providers: newProviders, configurations: newConfigurations })
  }

  // Add a new configuration for a provider
  const addConfiguration = (providerId: string) => {
    const providerModels = PROVIDER_MODELS[providerId as ProviderId] || []
    const providerVoices = VOICE_OPTIONS[providerId as ProviderId] || []

    // Filter out lunalabs0 for Luna provider
    const availableModels = providerId === 'luna'
      ? providerModels.filter((m: { value: string }) => m.value !== 'lunalabs0')
      : providerModels

    const defaultModel = availableModels[0]?.value || providerModels[0]?.value || ""
    const defaultVoice = providerVoices[0]?.value || ""

    const newConfigurations: TTSConfiguration[] = [
      ...config.configurations,
      {
        id: generateConfigId(),
        provider: providerId,
        model: defaultModel,
        voice: defaultVoice,
      }
    ]

    updateConfig({ configurations: newConfigurations })
  }

  // Remove a configuration
  const removeConfiguration = (configId: string) => {
    const newConfigurations = config.configurations.filter(c => c.id !== configId)

    // If no configurations left for a provider, remove the provider too
    const remainingProviders = new Set(newConfigurations.map(c => c.provider))
    const newProviders = config.providers.filter(p => remainingProviders.has(p))

    updateConfig({ providers: newProviders, configurations: newConfigurations })
  }

  // Update a configuration's model or voice
  const updateConfiguration = (configId: string, updates: Partial<Pick<TTSConfiguration, 'model' | 'voice'>>) => {
    const newConfigurations = config.configurations.map(c =>
      c.id === configId ? { ...c, ...updates } : c
    )
    updateConfig({ configurations: newConfigurations })
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Text Input Card - Always Visible */}
      <Card className="glass-panel rounded-3xl border border-white/10 bg-white/[0.03]">
        {!hideHeader && (
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-sky-300 bg-clip-text text-transparent">
                {t("config.title")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setRandomSpinning(true)
                  setTimeout(() => setRandomSpinning(false), 1000)
                  updateConfig({
                    text: localSampleSentences[Math.floor(Math.random() * localSampleSentences.length)]
                  })
                }}
                className="h-9 w-9 text-foreground/70 hover:text-foreground hover:bg-white/10"
              >
                <RefreshCcw className={cn("h-5 w-5", randomSpinning && "animate-spin")} />
              </Button>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">{t("config.text.label")}</Label>
              <Select
                value={samplesLang}
                onValueChange={(value) => setSamplesLang(value as Language)}
              >
                <SelectTrigger className="h-8 w-32 rounded-lg border-white/10 bg-white/5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border border-white/10 bg-slate-950/95">
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              ref={textAreaRef}
              value={config.text}
              onChange={(e) => updateConfig({ text: e.target.value })}
              placeholder={t("config.text.placeholder")}
              className="min-h-[120px] rounded-xl border-white/10 bg-white/5 text-base placeholder:text-foreground/30"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateConfig({ text: localSampleSentences[Math.floor(Math.random() * localSampleSentences.length)] })}
                className="h-8 rounded-lg border-white/10 bg-white/5 text-xs hover:bg-white/10"
              >
                <Zap className="mr-1 h-3 w-3" />
                {t("config.text.random")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Selection */}
      <Card className="glass-panel rounded-3xl border border-white/10 bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg font-semibold">{t("config.providers.title")}</span>
            <span className="text-xs text-foreground/60">{t("config.providers.count", { count: config.configurations.length })}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="grid max-h-[min(480px,calc(100vh-360px))] min-h-[min(480px,calc(100vh-360px))] gap-4 overflow-y-auto">
            {PROVIDERS.filter((provider) => !['elevenlabs', 'siliconflow'].includes(provider.id)).map((provider) => {
              const providerConfigs = getProviderConfigurations(provider.id)
              const isSelected = providerConfigs.length > 0

              return (
                <div
                  key={provider.id}
                  className="w-full space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 overflow-x-auto"
                  style={{ scrollbarGutter: "stable", overflow: 'hidden' }}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={provider.id}
                      checked={isSelected}
                      onCheckedChange={() => toggleProvider(provider.id)}
                      className="mt-0.5 border-white/40 data-[state=checked]:border-transparent data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-indigo-500 data-[state=checked]:to-sky-400"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor={provider.id}
                          className="cursor-pointer text-base font-semibold text-foreground"
                        >
                          {provider.label}
                        </Label>
                      </div>
                      <p className="text-xs text-foreground/60 truncate">{provider.description}</p>
                    </div>
                  </div>

                  {/* Configurations for this provider */}
                  {isSelected && providerConfigs.map((configItem, index) => {
                    const selectedModel = configItem.model

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

                    const filter = (voiceFiltersDebounced[configItem.id] || "").trim().toLowerCase()
                    const filteredProviderVoices = filter
                      ? providerVoices.filter(
                          (v) => v.label.toLowerCase().includes(filter) || v.value.toLowerCase().includes(filter),
                        )
                      : providerVoices
                    const currentVoice = configItem.voice || ""

                    return (
                      <div key={configItem.id} className="relative rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-3">
                        {/* Config Header */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-indigo-400">
                            {getProviderLabel(provider.id)} #{index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeConfiguration(configItem.id)}
                            className="h-6 w-6 p-0 text-foreground/50 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Model Selection */}
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-foreground/50">{t("config.model.label")}</Label>
                            {(() => {
                              const providerModels = PROVIDER_MODELS[provider.id] || []
                              return providerModels.length > 0 ? (
                                <Select
                                  value={configItem.model}
                                  onValueChange={(value) => {
                                    updateConfiguration(configItem.id, { model: value })
                                  }}
                                >
                                  <SelectTrigger className="h-9 rounded-lg border-white/10 bg-white/5 text-sm text-foreground">
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
                              )
                            })()}
                          </div>

                          {/* Voice Selection */}
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-foreground/50">{t("config.voice.label")}</Label>
                            {providerVoices.length > 0 ? (
                              <Select
                                value={currentVoice}
                                onValueChange={(value) => updateConfiguration(configItem.id, { voice: value })}
                              >
                                <SelectTrigger className="h-9 rounded-lg border-white/10 bg-white/5 text-sm text-foreground">
                                  <SelectValue placeholder={t("config.voice.label")} />
                                </SelectTrigger>
                                <SelectContent className="border border-white/10 bg-slate-950/95 text-foreground max-h-96">
                                  <div className="px-3 py-2 sticky top-0 bg-slate-950/95 backdrop-blur-sm border-b border-white/5">
                                    <Input
                                      value={voiceFilters[configItem.id] || ''}
                                      onChange={(e) => setVoiceFilters({ ...voiceFilters, [configItem.id]: e.target.value })}
                                      placeholder={`搜索 ${provider.label} 的声线 / search voices`}
                                      className="h-8 rounded-md border-white/10 bg-white/5 text-sm"
                                    />
                                  </div>
                                  {filteredProviderVoices.length > 0 ? (
                                    filteredProviderVoices.slice(0, 100).map((voice) => (
                                      <SelectItem key={voice.value} value={voice.value} className="text-xs">
                                        {voice.label}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="px-3 py-2 text-xs text-foreground/50 text-center">
                                      {filter ? "No matching voices" : "No voices available"}
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-xs text-foreground/50">{t("config.providers.noVoice")}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Add Configuration Button */}
                  {isSelected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addConfiguration(provider.id)}
                      className="w-full h-8 rounded-lg border-dashed border-white/20 bg-white/5 text-xs hover:bg-white/10 hover:border-indigo-500/50"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      添加配置
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {!hideActionButton && (
        <Button
          onClick={onStartComparison}
          disabled={isRunning || config.configurations.length === 0 || !config.text.trim()}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-400 text-base font-semibold text-white shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isRunning ? (
            <>
              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {t("config.button.running")}
            </>
          ) : (
            <>
              <ArrowRight className="mr-2 h-5 w-5" />
              {t("config.button.idle")}
            </>
          )}
        </Button>
      )}
    </div>
  )
}
