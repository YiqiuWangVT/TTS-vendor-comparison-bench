/**
 * VolcEngine TTS WebSocket Protocol Implementation
 * Ported from Python volcengine_binary_demo/protocols/protocols.py
 */

// Core enumerations matching Python implementation
export enum MsgType {
  Invalid = 0,
  FullClientRequest = 0b1,
  AudioOnlyClient = 0b10,
  FullServerResponse = 0b1001,
  AudioOnlyServer = 0b1011,
  FrontEndResultServer = 0b1100,
  Error = 0b1111,
  // Alias
  ServerACK = MsgType.AudioOnlyServer,
}

export enum MsgTypeFlagBits {
  NoSeq = 0, // Non-terminal packet with no sequence
  PositiveSeq = 0b1, // Non-terminal packet with sequence > 0
  LastNoSeq = 0b10, // Last packet with no sequence
  NegativeSeq = 0b11, // Last packet with sequence < 0
  WithEvent = 0b100, // Payload contains event number (int32)
}

export enum VersionBits {
  Version1 = 1,
  Version2 = 2,
  Version3 = 3,
  Version4 = 4,
}

export enum HeaderSizeBits {
  HeaderSize4 = 1,
  HeaderSize8 = 2,
  HeaderSize12 = 3,
  HeaderSize16 = 4,
}

export enum SerializationBits {
  Raw = 0,
  JSON = 0b1,
  Thrift = 0b11,
  Custom = 0b1111,
}

export enum CompressionBits {
  None = 0,
  Gzip = 0b1,
  Custom = 0b1111,
}

export enum EventType {
  None = 0, // Default event

  // 1 ~ 49 Upstream Connection events
  StartConnection = 1,
  StartTask = 2, // Different value to avoid duplication
  FinishConnection = 3,
  FinishTask = 4, // Different value to avoid duplication

  // 50 ~ 99 Downstream Connection events
  ConnectionStarted = 50, // Connection established successfully
  TaskStarted = 51, // Different value to avoid duplication
  ConnectionFailed = 52, // Connection failed (possibly due to authentication failure)
  TaskFailed = 53, // Different value to avoid duplication
  ConnectionFinished = 54, // Connection ended
  TaskFinished = 55, // Different value to avoid duplication

  // 100 ~ 149 Upstream Session events
  StartSession = 100,
  CancelSession = 101,
  FinishSession = 102,

  // 150 ~ 199 Downstream Session events
  SessionStarted = 150,
  SessionCanceled = 151,
  SessionFinished = 152,
  SessionFailed = 153,
  UsageResponse = 154, // Usage response
  ChargeData = 155, // Different value to avoid duplication

  // 200 ~ 249 Upstream general events
  TaskRequest = 200,
  UpdateConfig = 201,

  // 250 ~ 299 Downstream general events
  AudioMuted = 250,

  // 300 ~ 349 Upstream TTS events
  SayHello = 300,

  // 350 ~ 399 Downstream TTS events
  TTSSentenceStart = 350,
  TTSSentenceEnd = 351,
  TTSResponse = 352,
  TTSEnded = 359,
  PodcastRoundStart = 360,
  PodcastRoundResponse = 361,
  PodcastRoundEnd = 362,

  // 450 ~ 499 Downstream ASR events
  ASRInfo = 450,
  ASRResponse = 451,
  ASREnded = 459,

  // 500 ~ 549 Upstream dialogue events
  ChatTTSText = 500, // (Ground-Truth-Alignment) text for speech synthesis

  // 550 ~ 599 Downstream dialogue events
  ChatResponse = 550,
  ChatEnded = 559,

  // 650 ~ 699 Downstream dialogue events
  // Events for source (original) language subtitle
  SourceSubtitleStart = 650,
  SourceSubtitleResponse = 651,
  SourceSubtitleEnd = 652,
  // Events for target (translation) language subtitle
  TranslationSubtitleStart = 653,
  TranslationSubtitleResponse = 654,
  TranslationSubtitleEnd = 655,
}

export interface MessageOptions {
  version?: VersionBits;
  headerSize?: HeaderSizeBits;
  type?: MsgType;
  flag?: MsgTypeFlagBits;
  serialization?: SerializationBits;
  compression?: CompressionBits;
  event?: EventType;
  sessionId?: string;
  connectId?: string;
  sequence?: number;
  errorCode?: number;
  payload?: Uint8Array;
}

