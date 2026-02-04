export interface SiliconFlowTTSRequest {
  model: string
  input: string
  voice: string
  response_format?: string
  speed?: number
}

export interface SiliconFlowTTSResponse {
  success: boolean
  audio?: string // base64 encoded audio data
  error?: string
  duration?: number
  metrics?: {
    ttfb: number
  }
}

/**
 * 估算 WAV 音频时长（毫秒）
 * 基于文件大小和标准参数估算
 */
export function estimateWavDuration(audioBuffer: ArrayBuffer): number {
  if (audioBuffer.byteLength < 44) return 0; // WAV header 最小 44 字节

  // 查找 fmt chunk 中的采样率
  const dataView = new DataView(audioBuffer)

  // 跳过 RIFF header 和 WAVE format
  let offset = 12

  while (offset < audioBuffer.byteLength - 8) {
    const chunkId = String.fromCharCode(
      dataView.getUint8(offset),
      dataView.getUint8(offset + 1),
      dataView.getUint8(offset + 2),
      dataView.getUint8(offset + 3)
    )

    const chunkSize = dataView.getUint32(offset + 4, true)

    if (chunkId === 'fmt ') {
      const sampleRate = dataView.getUint32(offset + 8, true)
      const channels = dataView.getUint16(offset + 10, true)
      const bitsPerSample = dataView.getUint16(offset + 14, true)

      const byteRate = sampleRate * channels * (bitsPerSample / 8)
      const dataSize = audioBuffer.byteLength - 44 // 减去 header

      return Math.round((dataSize / byteRate) * 1000) // 返回毫秒
    }

    offset += 8 + chunkSize
  }

  // 如果找不到 fmt chunk，使用默认估算（假设 44.1kHz, 16bit, stereo）
  const defaultByteRate = 44100 * 2 * (16 / 8) // 采样率 * 声道数 * 位深度/8
  const estimatedDuration = Math.round(((audioBuffer.byteLength - 44) / defaultByteRate) * 1000)
  return estimatedDuration
}

/**
 * 将 ArrayBuffer 转换为 base64 字符串
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * SiliconFlow TTS API 调用
 */
export async function generateSiliconFlowSpeech(
  request: SiliconFlowTTSRequest,
  apiKey: string
): Promise<SiliconFlowTTSResponse> {
  const startTime = Date.now()

  try {
    const response = await fetch('https://api.siliconflow.cn/v1/audio/speech', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(request)
    })

    const ttfb = Date.now() - startTime
    const contentType = response.headers.get('content-type')

    if (response.ok) {
      if (contentType && contentType.includes('audio')) {
        // 直接音频响应
        const audioBuffer = await response.arrayBuffer()
        const audioBase64 = arrayBufferToBase64(audioBuffer)
        const duration = estimateWavDuration(audioBuffer)

        return {
          success: true,
          audio: `data:audio/wav;base64,${audioBase64}`,
          duration,
          metrics: { ttfb }
        }
      } else {
        // JSON 响应（可能包含 base64 音频）
        const result = await response.json()

        if (result.audio) {
          return {
            success: true,
            audio: result.audio,
            metrics: { ttfb }
          }
        } else {
          return {
            success: false,
            error: result.error || result.message || 'No audio data found',
            metrics: { ttfb }
          }
        }
      }
    } else {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || errorData.message || `HTTP ${response.status}`,
        metrics: { ttfb }
      }
    }
  } catch (error) {
    const ttfb = Date.now() - startTime
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metrics: { ttfb }
    }
  }
}

/**
 * 构建标准的 SiliconFlow TTS 请求
 */
export function buildSiliconFlowRequest(
  text: string,
  voice: string,
  model: string = 'fnlp/MOSS-TTSD-v0.5',
  options: {
    speed?: number
    responseFormat?: string
  } = {}
): SiliconFlowTTSRequest {
  return {
    model,
    input: text,
    voice: `fnlp/MOSS-TTSD-v0.5:${voice}`,
    response_format: options.responseFormat || 'wav',
    speed: options.speed || 1.0
  }
}