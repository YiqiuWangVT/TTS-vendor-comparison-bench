/**
 * A/B 测试页面 - 支持手动导入音频
 */

'use client'

import { useState } from 'react'
import { AudioInfo, Answer } from '../../ab-test/types'
import { useABTest } from '../../ab-test/hooks/use-ab-test'
import { AudioSelector } from '../../ab-test/components/AudioSelector'
import { QuizBatch } from '../../ab-test/components/QuizBatch'
import { ProgressTracker } from '../../ab-test/components/ProgressTracker'

type TestPhase = 'selection' | 'testing' | 'results'

interface TTSResult {
  status?: string
  audioUrl?: string
  provider?: string
  configId?: string
  text?: string
  audioMimeType?: string
  configLabel?: string
}

interface ParsedData {
  results?: TTSResult[]
}

export default function ABTestPage() {
  const {
    progress,
    startTest,
    getNextBatch,
    submitBatch,
    resetTest,
    exportResults
  } = useABTest()

  const [phase, setPhase] = useState<TestPhase>('selection')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [manualInput, setManualInput] = useState('')
  const [manualAudios, setManualAudios] = useState<AudioInfo[]>([])

  // 从文本框解析音频 URL
  const handleParseAudios = () => {
    try {
      const data = JSON.parse(manualInput) as ParsedData | TTSResult[]
      const results = Array.isArray(data) ? data : (data.results || [])

      const audios: AudioInfo[] = results
        .filter((r: TTSResult) => r.status === 'success' && r.audioUrl)
        .map((r: TTSResult, index: number) => ({
          id: r.configId || r.provider || `audio_${index}`,
          provider: r.provider || 'unknown',
          audioUrl: r.audioUrl || '',
          audioMimeType: r.audioMimeType || 'audio/wav',
          text: r.text || '',
          metadata: {
            voice: r.configLabel || r.provider || 'unknown',
            model: r.configId || r.provider || 'unknown'
          }
        }))

      setManualAudios(audios)
      console.log(`[AB-Test] 解析到 ${audios.length} 条音频`)
    } catch (error) {
      alert('JSON 格式错误，请检查输入')
      console.error(error)
    }
  }

  // 处理开始测试
  const handleStartTest = (audios: AudioInfo[]) => {
    if (audios.length < 2) {
      alert('请至少选择 2 条音频')
      return
    }
    startTest(audios)
    setPhase('testing')
    getNextBatch()
  }

  // 处理提交答案
  const handleSubmitBatch = (newAnswers: Answer[]) => {
    submitBatch(newAnswers)
    setTimeout(() => {
      const hasNext = getNextBatch()
      if (!hasNext) {
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
      setManualAudios([])
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
            从 Network 复制 results 数据，粘贴下方开始测评
          </p>
        </div>

        {/* 阶段 1: 输入和选择音频 */}
        {phase === 'selection' && (
          <div className="space-y-6">
            {/* 手动输入音频 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">
                1. 导入音频数据
              </h3>
              <div className="space-y-4">
                <textarea
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={`从 Network /api/tts 的响应中复制 results 数据，例如：

{
  "results": [
    {
      "provider": "qwen",
      "audioUrl": "data:audio/wav;base64,...",
      "audioMimeType": "audio/wav",
      "status": "success"
    },
    ...
  ]
}`}
                  className="w-full h-40 bg-black/30 text-white p-4 rounded-xl border border-white/20 font-mono text-sm resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleParseAudios}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                  >
                    解析音频数据
                  </button>
                  {manualAudios.length > 0 && (
                    <button
                      onClick={() => {
                        setManualAudios([])
                        setManualInput('')
                      }}
                      className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition"
                    >
                      清除 ({manualAudios.length} 条)
                    </button>
                  )}
                </div>
                {manualAudios.length > 0 && (
                  <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                    <p className="text-green-300 text-sm">
                      ✅ 成功解析 {manualAudios.length} 条音频
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 选择音频 */}
            {manualAudios.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">
                  2. 选择要测评的音频
                </h3>
                <AudioSelector
                  audios={manualAudios}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                />
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => {
                      const selected = manualAudios.filter(a => selectedIds.has(a.id))
                      handleStartTest(selected)
                    }}
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
              </div>
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
