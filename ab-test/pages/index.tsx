/**
 * A/B 测试主页面
 * 完整的测评流程：选择音频 → 开始测试 → 答题 → 查看进度
 */

'use client'

import { useState, useEffect } from 'react'
import { AudioInfo, Answer } from '../types'
import { useABTest } from '../hooks/use-ab-test'
import { AudioSelector } from '../components/AudioSelector'
import { QuizBatch } from '../components/QuizBatch'
import { ProgressTracker } from '../components/ProgressTracker'

// 测试阶段
type TestPhase = 'selection' | 'testing' | 'results'

export default function ABTestPage() {
  const {
    bank,
    answers,
    progress,
    startTest,
    getNextBatch,
    submitBatch,
    resetTest,
    exportResults
  } = useABTest()

  const [phase, setPhase] = useState<TestPhase>('selection')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 从 sessionStorage 读取 TTS 生成的音频
  const [availableAudios, setAvailableAudios] = useState<AudioInfo[]>([])

  // 初始化时加载音频
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('tts-generated-audios')
      if (stored) {
        const audios = JSON.parse(stored) as AudioInfo[]
        setAvailableAudios(audios)
        console.log('[AB-Test] 从 sessionStorage 加载了', audios.length, '条音频')
      }
    } catch (error) {
      console.error('[AB-Test] 加载音频失败:', error)
    }
  }, [])

  // 处理开始测试
  const handleStartTest = () => {
    const selectedAudios = availableAudios.filter(a => selectedIds.has(a.id))
    if (selectedAudios.length < 2) {
      alert('请至少选择 2 条音频')
      return
    }
    startTest(selectedAudios)
    setPhase('testing')
    // 无需调用 getNextBatch，startTest 已经设置了初始进度
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
      setPhase('selection')
      setSelectedIds(new Set())
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            A/B 音频测评系统
          </h1>
          <p className="text-white/60">
            选择多条音频，系统自动生成所有两两配对进行对比测评
          </p>
          {availableAudios.length > 0 && (
            <p className="text-green-400 text-sm mt-2">
              已从 TTS 平台加载 {availableAudios.length} 条音频
            </p>
          )}
        </div>

        {/* 阶段 1: 选择音频 */}
        {phase === 'selection' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            {availableAudios.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/60 mb-4">
                  请先在 TTS 对比平台生成音频
                </p>
                <a
                  href="/"
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg hover:shadow-blue-500/25 rounded-xl font-medium text-white transition inline-block"
                >
                  前往 TTS 平台
                </a>
              </div>
            ) : (
              <>
                <AudioSelector
                  audios={availableAudios}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                />
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleStartTest}
                    disabled={selectedIds.size < 2}
                    className={`
                      px-8 py-3 rounded-xl font-medium text-white transition
                      ${selectedIds.size >= 2
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg hover:shadow-blue-500/25'
                        : 'bg-white/10 cursor-not-allowed opacity-50'
                      }
                    `}
                  >
                    开始测试
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 阶段 2: 答题 */}
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

        {/* 阶段 3: 结果 */}
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

        {/* 进度追踪（测试阶段显示） */}
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
