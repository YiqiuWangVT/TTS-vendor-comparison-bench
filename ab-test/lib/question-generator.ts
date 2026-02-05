/**
 * 题库生成器
 * 从 n 条音频生成所有两两配对和题目（完全随机）
 */

import { AudioInfo, AudioPair, Question, QuestionBank, QuestionDimension } from '../types'
import { DIMENSIONS } from '../data/dimensions'

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
 * 生成所有音频的两两配对（随机顺序）
 * n 条音频 → n*(n-1)/2 对
 */
export function generateAudioPairs(audios: AudioInfo[]): AudioPair[] {
  // 先随机打乱音频数组
  const shuffledAudios = shuffle(audios)
  const pairs: AudioPair[] = []

  for (let i = 0; i < shuffledAudios.length; i++) {
    for (let j = i + 1; j < shuffledAudios.length; j++) {
      const pair: AudioPair = {
        id: `pair_${i}_${j}`,
        audioA: shuffledAudios[i],
        audioB: shuffledAudios[j]
      }
      pairs.push(pair)
    }
  }

  return pairs
}

/**
 * 为单个音频对生成所有维度的题目（随机维度顺序）
 */
export function generateQuestionsForPair(pair: AudioPair): Question[] {
  // 随机打乱维度顺序，避免每对都是相同维度的题目顺序
  const shuffledDimensions = shuffle(DIMENSIONS)
  const questions: Question[] = []

  shuffledDimensions.forEach(dimension => {
    const question: Question = {
      id: `${pair.id}_${dimension.dimension}`,
      pairId: pair.id,
      dimension: dimension.dimension,
      questionText: dimension.question,
      audioA: pair.audioA,
      audioB: pair.audioB
    }
    questions.push(question)
  })

  return questions
}

/**
 * 生成完整题库（完全随机）
 * n 条音频 → n*(n-1)/2 对 → n*(n-1)/2 * 12 题
 */
export function generateQuestionBank(audios: AudioInfo[]): QuestionBank {
  // 生成随机顺序的音频对
  const pairs = generateAudioPairs(audios)
  const allQuestions: Question[] = []

  // 为每个对生成题目（每个对的维度也是随机顺序）
  pairs.forEach(pair => {
    const questions = generateQuestionsForPair(pair)
    allQuestions.push(...questions)
  })

  // 最后随机打乱所有题目的顺序
  const shuffledQuestions = shuffle(allQuestions)

  return {
    questions: shuffledQuestions,
    total: shuffledQuestions.length,
    completed: new Set<string>()
  }
}

/**
 * 计算总题数公式
 * n 条音频 = n*(n-1)/2 * 12 题
 */
export function calculateTotalQuestions(audioCount: number): number {
  const pairsCount = (audioCount * (audioCount - 1)) / 2
  return pairsCount * 12
}

/**
 * 验证音频数量
 * 至少需要 2 条音频才能进行 A/B 测试
 */
export function validateAudioCount(count: number): { valid: boolean; error?: string } {
  if (count < 2) {
    return {
      valid: false,
      error: '至少需要选择 2 条音频进行 A/B 测试'
    }
  }

  const totalQuestions = calculateTotalQuestions(count)
  if (totalQuestions > 1000) {
    return {
      valid: false,
      error: `音频数量过多，将生成 ${totalQuestions} 道题目，建议减少音频数量`
    }
  }

  return { valid: true }
}
