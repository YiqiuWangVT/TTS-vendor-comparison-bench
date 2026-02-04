import { type NextRequest, NextResponse } from "next/server"

/**
 * Voice Management API
 * Consolidated endpoint for managing voice lists across providers
 */

export async function POST(request: NextRequest) {
  try {
    const { action, provider, ...params } = await request.json()

    console.log(`[Admin] Voice management request: ${action} for ${provider}`)

    switch (action) {
      case 'fetch':
        return await handleFetchVoices(provider, params)
      case 'scan':
        return await handleScanVoices(provider, params)
      case 'export':
        return await handleExportVoices(provider, params)
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

  } catch (error) {
    console.error("[Admin] Voice management error:", error)
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

async function handleFetchVoices(provider: string, params: Record<string, unknown>) {
  switch (provider) {
    case 'elevenlabs':
      return await fetchElevenLabsVoices(params as { apiKey: string, baseUrl?: string })
    case 'minimax':
      return await fetchMinimaxVoices(params as { groupId: string, apiKey: string })
    case 'qwen':
      return await fetchQwenVoices(params as { apiKey?: string })
    default:
      return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 })
  }
}

async function handleScanVoices(provider: string, params: Record<string, unknown>) {
  switch (provider) {
    case 'minimax':
      return await scanMinimaxVoices(params as { groupId: string, apiKey: string, model?: string })
    default:
      return NextResponse.json({ error: `Scanning not supported for: ${provider}` }, { status: 400 })
  }
}

async function handleExportVoices(provider: string, params: Record<string, unknown>) {
  switch (provider) {
    case 'all':
      return await exportAllVoices(params as { format?: 'json' | 'csv' })
    default:
      return NextResponse.json({ error: `Export not supported for: ${provider}` }, { status: 400 })
  }
}

// Individual provider implementations
async function fetchElevenLabsVoices(params: { apiKey: string, baseUrl?: string }) {
  const { apiKey, baseUrl } = params

  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 })
  }

  // Try multiple possible API endpoints
  const possibleUrls = [
    `${baseUrl}/v2/voices?voice_type=`.replace('undefined', ''),
    "https://api.elevenlabs.io/v2/voices?voice_type=",
    "https://api.elevenlabs.io/v1/voices",
  ]

  let voicesData: Record<string, unknown> | null = null
  let lastError: string | null = null

  for (const url of possibleUrls) {
    try {
      const response = await fetch(url, {
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        voicesData = await response.json()
        break
      } else {
        lastError = `HTTP ${response.status}: ${response.statusText}`
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      continue
    }
  }

  if (!voicesData) {
    return NextResponse.json({
      error: "Failed to fetch voices from all endpoints",
      details: lastError
    }, { status: 500 })
  }

  const normalizedVoices = normalizeElevenLabsVoices(voicesData)

  return NextResponse.json({
    success: true,
    provider: 'elevenlabs',
    voices: normalizedVoices,
    total: normalizedVoices.length,
  })
}

async function fetchMinimaxVoices(_params: { groupId: string, apiKey: string }) {
  // For Minimax, we'll return the known voice list since they don't have a public voice list API
  const knownVoiceIds = [
    { id: "male-qn-qingse", name: "Male - Young", category: "standard", language: "zh" },
    { id: "male-qn-jingying", name: "Male - Professional", category: "standard", language: "zh" },
    { id: "male-qn-badao", name: "Male - Cool", category: "standard", language: "zh" },
    { id: "male-qn-daxuesheng", name: "Male - Student", category: "standard", language: "zh" },
    { id: "female-shaonv", name: "Female - Young", category: "standard", language: "zh" },
    { id: "female-yujie", name: "Female - Elegant", category: "standard", language: "zh" },
    { id: "female-chengshu", name: "Female - Mature", category: "standard", language: "zh" },
    { id: "female-tianmei", name: "Female - Sweet", category: "standard", language: "zh" },
    { id: "presenter_male", name: "Male Presenter", category: "presenter", language: "zh" },
    { id: "presenter_female", name: "Female Presenter", category: "presenter", language: "zh" },
    { id: "audiobook_male_1", name: "Male Audiobook 1", category: "audiobook", language: "zh" },
    { id: "audiobook_male_2", name: "Male Audiobook 2", category: "audiobook", language: "zh" },
    { id: "audiobook_female_1", name: "Female Audiobook 1", category: "audiobook", language: "zh" },
    { id: "audiobook_female_2", name: "Female Audiobook 2", category: "audiobook", language: "zh" },
  ]

  return NextResponse.json({
    success: true,
    provider: 'minimax',
    voices: knownVoiceIds,
    total: knownVoiceIds.length,
    note: "This is a static list. Use the 'scan' action to test voice availability."
  })
}

async function fetchQwenVoices(_params: { apiKey?: string }) {
  // Qwen voices from providers.ts
  const qwenVoices = [
    { id: "Cherry", name: "Cherry", category: "standard", language: "zh" },
    { id: "Mia", name: "Mia", category: "standard", language: "en" },
    { id: "Jenny", name: "Jenny", category: "standard", language: "en" },
  ]

  return NextResponse.json({
    success: true,
    provider: 'qwen',
    voices: qwenVoices,
    total: qwenVoices.length,
  })
}

async function scanMinimaxVoices(_params: { groupId: string, apiKey: string, model?: string }) {
  // This would implement the voice scanning logic from minimax_scan_voices.py
  // For now, return a placeholder response
  return NextResponse.json({
    success: true,
    provider: 'minimax',
    action: 'scan',
    note: "Voice scanning implementation in progress. Use fetch-elevenlabs-voices endpoint for now.",
  })
}

async function exportAllVoices(params: { format?: 'json' | 'csv' }) {
  // Export all known voices from all providers
  const allProviders = ['elevenlabs', 'minimax', 'qwen']
  const allVoices: Array<Record<string, unknown>> = []

  for (const provider of allProviders) {
    try {
      let response: Response | undefined
      if (provider === 'elevenlabs') {
        response = await fetchElevenLabsVoices({ apiKey: 'test' })
      } else if (provider === 'minimax') {
        response = await fetchMinimaxVoices({ groupId: 'test', apiKey: 'test' })
      } else if (provider === 'qwen') {
        response = await fetchQwenVoices({ apiKey: 'test' })
      }

      if (response && response.status === 200) {
        const data = await response.json()
        allVoices.push(...data.voices.map((voice: Record<string, unknown>) => ({ ...voice, provider })))
      }
    } catch (error) {
      console.warn(`Failed to fetch voices for ${provider}:`, error)
    }
  }

  const format = params.format || 'json'

  if (format === 'csv') {
    // Convert to CSV
    const headers = ['provider', 'id', 'name', 'category', 'language', 'gender', 'description']
    const csvRows = [headers.join(',')]

    for (const voice of allVoices) {
      const row = headers.map(header => `"${voice[header] || ''}"`)
      csvRows.push(row.join(','))
    }

    const csv = csvRows.join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="voices.csv"',
      },
    })
  }

  return NextResponse.json({
    success: true,
    providers: allProviders,
    totalVoices: allVoices.length,
    voices: allVoices,
  })
}

// Helper function to normalize ElevenLabs voices
function normalizeElevenLabsVoices(data: Record<string, unknown>) {
  const voices: Array<Record<string, unknown>> = []

  if (data.voices && Array.isArray(data.voices)) {
    voices.push(...data.voices as Array<Record<string, unknown>>)
  } else if (Array.isArray(data)) {
    voices.push(...data as Array<Record<string, unknown>>)
  }

  return voices.map((voice: Record<string, unknown>) => ({
    id: (voice.voice_id as string) || (voice.id as string),
    name: (voice.name as string) || 'Unknown',
    category: ((voice.labels as Record<string, unknown>)?.category as string) || 'standard',
    language: (voice.language as string) || ((voice.languages as Array<string>)?.[0]) || 'unknown',
    gender: ((voice.labels as Record<string, unknown>)?.gender as string) || 'unknown',
    accent: ((voice.labels as Record<string, unknown>)?.accent as string),
    description: voice.description as string,
    preview_url: voice.preview_url as string,
  }))
}