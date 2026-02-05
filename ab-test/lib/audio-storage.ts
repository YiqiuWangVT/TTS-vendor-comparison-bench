/**
 * 音频存储管理器
 * 存储原项目生成的音频，供 A/B 测试使用
 */

import { AudioInfo } from '../types'

// Storage keys
const STORAGE_KEY = 'ab_test_saved_audios'
const CLEAR_KEY = 'ab_test_generation_id'

/**
 * 保存音频列表
 * 每次 TTS 生成新的音频时调用
 */
export function saveAudios(audios: AudioInfo[]): void {
  if (typeof window === 'undefined') return

  try {
    // 检查是否是新的生成（通过 generation ID）
    const currentGenId = localStorage.getItem(CLEAR_KEY)
    const newGenId = Date.now().toString()

    // 如果是新的生成，清空旧音频
    if (currentGenId !== newGenId) {
      localStorage.setItem(CLEAR_KEY, newGenId)
      localStorage.removeItem(STORAGE_KEY)
    }

    // 序列化音频列表
    const data = JSON.stringify(audios)
    localStorage.setItem(STORAGE_KEY, data)

    console.log(`[AB-Test] 已保存 ${audios.length} 条音频`)
  } catch (error) {
    console.error('[AB-Test] 保存音频失败:', error)
  }
}

/**
 * 加载保存的音频列表
 */
export function loadAudios(): AudioInfo[] {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []

    const audios = JSON.parse(data) as AudioInfo[]
    console.log(`[AB-Test] 已加载 ${audios.length} 条音频`)
    return audios
  } catch (error) {
    console.error('[AB-Test] 加载音频失败:', error)
    return []
  }
}

/**
 * 清空保存的音频
 * 在以下情况调用：
 * 1. 页面刷新时
 * 2. 用户点击"生成"按钮时（在生成新音频前）
 */
export function clearAudios(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(CLEAR_KEY)
    console.log('[AB-Test] 已清空音频存储')
  } catch (error) {
    console.error('[AB-Test] 清空音频失败:', error)
  }
}

/**
 * 检查是否有保存的音频
 */
export function hasSavedAudios(): boolean {
  if (typeof window === 'undefined') return false

  const data = localStorage.getItem(STORAGE_KEY)
  return data !== null && data !== '[]'
}

/**
 * 获取保存的音频数量
 */
export function getAudioCount(): number {
  return loadAudios().length
}
