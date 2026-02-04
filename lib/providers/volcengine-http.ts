/**
 * VolcEngine TTS HTTP Provider
 * HTTP REST API version for VolcEngine (Douyin) TTS
 * Based on the same API structure as SeedTTS but for VolcEngine cluster
 */

export interface VolcEngineHTTPOptions {
  appId: string;
  accessToken: string;
  cluster: string;
  voiceType: string;
  text: string;
  encoding?: 'mp3' | 'wav';
  speedRatio?: number;
  host?: string;
  uid?: string;
}

export interface VolcEngineHTTPResponse {
  reqid: string;
  code: number;
  message: string;
  operation: string;
  sequence?: number;
  data?: string; // Base64 encoded audio data
}

export interface VolcEngineVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  language?: string;
}

/**
 * VolcEngine HTTP TTS Provider
 */
export class VolcEngineHTTPProvider {
  private host: string;
  private apiUrl: string;

  constructor(host?: string) {
    this.host = host || "openspeech.bytedance.com";
    this.apiUrl = `https://${this.host}/api/v1/tts`;
  }

  /**
   * Synthesize speech using VolcEngine HTTP API
   */
  async synthesize(options: VolcEngineHTTPOptions): Promise<ArrayBuffer> {
    try {
      const {
        appId,
        accessToken,
        cluster,
        voiceType,
        text,
        encoding = 'mp3',
        speedRatio = 1.0,
        uid = "388808087185088"
      } = options;

      // Generate unique request ID
      const reqid = this.generateReqId();

      // Build request payload following VolcEngine official API structure
      const requestPayload = {
        app: {
          appid: appId,
          token: "access_token", // Fixed literal value as per official docs
          cluster: cluster
        },
        user: {
          uid: uid
        },
        audio: {
          voice_type: voiceType,
          encoding: encoding,
          speed_ratio: speedRatio
        },
        request: {
          reqid: reqid,
          text: text,
          operation: "query"
        }
      };

      // Build headers
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer;${accessToken}`
      };

      console.log('[VolcEngineHTTP] Sending request:', {
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

      const result: VolcEngineHTTPResponse = await response.json();
      console.log('[VolcEngineHTTP] API response:', {
        reqid: result.reqid,
        code: result.code,
        message: result.message,
        hasData: !!result.data
      });

      // Check response code
      if (result.code !== 3000) {
        throw new Error(`VolcEngine API error: ${result.message} (code: ${result.code})`);
      }

      // Decode base64 audio data
      if (!result.data) {
        throw new Error('No audio data in response');
      }

      // Convert base64 to ArrayBuffer
      const audioBuffer = this.base64ToArrayBuffer(result.data);
      console.log('[VolcEngineHTTP] Audio decoded successfully:', {
        size: audioBuffer.byteLength,
        encoding
      });

      return audioBuffer;

    } catch (error) {
      console.error('[VolcEngineHTTP] Synthesis error:', error);

      // No fallback - return real error for TTS LLM
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`VolcEngine TTS API failed: ${errorMessage}`);
    }
  }

  /**
   * Get available voices for VolcEngine HTTP
   * Since there's no public API for voice list, return known voices
   */
  async getVoices(): Promise<VolcEngineVoice[]> {
    // Official VolcEngine voice types from documentation
    const knownVoices: VolcEngineVoice[] = [
      // Male voices (recommended)
      { voice_id: "zh_male_M392_conversation_wvae_bigtts", name: "男声-M392 (推荐)", category: "male", language: "zh" },
      { voice_id: "zh_male_jingpin_wav", name: "男声-精品", category: "male", language: "zh" },
      { voice_id: "zh_male_novel", name: "男声-小说", category: "male", language: "zh" },
      { voice_id: "zh_male_XiaoHu_tts", name: "男声-小虎", category: "male", language: "zh" },

      // Female voices (recommended)
      { voice_id: "zh_female_jingpin_wav", name: "女声-精品", category: "female", language: "zh" },
      { voice_id: "zh_female_tianmei_moon_tts", name: "女声-甜美", category: "female", language: "zh" },
      { voice_id: "zh_female_XiaoYun_tts", name: "女声-小云", category: "female", language: "zh" },
      { voice_id: "zh_female_novel", name: "女声-小说", category: "female", language: "zh" },
      { voice_id: "zh_female_vv_uranus_bigtts", name: "女声-Uranus", category: "female", language: "zh" },
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

  }

/**
 * Convenience function for VolcEngine HTTP TTS
 */
export async function synthesizeWithVolcEngineHTTP(options: VolcEngineHTTPOptions): Promise<ArrayBuffer> {
  const provider = new VolcEngineHTTPProvider(options.host);
  return await provider.synthesize(options);
}

/**
 * Convenience function for getting VolcEngine HTTP voices
 */
export async function getVolcEngineHTTPVoices(host?: string): Promise<VolcEngineVoice[]> {
  const provider = new VolcEngineHTTPProvider(host);
  return await provider.getVoices();
}

/**
 * Get configuration from environment variables
 */
export function getConfigFromEnv() {
  return {
    appId: process.env.VOLCENGINE_APP_ID || process.env.DOUYIN_APP_ID || undefined,
    accessToken: process.env.VOLCENGINE_ACCESS_TOKEN || process.env.DOUYIN_ACCESS_TOKEN || undefined,
    cluster: process.env.VOLCENGINE_CLUSTER || process.env.DOUYIN_CLUSTER || undefined,
    host: process.env.VOLCENGINE_HOST || "openspeech.bytedance.com",
  };
}