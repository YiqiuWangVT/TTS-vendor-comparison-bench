"use client"

import { useEffect, useState } from "react"

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handleChange = () => setReducedMotion(mediaQuery.matches)

    handleChange()

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }

    // Safari < 16 fallback
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  return reducedMotion
}

export function DynamicBackdrop() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_55%)]" />

      {mounted && !prefersReducedMotion && (
        <>
          <div className="aurora-cluster" aria-hidden="true">
            <span className="aurora-arc aurora-arc--one" />
            <span className="aurora-arc aurora-arc--two" />
            <span className="aurora-arc aurora-arc--three" />
          </div>

          <div className="orbital-field">
            <span className="orb orb--one" />
            <span className="orb orb--two" />
            <span className="orb orb--three" />
          </div>
        </>
      )}

      <div className="absolute inset-x-0 bottom-0 h-[420px] translate-y-1/3 bg-gradient-to-t from-[rgba(15,23,42,0.85)] via-[rgba(15,23,42,0.6)] to-transparent" />
    </div>
  )
}
