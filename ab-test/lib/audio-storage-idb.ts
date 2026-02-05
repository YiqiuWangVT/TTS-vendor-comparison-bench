/**
 * 音频文件存储管理器 (IndexedDB)
 * 存储实际的音频文件（WAV Blob），而不是 Data URL
 */

import type { AudioInfo } from '../types'
import { convertToWav } from './audio-converter'

// 数据库名称
const DB_NAME = 'ABTestAudioDB'
const STORE_NAME = 'audios'
const DB_VERSION = 1

/**
 * 初始化 IndexedDB
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // 创建对象仓库，用 id 作为键
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('provider', 'provider', { unique: false })
      }
    }
  })
}

/**
 * 保存音频文件到 IndexedDB（自动转换为 WAV 格式）
 */
async function saveAudioBlob(id: string, audioBlob: Blob, metadata: {
  text?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  console.log(`[AB-Test] 开始保存音频: ${id}, Blob 大小: ${audioBlob.size}`)

  const db = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    // 转换为 WAV 格式
    convertToWav(audioBlob).then(wavBlob => {
      console.log(`[AB-Test] WAV 转换完成: ${id}, 新大小: ${wavBlob.size}`)

      const record = {
        id,
        blob: wavBlob,  // 保存为 WAV 格式
        ...metadata,
        createdAt: Date.now()
      }

      const request = store.put(record)

      request.onsuccess = () => {
        console.log(`[AB-Test] 已保存音频文件 (WAV): ${id}, 大小: ${wavBlob.size} bytes`)
        resolve()
      }

      request.onerror = (e) => {
        console.error(`[AB-Test] IndexedDB 保存失败: ${id}`, e)
        reject(new Error(`Failed to save audio: ${id}`))
      }
    }).catch(error => {
      console.error(`[AB-Test] WAV 转换失败: ${id}`, error)
      reject(error)
    })
  })
}

/**
 * 从 IndexedDB 读取音频文件
 */
async function getAudioBlob(id: string): Promise<{ blob: Blob; metadata: AudioInfo } | null> {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onsuccess = () => {
      const record = request.result
      if (!record) {
        resolve(null)
        return
      }

      // 创建 Blob URL
      const audioUrl = URL.createObjectURL(record.blob)

      resolve({
        blob: record.blob,
        metadata: {
          id: record.id,
          provider: record.provider,
          audioUrl,
          audioMimeType: record.blob.type,
          text: record.text,
          metadata: record.metadata
        }
      })
    }

    request.onerror = () => {
      reject(new Error(`Failed to get audio: ${id}`))
    }
  })
}

/**
 * 保存多个音频文件（增量保存，不清空旧的）
 */
export async function saveAudioFiles(audios: Array<{
  id: string
  provider: string
  audioUrl: string
  audioMimeType?: string
  text?: string
  metadata?: Record<string, unknown>
}>): Promise<void> {
  console.log(`[AB-Test] 开始批量保存 ${audios.length} 个音频文件`)

  try {
    // 保存每个音频
    let successCount = 0
    const errors: Array<{ id: string; error: string }> = []

    for (const audio of audios) {
      try {
        console.log(`[AB-Test] 正在处理音频: ${audio.id} (${audio.provider})`)
        console.log(`[AB-Test]   URL: ${audio.audioUrl.substring(0, 100)}...`)

        // 从 Data URL 或 URL 获取 Blob
        const response = await fetch(audio.audioUrl)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const blob = await response.blob()
        console.log(`[AB-Test]   获取 Blob 成功: ${blob.size} bytes`)

        await saveAudioBlob(audio.id, blob, audio)
        successCount++
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`[AB-Test] ❌ 保存音频失败 ${audio.id} (${audio.provider}):`, errorMsg)
        errors.push({ id: audio.id, error: errorMsg })
      }
    }

    console.log(`[AB-Test] 批量保存完成: ${successCount}/${audios.length} 成功`)

    if (errors.length > 0) {
      console.error('[AB-Test] 失败的音频:', errors)
    }
  } catch (error) {
    console.error('[AB-Test] 保存音频文件失败:', error)
  }
}

/**
 * 加载所有保存的音频文件
 */
export async function loadAudioFiles(): Promise<AudioInfo[]> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const records = request.result

        const audios = records.map((record: {
          id: string
          blob: Blob
          provider: string
          text: string
          metadata: Record<string, unknown>
        }) => {
          // 创建 Blob URL
          const audioUrl = URL.createObjectURL(record.blob)

          return {
            id: record.id,
            provider: record.provider,
            audioUrl,
            audioMimeType: 'audio/wav',  // 统一返回 WAV 格式
            text: record.text,
            metadata: record.metadata
          } as AudioInfo
        })

        console.log(`[AB-Test] 已加载 ${audios.length} 个音频文件`)
        resolve(audios)
      }

      request.onerror = () => {
        reject(new Error('Failed to load audio files'))
      }
    })
  } catch (error) {
    console.error('[AB-Test] 加载音频文件失败:', error)
    return []
  }
}

/**
 * 清空所有保存的音频文件
 */
export async function clearAudioFiles(): Promise<void> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('[AB-Test] 已清空音频文件存储')
        resolve()
      }

      request.onerror = () => {
        reject(new Error('Failed to clear audio files'))
      }
    })
  } catch (error) {
    console.error('[AB-Test] 清空音频文件失败:', error)
  }
}

/**
 * 检查是否有保存的音频文件
 */
export async function hasSavedAudioFiles(): Promise<boolean> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.count()

      request.onsuccess = () => {
        resolve(request.result > 0)
      }

      request.onerror = () => {
        reject(new Error('Failed to check audio files'))
      }
    })
  } catch (error) {
    console.error('[AB-Test] 检查音频文件失败:', error)
    return false
  }
}

/**
 * 获取保存的音频文件数量
 */
export async function getAudioFileCount(): Promise<number> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.count()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error('Failed to count audio files'))
      }
    })
  } catch (error) {
    console.error('[AB-Test] 获取音频数量失败:', error)
    return 0
  }
}
