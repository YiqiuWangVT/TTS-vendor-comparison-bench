/**
 * 音频选择组件
 * 用户选择要参与 A/B 测试的音频
 */

'use client'

import { useState } from 'react'
import { AudioInfo } from '../types'

interface AudioSelectorProps {
  audios: AudioInfo[]
  selectedIds: Set<string>
  onSelectionChange: (selectedIds: Set<string>) => void
}

export function AudioSelector({ audios, selectedIds, onSelectionChange }: AudioSelectorProps) {
  const [selectAll, setSelectAll] = useState(false)

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    onSelectionChange(newSelected)
  }

  const handleSelectAll = () => {
    const newSelectAll = !selectAll
    setSelectAll(newSelectAll)

    if (newSelectAll) {
      onSelectionChange(new Set(audios.map(a => a.id)))
    } else {
      onSelectionChange(new Set())
    }
  }

  const selectedCount = selectedIds.size
  const totalQuestions = selectedCount >= 2
    ? (selectedCount * (selectedCount - 1)) / 2 * 10
    : 0

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">选择音频</h3>
        <button
          onClick={handleSelectAll}
          className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
        >
          {selectAll ? '取消全选' : '全选'}
        </button>
      </div>

      {/* 音频列表 */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {audios.map((audio, index) => {
          const isSelected = selectedIds.has(audio.id)
          return (
            <div
              key={audio.id}
              onClick={() => handleToggle(audio.id)}
              className={`
                flex items-center gap-4 p-4 rounded-xl cursor-pointer transition
                ${isSelected
                  ? 'bg-blue-500/20 border-2 border-blue-500'
                  : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                }
              `}
            >
              {/* 选择框 */}
              <div className={`
                w-6 h-6 rounded border-2 flex items-center justify-center transition
                ${isSelected
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-white/30'
                }
              `}>
                {isSelected && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* 音频信息 */}
              <div className="flex-1">
                <div className="text-white font-medium">
                  音频 {index + 1}: {audio.provider}
                </div>
                {audio.metadata?.voice && (
                  <div className="text-sm text-white/60">
                    音色: {audio.metadata.voice}
                  </div>
                )}
              </div>

              {/* 播放预览 */}
              <audio
                src={audio.audioUrl}
                controls
                className="w-32"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )
        })}
      </div>

      {/* 统计信息 */}
      <div className="bg-white/5 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">已选择:</span>
          <span className="text-white font-medium">{selectedCount} 条音频</span>
        </div>
        {selectedCount >= 2 && (
          <div className="flex justify-between text-sm">
            <span className="text-white/60">将生成:</span>
            <span className="text-blue-400 font-medium">{totalQuestions} 道题目</span>
          </div>
        )}
        {selectedCount < 2 && (
          <div className="text-yellow-400 text-sm">
            至少需要选择 2 条音频
          </div>
        )}
      </div>
    </div>
  )
}
