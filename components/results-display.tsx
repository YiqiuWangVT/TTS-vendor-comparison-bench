"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getProviderLabel } from "@/lib/providers"
import { Badge } from "@/components/ui/badge"
import { Clock, Zap, AlertCircle, CheckCircle2, Download, Package } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { downloadAudioFiles, type AudioFile, isDownloadSupported } from "@/lib/download"
import { useToast } from "@/hooks/use-toast"
import type { TTSResult } from "./tts-comparison-platform"
import { MetricsTable } from "./metrics-table"
import { AudioPlayer } from "./audio-player"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/i18n-provider"

interface ResultsDisplayProps {
  results: TTSResult[]
  isRunning: boolean
  columns?: 1 | 2 | 3
  onSetColumns?: (n: 1 | 2 | 3) => void
  className?: string
  text?: string // Add text for download functionality
}

export function ResultsDisplay({ results, isRunning, columns, onSetColumns, className, text }: ResultsDisplayProps) {
  const [activePlayer, setActivePlayer] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const { t } = useI18n()
  const { toast } = useToast()

  const handlePlayerStateChange = (provider: string, isPlaying: boolean) => {
    if (isPlaying) {
      setActivePlayer(provider)
    } else if (activePlayer === provider) {
      setActivePlayer(null)
    }
  }

  const getStatusIcon = (status: TTSResult["status"]) => {
    switch (status) {
      case "pending":
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-400" />
    }
  }

  const getStatusBadge = (status: TTSResult["status"]) => {
    switch (status) {
      case "pending":
        return <Badge className="gap-1 border border-white/20 bg-white/10 text-foreground/80">{t("results.badge.processing")}</Badge>
      case "success":
        return <Badge className="gap-1 border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">{t("results.badge.success")}</Badge>
      case "error":
        return <Badge className="gap-1 border border-red-500/40 bg-red-500/10 text-red-200">{t("results.badge.error")}</Badge>
    }
  }

  const formatTime = (ms: number) => {
    return ms > 0 ? `${ms}ms` : "-"
  }

  const handleBatchDownload = async (format: 'individual' | 'zip' = 'zip') => {
    if (!isDownloadSupported()) {
      toast({
        title: "Download Not Supported",
        description: "Your browser doesn't support file downloads",
        variant: "destructive"
      })
      return
    }

    const successfulResults = results.filter(r => r.status === "success" && r.audioUrl)

    if (successfulResults.length === 0) {
      toast({
        title: "No Audio Files",
        description: "No successful audio files available for download",
        variant: "destructive"
      })
      return
    }

    setIsDownloading(true)

    try {
      const audioFiles: AudioFile[] = successfulResults.map(result => ({
        provider: result.provider,
        text: text || 'audio',
        dataUrl: result.audioUrl,
        mimeType: result.audioMimeType
      }))

      if (format === 'zip') {
        await downloadAudioFiles(audioFiles, { format: 'zip' })
        toast({
          title: "Download Complete",
          description: `Downloaded ${audioFiles.length} audio files as ZIP`
        })
      } else {
        let completed = 0
        await downloadAudioFiles(audioFiles, {
          format: 'individual',
          onProgress: (completedCount) => {
            completed = completedCount
            // Could show progress here if needed
          }
        })
        toast({
          title: "Download Complete",
          description: `Downloaded ${completed} individual audio files`
        })
      }
    } catch (error) {
      console.error('Batch download failed:', error)
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setIsDownloading(false)
    }
  }

  if (results.length === 0 && !isRunning) {
    return (
      <div className="glass-panel flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-white/10 p-12 text-center text-foreground">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <Zap className="h-8 w-8 text-sky-300" />
        </div>
        <h3 className="text-xl font-semibold tracking-tight text-foreground">{t("results.empty.title")}</h3>
        <p className="mt-2 max-w-sm text-sm text-foreground/70">{t("results.empty.desc")}</p>
      </div>
    )
  }

  return (
    <section className={cn("flex  min-h-0 flex-col gap-6", className)}>
      <div className="glass-panel rounded-3xl border border-white/10 p-6 text-foreground">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("results.title")}</h2>
            <p className="text-sm text-foreground/70">
              {isRunning ? t("results.running") : t("results.ready", { count: results.length })}
            </p>
          </div>
          {results.length > 0 && (
            <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label={t("results.columns")}>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-foreground/70">
                <Clock className="h-4 w-4" />
                {t("results.progress", {
                  done: results.filter((r) => r.status === "success").length,
                  total: results.length,
                })}
              </div>
              {results.some((r) => r.status === "success") && (
                <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBatchDownload('zip')}
                    disabled={isDownloading || !isDownloadSupported()}
                    className="h-8 gap-1 px-3 text-xs text-foreground/70 hover:text-foreground"
                    title="Download all audio files as ZIP"
                  >
                    <Package className="h-3 w-3" />
                    {isDownloading ? "Downloading..." : "Download ZIP"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBatchDownload('individual')}
                    disabled={isDownloading || !isDownloadSupported()}
                    className="h-8 gap-1 px-3 text-xs text-foreground/70 hover:text-foreground"
                    title="Download all audio files individually"
                  >
                    <Download className="h-3 w-3" />
                    Individual
                  </Button>
                </div>
              )}
              <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    role="radio"
                    aria-checked={columns === n}
                    aria-label={`${t("results.columns")} ${n}`}
                    onClick={() => onSetColumns && onSetColumns(n as 1 | 2 | 3)}
                    className={cn(
                      "h-9 w-10 rounded-full text-sm font-medium transition",
                      columns === n
                        ? "bg-gradient-to-r from-indigo-500 via-sky-400 to-fuchsia-500 text-white shadow-[0_8px_25px_rgba(59,130,246,0.35)]"
                        : "text-foreground/60 hover:bg-white/10",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <div className="flex-1 overflow-hidden">
          <div
            className={cn(
              "grid h-full min-h-0 gap-5 overflow-y-auto pr-1",
              !columns && "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
              columns === 1 && "grid-cols-1",
              columns === 2 && "grid-cols-1 md:grid-cols-2",
              columns === 3 && "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
            )}
          >
            {results.map((result) => (
              <Card
                key={result.provider}
                stretch={false}
                className="glass-panel flex  flex-col  rounded-3xl border border-white/10 bg-white/[0.03] shadow-none"
              >
                <CardHeader className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                      {getStatusIcon(result.status)}
                    </div>
                    <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                      {getProviderLabel(result.provider)}
                    </CardTitle>
                  </div>
                  {getStatusBadge(result.status)}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5 text-foreground">
                  {result.error ? (
                    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                      {t("results.error", { message: result.error ?? "" })}
                    </div>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wider text-foreground/60">
                          <span>{t("results.audio")}</span>
                          {typeof result.audioBytes === "number" && (
                            <span>
                              {result.audioBytes} bytes
                              {typeof result.audioDurationSeconds === "number" && (
                                <span className="ml-2">• {result.audioDurationSeconds.toFixed(2)}s</span>
                              )}
                            </span>
                          )}
                        </div>
                        <AudioPlayer
                          audioUrl={result.audioUrl}
                          audioMimeType={result.audioMimeType}
                          provider={result.provider}
                          isActive={activePlayer === result.provider || activePlayer === null}
                          onPlayStateChange={(isPlaying) => handlePlayerStateChange(result.provider, isPlaying)}
                          text={text}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <h4 className="text-xs uppercase tracking-wider text-foreground/60">{t("results.frontend")}</h4>
                          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                            <div className="flex items-center justify-between text-sm">
                              <span>{t("results.metric.ttfb")}</span>
                              <span className="font-mono text-foreground/80">{formatTime(result.metrics.frontend.ttfbMs)}</span>
                            </div>
                            {/* e2e metric removed */}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xs uppercase tracking-wider text-foreground/60">{t("results.backend")}</h4>
                          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                            <div className="flex items-center justify-between text-sm">
                              <span>{t("results.metric.ttfb")}</span>
                              <span className="font-mono text-foreground/80">{formatTime(result.metrics.backend.ttfbMs)}</span>
                            </div>
                            {/* e2e metric removed */}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Performance comparison table hidden */}
        {/* results.some((r) => r.status === "success") && (
          <Card
            compact
            stretch={false}
            className="glass-panel rounded-3xl border border-white/10 bg-white/[0.03] shadow-none"
          >
            <CardHeader>
              <CardTitle className="text-base text-foreground">{t("results.summary.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <MetricsTable results={results.filter((r) => r.status === "success")} />
              <div className="mt-4 space-y-1 text-sm text-foreground/70">
                <p>{t("results.summary.frontendTTFB")}</p>
                <p>{t("results.summary.backendTTFB")}</p>
              </div>
            </CardContent>
          </Card>
        ) */}
      </div>
    </section>
  )
}
