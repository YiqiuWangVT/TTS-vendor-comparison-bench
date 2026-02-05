/**
 * A/B 测试系统的核心类型定义
 */

// 音频信息
export interface AudioInfo {
  id: string
  provider: string
  audioUrl: string
  audioMimeType?: string
  text?: string
  metadata?: {
    voice?: string
    model?: string
    [key: string]: any
  }
}

// 音频对
export interface AudioPair {
  id: string
  audioA: AudioInfo
  audioB: AudioInfo
}

// 评价维度
export enum QuestionDimension {
  // 维度1: 可懂度
  CLARITY = 'clarity',                    // 发音更清楚，更容易听懂
  UNDERSTANDING = 'understanding',        // 不容易听错

  // 维度2: 自然度
  NATURALNESS = 'naturalness',            // 像真人
  HUMAN_LIKE = 'human_like',              // 不机器

  // 维度3: 好听度
  PLEASANTNESS = 'pleasantness',          // 更好听
  LISTENING_ENDURANCE = 'listening_endurance', // 连续听10分钟

  // 维度4: 辨识度
  MEMORABILITY = 'memorability',          // 有记忆点
  DISTINCTIVENESS = 'distinctiveness',    // 辨识度高

  // 维度5: 表现力
  EXPRESSIVENESS = 'expressiveness',      // 符合场景感觉

  // 维度6: 专业感
  PROFESSIONAL = 'professional'           // 专业配音
}

// 题目
export interface Question {
  id: string
  pairId: string  // 属于哪个音频对
  dimension: QuestionDimension
  questionText: string
  audioA: AudioInfo
  audioB: AudioInfo
}

// 答案类型
export type AnswerValue = 'A' | 'B' | 'equal' | number

// 答题记录
export interface Answer {
  questionId: string
  value: AnswerValue
  timestamp: number
  duration?: number  // 答题用时（毫秒）
}

// 题库状态
export interface QuestionBank {
  questions: Question[]
  total: number
  completed: Set<string>  // 已完成的题目 ID
}

// 答题进度
export interface Progress {
  totalQuestions: number
  completedQuestions: number
  currentBatch: Question[]
  batchIndex: number  // 当前第几批
}

// 评价维度配置
export interface DimensionConfig {
  dimension: QuestionDimension
  label: string
  question: string
  type: 'choice' | 'scale'  // choice: 单选(A/B/equal), scale: 评分(1-5)
}

// 批次配置
export interface BatchConfig {
  batchSize: number  // 每批题目数量（默认 5）
}
