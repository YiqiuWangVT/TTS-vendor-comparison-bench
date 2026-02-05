/**
 * 音频格式转换工具
 * 将各种格式转换为 WAV 格式
 */

/**
 * 将 Blob 转换为 AudioBuffer
 */
async function blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
  const audioContext = new AudioContext()
  const arrayBuffer = await blob.arrayBuffer()
  return await audioContext.decodeAudioData(arrayBuffer)
}

/**
 * 将 AudioBuffer 转换为 WAV Blob
 */
function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numberOfChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16

  const bytesPerSample = bitDepth / 8
  const blockAlign = numberOfChannels * bytesPerSample

  const length = audioBuffer.length * blockAlign
  const buffer = new ArrayBuffer(44 + length)
  const view = new DataView(buffer)

  // WAV 文件头
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  // RIFF 标识符
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + length, true) // 文件长度
  writeString(8, 'WAVE')

  // fmt 子块
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // fmt 子块大小
  view.setUint16(20, format, true) // 音频格式 (PCM)
  view.setUint16(22, numberOfChannels, true) // 声道数
  view.setUint32(24, sampleRate, true) // 采样率
  view.setUint32(28, sampleRate * blockAlign, true) // 字节率
  view.setUint16(32, blockAlign, true) // 块对齐
  view.setUint16(34, bitDepth, true) // 位深度

  // data 子块
  writeString(36, 'data')
  view.setUint32(40, length, true) // 数据长度

  // 写入音频数据
  const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const sample = Math.max(-1, Math.min(1, input[i]))
      output.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
    }
  }

  const channels: Float32Array[] = []
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i))
  }

  let offset = 44
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      view.setInt16(offset, channels[channel][i] * 0x7FFF, true)
      offset += 2
    }
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

/**
 * 将任意格式的音频 Blob 转换为 WAV 格式
 */
export async function convertToWav(blob: Blob): Promise<Blob> {
  try {
    // 如果已经是 WAV 格式，直接返回
    if (blob.type === 'audio/wav' || blob.type === 'audio/wave') {
      return blob
    }

    // 转换为 AudioBuffer
    const audioBuffer = await blobToAudioBuffer(blob)

    // 转换为 WAV Blob
    const wavBlob = audioBufferToWav(audioBuffer)

    console.log(`[AudioConverter] 转换完成: ${blob.type} → audio/wav`)
    return wavBlob
  } catch (error) {
    console.error('[AudioConverter] 转换失败:', error)
    throw error
  }
}

/**
 * 从 Data URL 转换为 WAV Blob
 */
export async function dataUrlToWav(dataUrl: string): Promise<Blob> {
  try {
    // 从 Data URL 获取原始 Blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()

    // 转换为 WAV
    return await convertToWav(blob)
  } catch (error) {
    console.error('[AudioConverter] Data URL 转换失败:', error)
    throw error
  }
}
