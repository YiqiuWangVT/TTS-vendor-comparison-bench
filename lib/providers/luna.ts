/**
 * Luna TTS Provider
 * Based on the provided TypeScript interface
 */

export interface LunaTTSOptions {
  text: string;
  voice: string;
  voiceTranscript?: string;
  voiceUrl?: string;
  emotionClass?: string;
  voiceCloneState?: boolean;
  baseUrl?: string;
}

export interface LunaTTS2Options {
  voice: string;
  generate_text: string;
  emotion_class?: string;
}

export interface TtsHDRes {
  // The response interface is empty in the provided demo
  // Actual implementation will depend on the API response
  audioUrl?: string;
  audioData?: string; // base64 encoded
  duration?: number;
  sampleRate?: number;
}

export interface LunaTTS2Response {
  success: boolean;
  message?: string;
  data?: {
    audio_url?: string;
    audio_data?: string; // base64 encoded
    duration?: number;
    sample_rate?: number;
  };
}

/**
 * Luna TTS Provider
 */
export class LunaProvider {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || 'https://api.luna.ai';
  }

  /**
   * Synthesize speech using Luna TTS2 API (v1/generate)
   */
  async synthesizeLuna2(options: LunaTTS2Options): Promise<ArrayBuffer> {
    try {
      const url = `${this.baseUrl.replace('/api/lunaTTS', '')}/v1/tts/generate`;

      const payload: Record<string, unknown> = {
        voice: options.voice,
        generate_text: options.generate_text,
      };

      if (options.emotion_class) {
        payload.emotion_class = options.emotion_class;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: LunaTTS2Response = await response.json();

      if (!result.success) {
        throw new Error(`LunaTTS2 API failure: ${result.message || 'Unknown error'}`);
      }

      if (!result.data) {
        throw new Error('No data in LunaTTS2 response');
      }

      // Handle different response formats
      if (result.data.audio_data) {
        // Base64 audio data
        const base64Audio = result.data.audio_data;
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes.buffer;
      } else if (result.data.audio_url) {
        // Audio URL - download the audio
        const audioResponse = await fetch(result.data.audio_url);
        if (!audioResponse.ok) {
          throw new Error(`Failed to download audio from URL: ${result.data.audio_url}`);
        }
        return await audioResponse.arrayBuffer();
      } else {
        throw new Error('No audio data in LunaTTS2 response');
      }
    } catch (error) {
      console.error('[LunaTTS2] Synthesis error:', error);
      throw new Error(`LunaTTS2 synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Synthesize speech using Luna TTS API
   */
  async synthesize(options: Omit<LunaTTSOptions, 'baseUrl'>): Promise<ArrayBuffer> {
    try {
      // Build query parameters
      const params = new URLSearchParams({
        text: options.text,
        voice: options.voice,
      });

      // Add optional parameters
      if (options.voiceTranscript) {
        params.append('voiceTranscript', options.voiceTranscript);
      }
      if (options.voiceUrl) {
        params.append('voiceUrl', options.voiceUrl);
      }
      if (options.emotionClass) {
        params.append('emotionClass', options.emotionClass);
      }
      if (options.voiceCloneState !== undefined) {
        params.append('voiceCloneState', options.voiceCloneState.toString());
      }

      const url = `${this.baseUrl}/api/lunaTTS/tts-hd?${params.toString()}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: TtsHDRes = await response.json();

      // Handle different response formats
      if (result.audioData) {
        // Base64 audio data
        const base64Audio = result.audioData;
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes.buffer;
      } else if (result.audioUrl) {
        // Audio URL - download the audio
        const audioResponse = await fetch(result.audioUrl);
        if (!audioResponse.ok) {
          throw new Error(`Failed to download audio from URL: ${result.audioUrl}`);
        }
        return await audioResponse.arrayBuffer();
      } else {
        throw new Error('No audio data in response');
      }
    } catch (error) {
      console.error('[Luna] Synthesis error:', error);
      throw new Error(`Luna synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate mock WAV audio for testing when API is not available
   */
  generateMockWAV(text: string, voice: string = 'default'): ArrayBuffer {
    // Similar mock implementation as Qwen
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
  async synthesizeWithFallback(options: Omit<LunaTTSOptions, 'baseUrl'>, enableMock: boolean = false): Promise<ArrayBuffer> {
    if (enableMock) {
      console.warn('[Luna] Using mock audio generation');
      return this.generateMockWAV(options.text, options.voice);
    }

    try {
      return await this.synthesize(options);
    } catch (error) {
      console.warn('[Luna] API failed, falling back to mock audio:', error);
      return this.generateMockWAV(options.text, options.voice);
    }
  }
}

/**
 * Convenience function for Luna TTS (matching the provided interface)
 */
export function ttsHD(_text: string, _voice: string, _voiceTranscript?: string, _voiceUrl?: string, _emotionClass?: string, _voiceCloneState?: boolean): Promise<TtsHDRes> {
  const _provider = new LunaProvider();

  // This would return the TtsHDRes interface as shown in the demo
  // For now, we'll adapt it to return ArrayBuffer for consistency
  throw new Error('ttsHD interface not fully implemented - use synthesizeWithLuna instead');
}

/**
 * Convenience function for Luna TTS that returns ArrayBuffer
 */
export async function synthesizeWithLuna(options: LunaTTSOptions): Promise<ArrayBuffer> {
  const provider = new LunaProvider(options.baseUrl);
  return await provider.synthesize(options);
}

/**
 * Convenience function for Luna TTS with fallback
 */
export async function synthesizeWithLunaFallback(options: LunaTTSOptions, enableMock: boolean = false): Promise<ArrayBuffer> {
  const provider = new LunaProvider(options.baseUrl);
  return await provider.synthesizeWithFallback(options, enableMock);
}

/**
 * Convenience function for Luna TTS2 that returns ArrayBuffer
 */
export async function synthesizeWithLuna2(options: LunaTTS2Options, baseUrl?: string): Promise<ArrayBuffer> {
  const provider = new LunaProvider(baseUrl);
  return await provider.synthesizeLuna2(options);
}

/**
 * Convenience function for Luna TTS2 with fallback
 */
export async function synthesizeWithLuna2Fallback(options: LunaTTS2Options, enableMock: boolean = false, baseUrl?: string): Promise<ArrayBuffer> {
  const provider = new LunaProvider(baseUrl);

  if (enableMock) {
    console.warn('[LunaTTS2] Using mock audio generation');
    return provider.generateMockWAV(options.generate_text, options.voice);
  }

  try {
    return await provider.synthesizeLuna2(options);
  } catch (error) {
    console.warn('[LunaTTS2] API failed, falling back to mock audio:', error);
    return provider.generateMockWAV(options.generate_text, options.voice);
  }
}

/**
 * Legacy function for backward compatibility
 */
export function getConfigFromEnv() {
  return {
    baseUrl: process.env.LUNA_BASE_URL || 'https://api.luna.ai',
    luna2BaseUrl: process.env.LUNA2_BASE_URL || 'https://dev-api.lunalabs.cn',
  };
}

