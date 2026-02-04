/**
 * Qwen TTS Provider using DashScope API
 * Updated to use official Alibaba DashScope API
 */

export interface QwenTTSOptions {
  apiKey: string;
  text: string;
  voice?: string;
  model?: string;
  languageType?: string;
  baseUrl?: string;
}

export interface QwenVoice {
  id: string;
  name: string;
  category?: string;
  language?: string;
  description?: string;
}

export interface QwenTTSResponse {
  output: {
    audio_url?: string;
    audio_data?: string; // base64 encoded audio
    audio?: {
      data?: string; // base64 encoded audio in nested format
      url?: string; // audio URL in nested format
    };
  };
  usage: {
    character_count: number;
  };
  request_id: string;
  task_id: string;
  task_status: string;
}

/**
 * Qwen TTS Provider using DashScope API
 */
export class QwenProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://dashscope.aliyuncs.com';
  }

  /**
   * Synthesize speech using Qwen TTS API
   */
  async synthesize(options: Omit<QwenTTSOptions, 'apiKey' | 'baseUrl'>): Promise<ArrayBuffer> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/services/aigc/multimodal-generation/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model || 'qwen3-tts-flash',
          input: {
            text: options.text,
            voice: options.voice || 'Cherry',
            language_type: options.languageType || 'Chinese',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: QwenTTSResponse = await response.json();

      console.log('[Qwen] API response:', {
        statusCode: result.task_status,
        requestId: result.request_id,
        hasAudioData: !!result.output?.audio_data,
        hasAudioUrl: !!result.output?.audio_url,
        usage: result.usage,
        outputKeys: result.output ? Object.keys(result.output) : null,
        fullResponse: result
      });

      // Handle different response formats
      if (result.output?.audio?.data) {
        // Base64 audio data in nested audio object
        const base64Audio = result.output.audio.data;
        if (base64Audio && base64Audio.length > 0) {
          console.log('[Qwen] Processing base64 audio data, length:', base64Audio.length);
          const binaryString = atob(base64Audio);
          const bytes = new Uint8Array(binaryString.length);

          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          console.log('[Qwen] Successfully converted base64 to ArrayBuffer, size:', bytes.buffer.byteLength);
          return bytes.buffer;
        }
      }

      if (result.output?.audio?.url) {
        // Audio URL - download the audio
        console.log('[Qwen] Downloading audio from URL:', result.output.audio.url);
        const audioResponse = await fetch(result.output.audio.url);
        if (!audioResponse.ok) {
          throw new Error(`Failed to download audio from URL: ${result.output.audio.url}`);
        }
        const audioBuffer = await audioResponse.arrayBuffer();
        console.log('[Qwen] Successfully downloaded audio, size:', audioBuffer.byteLength);
        return audioBuffer;
      }

      // Legacy format fallbacks
      if (result.output?.audio_data) {
        // Base64 audio data (legacy)
        const base64Audio = result.output.audio_data;
        console.log('[Qwen] Processing legacy base64 audio data, length:', base64Audio.length);
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        console.log('[Qwen] Successfully converted legacy base64 to ArrayBuffer, size:', bytes.buffer.byteLength);
        return bytes.buffer;
      } else if (result.output?.audio_url) {
        // Audio URL - download the audio (legacy)
        console.log('[Qwen] Downloading audio from legacy URL:', result.output.audio_url);
        const audioResponse = await fetch(result.output.audio_url);
        if (!audioResponse.ok) {
          throw new Error(`Failed to download audio from legacy URL: ${result.output.audio_url}`);
        }
        const audioBuffer = await audioResponse.arrayBuffer();
        console.log('[Qwen] Successfully downloaded legacy audio, size:', audioBuffer.byteLength);
        return audioBuffer;
      } else {
        console.error('[Qwen] No audio data in response. Full response:', JSON.stringify(result, null, 2));
        throw new Error('No audio data in response');
      }
    } catch (error) {
      console.error('[Qwen] Synthesis error:', error);
      throw new Error(`Qwen synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get available Qwen voices (static list as Qwen doesn't have a public voice list API)
   */
  async getVoices(): Promise<QwenVoice[]> {
    // Known Qwen voices from the providers.ts file and documentation
    const qwenVoices: QwenVoice[] = [
      { id: "Cherry", name: "Cherry", category: "standard", language: "zh", description: "Chinese female voice" },
      { id: "Mia", name: "Mia", category: "standard", language: "en", description: "English female voice" },
      { id: "Jenny", name: "Jenny", category: "standard", language: "en", description: "English female voice" },
    ];

    return qwenVoices;
  }

  /**
   * Generate mock WAV audio for testing when API is not available
   */
  generateMockWAV(text: string, voice: string = 'Cherry'): ArrayBuffer {
    // Simple mock WAV generation for testing
    const sampleRate = 22050;
    const duration = Math.min(text.length * 0.1, 10); // 0.1s per character, max 10s
    const numSamples = Math.floor(sampleRate * duration);

    // Generate a simple sine wave with some variation
    const buffer = new ArrayBuffer(44 + numSamples * 2); // WAV header + 16-bit samples
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true); // File size - 8
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, 1, true); // NumChannels (mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true); // Subchunk2Size

    // Generate audio data (simple sine wave with voice-based frequency variation)
    const baseFrequency = voice === 'Cherry' ? 440 : voice === 'Mia' ? 380 : 420;
    const frequency = baseFrequency + (text.charCodeAt(0) % 100); // Vary based on text

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 0.3); // Exponential decay
      const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
      const value = Math.max(-1, Math.min(1, sample)); // Clamp
      view.setInt16(44 + i * 2, value * 0x7FFF, true);
    }

    return buffer;
  }

  /**
   * Synthesize with fallback to mock audio for testing
   */
  async synthesizeWithFallback(options: Omit<QwenTTSOptions, 'apiKey' | 'baseUrl'>, enableMock: boolean = false): Promise<ArrayBuffer> {
    if (enableMock || !this.apiKey) {
      console.warn('[Qwen] Using mock audio generation');
      return this.generateMockWAV(options.text, options.voice);
    }

    try {
      return await this.synthesize(options);
    } catch (error) {
      console.warn('[Qwen] API failed, falling back to mock audio:', error);
      return this.generateMockWAV(options.text, options.voice);
    }
  }
}

/**
 * Convenience function for Qwen TTS
 */
export async function synthesizeWithQwen(options: QwenTTSOptions): Promise<ArrayBuffer> {
  const provider = new QwenProvider(options.apiKey, options.baseUrl);
  return await provider.synthesize(options);
}

/**
 * Convenience function for Qwen TTS with fallback
 */
export async function synthesizeWithQwenFallback(options: QwenTTSOptions, enableMock: boolean = false): Promise<ArrayBuffer> {
  const provider = new QwenProvider(options.apiKey, options.baseUrl);
  return await provider.synthesizeWithFallback(options, enableMock);
}

/**
 * Convenience function for getting Qwen voices
 */
export async function getQwenVoices(apiKey?: string, baseUrl?: string): Promise<QwenVoice[]> {
  const provider = new QwenProvider(apiKey || '', baseUrl);
  return await provider.getVoices();
}

/**
 * Legacy function for backward compatibility
 */
export function getConfigFromEnv() {
  return {
    apiKey: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || undefined,
    voice: process.env.QWEN_VOICE || 'Cherry',
    model: process.env.QWEN_MODEL || 'qwen3-tts-flash',
    baseUrl: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com',
  };
}

