import { type NextRequest, NextResponse } from "next/server"
import { Buffer } from "buffer"
import type { ProviderId } from "@/lib/providers"

// Import new provider implementations
import { synthesizeWithElevenLabs } from "@/lib/providers/elevenlabs"
import { synthesizeWithQwenFallback } from "@/lib/providers/qwen"
import { synthesizeWithSeedTTS } from "@/lib/providers/seedtts"
import { generateSiliconFlowSpeech, buildSiliconFlowRequest } from "@/lib/providers/siliconflow"

function asNodeBuffer(input: Buffer | Uint8Array | ArrayBuffer): Buffer {
  if (Buffer.isBuffer(input)) return input
  if (input instanceof ArrayBuffer) return Buffer.from(input)
  return Buffer.from(input.buffer, input.byteOffset, input.byteLength)
}

function detectAudioMimeType(buffer: Buffer): string | undefined {
  if (buffer.length < 4) return undefined

  const header4 = buffer.slice(0, 4)
  const header12 = buffer.slice(4, 12)

  if (header4.toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WAVE") {
    return "audio/wav"
  }

  if (header4[0] === 0x49 && header4[1] === 0x44 && header4[2] === 0x33) {
    return "audio/mpeg"
  }

  if (header4[0] === 0xff && (header4[1] & 0xe0) === 0xe0) {
    return "audio/mpeg"
  }

  if (header4.toString("ascii") === "OggS") {
    return "audio/ogg"
  }

  if (header4.toString("ascii") === "fLaC") {
    return "audio/flac"
  }

  if (header4[0] === 0x1a && header4[1] === 0x45 && header4[2] === 0xdf && header4[3] === 0xa3) {
    return "audio/webm"
  }

  if (header4.toString("ascii") === "MThd") {
    return "audio/midi"
  }

  if (header12.toString("ascii", 0, 4) === "ftyp") {
    const brand = buffer.slice(8, 12).toString("ascii").toLowerCase()
    if (brand.includes("m4a") || brand.includes("mp4") || brand.includes("isom") || brand.includes("iso2")) {
      return "audio/mp4"
    }
  }

  return undefined
}

// Simple MP3 duration estimator based on frame count and bitrate
function estimateMp3DurationSeconds(buf: Buffer | Uint8Array | ArrayBuffer | null | undefined): number | undefined {
  if (!buf) return undefined
  let arr: Uint8Array
  if (buf instanceof ArrayBuffer) arr = new Uint8Array(buf)
  else if (Buffer.isBuffer(buf)) arr = new Uint8Array(buf)
  else if (buf instanceof Uint8Array) arr = buf
  else return undefined

  // Simple estimation: assume 128kbps CBR MP3
  // 128kbps = 16KB/s = 16000 bytes/s
  const bitRate = 128 // kbps
  const bytesPerSecond = (bitRate * 1000) / 8 // 16000 bytes per second

  // For mock audio, we know we generated 10 frames of ~417 bytes each
  // But for general estimation, we can use the total size
  const estimatedDuration = arr.length / bytesPerSecond
  return Math.max(0.1, estimatedDuration) // Minimum 0.1 seconds
}

function createAudioDataUrl(
  buffer: Buffer | Uint8Array | ArrayBuffer,
  fallbackMime: string = "audio/mpeg",
): { dataUrl: string; mimeType: string; byteLength: number; wavDurationSeconds?: number; mp3DurationSeconds?: number } {
  const nodeBuffer = asNodeBuffer(buffer)
  const mimeType = detectAudioMimeType(nodeBuffer) ?? fallbackMime
  const base64 = nodeBuffer.toString("base64")
  const wavDurationSeconds = mimeType === "audio/wav" ? estimateWavDurationSeconds(nodeBuffer) : undefined
  const mp3DurationSeconds = mimeType === "audio/mpeg" ? estimateMp3DurationSeconds(nodeBuffer) : undefined
  return {
    dataUrl: `data:${mimeType};base64,${base64}`,
    mimeType,
    byteLength: nodeBuffer.length,
    wavDurationSeconds,
    mp3DurationSeconds,
  }
}

