/**
 * ElevenLabs TTS Provider using Official JS SDK
 * Updated to use @elevenlabs/elevenlabs-js
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

export interface ElevenLabsTTSOptions {
  apiKey: string;
  voiceId: string;
  text: string;
  modelId?: string;
  outputFormat?: string;
  baseUrl?: string;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  labels?: {
    gender?: string;
    age?: string;
    accent?: string;
    language?: string;
    use_case?: string;
  };
}

/**
 * ElevenLabs TTS Provider with official SDK
 */
export class ElevenLabsProvider {
  private client: ElevenLabsClient;

  constructor(apiKey: string, _baseUrl?: string) {
    this.client = new ElevenLabsClient({
      apiKey: apiKey,
      // Note: Official SDK doesn't support custom baseUrl in current version
      // For custom endpoints, we'll fall back to manual fetch
    });
  }

  /**
   * Synthesize speech using ElevenLabs API
   */
  async synthesize(options: Omit<ElevenLabsTTSOptions, 'apiKey' | 'baseUrl'>): Promise<ArrayBuffer> {
    try {
      const audio = await this.client.textToSpeech.convert(options.voiceId, {
        text: options.text,
        modelId: options.modelId || 'eleven_multilingual_v2',
        outputFormat: (options.outputFormat as 'mp3_44100_128' | 'mp3_22050_32' | 'pcm_16000') || 'mp3_44100_128',
      });

      // Convert the audio stream to ArrayBuffer
      if (audio && typeof audio === 'object' && 'getReader' in audio) {
        const reader = (audio as ReadableStream<Uint8Array>).getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        // Combine all chunks into a single ArrayBuffer
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;

        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }

        return result.buffer;
      }

      // Handle other response formats
      if (audio && typeof audio === 'object' && 'byteLength' in audio) {
        return audio as ArrayBuffer;
      }

      // If it's a Blob or other format, convert to ArrayBuffer
      if (audio && typeof audio === 'object' && 'arrayBuffer' in audio) {
        return await (audio as Blob).arrayBuffer();
      }

      throw new Error('Unexpected audio format from ElevenLabs SDK');
    } catch (error) {
      console.error('[ElevenLabs] Synthesis error:', error);
      throw new Error(`ElevenLabs synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getVoices(): Promise<ElevenLabsVoice[]> {
    try {
      const voices = await this.client.voices.getAll();

      return (voices as unknown as Array<Record<string, unknown>>).map((voice: Record<string, unknown>) => ({
        voice_id: voice.voice_id as string,
        name: voice.name as string,
        category: ((voice.labels as Record<string, unknown>)?.category as string) || 'standard',
        description: voice.description as string,
        preview_url: voice.preview_url as string,
        labels: voice.labels as Record<string, unknown>,
      }));
    } catch (error) {
      console.error('[ElevenLabs] Error fetching voices:', error);
      throw new Error(`Failed to fetch voices: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fallback method for custom endpoints or when SDK doesn't work
   */
  async synthesizeWithFallback(options: ElevenLabsTTSOptions): Promise<ArrayBuffer> {
    const { apiKey, voiceId, text, modelId, outputFormat, baseUrl } = options;

    // Try multiple possible API endpoints
    const possibleUrls = [
      `${baseUrl}/v1/text-to-speech/${voiceId}`,
      "https://api.elevenlabs.io/v1/text-to-speech/${voiceId}",
    ].filter(url => url && !url.includes('undefined'));

    let lastError: string | null = null;

    for (const url of possibleUrls) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: modelId || "eleven_multilingual_v2",
            output_format: outputFormat || "mp3_44100_128",
          }),
        });

        if (response.ok) {
          return await response.arrayBuffer();
        } else {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        continue;
      }
    }

    throw new Error(`All endpoints failed. Last error: ${lastError}`);
  }

  /**
   * Fallback method for getting voices with custom endpoints
   */
  async getVoicesWithFallback(apiKey: string, baseUrl?: string): Promise<ElevenLabsVoice[]> {
    // Try multiple possible API endpoints
    const possibleUrls = [
      `${baseUrl}/v1/voices`,
      "https://api.elevenlabs.io/v1/voices",
    ].filter(url => url && !url.includes('undefined'));

    let lastError: string | null = null;
    let voicesData: Record<string, unknown> | null = null;

    for (const url of possibleUrls) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          voicesData = await response.json();
          break;
        } else {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        continue;
      }
    }

    if (!voicesData) {
      throw new Error(`Failed to fetch voices from all endpoints. Last error: ${lastError}`);
    }

    // Normalize voice data
    const voices: Array<Record<string, unknown>> = [];
    if (voicesData.voices && Array.isArray(voicesData.voices)) {
      voices.push(...voicesData.voices as Array<Record<string, unknown>>);
    } else if (Array.isArray(voicesData)) {
      voices.push(...voicesData as Array<Record<string, unknown>>);
    }

    return voices.map((voice: Record<string, unknown>) => ({
      voice_id: (voice.voice_id as string) || (voice.id as string),
      name: (voice.name as string) || 'Unknown',
      category: ((voice.labels as Record<string, unknown>)?.category as string) || 'standard',
      description: voice.description as string,
      preview_url: voice.preview_url as string,
      labels: voice.labels as Record<string, unknown>,
    }));
  }
}

/**
 * Convenience function for ElevenLabs TTS
 */
export async function synthesizeWithElevenLabs(options: ElevenLabsTTSOptions): Promise<ArrayBuffer> {
  const provider = new ElevenLabsProvider(options.apiKey, options.baseUrl);

  try {
    // Try official SDK first
    return await provider.synthesize(options);
  } catch (error) {
    console.warn('[ElevenLabs] SDK failed, trying fallback:', error);
    // Fallback to manual fetch
    return await provider.synthesizeWithFallback(options);
  }
}

/**
 * Convenience function for getting ElevenLabs voices
 */
export async function getElevenLabsVoices(apiKey: string, baseUrl?: string): Promise<ElevenLabsVoice[]> {
  const provider = new ElevenLabsProvider(apiKey, baseUrl);

  try {
    // Try official SDK first
    return await provider.getVoices();
  } catch (error) {
    console.warn('[ElevenLabs] SDK voice fetch failed, trying fallback:', error);
    // Fallback to manual fetch
    return await provider.getVoicesWithFallback(apiKey, baseUrl);
  }
}

/**
 * Legacy function for backward compatibility
 */
export function getConfigFromEnv() {
  return {
    apiKey: process.env.ELEVENLABS_API_KEY || undefined,
    voiceId: process.env.ELEVENLABS_VOICE_ID || undefined,
    baseUrl: process.env.ELEVENLABS_BASE_URL || undefined,
  };
}

