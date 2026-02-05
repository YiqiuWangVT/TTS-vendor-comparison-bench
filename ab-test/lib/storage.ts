/**
 * 本地存储工具
 * 用于持久化题库、答案和进度
 */

import { QuestionBank, Answer } from '../types'

// Storage keys
const STORAGE_KEYS = {
  QUESTION_BANK: 'ab_test_question_bank',
  ANSWERS: 'ab_test_answers',
  PROGRESS: 'ab_test_progress'
}

/**
 * 序列化题库（处理 Set 类型）
 */
function serializeBank(bank: QuestionBank): string {
  const data = {
    ...bank,
    completed: Array.from(bank.completed)  // Set → Array
  }
  return JSON.stringify(data)
}

/**
 * 反序列化题库（恢复 Set 类型）
 */
function deserializeBank(json: string): QuestionBank | null {
  try {
    const data = JSON.parse(json)
    return {
      ...data,
      completed: new Set(data.completed)  // Array → Set
    }
  } catch {
    return null
  }
}

/**
 * 保存题库到 localStorage
 */
export function saveQuestionBank(bank: QuestionBank): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.QUESTION_BANK, serializeBank(bank))
  } catch (error) {
    console.error('Failed to save question bank:', error)
  }
}

/**
 * 从 localStorage 加载题库
 */
export function loadQuestionBank(): QuestionBank | null {
  if (typeof window === 'undefined') return null
  try {
    const json = localStorage.getItem(STORAGE_KEYS.QUESTION_BANK)
    return json ? deserializeBank(json) : null
  } catch (error) {
    console.error('Failed to load question bank:', error)
    return null
  }
}

/**
 * 清除题库
 */
export function clearQuestionBank(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEYS.QUESTION_BANK)
  } catch (error) {
    console.error('Failed to clear question bank:', error)
  }
}

/**
 * 保存答案记录
 */
export function saveAnswers(answers: Answer[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.ANSWERS, JSON.stringify(answers))
  } catch (error) {
    console.error('Failed to save answers:', error)
  }
}

/**
 * 加载答案记录
 */
export function loadAnswers(): Answer[] {
  if (typeof window === 'undefined') return []
  try {
    const json = localStorage.getItem(STORAGE_KEYS.ANSWERS)
    return json ? JSON.parse(json) : []
  } catch (error) {
    console.error('Failed to load answers:', error)
    return []
  }
}

/**
 * 添加单个答案
 */
export function addAnswer(answer: Answer): void {
  const answers = loadAnswers()
  answers.push(answer)
  saveAnswers(answers)
}

/**
 * 清除所有数据
 */
export function clearAllData(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEYS.QUESTION_BANK)
    localStorage.removeItem(STORAGE_KEYS.ANSWERS)
    localStorage.removeItem(STORAGE_KEYS.PROGRESS)
  } catch (error) {
    console.error('Failed to clear all data:', error)
  }
}
