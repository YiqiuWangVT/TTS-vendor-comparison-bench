"use client"

import { useState } from "react"

// AB 测试相关导入（从 ab-test 文件夹）
import { useABTest } from "../../ab-test/hooks/use-ab-test"
import { QuizBatch } from "../../ab-test/components/QuizBatch"
import { ProgressTracker } from "../../ab-test/components/ProgressTracker"
import type { Answer } from "../../ab-test/types"

// 测试阶段
type TestPhase = 'tts' | 'testing' | 'results'

export function ABTestSection() {
  const [phase, setPhase] = useState<TestPhase>('tts')

  // AB 测试 hook
  const {
    progress,
    startTest,
    submitBatch,
    resetTest,
    exportResults
  } = useABTest()

  // 从 sessionStorage 读取音频
  const handleLoadAudios = () => {
    console.log('[AB-Test] 点击加载音频按钮')
    try {
      const stored = sessionStorage.getItem('tts-generated-audios')
      console.log('[AB-Test] sessionStorage 内容:', stored ? stored.substring(0, 100) : 'null')
      if (stored) {
        const audios = JSON.parse(stored)
        // 默认全选，直接开始测试
        if (audios.length >= 2) {
          startTest(audios)
          setPhase('testing')
        }
        console.log('[AB-Test] 加载了', audios.length, '条音频')
      } else {
        console.log('[AB-Test] sessionStorage 中没有音频数据')
      }
    } catch (error) {
      console.error('[AB-Test] 加载音频失败:', error)
    }
  }

  // 处理提交答案
  const handleSubmitBatch = (newAnswers: Answer[]) => {
    const result = submitBatch(newAnswers)

    // 延迟后检查是否还有下一批
    setTimeout(() => {
      if (!result.hasNext) {
        setPhase('results')
      }
    }, 1500)
  }

  // 处理重置
  const handleReset = () => {
    if (confirm('确定要重置测试吗？所有进度将丢失。')) {
      resetTest()
      setPhase('tts')
    }
  }

  // 处理导出
  const handleExport = () => {
    const results = exportResults()
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ab-test-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="border-t border-white/10 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* 阶段切换器 */}
        <div className="mb-6 flex justify-center">
          <button
            onClick={() => setPhase('tts')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              phase === 'tts'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
          >
            TTS 对比
          </button>
          <button
            onClick={handleLoadAudios}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              phase !== 'tts'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
          >
            AB 测试评估
          </button>
        </div>

        {/* 阶段 2：答题 */}
        {phase === 'testing' && progress?.currentBatch && progress.currentBatch.length > 0 && (
          <div className="space-y-6">
            <QuizBatch
              questions={progress.currentBatch}
              batchIndex={progress.batchIndex}
              onSubmit={handleSubmitBatch}
              canContinue={progress.completedQuestions < progress.totalQuestions}
            />
          </div>
        )}

        {/* 阶段 3：结果 */}
        {phase === 'results' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">测试完成！</h2>
              <p className="text-white/60">您可以查看结果或继续测试</p>
            </div>
            <ProgressTracker
              progress={progress}
              onExport={handleExport}
              onReset={handleReset}
            />
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setPhase('testing')}
                className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
              >
                继续测试（如果有剩余题目）
              </button>
            </div>
          </div>
        )}

        {/* 进度追踪（答题阶段显示） */}
        {phase === 'testing' && (
          <div className="mt-6">
            <ProgressTracker
              progress={progress}
              onExport={handleExport}
              onReset={handleReset}
            />
          </div>
        )}
      </div>
    </div>
  )
}
