"use client"

import { TTSComparisonPlatform } from "@/components/tts-comparison-platform"
import { ABTestSection } from "./components/ab-test-section"

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col">
      <TTSComparisonPlatform />
      <ABTestSection />
    </main>
  )
}