export class VolcEngineMessage {
  version: VersionBits = VersionBits.Version1;
  headerSize: HeaderSizeBits = HeaderSizeBits.HeaderSize4;
  type: MsgType = MsgType.Invalid;
  flag: MsgTypeFlagBits = MsgTypeFlagBits.NoSeq;
  serialization: SerializationBits = SerializationBits.JSON;
  compression: CompressionBits = CompressionBits.None;
  event: EventType = EventType.None;
  sessionId: string = "";
  connectId: string = "";
  sequence: number = 0;
  errorCode: number = 0;
  payload: Uint8Array = new Uint8Array(0);

  constructor(options?: MessageOptions) {
    if (options) {
      Object.assign(this, options);
    }
  }

  /**
   * Create message object from bytes
   */
  static fromBytes(data: ArrayBuffer | Uint8Array): VolcEngineMessage {
    const buffer = new Uint8Array(data);

    if (buffer.length < 3) {
      throw new Error(
        `Data too short: expected at least 3 bytes, got ${buffer.length}`
      );
    }

    const typeAndFlag = buffer[1];
    const msgType = typeAndFlag >> 4;
    const flag = typeAndFlag & 0b00001111;

    const msg = new VolcEngineMessage({
      type: msgType,
      flag: flag,
    });

    msg.unmarshal(buffer);
    return msg;
  }

  /**
   * Serialize message to bytes
   */
  marshal(): Uint8Array {
    // Calculate total size
    let totalSize = 3; // Basic header size
    totalSize += (4 * this.headerSize) - 3; // Header padding

    if (this.flag === MsgTypeFlagBits.WithEvent) {
      totalSize += 4; // event (int32)
      totalSize += 4; // session_id size (uint32)
      totalSize += Buffer.byteLength(this.sessionId, 'utf8'); // session_id
    }

    if (this.shouldHaveSequence()) {
      totalSize += 4; // sequence (int32)
    } else if (this.type === MsgType.Error) {
      totalSize += 4; // error_code (uint32)
    }

    totalSize += 4; // payload size (uint32)
    totalSize += this.payload.length; // payload

    const result = new Uint8Array(totalSize);
    let offset = 0;

    // Write header
    result[offset++] = (this.version << 4) | this.headerSize;
    result[offset++] = (this.type << 4) | this.flag;
    result[offset++] = (this.serialization << 4) | this.compression;

    // Write header padding
    const headerSize = 4 * this.headerSize;
    while (offset < headerSize) {
      result[offset++] = 0;
    }

    // Write fields
    if (this.flag === MsgTypeFlagBits.WithEvent) {
      offset = this.writeEvent(result, offset);
      offset = this.writeSessionId(result, offset);
    }

    if (this.shouldHaveSequence()) {
      offset = this.writeSequence(result, offset);
    } else if (this.type === MsgType.Error) {
      offset = this.writeErrorCode(result, offset);
    }

    offset = this.writePayload(result, offset);

    return result;
  }

  /**
   * Deserialize message from bytes
   */
  unmarshal(data: Uint8Array): void {
    let offset = 0;

    // Read version and header size
    const versionAndHeaderSize = data[offset++];
    this.version = versionAndHeaderSize >> 4;
    this.headerSize = versionAndHeaderSize & 0b00001111;

    // Skip second byte (already processed in constructor)
    offset++;

    // Read serialization and compression methods
    const serializationCompression = data[offset++];
    this.serialization = serializationCompression >> 4;
    this.compression = serializationCompression & 0b00001111;

    // Skip header padding
    const headerSize = 4 * this.headerSize;
    offset = headerSize;

    // Read other fields
    if (this.flag === MsgTypeFlagBits.WithEvent) {
      offset = this.readEvent(data, offset);
      offset = this.readSessionId(data, offset);
      offset = this.readConnectId(data, offset);
    }

    if (this.shouldHaveSequence()) {
      offset = this.readSequence(data, offset);
    } else if (this.type === MsgType.Error) {
      offset = this.readErrorCode(data, offset);
    }

    offset = this.readPayload(data, offset);
  }

