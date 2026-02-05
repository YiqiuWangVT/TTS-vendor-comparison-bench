# 音频文件存储功能说明（IndexedDB 版本）

## 功能概述

原项目每次生成 TTS 音频后，会将音频文件保存为 **Blob 对象存储在 IndexedDB** 中，供 A/B 测试功能直接使用。

## 为什么用 IndexedDB？

| 特性 | localStorage | IndexedDB |
|------|-------------|-----------|
| **容量限制** | 5-10 MB | 几百 MB 甚至更大 |
| **存储类型** | 字符串（需要 base64 编码） | Blob、ArrayBuffer 等二进制 |
| **性能** | 较慢 | 快速 |
| **适用场景** | 少量配置数据 | 大文件（音频、视频等） |

**IndexedDB 适合存储音频文件！**

## 工作流程

```
用户在主项目生成音频（Data URL 或 URL）
    ↓
系统 fetch 获取音频二进制数据
    ↓
转换为 Blob 对象
    ↓
存储到 IndexedDB
    ↓
A/B 测试读取时创建 Blob URL
    ↓
直接用于 audio 标签播放
```

## 数据存储结构

### IndexedDB 结构

```
数据库名: ABTestAudioDB
对象仓库: audios
版本: 1

记录结构:
{
  id: string              # 主键
  blob: Blob              # 音频二进制数据
  provider: string        # TTS 提供商
  text: string            # 对应文本
  metadata: object        # 其他元数据
  createdAt: timestamp    # 创建时间
}
```

### 示例数据

```javascript
{
  id: "config_1",
  blob: Blob { size: 245678, type: "audio/mpeg" },
  provider: "douyin",
  text: "你好，世界",
  metadata: {
    voice: "豆包火山 #1",
    model: "config_1"
  },
  createdAt: 1736018400000
}
```

## API 接口

### 保存音频文件

```typescript
import { saveAudioFiles } from '../ab-test/lib/audio-storage-idb'

await saveAudioFiles([
  {
    id: 'config_1',
    provider: 'douyin',
    audioUrl: 'data:audio/mpeg;base64,...',  // Data URL 或 HTTP URL
    audioMimeType: 'audio/mpeg',
    text: '你好',
    metadata: { voice: '豆包火山 #1' }
  },
  // ... 更多音频
])
```

### 加载音频文件

```typescript
import { loadAudioFiles } from '../ab-test/lib/audio-storage-idb'

const audios = await loadAudioFiles()
// 返回: AudioInfo[]
// 每个 AudioInfo.audioUrl 是 Blob URL (blob:http://...)
```

### 清空音频文件

```typescript
import { clearAudioFiles } from '../ab-test/lib/audio-storage-idb'

await clearAudioFiles()
```

### 检查是否有音频

```typescript
import { hasSavedAudioFiles, getAudioFileCount } from '../ab-test/lib/audio-storage-idb'

const hasAudio = await hasSavedAudioFiles()
const count = await getAudioFileCount()
```

## 原项目集成

### 文件位置

`components/tts-comparison-platform.tsx`

### 代码集成

**1. 导入函数**
```typescript
import { clearAudioFiles, saveAudioFiles } from "../ab-test/lib/audio-storage-idb"
```

**2. 页面加载时清空旧音频**
```typescript
useEffect(() => {
  clearAudioFiles()
}, [])
```

**3. 音频生成成功后保存**
```typescript
useEffect(() => {
  if (!isRunning && results.length > 0) {
    const successfulResults = results.filter(
      r => r.status === 'success' && r.audioUrl
    )

    if (successfulResults.length > 0) {
      const audios = successfulResults.map(r => ({
        id: r.configId || r.provider,
        provider: r.provider,
        audioUrl: r.audioUrl,        // 可以是 Data URL 或 HTTP URL
        audioMimeType: r.audioMimeType,
        text: config.text,
        metadata: {
          voice: r.configLabel,
          model: r.configId
        }
      }))

      saveAudioFiles(audios)  // 自动 fetch 并存储为 Blob
    }
  }
}, [isRunning, results, config.text])
```

## Blob URL 说明

### 什么是 Blob URL？

```
blob:http://localhost:3002/uuid-uuid-uuid
```

- 是浏览器内存中二进制数据的引用
- 只在当前页面会话有效
- 刷新页面后失效（但我们从 IndexedDB 重新创建）

