import { type NextRequest, NextResponse } from "next/server"

/**
 * Fetch and normalize ElevenLabs voice list
 * Ported from Python 11labs_voicelist/voicelist11labs11labs.py
 */

export async function POST(request: NextRequest) {
  try {
    const { apiKey, baseUrl } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 })
    }

    console.log("[Admin] Fetching ElevenLabs voices...")

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
          method: "GET",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
            })

        if (response.ok) {
          voicesData = await response.json()
          console.log(`[Admin] Successfully fetched voices from: ${url}`)
          break
        } else {
          lastError = `HTTP ${response.status}: ${response.statusText}`
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        console.warn(`[Admin] Failed to fetch from ${url}:`, lastError)
        continue
      }
    }

    if (!voicesData) {
      return NextResponse.json({
        error: "Failed to fetch voices from all endpoints",
        details: lastError
      }, { status: 500 })
    }

    // Normalize voice data to match the format expected by the UI
    const normalizedVoices = normalizeVoices(voicesData)

    return NextResponse.json({
      success: true,
      voices: normalizedVoices,
      total: normalizedVoices.length,
      raw: voicesData,
    })

  } catch (error) {
    console.error("[Admin] Error fetching ElevenLabs voices:", error)
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

function normalizeVoices(data: unknown): Array<{
  id: string
  name: string
  category?: string
  language?: string
  gender?: string
  age?: string
  accent?: string
  description?: string
  preview_url?: string
}> {
  const voices: Array<Record<string, unknown>> = []

  // Handle different response formats
  const responseData = data as Record<string, unknown>
  if (responseData.voices && Array.isArray(responseData.voices)) {
    voices.push(...responseData.voices as Array<Record<string, unknown>>)
  } else if (Array.isArray(data)) {
    voices.push(...data as Array<Record<string, unknown>>)
  } else {
    console.warn("[Admin] Unexpected voice data format:", data)
    return []
  }

  return voices.map((voice: Record<string, unknown>) => {
    const labels = voice.labels as Record<string, unknown> | undefined
    const languages = voice.languages as Array<string> | undefined

    // Extract language information
    const language = (voice.language as string) || languages?.[0] || 'unknown'

    // Determine category from labels or voice_id
    let category = 'standard'
    if (labels) {
      if (labels.category) {
        category = labels.category as string
      } else if (labels.type) {
        category = labels.type as string
      }
    }

    // Extract gender from labels or name
    let gender = 'unknown'
    if (labels?.gender) {
      gender = labels.gender as string
    } else if (voice.name) {
      const name = (voice.name as string).toLowerCase()
      if (name.includes('female') || name.includes('woman') || name.includes('girl')) {
        gender = 'female'
      } else if (name.includes('male') || name.includes('man') || name.includes('boy')) {
        gender = 'male'
      }
    }

    // Extract accent from labels
    const accent = (labels?.accent as string) || (voice.accent as string)

    return {
      id: (voice.voice_id as string) || (voice.id as string),
      name: (voice.name as string) || 'Unknown',
      category,
      language,
      gender,
      accent,
      age: labels?.age as string,
      description: voice.description as string,
      preview_url: voice.preview_url as string,
    }
  })
}