/**
 * 单个答题卡片
 * 显示一个 A/B 比较问题，用户选择答案
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Question, AnswerValue } from '../types'
import { ANSWER_OPTIONS } from '../data/dimensions'
import audioPlayerManager from '../lib/audio-player-manager'

interface QuestionCardProps {
  question: Question
  index: number
  onAnswer: (value: AnswerValue) => void
  answered?: boolean
}

export function QuestionCard({ question, index, onAnswer, answered }: QuestionCardProps) {
  const [selected, setSelected] = useState<AnswerValue | null>(null)
  const audioARef = useRef<HTMLAudioElement>(null)
  const audioBRef = useRef<HTMLAudioElement>(null)
  const [isPlayingA, setIsPlayingA] = useState(false)
  const [isPlayingB, setIsPlayingB] = useState(false)

  const handleSelect = (value: AnswerValue) => {
    if (answered) return
    setSelected(value)
    onAnswer(value)
  }

  // 播放音频 A
  const handlePlayA = () => {
    if (audioARef.current) {
      audioPlayerManager.play(`A-${question.id}`, audioARef.current)
    }
  }

  // 播放音频 B
  const handlePlayB = () => {
    if (audioBRef.current) {
      audioPlayerManager.play(`B-${question.id}`, audioBRef.current)
    }
  }

  // 注册音频元素
  useEffect(() => {
    if (audioARef.current) {
      audioPlayerManager.register(`A-${question.id}`, audioARef.current)
    }
    if (audioBRef.current) {
      audioPlayerManager.register(`B-${question.id}`, audioBRef.current)
    }

    // 检查播放状态
    setIsPlayingA(audioPlayerManager.isPlaying(`A-${question.id}`))
    setIsPlayingB(audioPlayerManager.isPlaying(`B-${question.id}`))

    return () => {
      if (audioARef.current) {
        audioPlayerManager.unregister(`A-${question.id}`)
      }
      if (audioBRef.current) {
        audioPlayerManager.unregister(`B-${question.id}`)
      }
    }
  }, [question.id])

  return (
    <div className={`
      bg-white/5 rounded-2xl p-6 border-2 transition
      ${answered ? 'border-green-500/50' : 'border-white/10'}
    `}>
      {/* 题号和问题 */}
      <div className="mb-4">
        <div className="text-sm text-white/60 mb-2">题目 {index + 1}</div>
        <h4 className="text-lg font-semibold text-white">{question.questionText}</h4>
      </div>

      {/* 音频播放区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* 音频 A */}
        <div
          onClick={handlePlayA}
          className={`
            bg-blue-500/10 rounded-xl p-4 border-2 cursor-pointer transition-all duration-300
            ${isPlayingA ? 'border-blue-500 bg-blue-500/20' : 'border-blue-500/30'}
          `}
        >
          <div className="text-sm text-blue-300 mb-3">音频 A</div>
          <audio
            ref={audioARef}
            src={question.audioA.audioUrl}
            onEnded={() => audioPlayerManager.onEnded(`A-${question.id}`)}
            className="w-full"
            onClick={(e) => e.stopPropagation()}
          />
          {/* 播放状态图标 */}
          {isPlayingA && (
            <div className="mt-3 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4l4 4-4 4v4l4-4z" />
              </svg>
              <span className="ml-2 text-xs text-blue-300">播放中...</span>
            </div>
          )}
        </div>

        {/* 音频 B */}
        <div
          onClick={handlePlayB}
          className={`
            bg-purple-500/10 rounded-xl p-4 border-2 cursor-pointer transition-all duration-300
            ${isPlayingB ? 'border-purple-500 bg-purple-500/20' : 'border-purple-500/30'}
          `}
        >
          <div className="text-sm text-purple-300 mb-3">音频 B</div>
          <audio
            ref={audioBRef}
            src={question.audioB.audioUrl}
            onEnded={() => audioPlayerManager.onEnded(`B-${question.id}`)}
            className="w-full"
            onClick={(e) => e.stopPropagation()}
          />
          {/* 播放状态图标 */}
          {isPlayingB && (
            <div className="mt-3 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4l4 4-4 4v4l4-4z" />
              </svg>
              <span className="ml-2 text-xs text-purple-300">播放中...</span>
            </div>
          )}
        </div>
      </div>

      {/* 答案选项 */}
      <div className="flex flex-wrap gap-3">
        {ANSWER_OPTIONS.map((option) => {
          const isSelected = selected === option.value
          const isDisabled = answered

          return (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value as AnswerValue)}
              disabled={isDisabled}
              className={`
                px-6 py-3 rounded-lg font-medium transition
                ${isSelected
                  ? `${option.color} text-white shadow-lg`
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {/* 已答标记 */}
      {answered && (
        <div className="mt-4 text-green-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          已完成
        </div>
      )}
    </div>
  )
}