  private shouldHaveSequence(): boolean {
    return this.type in [
      MsgType.FullClientRequest,
      MsgType.FullServerResponse,
      MsgType.FrontEndResultServer,
      MsgType.AudioOnlyClient,
      MsgType.AudioOnlyServer,
    ] && (this.flag === MsgTypeFlagBits.PositiveSeq || this.flag === MsgTypeFlagBits.NegativeSeq);
  }

  private writeEvent(buffer: Uint8Array, offset: number): number {
    const view = new DataView(buffer.buffer);
    view.setInt32(offset, this.event, false); // big-endian
    return offset + 4;
  }

  private writeSessionId(buffer: Uint8Array, offset: number): number {
    if (this.event in [
      EventType.StartConnection,
      EventType.FinishConnection,
      EventType.ConnectionStarted,
      EventType.ConnectionFailed,
    ]) {
      return offset;
    }

    const sessionIdBytes = Buffer.from(this.sessionId, 'utf8');
    const size = sessionIdBytes.length;

    if (size > 0xFFFFFFFF) {
      throw new Error(`Session ID size (${size}) exceeds max(uint32)`);
    }

    const view = new DataView(buffer.buffer);
    view.setUint32(offset, size, false); // big-endian
    offset += 4;

    if (size > 0) {
      buffer.set(sessionIdBytes, offset);
      offset += size;
    }

    return offset;
  }

  private writeSequence(buffer: Uint8Array, offset: number): number {
    const view = new DataView(buffer.buffer);
    view.setInt32(offset, this.sequence, false); // big-endian
    return offset + 4;
  }

  private writeErrorCode(buffer: Uint8Array, offset: number): number {
    const view = new DataView(buffer.buffer);
    view.setUint32(offset, this.errorCode, false); // big-endian
    return offset + 4;
  }

  private writePayload(buffer: Uint8Array, offset: number): number {
    const size = this.payload.length;

    if (size > 0xFFFFFFFF) {
      throw new Error(`Payload size (${size}) exceeds max(uint32)`);
    }

    const view = new DataView(buffer.buffer);
    view.setUint32(offset, size, false); // big-endian
    offset += 4;

    if (size > 0) {
      buffer.set(this.payload, offset);
      offset += size;
    }

    return offset;
  }

  private readEvent(data: Uint8Array, offset: number): number {
    if (offset + 4 > data.length) return offset;
    const view = new DataView(data.buffer);
    this.event = view.getInt32(offset, false); // big-endian
    return offset + 4;
  }

  private readSessionId(data: Uint8Array, offset: number): number {
    if (this.event in [
      EventType.StartConnection,
      EventType.FinishConnection,
      EventType.ConnectionStarted,
      EventType.ConnectionFailed,
      EventType.ConnectionFinished,
    ]) {
      return offset;
    }

    if (offset + 4 > data.length) return offset;
    const view = new DataView(data.buffer);
    const size = view.getUint32(offset, false); // big-endian
    offset += 4;

    if (size > 0 && offset + size <= data.length) {
      this.sessionId = Buffer.from(data.subarray(offset, offset + size)).toString('utf8');
      offset += size;
    }

    return offset;
  }

  private readConnectId(data: Uint8Array, offset: number): number {
    if (this.event in [
      EventType.ConnectionStarted,
      EventType.ConnectionFailed,
      EventType.ConnectionFinished,
    ]) {
      if (offset + 4 > data.length) return offset;
      const view = new DataView(data.buffer);
      const size = view.getUint32(offset, false); // big-endian
      offset += 4;

      if (size > 0 && offset + size <= data.length) {
        this.connectId = Buffer.from(data.subarray(offset, offset + size)).toString('utf8');
        offset += size;
      }
    }

    return offset;
  }

  private readSequence(data: Uint8Array, offset: number): number {
    if (offset + 4 > data.length) return offset;
    const view = new DataView(data.buffer);
    this.sequence = view.getInt32(offset, false); // big-endian
    return offset + 4;
  }

  private readErrorCode(data: Uint8Array, offset: number): number {
    if (offset + 4 > data.length) return offset;
    const view = new DataView(data.buffer);
    this.errorCode = view.getUint32(offset, false); // big-endian
    return offset + 4;
  }

