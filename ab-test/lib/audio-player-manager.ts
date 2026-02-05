/**
 * 全局音频播放管理器
 * 确保整个页面同时只能播放一个音频
 */

import { useRef, useCallback } from 'react'

type PlayingId = string | null

// 创建全局管理器
const audioManager = {
  currentPlaying: null as PlayingId,
  audioElements: new Map<string, HTMLAudioElement>(),

  play(id: string, audioElement: HTMLAudioElement) {
    // 停止当前播放的音频
    if (this.currentPlaying && this.currentPlaying !== id) {
      const currentAudio = this.audioElements.get(this.currentPlaying)
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
      }
    }

    // 播放新音频
    this.currentPlaying = id
    audioElement.play()
  },

  stop(id: string) {
    const audioElement = this.audioElements.get(id)
    if (audioElement) {
      audioElement.pause()
      audioElement.currentTime = 0
    }
    if (this.currentPlaying === id) {
      this.currentPlaying = null
    }
  },

  ended(id: string) {
    if (this.currentPlaying === id) {
      this.currentPlaying = null
    }
  },

  register(id: string, audioElement: HTMLAudioElement) {
    this.audioElements.set(id, audioElement)
  },

  unregister(id: string) {
    this.audioElements.delete(id)
  }
}

// 导出单例模式
const audioPlayerManager = {
  play: (id: string, audioElement: HTMLAudioElement) => {
    audioManager.play(id, audioElement)
  },
  stop: (id: string) => {
    audioManager.stop(id)
  },
  onEnded: (id: string) => {
    audioManager.ended(id)
  },
  register: (id: string, audioElement: HTMLAudioElement) => {
    audioManager.register(id, audioElement)
  },
  unregister: (id: string) => {
    audioManager.unregister(id)
  },
  isPlaying: (id: string) => {
    return audioManager.currentPlaying === id
  }
}

export default audioPlayerManager
