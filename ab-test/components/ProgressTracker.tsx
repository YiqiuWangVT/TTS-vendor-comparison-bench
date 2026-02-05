/**
 * 进度追踪组件
 * 显示测试进度和统计信息
 */

'use client'

import { Progress } from '../types'

interface ProgressTrackerProps {
  progress: Progress | null
  onExport?: () => void
  onReset?: () => void
}

export function ProgressTracker({ progress, onExport, onReset }: ProgressTrackerProps) {
  if (!progress) {
    return (
      <div className="bg-white/5 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">测试进度</h3>
        <p className="text-white/60 text-sm">暂无进行中的测试</p>
      </div>
    )
  }

  const completed = progress.completedQuestions
  const total = progress.totalQuestions
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  const remaining = total - completed

  return (
    <div className="space-y-4">
      {/* 进度概览 */}
      <div className="bg-white/5 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">测试进度</h3>

        {/* 进度条 */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/60">完成进度</span>
            <span className="text-white font-medium">{percentage}%</span>
          </div>
          <div className="bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* 统计数据 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{total}</div>
            <div className="text-xs text-white/60">总题数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{completed}</div>
            <div className="text-xs text-white/60">已完成</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{remaining}</div>
            <div className="text-xs text-white/60">剩余</div>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        {onExport && (
          <button
            onClick={onExport}
            className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition text-sm font-medium"
          >
            导出结果
          </button>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="flex-1 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition text-sm font-medium"
          >
            重置测试
          </button>
        )}
      </div>

      {/* 完成提示 */}
      {remaining === 0 && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-center">
          <svg className="w-8 h-8 text-green-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-300 font-medium">恭喜！您已完成所有题目</p>
        </div>
      )}
    </div>
  )
}
