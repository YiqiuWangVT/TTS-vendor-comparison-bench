/**
 * Minimax TTS Provider using official API
 * Based on the provided API reference
 */

export interface MinimaxTTSOptions {
  apiKey: string;
  text: string;
  model?: string;
  voiceId?: string;
  speed?: number;
  vol?: number;
  pitch?: number;
  stream?: boolean;
  languageBoost?: string;
  outputFormat?: string;
  sampleRate?: number;
  bitrate?: number;
  format?: string;
  channel?: number;
  pronunciationDict?: {
    tone?: string[];
  };
  voiceModify?: {
    pitch?: number;
    intensity?: number;
    timbre?: number;
    soundEffects?: string;
  };
  baseUrl?: string;
}

export interface MinimaxVoice {
  voice_id: string;
  name: string;
  category?: string;
  language?: string;
  description?: string;
}

export interface MinimaxTTSResponse {
  audio_url?: string;
  audio?: string; // hex encoded audio
  usage?: {
    total_tokens: number;
  };
  request_id: string;
}

/**
 * Minimax TTS Provider
 */
export class MinimaxProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.minimax.chat';
  }

  /**
   * Synthesize speech using Minimax TTS API
   */
  async synthesize(options: Omit<MinimaxTTSOptions, 'apiKey' | 'baseUrl'>): Promise<ArrayBuffer> {
    try {
      const requestBody = {
        model: options.model || "speech-2.5-hd-preview",
        text: options.text,
        stream: options.stream || false,
        language_boost: options.languageBoost || "auto",
        output_format: options.outputFormat || "hex",
        voice_setting: {
          voice_id: options.voiceId || "English_expressive_narrator",
          speed: options.speed || 1.0,
          vol: options.vol || 1.0,
          pitch: options.pitch || 0,
        },
        pronunciation_dict: options.pronunciationDict || {},
        audio_setting: {
          sample_rate: options.sampleRate || 32000,
          bitrate: options.bitrate || 128000,
          format: options.format || "mp3",
          channel: options.channel || 1,
        },
        ...(options.voiceModify && { voice_modify: options.voiceModify }),
      };

      const response = await fetch(`${this.baseUrl}/v1/t2a_v2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: MinimaxTTSResponse = await response.json();

      // Handle different response formats
      if (result.audio) {
        // Hex encoded audio
        const hexAudio = result.audio;
        const bytes = new Uint8Array(hexAudio.length / 2);

        for (let i = 0; i < hexAudio.length; i += 2) {
          bytes[i / 2] = parseInt(hexAudio.substr(i, 2), 16);
        }

        return bytes.buffer;
      } else if (result.audio_url) {
        // Audio URL - download the audio
        const audioResponse = await fetch(result.audio_url);
        if (!audioResponse.ok) {
          throw new Error(`Failed to download audio from URL: ${result.audio_url}`);
        }
        return await audioResponse.arrayBuffer();
      } else {
        throw new Error('No audio data in response');
      }
    } catch (error) {
      console.error('[Minimax] Synthesis error:', error);
      throw new Error(`Minimax synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get available Minimax voices (static list as Minimax doesn't have a public voice list API)
   */
  async getVoices(): Promise<MinimaxVoice[]> {
    // Known Minimax voices from the existing implementation
    const minimaxVoices: MinimaxVoice[] = [
      { voice_id: "male-qn-qingse", name: "Male - Young", category: "standard", language: "zh" },
      { voice_id: "male-qn-jingying", name: "Male - Professional", category: "standard", language: "zh" },
      { voice_id: "male-qn-badao", name: "Male - Cool", category: "standard", language: "zh" },
      { voice_id: "male-qn-daxuesheng", name: "Male - Student", category: "standard", language: "zh" },
      { voice_id: "female-shaonv", name: "Female - Young", category: "standard", language: "zh" },
      { voice_id: "female-yujie", name: "Female - Elegant", category: "standard", language: "zh" },
      { voice_id: "female-chengshu", name: "Female - Mature", category: "standard", language: "zh" },
      { voice_id: "female-tianmei", name: "Female - Sweet", category: "standard", language: "zh" },
      { voice_id: "presenter_male", name: "Male Presenter", category: "presenter", language: "zh" },
      { voice_id: "presenter_female", name: "Female Presenter", category: "presenter", language: "zh" },
      { voice_id: "audiobook_male_1", name: "Male Audiobook 1", category: "audiobook", language: "zh" },
      { voice_id: "audiobook_male_2", name: "Male Audiobook 2", category: "audiobook", language: "zh" },
      { voice_id: "audiobook_female_1", name: "Female Audiobook 1", category: "audiobook", language: "zh" },
      { voice_id: "audiobook_female_2", name: "Female Audiobook 2", category: "audiobook", language: "zh" },
      { voice_id: "English_expressive_narrator", name: "English Expressive Narrator", category: "standard", language: "en" },
      { voice_id: "English_male_host", name: "English Male Host", category: "standard", language: "en" },
      { voice_id: "English_female_host", name: "English Female Host", category: "standard", language: "en" },
    ];

    return minimaxVoices;
  }

  /**
   * Generate mock WAV audio for testing when API is not available
   */
  generateMockWAV(text: string, voiceId: string = 'English_expressive_narrator'): ArrayBuffer {
    // Similar mock implementation as other providers
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
    const baseFrequency = voiceId.includes('English') ? 380 : 440;
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
  async synthesizeWithFallback(options: Omit<MinimaxTTSOptions, 'apiKey' | 'baseUrl'>, enableMock: boolean = false): Promise<ArrayBuffer> {
    if (enableMock) {
      console.warn('[Minimax] Using mock audio generation');
      return this.generateMockWAV(options.text, options.voiceId);
    }

    try {
      return await this.synthesize(options);
    } catch (error) {
      console.warn('[Minimax] API failed, falling back to mock audio:', error);
      return this.generateMockWAV(options.text, options.voiceId);
    }
  }
}

/**
 * Convenience function for Minimax TTS
 */
export async function synthesizeWithMinimax(options: MinimaxTTSOptions): Promise<ArrayBuffer> {
  const provider = new MinimaxProvider(options.apiKey, options.baseUrl);
  return await provider.synthesize(options);
}

/**
 * Convenience function for Minimax TTS with fallback
 */
export async function synthesizeWithMinimaxFallback(options: MinimaxTTSOptions, enableMock: boolean = false): Promise<ArrayBuffer> {
  const provider = new MinimaxProvider(options.apiKey, options.baseUrl);
  return await provider.synthesizeWithFallback(options, enableMock);
}

/**
 * Convenience function for getting Minimax voices
 */
export async function getMinimaxVoices(apiKey?: string, baseUrl?: string): Promise<MinimaxVoice[]> {
  const provider = new MinimaxProvider(apiKey || '', baseUrl);
  return await provider.getVoices();
}

/**
 * Legacy function for backward compatibility
 */
export function getConfigFromEnv() {
  return {
    apiKey: process.env.MINIMAX_API_KEY || undefined,
    voiceId: process.env.MINIMAX_VOICE_ID || 'English_expressive_narrator',
    model: process.env.MINIMAX_MODEL || 'speech-2.5-hd-preview',
    baseUrl: process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat',
  };
}

