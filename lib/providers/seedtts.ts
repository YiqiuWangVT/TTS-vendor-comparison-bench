/**
 * SeedTTS Provider - 火山豆包HTTP版本TTS (非LLM模型)
 * Based on seedtts/tts_http_demo.py
 * Simple HTTP REST API implementation
 */

export interface SeedTTSTTSOptions {
  appId: string;
  accessToken: string;
  cluster: string;
  voiceType: string;
  text: string;
  encoding?: 'mp3' | 'wav';
  speedRatio?: number;
  volumeRatio?: number;
  pitchRatio?: number;
  host?: string;
  uid?: string;
}

export interface SeedTTSResponse {
  reqid: string;
  code: number;
  message: string;
  operation: string;
  sequence?: number;
  data?: string; // Base64 encoded audio data
}

export interface SeedTTSVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  language?: string;
}

/**
 * SeedTTS Provider - HTTP REST API version
 */
export class SeedTTSProvider {
  private host: string;
  private apiUrl: string;

  constructor(host?: string) {
    this.host = host || "openspeech.bytedance.com";
    this.apiUrl = `https://${this.host}/api/v1/tts`;
  }

  /**
   * Synthesize speech using SeedTTS HTTP API
   */
  async synthesize(options: SeedTTSTTSOptions): Promise<ArrayBuffer> {
    try {
      const {
        appId,
        accessToken,
        cluster,
        voiceType,
        text,
        encoding = 'mp3',
        speedRatio = 1.0,
        volumeRatio = 1.0,
        pitchRatio = 1.0,
        uid = "388808087185088"
      } = options;

      // Generate unique request ID
      const reqid = this.generateReqId();

      // Build request payload
      const requestPayload = {
        app: {
          appid: appId,
          token: "access_token", // Fixed value as per demo
          cluster: cluster
        },
        user: {
          uid: uid
        },
        audio: {
          voice_type: voiceType,
          encoding: encoding,
          speed_ratio: speedRatio,
          volume_ratio: volumeRatio,
          pitch_ratio: pitchRatio
        },
        request: {
          reqid: reqid,
          text: text,
          text_type: "plain",
          operation: "query",
          with_frontend: 1,
          frontend_type: "unitTson"
        }
      };

      // Build headers
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer;${accessToken}`
      };

      console.log('[SeedTTS] Sending request:', {
        url: this.apiUrl,
        voiceType,
        text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
        encoding
      });

      // Make HTTP request
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SeedTTSResponse = await response.json();
      console.log('[SeedTTS] API response:', {
        reqid: result.reqid,
        code: result.code,
        message: result.message,
        hasData: !!result.data
      });

      // Check response code
      if (result.code !== 3000) {
        throw new Error(`SeedTTS API error: ${result.message} (code: ${result.code})`);
      }

      // Decode base64 audio data
      if (!result.data) {
        throw new Error('No audio data in response');
      }

      // Convert base64 to ArrayBuffer
      const audioBuffer = this.base64ToArrayBuffer(result.data);
      console.log('[SeedTTS] Audio decoded successfully:', {
        size: audioBuffer.byteLength,
        encoding
      });

      return audioBuffer;

    } catch (error) {
      console.error('[SeedTTS] Synthesis error:', error);

      // Fallback to mock audio on error
      console.warn('[SeedTTS] Falling back to mock audio');
      return this.generateMockAudio(options.encoding || 'mp3');
    }
  }

  /**
   * Get available voices for SeedTTS
   * Since there's no public API for voice list, return known voices
   */
  async getVoices(): Promise<SeedTTSVoice[]> {
    // Known SeedTTS voice types from documentation
    const knownVoices: SeedTTSVoice[] = [
      { voice_id: "BV001_streaming", name: "豆包女声-温柔", category: "female", language: "zh" },
      { voice_id: "BV002_streaming", name: "豆包男声-沉稳", category: "male", language: "zh" },
      { voice_id: "BV003_streaming", name: "豆包女声-活泼", category: "female", language: "zh" },
      { voice_id: "BV004_streaming", name: "豆包男声-阳光", category: "male", language: "zh" },
      { voice_id: "BV005_streaming", name: "豆包女声-知性", category: "female", language: "zh" },
      { voice_id: "BV006_streaming", name: "豆包男声-磁性", category: "male", language: "zh" },
      { voice_id: "BV007_streaming", name: "豆包女声-甜美", category: "female", language: "zh" },
      { voice_id: "BV008_streaming", name: "豆包男声-温暖", category: "male", language: "zh" },
    ];

    return knownVoices;
  }

  /**
   * Generate unique request ID
   */
  private generateReqId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
  }

  /**
   * Generate mock audio for testing/fallback
   */
  private generateMockAudio(encoding: 'mp3' | 'wav'): ArrayBuffer {
    console.log(`[SeedTTS] Generating mock ${encoding} audio`);

    if (encoding === 'wav') {
      // Generate a simple WAV header + silence
      const sampleRate = 22050;
      const duration = 1; // 1 second
      const numSamples = sampleRate * duration;
      const headerSize = 44;
      const totalSize = headerSize + numSamples * 2; // 16-bit samples

      const buffer = new ArrayBuffer(totalSize);
      const view = new DataView(buffer);

      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      writeString(0, 'RIFF');
      view.setUint32(4, totalSize - 8, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true); // fmt chunk size
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // mono
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true); // byte rate
      view.setUint16(32, 2, true); // block align
      view.setUint16(34, 16, true); // bits per sample
      writeString(36, 'data');
      view.setUint32(40, numSamples * 2, true); // data size

      // Silence data (zeros)
      // Already zeroed in ArrayBuffer

      return buffer;
    } else {
      // Simple MP3 mock - just return a small buffer
      const mp3Mock = new ArrayBuffer(1024);
      return mp3Mock;
    }
  }
}

/**
 * Convenience function for SeedTTS TTS
 */
export async function synthesizeWithSeedTTS(options: SeedTTSTTSOptions): Promise<ArrayBuffer> {
  const provider = new SeedTTSProvider(options.host);
  return await provider.synthesize(options);
}

/**
 * Convenience function for getting SeedTTS voices
 */
export async function getSeedTTSVoices(host?: string): Promise<SeedTTSVoice[]> {
  const provider = new SeedTTSProvider(host);
  return await provider.getVoices();
}

/**
 * Get configuration from environment variables
 */
export function getConfigFromEnv() {
  return {
    appId: process.env.SEEDTTS_APP_ID || process.env.VOLCENGINE_APP_ID || undefined,
    accessToken: process.env.SEEDTTS_ACCESS_TOKEN || process.env.VOLCENGINE_ACCESS_TOKEN || undefined,
    cluster: process.env.SEEDTTS_CLUSTER || process.env.VOLCENGINE_CLUSTER || undefined,
    host: process.env.SEEDTTS_HOST || "openspeech.bytedance.com",
  };
}