// Simple WAV header parser to estimate duration when we have raw WAV bytes.
function estimateWavDurationSeconds(buf: Buffer | Uint8Array | ArrayBuffer | null | undefined): number | undefined {
  if (!buf) return undefined
  let arr: Uint8Array
  if (buf instanceof ArrayBuffer) arr = new Uint8Array(buf)
  else if (Buffer.isBuffer(buf)) arr = new Uint8Array(buf)
  else if (buf instanceof Uint8Array) arr = buf
  else return undefined

  // Check RIFF/WAVE header
  if (arr.length < 44) return undefined
  try {
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength)
    // 'RIFF' at 0 and 'WAVE' at 8
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))
    if (riff !== 'RIFF' || wave !== 'WAVE') return undefined

    // fmt chunk starts at 12 normally; read sampleRate at offset 24 (little-endian uint32)
    const sampleRate = view.getUint32(24, true)
    const bitsPerSample = view.getUint16(34, true)
    const numChannels = view.getUint16(22, true)

    // data chunk size usually at offset 40 (but could be after extra chunks). We'll try offset 40 first.
    const dataChunkSize = view.getUint32(40, true)
    if (sampleRate > 0 && bitsPerSample > 0 && dataChunkSize > 0) {
      const bytesPerSample = bitsPerSample / 8
      const totalSamples = dataChunkSize / (bytesPerSample * numChannels)
      const durationSeconds = totalSamples / sampleRate
      return durationSeconds
    }
  } catch {
    return undefined
  }

  return undefined
}

export interface TTSRequest {
  text: string
  language: string
  providers: string[]
  models?: Record<string, string> // provider-specific models
  voices?: Record<string, string> // provider-specific voices
  emotionClasses?: Record<string, string> // provider-specific emotion classes
}

const LUNA_AUDIO_URL_KEYS = ["url", "voiceUrl", "audioUrl", "voice_url", "audio_url"] as const

export interface TTSProviderResult {
  provider: string
  metrics: {
    frontend: { ttfbMs: number }
    backend: { ttfbMs: number }
  }
  audioUrl: string
  audioMimeType?: string
  // optional debug: size of returned audio in bytes (when available)
  audioBytes?: number
  // optional: estimated duration in seconds when derivable from the audio bytes (wav/mp3)
  audioDurationSeconds?: number
  // Where the audio came from: 'local' (generated), 'dashscope' (API), 'url' (downloaded)
  source?: 'local' | 'dashscope' | 'url' | 'base64' | 'volcengine' | 'siliconflow'
  error?: string
  status: "success" | "error"
}

type ProviderOptions = {
  language: string
  voice?: string
  model?: string
  speed?: number
  pitch?: number
  emotion_class?: string
}

type ProviderHandler = (
  text: string,
  options: ProviderOptions,
  startTime: number,
) => Promise<TTSProviderResult>

const PROVIDER_HANDLERS: Record<ProviderId, ProviderHandler> = {
  douyin: (text, options, startTime) => {
    // Default to LLM version
    return processDouyinTTS(text, options, startTime)
  },
  minimax: processMinimaxTTS,
  luna: processLunaTTS,
  qwen: processQwenTTS,
  elevenlabs: async (_text: string, _options: ProviderOptions, _startTime: number) => {
    throw new Error("ElevenLabs TTS is currently unavailable")
  },
  siliconflow: async (_text: string, _options: ProviderOptions, _startTime: number) => {
    throw new Error("SiliconFlow TTS is currently unavailable")
  },
}


