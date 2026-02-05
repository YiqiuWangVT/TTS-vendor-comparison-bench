/**
 * 评价维度配置
 * 6 个维度，共 10 个问题
 */

import { DimensionConfig, QuestionDimension } from '../types'

export const DIMENSIONS: DimensionConfig[] = [
  // 维度1: 可懂度 (2个问题)
  {
    dimension: QuestionDimension.CLARITY,
    label: '可懂度',
    question: '哪一个的发音更清楚，更容易听懂？',
    type: 'choice'
  },
  {
    dimension: QuestionDimension.UNDERSTANDING,
    label: '可懂度',
    question: '如果你只听一遍，哪一个更不容易听错？',
    type: 'choice'
  },

  // 维度2: 自然度 (2个问题)
  {
    dimension: QuestionDimension.NATURALNESS,
    label: '自然度',
    question: '闭上眼睛听，你觉得哪一个声音更像真人？',
    type: 'choice'
  },
  {
    dimension: QuestionDimension.HUMAN_LIKE,
    label: '自然度',
    question: '哪一个声音听起来更不"机器"？',
    type: 'choice'
  },

  // 维度3: 好听度 (2个问题)
  {
    dimension: QuestionDimension.PLEASANTNESS,
    label: '好听度',
    question: '你觉得哪个声音更好听？',
    type: 'choice'
  },
  {
    dimension: QuestionDimension.LISTENING_ENDURANCE,
    label: '好听度',
    question: '如果要连续听 10 分钟，你会选哪一个？',
    type: 'choice'
  },

  // 维度4: 辨识度 (2个问题)
  {
    dimension: QuestionDimension.MEMORABILITY,
    label: '辨识度',
    question: '哪一个声音更有记忆点？',
    type: 'choice'
  },
  {
    dimension: QuestionDimension.DISTINCTIVENESS,
    label: '辨识度',
    question: '你觉得哪个声音辨识度更高？',
    type: 'choice'
  },

  // 维度5: 表现力 (2个问题)
  {
    dimension: QuestionDimension.EXPRESSIVENESS,
    label: '表现力',
    question: '哪一个更符合【当前场景】的感觉？',
    type: 'choice'
  },
  {
    dimension: QuestionDimension.EXPRESSIVENESS,
    label: '表现力',
    question: '哪一个声音的表现力更强？',
    type: 'choice'
  },

  // 维度6: 专业感 (2个问题)
  {
    dimension: QuestionDimension.PROFESSIONAL,
    label: '专业感',
    question: '哪一个更像是专业配音？',
    type: 'choice'
  },
  {
    dimension: QuestionDimension.PROFESSIONAL,
    label: '专业感',
    question: '哪一个更适合商用？',
    type: 'choice'
  }
]

// 答案选项
export const ANSWER_OPTIONS = [
  { value: 'A', label: '选择 A', color: 'bg-blue-500' },
  { value: 'B', label: '选择 B', color: 'bg-purple-500' },
  { value: 'equal', label: '两者相当', color: 'bg-gray-500' }
] as const
