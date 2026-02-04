"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getProviderLabel } from "@/lib/providers"
import type { TTSResult } from "./tts-comparison-platform"
import { useI18n } from "@/components/i18n-provider"

interface MetricsTableProps {
  results: TTSResult[]
}

export function MetricsTable({ results }: MetricsTableProps) {
  const { t } = useI18n()

  const getBestMetric = (results: TTSResult[], source: "frontend" | "backend") => {
    const values = results.map((r) => r.metrics[source].ttfbMs).filter((v) => v > 0)

    return values.length === 0 ? Infinity : Math.min(...values)
  }

  const isBestMetric = (value: number, bestValue: number) => {
    return value === bestValue && value > 0 && Number.isFinite(bestValue)
  }

  const frontendTTFBBest = getBestMetric(results, "frontend")
  const backendTTFBBest = getBestMetric(results, "backend")

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <Table className="text-foreground/80">
        <TableHeader>
          <TableRow className="bg-white/10">
            <TableHead className="font-semibold text-foreground">{t("table.provider")}</TableHead>
            <TableHead className="text-center font-semibold text-foreground">{t("table.frontendTTFB")}</TableHead>
            <TableHead className="text-center font-semibold text-foreground">{t("table.backendTTFB")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => (
            <TableRow key={result.provider} className="hover:bg-white/8">
              <TableCell className="font-medium text-foreground">{getProviderLabel(result.provider)}</TableCell>
              <TableCell className="text-center">
                <MetricCell
                  value={result.metrics.frontend.ttfbMs}
                  isBest={isBestMetric(result.metrics.frontend.ttfbMs, frontendTTFBBest)}
                />
              </TableCell>
              <TableCell className="text-center">
                <MetricCell
                  value={result.metrics.backend.ttfbMs}
                  isBest={isBestMetric(result.metrics.backend.ttfbMs, backendTTFBBest)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function MetricCell({ value, isBest }: { value: number; isBest: boolean }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="font-mono text-sm text-foreground/80">{value > 0 ? `${value}ms` : "-"}</span>
      {isBest && (
        <Badge className="text-xs border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
          {t("table.best")}
        </Badge>
      )}
    </div>
  )
}