export async function POST(request: NextRequest) {
  try {
    const body: TTSRequest = await request.json()
    // Debug: log incoming request body to verify what text the server receives
    try {
      // eslint-disable-next-line no-console
      console.debug("[server] /api/tts POST received:", { text: body.text, providers: body.providers })
    } catch {}
    const { text, language, providers, models, voices, emotionClasses } = body

    if (!text || !providers || providers.length === 0) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

  // results array is not used here; provider results are returned directly

    const modelSelections = models ?? {}
    const voiceSelections = voices ?? {}
    const emotionClassSelections = emotionClasses ?? {}

    // Process each provider in parallel
    const providerPromises = providers.map(async (provider) => {
      const startTime = Date.now()

      try {
        const providerId = provider as ProviderId
        const handler = PROVIDER_HANDLERS[providerId]
        if (!handler) {
          throw new Error(`Unsupported provider: ${provider}`)
        }

        const selectedModel = modelSelections[provider]
        const selectedVoice = voiceSelections[provider]
        const selectedEmotionClass = emotionClassSelections[provider]

        return await handler(
          text,
          { language, model: selectedModel, voice: selectedVoice, emotion_class: selectedEmotionClass },
          startTime,
        )
      } catch (error) {
        return {
          provider,
          metrics: {
            frontend: { ttfbMs: 0 },
            backend: { ttfbMs: 0 },
          },
          audioUrl: "",
          error: error instanceof Error ? error.message : "Unknown error",
          status: "error" as const,
        }
      }
    })

  const providerResults = await Promise.all(providerPromises)
  return NextResponse.json({ results: providerResults })
  } catch (error) {
    console.error("TTS API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Local Volcano (binary/demo) TTS Integration
async function _processDouyinLocalTTS(
  text: string,
  options: { language: string; voice?: string; model?: string },
  startTime: number,
): Promise<TTSProviderResult> {
  const configuredEndpoint = process.env.VOLC_LOCAL_ENDPOINT?.trim()
  if (configuredEndpoint) {
    console.log("[v0] Douyin Local Volcano endpoint:", configuredEndpoint)

    let ttfbTime = 0
    const payload: Record<string, unknown> = {
      text,
      language: options.language,
    }

    if (options.voice) payload.voice = options.voice

    const response = await fetch(configuredEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    ttfbTime = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[v0] Local Volcano API error response:", errorText)
      throw new Error(`Local Volcano TTS error: ${response.status}`)
    }

  const result = await response.json()

    let audioMeta: ReturnType<typeof createAudioDataUrl> | null = null
    if (typeof result === "object" && result !== null) {
      if (typeof result.audio_base64 === "string" && result.audio_base64.length > 0) {
        const audioBuffer = Buffer.from(result.audio_base64, "base64")
        audioMeta = createAudioDataUrl(audioBuffer, "audio/mpeg")
      } else if (typeof result.audio_url === "string" && result.audio_url.length > 0) {
        const audioResp = await fetch(result.audio_url)
        if (!audioResp.ok) {
          const errorText = await audioResp.text()
          throw new Error(`Failed to download local audio: ${audioResp.status} ${errorText}`)
        }
        const audioBuffer = await audioResp.arrayBuffer()
        audioMeta = createAudioDataUrl(audioBuffer, audioResp.headers.get("content-type") || "audio/mpeg")
      }
    }

    if (!audioMeta) {
      throw new Error("Local Volcano TTS did not return audio")
    }

    return {
      provider: "douyin",
      metrics: {
        frontend: { ttfbMs: 0 },
        backend: { ttfbMs: ttfbTime },
      },
      audioUrl: audioMeta.dataUrl,
      audioMimeType: audioMeta.mimeType,
      audioBytes: audioMeta.byteLength,
      audioDurationSeconds: audioMeta.wavDurationSeconds ?? audioMeta.mp3DurationSeconds,
      status: "success",
    }
  }

  return await processDouyinLocalBinaryDemo(text, options, startTime)
}

async function processDouyinLocalBinaryDemo(
  text: string,
  options: { language: string; voice?: string },
  startTime: number,
): Promise<TTSProviderResult> {
  // Use environment variable mapping for HTTP configuration
  const { getConfigFromEnv } = await import("@/lib/providers/volcengine-http")
  const config = getConfigFromEnv()

  if (!config.appId || !config.accessToken || !config.cluster) {
    throw new Error("Douyin local TTS credentials not configured")
  }

  const voiceFromConfig = options.voice?.trim()
  const defaultVoice = "BV001_streaming" // Use SeedTTS voice ID for HTTP version
  const voiceType = voiceFromConfig && voiceFromConfig.length > 0 ? voiceFromConfig : defaultVoice
  const encoding = process.env.VOLC_LOCAL_ENCODING || "mp3"

  console.log("[v0] Douyin local HTTP config", {
    appId: config.appId ? "✓ Set" : "✗ Missing",
    accessToken: config.accessToken ? "✓ Set" : "✗ Missing",
    cluster: config.cluster ? "✓ Set" : "✗ Missing",
    voiceType,
    encoding,
    host: config.host || "default",
  })

  try {
    // Import HTTP provider instead of WebSocket
    const { synthesizeWithVolcEngineHTTP } = await import("@/lib/providers/volcengine-http")

    // Use the HTTP implementation
    const audioBuffer = await synthesizeWithVolcEngineHTTP({
      appId: config.appId,
      accessToken: config.accessToken,
      cluster: config.cluster,
      voiceType: voiceType,
      text: text,
      encoding: encoding as 'mp3' | 'wav',
      speedRatio: 1.0,
      host: config.host,
      uid: "388808087185088"
    })

    const backendDuration = Date.now() - startTime
    const audioMeta = createAudioDataUrl(audioBuffer, encodingToMimeType(encoding))

    return {
      provider: "douyin",
      metrics: {
        frontend: { ttfbMs: 0 },
        backend: { ttfbMs: backendDuration },
      },
      audioUrl: audioMeta.dataUrl,
      source: 'volcengine',
      audioMimeType: audioMeta.mimeType,
      audioBytes: audioMeta.byteLength,
      audioDurationSeconds: audioMeta.wavDurationSeconds ?? audioMeta.mp3DurationSeconds,
      status: "success",
    }
  } catch (error) {
    console.error("[v0] Douyin local HTTP TTS failed:", error)
    throw new Error(`Local Volcano TTS failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function encodingToMimeType(encoding: string): string {
  const normalized = encoding.trim().toLowerCase()
  switch (normalized) {
    case "wav":
      return "audio/wav"
    case "ogg":
      return "audio/ogg"
    case "flac":
      return "audio/flac"
    case "webm":
      return "audio/webm"
    case "m4a":
    case "mp4":
      return "audio/mp4"
    case "mp3":
    default:
      return "audio/mpeg"
  }
}

/**
 * Generate a short mock WAV file for testing when API keys are not available
 * Ported from Python tts_qwen3tts_api.py generate_dummy_wav function
 */
function _generateMockWav(text: string, startTime: number): TTSProviderResult {
  // Duration based on text length (minimum 0.7s, plus 0.1s per character)
  const durationSeconds = Math.max(0.7, 0.7 + (text.length * 0.1))
  const sampleRate = 22050
  const frequency = 440.0 // A4 note
  const amplitude = 16000 // 16-bit audio

  const nSamples = Math.floor(durationSeconds * sampleRate)
  const bufferSize = 44 + (nSamples * 2) // WAV header + 16-bit samples
  const buffer = Buffer.alloc(bufferSize)

  // WAV Header
  buffer.write('RIFF', 0) // ChunkID
  buffer.writeUInt32LE(bufferSize - 8, 4) // ChunkSize
  buffer.write('WAVE', 8) // Format
  buffer.write('fmt ', 12) // Subchunk1ID
  buffer.writeUInt32LE(16, 16) // Subchunk1Size
  buffer.writeUInt16LE(1, 20) // AudioFormat (PCM)
  buffer.writeUInt16LE(1, 22) // NumChannels (mono)
  buffer.writeUInt32LE(sampleRate, 24) // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28) // ByteRate
  buffer.writeUInt16LE(2, 32) // BlockAlign
  buffer.writeUInt16LE(16, 34) // BitsPerSample
  buffer.write('data', 36) // Subchunk2ID
  buffer.writeUInt32LE(nSamples * 2, 40) // Subchunk2Size

  // Generate sine wave samples
  for (let i = 0; i < nSamples; i++) {
    const t = i / sampleRate
    const sample = Math.floor(amplitude * Math.sin(2 * Math.PI * frequency * t))
    const offset = 44 + (i * 2)
    buffer.writeInt16LE(sample, offset)
  }

  const ttfbTime = Date.now() - startTime
  const audioMeta = createAudioDataUrl(buffer, "audio/wav")

  console.log(`[v0] Generated mock WAV: ${buffer.length} bytes, ${durationSeconds.toFixed(1)}s`)

  return {
    provider: "qwen",
    metrics: {
      frontend: { ttfbMs: 0 },
      backend: { ttfbMs: ttfbTime },
    },
    audioUrl: audioMeta.dataUrl,
    source: 'local',
    audioMimeType: audioMeta.mimeType,
    audioBytes: audioMeta.byteLength,
    audioDurationSeconds: audioMeta.wavDurationSeconds ?? audioMeta.mp3DurationSeconds,
    status: "success",
  }
}

// Douyin/Volcano TTS Integration (merged with SeedTTS HTTP functionality)
async function processDouyinTTS(
  text: string,
  options: { language: string; voice?: string; model?: string; speed?: number; pitch?: number },
  startTime: number,
): Promise<TTSProviderResult> {
  // Support both DOUYIN_* and VOLCENGINE_* environment variables
  const appId = process.env.VOLCENGINE_APP_ID || process.env.DOUYIN_APP_ID || process.env.SEEDTTS_APP_ID
  const clusterId = process.env.VOLCENGINE_CLUSTER || process.env.DOUYIN_CLUSTER_ID || process.env.SEEDTTS_CLUSTER
  const accessToken = process.env.VOLCENGINE_ACCESS_TOKEN || process.env.DOUYIN_ACCESS_TOKEN || process.env.SEEDTTS_ACCESS_TOKEN
  const secretKey = process.env.DOUYIN_SECRET_KEY // Keep for backward compatibility
  const host = process.env.DOUYIN_HOST || process.env.VOLCENGINE_HOST || process.env.SEEDTTS_HOST || "openspeech.bytedance.com"

  console.log("[v0] Douyin credentials check:", {
    appId: appId ? "✓ Set" : "✗ Missing",
    clusterId: clusterId ? "✓ Set" : "✗ Missing",
    accessToken: accessToken ? "✓ Set" : "✗ Missing",
    secretKey: secretKey ? "✓ Set" : "✗ Missing",
    host: host,
  })

  // Require credentials to be explicitly set via environment variables
  if (!appId || !clusterId || !accessToken) {
    throw new Error(
      "Douyin TTS credentials not configured. Please set DOUYIN_APP_ID/VOLCENGINE_APP_ID, DOUYIN_CLUSTER_ID/VOLCENGINE_CLUSTER, and DOUYIN_ACCESS_TOKEN/VOLCENGINE_ACCESS_TOKEN in your environment."
    )
  }

  // Use the requested voice directly (supports both Douyin and SeedTTS voice IDs)
  const requestedVoice = options.voice?.trim()
  const defaultVoice = "zh_female_vv_uranus_bigtts" // Default to a reliable LLM voice
  const resolvedVoice = requestedVoice && requestedVoice.length > 0 ? requestedVoice : defaultVoice

  const speedRatio = options.speed ?? 1.0
  const pitchRatio = options.pitch ?? 1.0
  const volumeRatio = 1.0

  // Generate unique request ID
  const reqid = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Build request payload following official VolcEngine API structure
  const requestBody = {
    app: {
      appid: appId,
      token: "access_token", // Fixed literal value as per official docs
      cluster: clusterId,
    },
    user: {
      uid: "388808087185088", // Use proper UID format
    },
    audio: {
      voice_type: resolvedVoice,
      encoding: "mp3",
      speed_ratio: speedRatio,
      volume_ratio: volumeRatio,
      pitch_ratio: pitchRatio,
    },
    request: {
      reqid: reqid,
      text: text,
      text_type: "plain",
      operation: "query",
      with_frontend: 1, // Required field
      frontend_type: "unitTson", // Required field
    },
  }

  console.log("[v0] Douyin HTTP request:", {
    url: `https://${host}/api/v1/tts`,
    voiceType: resolvedVoice,
    text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
    encoding: "mp3",
    appId: appId ? `${appId.substring(0, 4)}...` : "missing",
  })

  let ttfbTime = 0
  const response = await fetch(`https://${host}/api/v1/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer;${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  })

  ttfbTime = Date.now() - startTime

  if (!response.ok) {
    const errorText = await response.text()
    console.log("[v0] Douyin API error response:", { status: response.status, error: errorText })
    throw new Error(`Douyin TTS API error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()

  console.log("[v0] Douyin API response:", {
    reqid: result.reqid,
    code: result.code,
    message: result.message,
    hasData: !!result.data
  })

  // Check response code (3000 means success for VolcEngine API)
  if (result.code !== 3000) {
    throw new Error(`Douyin TTS API error: ${result.message} (code: ${result.code})`)
  }

  if (!result.data) {
    throw new Error("No audio data received from Douyin TTS")
  }

  // Convert base64 audio data to blob URL for playback
  let audioBuffer: Buffer
  try {
    audioBuffer = Buffer.from(result.data, "base64")
  } catch (error) {
    throw new Error(`Failed to decode base64 audio data: ${error instanceof Error ? error.message : String(error)}`)
  }

  let audioMeta: ReturnType<typeof createAudioDataUrl>
  try {
    audioMeta = createAudioDataUrl(audioBuffer, "audio/mpeg")
  } catch (error) {
    throw new Error(`Failed to create audio data URL: ${error instanceof Error ? error.message : String(error)}`)
  }

  console.log("[v0] Douyin HTTP synthesis succeeded:", {
    size: audioBuffer.byteLength,
    duration: audioMeta.mp3DurationSeconds
  })

  return {
    provider: "douyin",
    metrics: {
      frontend: { ttfbMs: 0 }, // Will be set by frontend
      backend: { ttfbMs: ttfbTime },
    },
    audioUrl: audioMeta.dataUrl,
    audioMimeType: audioMeta.mimeType,
    audioBytes: audioMeta.byteLength,
    audioDurationSeconds: audioMeta.wavDurationSeconds ?? audioMeta.mp3DurationSeconds,
    source: 'volcengine', // Mark as VolcEngine source for HTTP API
    status: "success",
  }
}

// Minimax TTS Integration
async function processMinimaxTTS(
  text: string,
  options: { language: string; voice?: string; model?: string; speed?: number; pitch?: number },
  startTime: number,
): Promise<TTSProviderResult> {
  const groupId = process.env.MINIMAX_GROUP_ID || "1725213007488750393"
  const apiKey =
    process.env.MINIMAX_API_KEY ||
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiLlrofnlJ_mnIjkvLTvvIjmna3lt57vvInmmbrog73np5HmioDmnInpmZDlhazlj7giLCJVc2VyTmFtZSI6Imxpc2hlbmd5dWFuIiwiQWNjb3VudCI6Imxpc2hlbmd5dWFuQDE3MjUyMTMwMDc0ODg3NTAzOTMiLCJTdWJqZWN0SUQiOiIxOTU1NTAwOTQzODEwMjQwNTYyIiwiUGhvbmUiOiIiLCJHcm91cElEIjoiMTcyNTIxMzAwNzQ4ODc1MDM5MyIsIlBhZ2VOYW1lIjoiIiwiTWFpbCI6IiIsIkNyZWF0ZVRpbWUiOiIyMDI1LTA4LTE1IDEwOjIwOjM4IiwiVG9rZW5UeXBlIjoxLCJpc3MiOiJtaW5pbWF4In0.jJxfeZ1AtrM_qwc0nUXDG-Alva6M4lFaGYW0QcY4brv-uhtjnkozLKqoZs825fLr79XFvAp3LxOmRvGidj-TD-4TpDUyJkpxt3JsQDAVpk7KUpoGmmDrasOGibRGByk15XaubYkyzWeg1DO29Jj4qudeOTTVEMoYorHxnoqsDc9V_zuSyo4VzviT_5i7uZmY8Nmax7Uk9j9ydS7iZx1OU83aDXCmuRnjwMsOfKoxwzl4Jjxgs5xaaosIBYmXFx0Nk2iEYGuZuyF_--nVynC1s5pSTzJe2HOfiQtui6mF8Ko0ptZRAckVsoJxhJT96G4JwO-s4xYVrm9dPrB-n2J29A"

  console.log("[v0] Minimax credentials check:", {
    groupId: groupId ? "✓ Set" : "✗ Missing",
    apiKey: apiKey ? "✓ Set" : "✗ Missing",
  })

  if (!groupId || !apiKey) {
    throw new Error("Minimax TTS credentials not configured")
  }

  const selectedModel = options.model || "speech-2.5-hd-preview"

  // Use the exact request structure from the working Python example

  // Reference voices exposed in the UI; custom IDs are also accepted
  const validMinimaxVoices = [
    "male-qn-qingse",
    "male-qn-jingying",
    "male-qn-badao",
    "male-qn-daxuesheng",
    "female-shaonv",
    "female-yujie",
    "female-chengshu",
    "female-tianmei",
    "presenter_male",
    "presenter_female",
    "audiobook_male_1",
    "audiobook_male_2",
    "audiobook_female_1",
    "audiobook_female_2",
    "male-qn-qingse-jingpin",
    "male-qn-jingying-jingpin",
    "male-qn-badao-jingpin",
    "male-qn-daxuesheng-jingpin",
    "female-shaonv-jingpin",
    "female-yujie-jingpin",
    "female-chengshu-jingpin",
    "female-tianmei-jingpin",
    "clever_boy",
    "cute_boy",
    "lovely_girl",
    "cartoon_pig",
    "bingjiao_didi",
    "junlang_nanyou",
    "chunzhen_xuedi",
    "lengdan_xiongzhang",
    "badao_shaoye",
    "tianxin_xiaoling",
    "qiaopi_mengmei",
    "wumei_yujie",
    "diadia_xuemei",
    "danya_xuejie",
    "Santa_Claus",
    "Grinch",
    "Rudolph",
    "Arnold",
    "Charming_Santa",
    "Charming_Lady",
    "Sweet_Girl",
    "Cute_Elf",
    "Attractive_Girl",
    "Serene_Woman",
  ]

  const requestedVoice = options.voice?.trim()
  const defaultMinimaxVoice = validMinimaxVoices[0] || "Boyan_new_platform"
  const finalVoiceId = requestedVoice && requestedVoice.length > 0 ? requestedVoice : defaultMinimaxVoice
  const speedValue = options.speed ?? 1.0
  const pitchValue = options.pitch ?? 1.0

  const requestBody = {
    model: selectedModel, // Use dynamic model selection
    text: text,
    timbre_weights: [
      {
        voice_id: finalVoiceId,
        weight: 100,
      },
    ],
    voice_setting: {
      voice_id: "",
      speed: speedValue,
      pitch: pitchValue,
      vol: 1,
      latex_read: false,
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
    },
    language_boost: "auto",
  }

  let ttfbTime = 0
  // Use the correct API endpoint from the working example
  const response = await fetch(`https://api.minimax.chat/v1/t2a_v2?GroupId=${groupId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })

  ttfbTime = Date.now() - startTime

  if (!response.ok) {
    const errorText = await response.text()
    console.log("[v0] Minimax API error response:", errorText)
    throw new Error(`Minimax TTS API error: ${response.status}`)
  }

  const result = await response.json()

  console.log("[v0] Minimax API response:", result)

  // Handle the response structure from the working example
  const audioHex = result?.data?.audio
  if (!audioHex) {
    throw new Error("No audio data received from Minimax TTS")
  }

  // Convert hex audio data to base64 for playback (as shown in Python example)
  try {
    const audioBuffer = Buffer.from(audioHex, "hex")
    const audioMeta = createAudioDataUrl(audioBuffer, "audio/mpeg")

    return {
      provider: "minimax",
      metrics: {
        frontend: { ttfbMs: 0 }, // Will be set by frontend
        backend: { ttfbMs: ttfbTime },
      },
      audioUrl: audioMeta.dataUrl,
      audioMimeType: audioMeta.mimeType,
      audioBytes: audioMeta.byteLength,
      audioDurationSeconds: audioMeta.wavDurationSeconds ?? audioMeta.mp3DurationSeconds,
      status: "success",
    }
  } catch {
    throw new Error("Failed to process Minimax audio data")
  }
}


// Luna TTS processing function
async function processLunaTTS(
  text: string,
  options: { language: string; voice?: string; model?: string },
  startTime: number,
): Promise<TTSProviderResult> {
  const model = options.model || "standard"

  // If LunaTTS1 model (formerly LunaTTS2), use the new API
  if (model === "lunalabs1") {
    return await processLunaTTS2(text, options, startTime)
  }

  // LunaTTS0 processing (formerly LunaTTS1)
  const endpoint = "https://demo.lunalabs.cn/api/lunaTTS/tts"
  const token = process.env.LUNA_ACCESS_TOKEN

  const payload: Record<string, unknown> = {
    text,
  }

  if (options.voice) {
    payload.voice = options.voice
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (token) {
    headers["X-Access-Token"] = token
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Luna TTS API error: ${response.status}`)
  }

  const responseData = await response.json()
  if (!responseData.success) {
    const message = typeof responseData.message === "string" ? responseData.message : "Unknown error"
    throw new Error(`Luna TTS failed: ${message}`)
  }

  const result = responseData.result || {}
  const audioUrl = result.audio_url || result.audioUrl || result.url

  if (!audioUrl) {
    throw new Error("No audio URL in Luna TTS response")
  }

  const audioResponse = await fetch(audioUrl)
  if (!audioResponse.ok) {
    throw new Error(`Failed to download Luna audio: ${audioResponse.status}`)
  }

  const audioBuffer = await audioResponse.arrayBuffer()
  const audioMeta = createAudioDataUrl(Buffer.from(audioBuffer), "audio/mpeg")
  const ttfbTime = Date.now() - startTime

  return {
    provider: "luna",
    metrics: {
      frontend: { ttfbMs: 0 },
      backend: { ttfbMs: ttfbTime },
    },
    audioUrl: audioMeta.dataUrl,
    audioMimeType: audioMeta.mimeType,
    audioBytes: audioMeta.byteLength,
    status: "success",
  }
}

// Qwen TTS processing function
async function processQwenTTS(
  text: string,
  options: { language: string; voice?: string; model?: string },
  startTime: number,
): Promise<TTSProviderResult> {
  try {
    const apiKey = process.env.DASHSCOPE_API_KEY || ""

    const audioBuffer = await synthesizeWithQwenFallback({
      apiKey,
      text,
      voice: options.voice || "Cherry",
      model: options.model || "qwen3-tts-flash",
    })

    const audioMeta = createAudioDataUrl(Buffer.from(audioBuffer), "audio/mpeg")
    const ttfbTime = Date.now() - startTime

    return {
      provider: "qwen",
      metrics: {
        frontend: { ttfbMs: 0 },
        backend: { ttfbMs: ttfbTime },
      },
      audioUrl: audioMeta.dataUrl,
      audioMimeType: audioMeta.mimeType,
      audioBytes: audioMeta.byteLength,
      status: "success",
      source: 'dashscope',
    }
  } catch (error) {
    console.error("[Qwen] Synthesis error:", error)
    throw new Error(`Qwen TTS failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// LunaTTS2 processing function (enhanced version)
async function processLunaTTS2(
  text: string,
  options: { language: string; voice?: string; model?: string },
  startTime: number,
): Promise<TTSProviderResult> {
  try {
    const luna2BaseUrl = process.env.LUNA2_BASE_URL || "https://dev-api.lunalabs.cn"
    const endpoint = `${luna2BaseUrl}/v1/text-to-speech`
    const apiKey = process.env.LUNA2_ACCESS_TOKEN

    if (!apiKey) {
      throw new Error("LUNA2_ACCESS_TOKEN is not configured")
    }

    const payload = {
      voice_id: options.voice || "jingcheng",
      generate_text: text,
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`LunaTTS2 API error: ${response.status}`)
    }

    const responseData = await response.json()

    if (responseData.succeed === false) {
      const message = typeof responseData.error_message === "string" ? responseData.error_message : "Unknown error"
      throw new Error(`LunaTTS2 API error: ${message}`)
    }

    if (!responseData.data?.audio_url) {
      throw new Error("No audio URL in LunaTTS2 response")
    }

    const audioResponse = await fetch(responseData.data.audio_url)
    if (!audioResponse.ok) {
      throw new Error(`Failed to download LunaTTS2 audio: ${audioResponse.status}`)
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    const audioMeta = createAudioDataUrl(Buffer.from(audioBuffer), "audio/mpeg")
    const ttfbTime = Date.now() - startTime

    return {
      provider: "luna",
      metrics: {
        frontend: { ttfbMs: 0 },
        backend: { ttfbMs: ttfbTime },
      },
      audioUrl: audioMeta.dataUrl,
      audioMimeType: audioMeta.mimeType,
      audioBytes: audioMeta.byteLength,
      status: "success",
    }
  } catch (error) {
    console.error("[LunaTTS2] Error:", error)
    throw new Error(`LunaTTS2 failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}
