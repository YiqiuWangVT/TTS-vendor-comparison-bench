import { type NextRequest, NextResponse } from "next/server"

/**
 * Scan and classify Minimax voice IDs
 * Ported from Python minimax_voice_lists/minimax_scan_voices.py
 */

export async function POST(request: NextRequest) {
  try {
    const { groupId, apiKey, model, testTexts } = await request.json()

    if (!groupId || !apiKey) {
      return NextResponse.json({ error: "groupId and apiKey are required" }, { status: 400 })
    }

    console.log("[Admin] Scanning Minimax voices...")

    // Default test texts
    const defaultTestTexts = {
      zh: "你好，这是一个测试语音。",
      en: "Hello, this is a test voice."
    }

    const textsToTest = { ...defaultTestTexts, ...(testTexts || {}) }
    const selectedModel = model || "speech-01-240228"

    // Known Minimax voice IDs (from the Python script and providers.ts)
    const knownVoiceIds = [
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

    const results = []
    const timeout = 10000 // 10 seconds per test

    console.log(`[Admin] Testing ${knownVoiceIds.length} voices with model: ${selectedModel}`)

    for (const voiceId of knownVoiceIds) {
      console.log(`[Admin] Testing voice: ${voiceId}`)

      const voiceResult = {
        voice_id: voiceId,
        name: voiceId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        zh_test: null as {
          success?: boolean
          error?: string
          elapsed_ms?: number
          audio_size?: number
        } | null,
        en_test: null as {
          success?: boolean
          error?: string
          elapsed_ms?: number
          audio_size?: number
        } | null,
        category: 'none',
        total_time_ms: 0,
      }

      const startTime = Date.now()

      // Test Chinese
      if (textsToTest.zh) {
        try {
          const zhResult = await testMinimaxVoice({
            groupId,
            apiKey,
            model: selectedModel,
            voiceId,
            text: textsToTest.zh,
            timeout
          })
          voiceResult.zh_test = zhResult
        } catch (error) {
          voiceResult.zh_test = {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }
        }
      }

      // Test English
      if (textsToTest.en) {
        try {
          const enResult = await testMinimaxVoice({
            groupId,
            apiKey,
            model: selectedModel,
            voiceId,
            text: textsToTest.en,
            timeout
          })
          voiceResult.en_test = enResult
        } catch (error) {
          voiceResult.en_test = {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }
        }
      }

      voiceResult.total_time_ms = Date.now() - startTime

      // Determine category
      if (voiceResult.zh_test?.success && voiceResult.en_test?.success) {
        voiceResult.category = 'dual'
      } else if (voiceResult.zh_test?.success) {
        voiceResult.category = 'zh'
      } else if (voiceResult.en_test?.success) {
        voiceResult.category = 'en'
      } else {
        voiceResult.category = 'none'
      }

      results.push(voiceResult)

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Summary statistics
    const summary = {
      total: results.length,
      zh: results.filter(r => r.category === 'zh').length,
      en: results.filter(r => r.category === 'en').length,
      dual: results.filter(r => r.category === 'dual').length,
      none: results.filter(r => r.category === 'none').length,
    }

    console.log("[Admin] Voice scan completed:", summary)

    return NextResponse.json({
      success: true,
      model: selectedModel,
      testTexts: textsToTest,
      summary,
      voices: results,
    })

  } catch (error) {
    console.error("[Admin] Error scanning Minimax voices:", error)
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

async function testMinimaxVoice({
  groupId: _groupId,  // Prefix with underscore to indicate intentionally unused
  apiKey,
  model,
  voiceId,
  text,
  timeout
}: {
  groupId: string
  apiKey: string
  model: string
  voiceId: string
  text: string
  timeout: number
}): Promise<{
  success: boolean
  elapsed_ms: number
  audio_size: number
  response: Record<string, unknown>
}> {
  const startTime = Date.now()

  const response = await fetch(`https://api.minimax.chat/v1/t2a_v2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      voice_id: voiceId,
      text,
      speed: 1.0,
      vol: 1.0,
      pitch: 0,
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: "mp3",
      },
    }),
    signal: AbortSignal.timeout(timeout),
  })

  const elapsedMs = Date.now() - startTime

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  const result = await response.json()

  if (result.base64_audio) {
    return {
      success: true,
      elapsed_ms: elapsedMs,
      audio_size: Buffer.from(result.base64_audio, 'base64').length,
      response: result,
    }
  } else {
    throw new Error("No audio data in response")
  }
}