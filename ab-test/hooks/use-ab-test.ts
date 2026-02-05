/**
 * A/B 测试状态管理 Hook
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { AudioInfo, QuestionBank, Answer, Progress } from '../types'
import { generateQuestionBank } from '../lib/question-generator'
import { submitAnswers, selectRandomBatch, calculateProgress, isAllCompleted } from '../lib/question-selector'
import { saveQuestionBank, loadQuestionBank, saveAnswers, loadAnswers, clearAllData } from '../lib/storage'

export function useABTest() {
  // 题库状态
  const [bank, setBank] = useState<QuestionBank | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [progress, setProgress] = useState<Progress | null>(null)

  // 初始化：从 localStorage 加载
  useEffect(() => {
    const savedBank = loadQuestionBank()
    const savedAnswers = loadAnswers()

    if (savedBank) {
      setBank(savedBank)
      setAnswers(savedAnswers)
    }
  }, [])

  /**
   * 开始新的测试
   */
  const startTest = useCallback((audios: AudioInfo[]) => {
    const newBank = generateQuestionBank(audios)
    setBank(newBank)
    setAnswers([])

    // 计算初始进度
    const initialProgress = calculateProgress(newBank)
    setProgress(initialProgress)

    // 持久化
    saveQuestionBank(newBank)
    saveAnswers([])

    console.log('[AB-Test] 开始新测试，总题数:', newBank.total)
  }, [setProgress])

  return {
    // 状态
    bank,
    answers,
    progress,

    // 方法
    startTest,
    submitBatch: (newAnswers: Answer[]) => {
      if (!bank) return

      // 更新题库状态
      const updatedBank = submitAnswers(bank, newAnswers)
      setBank(updatedBank)

      // 合并答案
      const allAnswers = [...answers, ...newAnswers]
      setAnswers(allAnswers)

      // 计算新的进度
      const newProgress = calculateProgress(updatedBank)
      setProgress(newProgress)

      // 持久化
      saveQuestionBank(updatedBank)
      saveAnswers(allAnswers)

      console.log('[AB-Test] 提交答案数量:', newAnswers.length)
    },
    submitAnswers: (newAnswers: Answer[]) => {
      if (!bank) return

      // 更新题库状态
      const updatedBank = submitAnswers(bank, newAnswers)
      setBank(updatedBank)

      // 合并答案
      const allAnswers = [...answers, ...newAnswers]
      setAnswers(allAnswers)

      // 计算新的进度
      const newProgress = calculateProgress(updatedBank)
      setProgress(newProgress)

      // 持久化
      saveQuestionBank(updatedBank)
      saveAnswers(allAnswers)

      console.log('[AB-Test] 提交答案数量:', newAnswers.length)
    },
    getNextBatch: () => {
      if (!bank) return false

      // 检查是否已经完成
      if (isAllCompleted(bank)) {
        return false
      }

      // 获取下一批题目
      const nextBatch = selectRandomBatch(bank, 5)
      const newProgress = calculateProgress(bank)
      newProgress.currentBatch = nextBatch

      setProgress(newProgress)

      return nextBatch.length > 0
    },
    resetTest: () => {
      setBank(null)
      setAnswers([])
      setProgress(null)
      clearAllData()
    },
    exportResults: () => {
      const now = new Date()
      return {
        answers,
        progress,
        exportTime: now.toISOString()
      }
    }
  }
}
