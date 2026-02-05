/**
 * 批量提交答案逻辑
 */

import { Question, QuestionBank, Answer, Progress } from '../types'

/**
 * Fisher-Yates 洗牌算法
 * 用于随机打乱数组
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * 从题库中抽取一批未完成的题目
 * @param bank 题库
 * @param batchSize 批次大小（默认 5）
 * @returns 随机抽取的题目数组
 */
export function selectRandomBatch(bank: QuestionBank, batchSize: number = 5): Question[] {
  // 筛选出未完成的题目
  const unanswered = bank.questions.filter(
    q => !bank.completed.has(q.id)
  )

  // 如果没有未完成的题目，返回空数组
  if (unanswered.length === 0) {
    return []
  }

  // 随机打乱
  const shuffled = shuffle(unanswered)

  // 返回前 batchSize 个（或剩余的所有题目）
  return shuffled.slice(0, Math.min(batchSize, shuffled.length))
}

/**
 * 提交答案并更新题库状态
 * 直接修改 completed Set，确保所有答案都被标记
 */
export function submitAnswer(bank: QuestionBank, answer: Answer): QuestionBank {
  const newCompleted = new Set(bank.completed)
  newCompleted.add(answer.questionId)

  return {
    ...bank,
    completed: newCompleted
  }
}

/**
 * 批量提交答案
 * 累加所有答案的 questionId 到 completed Set
 */
export function submitAnswers(bank: QuestionBank, answers: Answer[]): QuestionBank {
  const newCompleted = new Set(bank.completed)

  // 添加所有答案的 questionId
  answers.forEach(answer => {
    newCompleted.add(answer.questionId)
  })

  return {
    ...bank,
    completed: newCompleted
  }
}

/**
 * 计算进度信息
 */
export function calculateProgress(bank: QuestionBank): Progress {
  const completedCount = bank.completed.size
  const unanswered = bank.questions.filter(q => !bank.completed.has(q.id))
  const currentBatch = selectRandomBatch(bank, 5)

  return {
    totalQuestions: bank.total,
    completedQuestions: completedCount,
    currentBatch,
    batchIndex: Math.floor(completedCount / 5)
  }
}

/**
 * 检查是否所有题目已完成
 */
export function isAllCompleted(bank: QuestionBank): boolean {
  return bank.completed.size === bank.total
}

/**
 * 获取剩余题目数量
 */
export function getRemainingCount(bank: QuestionBank): number {
  return bank.total - bank.completed.size
}