  private readPayload(data: Uint8Array, offset: number): number {
    if (offset + 4 > data.length) return offset;
    const view = new DataView(data.buffer);
    const size = view.getUint32(offset, false); // big-endian
    offset += 4;

    if (size > 0 && offset + size <= data.length) {
      this.payload = data.subarray(offset, offset + size);
      offset += size;
    }

    return offset;
  }

  toString(): string {
    if (this.type === MsgType.AudioOnlyServer || this.type === MsgType.AudioOnlyClient) {
      if (this.flag === MsgTypeFlagBits.PositiveSeq || this.flag === MsgTypeFlagBits.NegativeSeq) {
        return `MsgType: ${MsgType[this.type]}, EventType:${EventType[this.event]}, Sequence: ${this.sequence}, PayloadSize: ${this.payload.length}`;
      }
      return `MsgType: ${MsgType[this.type]}, EventType:${EventType[this.event]}, PayloadSize: ${this.payload.length}`;
    } else if (this.type === MsgType.Error) {
      const payloadText = this.payload.length > 0
        ? Buffer.from(this.payload).toString('utf8', 0, Math.min(100, this.payload.length))
        : "";
      return `MsgType: ${MsgType[this.type]}, EventType:${EventType[this.event]}, ErrorCode: ${this.errorCode}, Payload: ${payloadText}`;
    } else {
      const payloadText = this.payload.length > 0
        ? Buffer.from(this.payload).toString('utf8', 0, Math.min(100, this.payload.length))
        : "";
      if (this.flag === MsgTypeFlagBits.PositiveSeq || this.flag === MsgTypeFlagBits.NegativeSeq) {
        return `MsgType: ${MsgType[this.type]}, EventType:${EventType[this.event]}, Sequence: ${this.sequence}, Payload: ${payloadText}`;
      }
      return `MsgType: ${MsgType[this.type]}, EventType:${EventType[this.event]}, Payload: ${payloadText}`;
    }
  }
}

// Convenience functions for message creation
export function createFullClientRequest(payload: Uint8Array): VolcEngineMessage {
  return new VolcEngineMessage({
    type: MsgType.FullClientRequest,
    flag: MsgTypeFlagBits.NoSeq,
    payload,
  });
}

export function createAudioOnlyClient(payload: Uint8Array, flag: MsgTypeFlagBits): VolcEngineMessage {
  return new VolcEngineMessage({
    type: MsgType.AudioOnlyClient,
    flag,
    payload,
  });
}

export function createStartConnection(): VolcEngineMessage {
  return new VolcEngineMessage({
    type: MsgType.FullClientRequest,
    flag: MsgTypeFlagBits.WithEvent,
    event: EventType.StartConnection,
    payload: Buffer.from('{}', 'utf8'),
  });
}

export function createFinishConnection(): VolcEngineMessage {
  return new VolcEngineMessage({
    type: MsgType.FullClientRequest,
    flag: MsgTypeFlagBits.WithEvent,
    event: EventType.FinishConnection,
    payload: Buffer.from('{}', 'utf8'),
  });
}

export function createStartSession(payload: Uint8Array, sessionId: string): VolcEngineMessage {
  return new VolcEngineMessage({
    type: MsgType.FullClientRequest,
    flag: MsgTypeFlagBits.WithEvent,
    event: EventType.StartSession,
    sessionId,
    payload,
  });
}

export function createFinishSession(sessionId: string): VolcEngineMessage {
  return new VolcEngineMessage({
    type: MsgType.FullClientRequest,
    flag: MsgTypeFlagBits.WithEvent,
    event: EventType.FinishSession,
    sessionId,
    payload: Buffer.from('{}', 'utf8'),
  });
}

export function createCancelSession(sessionId: string): VolcEngineMessage {
  return new VolcEngineMessage({
    type: MsgType.FullClientRequest,
    flag: MsgTypeFlagBits.WithEvent,
    event: EventType.CancelSession,
    sessionId,
    payload: Buffer.from('{}', 'utf8'),
  });
}

export function createTaskRequest(payload: Uint8Array, sessionId: string): VolcEngineMessage {
  return new VolcEngineMessage({
    type: MsgType.FullClientRequest,
    flag: MsgTypeFlagBits.WithEvent,
    event: EventType.TaskRequest,
    sessionId,
    payload,
  });
}