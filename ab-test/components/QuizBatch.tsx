/**
 * 批次答题界面
 * 每次显示 5 道题，用户完成后提交
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Question, Answer, AnswerValue } from '../types'
import { QuestionCard } from './QuestionCard'

interface QuizBatchProps {
  questions: Question[]
  batchIndex: number
  onSubmit: (answers: Answer[]) => void
  canContinue: boolean
}

export function QuizBatch({ questions, batchIndex, onSubmit, canContinue }: QuizBatchProps) {
  const [answers, setAnswers] = useState<Map<string, AnswerValue>>(new Map())
  const [submitted, setSubmitted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevQuestionsRef = useRef<Question[]>([])

  // 当题目列表变化时重置状态
  useEffect(() => {
    const prevQuestions = prevQuestionsRef.current
    prevQuestionsRef.current = questions

    // 只有当题目列表真正变化时才重置
    const hasChanged = prevQuestions.length !== questions.length ||
      prevQuestions.some((q, i) => q.id !== questions[i]?.id)

    if (hasChanged && questions.length > 0) {
      setAnswers(new Map())
      setSubmitted(false)
      // 重置后延迟滚动到顶部
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }, [questions])

  const handleAnswer = useCallback((questionId: string) => {
    return (value: AnswerValue) => {
      const newAnswers = new Map(answers)
      newAnswers.set(questionId, value)
      setAnswers(newAnswers)
    }
  }, [answers])

  const handleSubmit = useCallback(() => {
    if (answers.size !== questions.length) {
      alert('请完成所有题目后再提交！')
      return
    }

    const answerArray: Answer[] = Array.from(answers.entries()).map(([questionId, value]) => ({
      questionId,
      value,
      timestamp: Date.now()
    }))

    setSubmitted(true)
    onSubmit(answerArray)
  }, [answers, questions.length, onSubmit])

  const completedCount = answers.size
  const totalCount = questions.length
  const allCompleted = completedCount === totalCount

  return (
    <div className="space-y-6" ref={containerRef} id={`quiz-batch-${batchIndex}`}>
      <div className="bg-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">第 {batchIndex + 1} 批题目</h3>
            <p className="text-sm text-white/60 mt-1">完成进度: {completedCount} / {totalCount}</p>
          </div>
          {!submitted && (
            <div className={`
              px-4 py-2 rounded-lg text-sm font-medium
              ${allCompleted ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}
            `}>
              {allCompleted ? '可以提交' : '请完成所有题目'}
            </div>
          )}
        </div>

        <div className="mt-3 bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            onAnswer={handleAnswer(question.id)}
            answered={submitted}
          />
        ))}
      </div>

      {!submitted && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleSubmit}
            disabled={!allCompleted}
            className={`
              px-8 py-3 rounded-xl font-medium text-white transition
              ${allCompleted
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg hover:shadow-blue-500/25'
                : 'bg-white/10 cursor-not-allowed opacity-50'
              }
            `}
          >
            提交本批答案
          </button>
        </div>
      )}

      {submitted && canContinue && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6 text-center">
          <svg className="w-12 h-12 text-green-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0z" />
          </svg>
          <h4 className="text-lg font-semibold text-green-300 mb-2">提交成功！</h4>
          <p className="text-white/60 text-sm">您可以继续下一批题目</p>
        </div>
      )}
    </div>
  )
}
