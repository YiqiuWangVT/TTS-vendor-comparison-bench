"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Volume2, VolumeX, Download } from "lucide-react"
import { downloadAudioFromDataUrl, isDownloadSupported } from "@/lib/download"

interface AudioPlayerProps {
  audioUrl: string
  audioMimeType?: string
  provider: string
  isActive: boolean
  onPlayStateChange: (isPlaying: boolean) => void
  text?: string // Add text for filename generation
}

export function AudioPlayer({ audioUrl, audioMimeType, provider, isActive, onPlayStateChange, text }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  // metadataLoaded was previously used to gate UI, now not required
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const onPlayStateChangeRef = useRef(onPlayStateChange)
  const rafRef = useRef<number | null>(null)
  const lastRafRef = useRef<number>(0)
  useEffect(() => {
    onPlayStateChangeRef.current = onPlayStateChange
  }, [onPlayStateChange])
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return


    const updateTime = () => {
      const t = Number.isFinite(audio.currentTime) ? audio.currentTime : 0
      const d = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Infinity
      // If duration becomes available on the element but `loadedmetadata`
      // hasn't fired (some browsers or timing scenarios), ensure we record
      // it so the UI (slider max, enabled state) can update.
      if (d !== Infinity) {
        try {
          setDuration(d)
        } catch {}
      }
      // clamp to [0, duration] when possible
      const clamped = d === Infinity ? Math.max(0, t) : Math.max(0, Math.min(t, d))
      setCurrentTime(clamped)
    }

    const updateDuration = () => {
      const d = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0
      setDuration(d)
    }

    const handleNativePlay = () => {
      const audioNow = audioRef.current
      console.debug("AudioPlayer: native play event", { currentTime: audioNow?.currentTime, duration: audioNow?.duration })
      setIsPlaying(true)
      try {
        onPlayStateChangeRef.current(true)
      } catch {}
      startRaf()
    }

    const handleNativePause = () => {
      const audioNow = audioRef.current
      console.debug("AudioPlayer: native pause event", { currentTime: audioNow?.currentTime, duration: audioNow?.duration })
      setIsPlaying(false)
      try {
        onPlayStateChangeRef.current(false)
      } catch {}
      stopRaf()
    }

  const handleEnded = () => {
      // ensure we show the exact end position
      const d = Number.isFinite(audio.duration) ? audio.duration : 0
      setCurrentTime(d)
    setIsPlaying(false)
  try { onPlayStateChangeRef.current(false) } catch {}
      // stop smooth RAF loop if running
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }

    // Ensure volume/mute settings are applied to newly mounted audio
    try {
      audio.volume = isMuted ? 0 : volume
    } catch {}

    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("loadedmetadata", updateDuration)
    audio.addEventListener("ended", handleEnded)
  // Listen for native play/pause so UI stays in sync even if playback is
  // controlled externally (e.g., another component or browser API).
  audio.addEventListener("play", handleNativePlay)
  audio.addEventListener("pause", handleNativePause)

    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("loadedmetadata", updateDuration)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("play", handleNativePlay)
      audio.removeEventListener("pause", handleNativePause)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
    // Re-run when the audio source changes so listeners attach to the current element
  }, [audioUrl, volume, isMuted])

  // When the audio URL changes, reset playback state so UI and controls match the new element
  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    // inform parent that play stopped for this provider
    try {
      onPlayStateChangeRef.current(false)
    } catch {}
  }, [audioUrl])
  const handlePauseCb = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    setIsPlaying(false)
    try { onPlayStateChangeRef.current(false) } catch {}
    stopRaf()
  }, [])

  useEffect(() => {
    if (!isActive && isPlaying) {
      handlePauseCb()
    }
  }, [isActive, isPlaying, handlePauseCb])

  // Playback is controlled via togglePlayPause and native play/pause
  // event listeners (handleNativePlay / handleNativePause) so we don't
  // keep duplicate imperative control paths here.

  const togglePlayPause = async () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      if (audio.paused) {
        console.debug("AudioPlayer: toggle -> play")
        await audio.play()
        // native 'play' event will update state and start RAF
      } else {
        console.debug("AudioPlayer: toggle -> pause")
        audio.pause()
        // native 'pause' event will update state and stop RAF
      }
    } catch (error) {
      console.error("AudioPlayer toggle error:", error)
      // Fallback: ensure state is consistent
      if (audio.paused) {
        setIsPlaying(false)
        onPlayStateChange(false)
        stopRaf()
      } else {
        setIsPlaying(true)
        onPlayStateChange(true)
        startRaf()
      }
    }
  }

  // Smoothly update the currentTime using requestAnimationFrame while playing
  const startRaf = () => {
    if (rafRef.current !== null) return
    const targetMs = 1000 / 30 // ~30fps
    const loop = (now: number) => {
      const audio = audioRef.current
      if (!audio) return
      // only update React state at ~30fps to reduce render churn
      if (now - lastRafRef.current >= targetMs) {
        const t = Number.isFinite(audio.currentTime) ? audio.currentTime : 0
        const d = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Infinity
        const clamped = d === Infinity ? Math.max(0, t) : Math.max(0, Math.min(t, d))
        setCurrentTime(clamped)
        lastRafRef.current = now
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  const stopRaf = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    const target = value[0]
    const d = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Infinity
    const clamped = d === Infinity ? Math.max(0, target) : Math.max(0, Math.min(target, d))

    try {
      audio.currentTime = clamped
    } catch {}
    setCurrentTime(clamped)
  }

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    const newVolume = value[0]
    audio.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isMuted) {
      audio.volume = volume
      setIsMuted(false)
    } else {
      audio.volume = 0
      setIsMuted(true)
    }
  }

  const formatTime = (time: number) => {
    if (!Number.isFinite(time) || time <= 0) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleDownload = async () => {
    if (!audioUrl || !isDownloadSupported()) {
      console.error('Download not supported or no audio URL available')
      return
    }

    try {
      await downloadAudioFromDataUrl(audioUrl, provider, text || 'audio')
    } catch (error) {
      console.error('Download failed:', error)
      // In a real implementation, you might show a toast notification here
    }
  }

  // Use audioUrl as the key so React will remount the <audio> element whenever the
  // source changes. Keep a direct `src` attribute and also render a <source/>
  // child so the element is discoverable in the DOM and the browser will
  // re-parse metadata when the source changes. We additionally call `load()`
  // below to ensure `loadedmetadata` fires reliably across browsers.
  const audioKey = audioUrl || `no-audio-${provider}`

  // When the audio URL changes, set the element's src and call load() to force
  // metadata parsing. This helps ensure `duration` becomes available and the
  // slider is enabled.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    try {
      // Assign src directly as an explicit signal to the browser
      console.debug("AudioPlayer: setting src", { audioUrl, prevSrc: audio.src })
      audio.src = audioUrl || ""
      // calling load() instructs the browser to (re)fetch and parse metadata
      // which should trigger `loadedmetadata` and allow duration to be set.
      audio.load()
      console.debug("AudioPlayer: called load", { src: audio.src, currentTime: audio.currentTime })
      // Some browsers populate `duration` very quickly after load(). Use
      // rAF to check once more and adopt the duration immediately to avoid
      // a tiny timing window where the UI uses the fallback max=1.
      try {
        requestAnimationFrame(() => {
          try {
            const d = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0
            if (d > 0) {
              setDuration(d)
            }
          } catch {}
        })
      } catch {}
    } catch (e) {
      // swallow — best-effort
      console.debug('audio load failed', e)
    }
  }, [audioUrl])

  return (
    <div className="space-y-3">
      <audio key={audioKey} ref={audioRef} src={audioUrl || undefined} preload="metadata">
        {audioUrl ? <source src={audioUrl} type={audioMimeType} /> : null}
      </audio>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={togglePlayPause}
          disabled={!audioUrl}
          className="gap-2 bg-transparent"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isPlaying ? "Pause" : "Play"}
        </Button>

        <div className="flex-1 space-y-1">
          {(() => {
            // When duration is available use it as the slider max. Relying on
            // metadataLoaded caused timing windows where the slider max stayed
            // at 1 while duration was already present; use duration>0 directly
            // to reduce that race.
            const sliderMax = duration > 0 ? Math.max(0.01, duration) : 1
            const sliderValue = [Math.min(currentTime, sliderMax)]
            return (
              <div
                // Keep this attribute for the Playwright monitor to select the
                // progress area. We also update data-now/data-max below so
                // automation can read the current progress without relying on
                // Radix internals or aria timing issues.
                data-progress-slider="true"
                // Expose the normalized slider value (the same value passed
                // into the Slider) so external automation reads an attribute
                // that matches the Thumb/ARIA state.
                data-now={String(sliderValue[0])}
                data-max={String(sliderMax)}
                className="w-full"
              >
                <Slider
                  aria-label="audio-progress"
                  value={sliderValue}
                  onValueChange={handleSeek}
                  max={sliderMax}
                  step={0.01}
                  className="w-full"
                  // Only disable the slider when there is no audio source;
                  // don't toggle disabled based on metadataLoaded because
                  // this previously caused React to remount the slider and
                  // produced transient inconsistent attributes that the
                  // Playwright monitor observed.
                  disabled={!audioUrl}
                />
              </div>
            )
          })()}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleMute} disabled={!audioUrl}>
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            onValueChange={handleVolumeChange}
            max={1}
            step={0.01}
            className="w-16"
            disabled={!audioUrl}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            disabled={!audioUrl || !isDownloadSupported()}
            title="Download audio file"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
