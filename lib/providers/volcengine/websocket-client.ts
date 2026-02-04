/**
 * VolcEngine TTS WebSocket Client
 * Ported from Python volcengine_binary_demo/examples/volcengine/binary.py
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { createHmac } from 'crypto';
import {
  MsgType,
  VolcEngineMessage,
  createFullClientRequest,
} from './protocol';

export interface VolcEngineTTSOptions {
  appId: string;
  accessToken: string;
  secretKey?: string;
  voiceType: string;
  text: string;
  encoding?: 'wav' | 'mp3' | 'ogg';
  cluster?: string;
  endpoint?: string;
  timeout?: number;
  authFormat?: 'bearer_space' | 'bearer_semicolon' | 'hmac_sha256';
}

export interface TTSRequestPayload {
  app: {
    appid: string;
    token: string;
    cluster: string;
  };
  user: {
    uid: string;
  };
  audio: {
    voice_type: string;
    encoding: string;
  };
  request: {
    reqid: string;
    text: string;
    operation: string;
    with_timestamp: string;
    extra_param: string;
  };
}

export class VolcEngineWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private options: Required<Omit<VolcEngineTTSOptions, 'secretKey'>> & { secretKey?: string };
  private isConnected = false;

  constructor(options: VolcEngineTTSOptions) {
    super();

    this.options = {
      appId: options.appId,
      accessToken: options.accessToken,
      secretKey: options.secretKey,
      voiceType: options.voiceType,
      text: options.text,
      encoding: options.encoding || 'wav',
      cluster: options.cluster || this.getCluster(options.voiceType),
      endpoint: options.endpoint || 'wss://openspeech.bytedance.com/api/v1/tts/ws_binary',
      timeout: options.timeout || 30000,
      authFormat: options.authFormat || 'bearer_semicolon',
    };
  }

  private getCluster(voice: string): string {
    return voice.startsWith('S_') ? 'volcano_icl' : 'volcano_tts';
  }

  private buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const token = this.options.accessToken.trim();

    // Remove quotes if present
    const cleanToken = token.replace(/^["']|["']$/g, '');

    switch (this.options.authFormat) {
      case 'bearer_space':
        headers['Authorization'] = `Bearer ${cleanToken}`;
        break;
      case 'bearer_semicolon':
        headers['Authorization'] = `Bearer;${cleanToken}`;
        break;
      case 'hmac_sha256':
        if (!this.options.secretKey) {
          throw new Error('HMAC_SHA256 auth requires secretKey');
        }
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const canonical = `${this.options.appId}${cleanToken}${timestamp}`;
        const signature = createHmac('sha256', this.options.secretKey)
          .update(canonical)
          .digest('hex');
        headers['Authorization'] = `Signature ${signature};t=${timestamp};appid=${this.options.appId}`;
        break;
    }

    return headers;
  }

  private buildRequestPayload(): TTSRequestPayload {
    return {
      app: {
        appid: this.options.appId,
        token: this.options.accessToken,
        cluster: this.options.cluster,
      },
      user: {
        uid: randomUUID(),
      },
      audio: {
        voice_type: this.options.voiceType,
        encoding: this.options.encoding,
      },
      request: {
        reqid: randomUUID(),
        text: this.options.text,
        operation: 'submit',
        with_timestamp: '1',
        extra_param: JSON.stringify({ disable_markdown_filter: false }),
      },
    };
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const headers = this.buildAuthHeaders();
        console.log(`[VolcEngine] Connecting to ${this.options.endpoint}`);
        console.log(`[VolcEngine] Auth format: ${this.options.authFormat}`);

        this.ws = new WebSocket(this.options.endpoint, {
          headers: headers as Record<string, string>,
        });

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.options.timeout);

        this.ws.on('open', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          console.log('[VolcEngine] WebSocket connected');
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error: Error) => {
          clearTimeout(timeout);
          console.error('[VolcEngine] WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('close', () => {
          clearTimeout(timeout);
          this.isConnected = false;
          console.log('[VolcEngine] WebSocket closed');
          this.emit('close');
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(data: Buffer): void {
    try {
      const message = VolcEngineMessage.fromBytes(data);
      console.log(`[VolcEngine] Received: ${message.toString()}`);

      if (message.type === MsgType.Error) {
        const payloadText = message.payload.length > 0
          ? Buffer.from(message.payload).toString('utf8')
          : '';
        const error = new Error(`TTS Error: ${payloadText} (code: ${message.errorCode})`);
        this.emit('error', error);
        return;
      }

      if (message.type === MsgType.FrontEndResultServer) {
        // Ignore frontend result messages
        return;
      }

      if (message.type === MsgType.AudioOnlyServer) {
        this.emit('audio', message.payload, message.sequence);

        // Negative sequence indicates end of stream
        if (message.sequence < 0) {
          this.emit('audioEnd');
          this.close();
        }
      } else {
        // Emit other message types for handling
        this.emit('message', message);
      }

    } catch (error) {
      console.error('[VolcEngine] Failed to parse message:', error);
      this.emit('error', error);
    }
  }

  async sendTTSRequest(): Promise<Buffer> {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    return new Promise(async (resolve, reject) => {
      try {
        const audioData: Buffer[] = [];
        let timeoutId: NodeJS.Timeout | null = null;

        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
          this.ws?.removeAllListeners('error');
          this.ws?.removeAllListeners('close');
        };

        // Set up timeout
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error('TTS request timeout'));
        }, this.options.timeout);

        // Handle errors
        this.ws?.once('error', (error) => {
          cleanup();
          reject(error);
        });

        this.ws?.once('close', () => {
          cleanup();
          reject(new Error('Connection closed before completion'));
        });

        // Collect audio data
        this.on('audio', (chunk: Buffer, _sequence: number) => {
          audioData.push(chunk);
        });

        // Handle completion
        this.on('audioEnd', () => {
          cleanup();
          const fullAudio = Buffer.concat(audioData);
          console.log(`[VolcEngine] Audio complete: ${fullAudio.length} bytes`);
          resolve(fullAudio);
        });

        // Send the request
        const payload = this.buildRequestPayload();
        const message = createFullClientRequest(Buffer.from(JSON.stringify(payload)));

        console.log(`[VolcEngine] Sending TTS request for: ${this.options.text.substring(0, 50)}...`);
        this.ws?.send(message.marshal());

      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws && this.isConnected) {
      this.ws.close();
      this.isConnected = false;
    }
  }

  close(): void {
    this.disconnect();
  }

  // Static convenience method for single TTS request
  static async synthesize(options: VolcEngineTTSOptions): Promise<Buffer> {
    const client = new VolcEngineWebSocketClient(options);

    try {
      await client.connect();
      return await client.sendTTSRequest();
    } finally {
      client.disconnect();
    }
  }
}

export function getCluster(voice: string): string {
  return voice.startsWith('S_') ? 'volcano_icl' : 'volcano_tts';
}