### 生命周期

```
IndexedDB 存储 (持久)
    ↓
loadAudioFiles() 读取
    ↓
URL.createObjectURL(blob) 创建 Blob URL
    ↓
<audio src={blobUrl} /> 播放
    ↓
页面刷新或调用 URL.revokeObjectURL() 清理
    ↓
Blob URL 失效，但 IndexedDB 数据仍存在
```

## 调试工具

### 查看存储的音频

在浏览器控制台运行：

```javascript
// 打开 IndexedDB
const request = indexedDB.open('ABTestAudioDB', 1)

request.onsuccess = () => {
  const db = request.result
  const transaction = db.transaction(['audios'], 'readonly')
  const store = transaction.objectStore('audios')
  const getAll = store.getAll()

  getAll.onsuccess = () => {
    console.log('存储的音频:', getAll.result)
  }
}
```

### 查看音频数量

```javascript
// 上面代码的 getAll.onsuccess 中
console.log('音频数量:', getAll.result.length)
```

### 手动清空

```javascript
const request = indexedDB.open('ABTestAudioDB', 1)
request.onsuccess = () => {
  const db = request.result
  const transaction = db.transaction(['audios'], 'readwrite')
  transaction.objectStore('audios').clear()
}
```

### 在 DevTools 中查看

1. 打开 Chrome DevTools
2. **Application** 标签
3. **IndexedDB** → **ABTestAudioDB** → **audios**
4. 可以看到所有存储的音频记录

## 性能对比

### localStorage 存储（旧方案）

```
音频大小: 500 KB
Base64 编码后: 667 KB  (+33%)
localStorage 可用: 5 MB
可存储数量: 约 7-8 条
```

### IndexedDB 存储（新方案）

```
音频大小: 500 KB
存储后: 500 KB  (无额外开销)
IndexedDB 可用: 几百 MB
可存储数量: 几百条甚至更多
```

## 注意事项

### 1. Blob URL 内存管理

- Blob URL 会占用内存
- 页面刷新后自动清理
- 长时间使用建议定期调用 `URL.revokeObjectURL()`

### 2. 浏览器兼容性

IndexedDB 支持情况：
- ✅ Chrome 24+
- ✅ Firefox 16+
- ✅ Safari 10+
- ✅ Edge 12+
- ✅ iOS Safari 10+
- ✅ Android Browser 4.4+

### 3. 隐私模式

- 部分浏览器的隐私模式可能限制 IndexedDB
- 存储可能在关闭浏览器后清除

### 4. 数据持久性

- IndexedDB 数据持久化在用户浏览器
- 清除浏览器数据会丢失
- 不会上传到服务器（安全）

## 文件清单

```
ab-test/lib/
├── audio-storage-idb.ts    # IndexedDB 实现（当前使用）
└── audio-storage.ts        # localStorage 实现（已弃用）

components/
└── tts-comparison-platform.tsx  # 原项目集成
```

## 使用示例

### 在 A/B 测试中使用

```typescript
'use client'

import { useEffect, useState } from 'react'
import { loadAudioFiles, hasSavedAudioFiles } from '../ab-test/lib/audio-storage-idb'

export function ABTestPage() {
  const [audios, setAudios] = useState<AudioInfo[]>([])

  useEffect(() => {
    async function loadAudios() {
      const hasAudio = await hasSavedAudioFiles()

      if (hasAudio) {
        const savedAudios = await loadAudioFiles()
        setAudios(savedAudios)
      } else {
        // 提示用户先在主项目生成音频
        alert('请先在主项目生成音频')
      }
    }

    loadAudios()
  }, [])

  return (
    <div>
      {audios.map(audio => (
        <div key={audio.id}>
          <p>{audio.provider}</p>
          <audio src={audio.audioUrl} controls />
        </div>
      ))}
    </div>
  )
}
```

## 总结

✅ **使用 IndexedDB 存储音频文件的优点：**
- 容量大，可以存储大量音频
- 直接存储二进制数据，无 base64 开销
- 性能好，读取速度快
- 适合大文件存储

✅ **自动管理：**
- 页面加载时自动清空旧音频
- 生成新音频时自动替换
- 无需手动管理

✅ **即开即用：**
- 主项目生成音频后自动保存
- A/B 测试直接读取使用
- 对用户透明无感
