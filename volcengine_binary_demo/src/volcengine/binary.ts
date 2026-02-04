import { Command } from 'commander'
import * as fs from 'fs'
import WebSocket from 'ws'
import * as uuid from 'uuid'
import { MsgType, ReceiveMessage, FullClientRequest } from '../protocols'

const program = new Command()

function VoiceToCluster(voice: string): string {
  if (voice.startsWith('S_')) {
    return 'volcano_icl'
  }
  return 'volcano_tts'
}

program
  .name('binary')
  .option('--appid <appid>', 'appid', '')
  .option('--access_token <access_token>', 'access key', '')
  .option('--cluster <cluster>', 'cluster', '')
  .option('--voice_type <voice>', 'voice_type', '')
  .option('--text <text>', 'text', '')
  .option('--encoding <encoding>', 'encoding format', 'wav')
  .option(
    '--endpoint <endpoint>',
    'websocket endpoint',
    'wss://openspeech.bytedance.com/api/v1/tts/ws_binary',
  )
  .action(async (options) => {
    console.log('options: ', options)

    const headers = {
      Authorization: `Bearer;${options.access_token}`,
    }

    const ws = new WebSocket(options.endpoint, {
      headers,
      skipUTF8Validation: true,
    })

    await new Promise((resolve, reject) => {
      ws.on('open', resolve)
      ws.on('error', reject)
    })

    const request = {
      app: {
        appid: options.appid,
        token: options.access_token,
        cluster:
          (options.cluster && options.cluster.trim()) ||
          VoiceToCluster(options.voice_type),
      },
      user: {
        uid: uuid.v4(),
      },
      audio: {
        voice_type: options.voice_type,
        encoding: options.encoding,
      },
      request: {
        reqid: uuid.v4(),
        text: options.text,
        operation: 'submit',
        extra_param: JSON.stringify({
          disable_markdown_filter: false,
        }),
        with_timestamp: '1',
      },
    }

    await FullClientRequest(
      ws,
      new TextEncoder().encode(JSON.stringify(request)),
    )

    const totalAudio: Uint8Array[] = []

    while (true) {
      const msg = await ReceiveMessage(ws)
      console.log(`${msg.toString()}`)

      switch (msg.type) {
        case MsgType.FrontEndResultServer:
          break
        case MsgType.AudioOnlyServer:
          totalAudio.push(msg.payload)
          break
        default:
          throw new Error(`${msg.toString()}`)
      }

      if (
        msg.type === MsgType.AudioOnlyServer &&
        msg.sequence !== undefined &&
        msg.sequence < 0
      ) {
        break
      }
    }

    if (totalAudio.length === 0) {
      throw new Error('no audio received')
    }

    const outputFile = `${options.voice_type}.${options.encoding}`
    await fs.promises.writeFile(outputFile, totalAudio)
    console.log(`audio saved to ${outputFile}`)

    ws.close()
  })

program.parse()
