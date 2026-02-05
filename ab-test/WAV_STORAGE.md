# WAV 格式音频存储说明

## 功能概述

音频文件在存储到 IndexedDB 时会**自动转换为 WAV 格式**，确保所有音频格式统一。

## 为什么存储为 WAV？

| 特性 | MP3 / 其他格式 | WAV (PCM) |
|------|---------------|-----------|
| **压缩** | 有损压缩 | 无损，原始数据 |
| **质量** | 有损失 | 完美保留原始质量 |
| **兼容性** | 需解码器 | 广泛支持 |
| **处理** | 需解压缩 | 直接可用 |
| **文件大小** | 较小 | 较大（但可接受） |

**选择 WAV 的原因：**
- ✅ 无损音频质量
- ✅ 标准格式，广泛支持
- ✅ 不需要额外的解码库
- ✅ 适合音频分析和处理
- ✅ IndexedDB 容量足够大

## 转换流程

```
原音频格式（MP3/OGG/etc）
    ↓
fetch 获取 Blob
    ↓
AudioContext.decodeAudioData()
    ↓
转换为 AudioBuffer
    ↓
audioBufferToWav() 编码
    ↓
生成 WAV Blob (PCM 16-bit)
    ↓
存储到 IndexedDB
```

## WAV 格式规格

存储的 WAV 文件使用以下规格：

```javascript
{
  format: 1,              // PCM
  numberOfChannels: 1/2,  // 单声道或立体声（与原音频相同）
  sampleRate: 原采样率,    // 如 22050, 44100, 48000
  bitDepth: 16,          // 16-bit
  bytesPerSample: 2,
  blockAlign: 2或4,       // 取决于声道数
}
```

## 代码实现

### 音频转换器

**文件：** `ab-test/lib/audio-converter.ts`

#### 1. 转换为 WAV

```typescript
import { convertToWav } from '../ab-test/lib/audio-converter'

// 将任意格式的 Blob 转换为 WAV
const wavBlob = await convertToWav(audioBlob)
```

#### 2. Data URL 转 WAV

```typescript
import { dataUrlToWav } from '../ab-test/lib/audio-converter'

// 从 Data URL 转换为 WAV Blob
const wavBlob = await dataUrlToWav('data:audio/mpeg;base64,...')
```

### IndexedDB 存储

**文件：** `ab-test/lib/audio-storage-idb.ts`

保存时自动转换为 WAV：

```typescript
// saveAudioBlob 函数内部
convertToWav(audioBlob).then(wavBlob => {
  // 保存 WAV 格式的 Blob
  const record = {
    id,
    blob: wavBlob,  // WAV 格式
    ...metadata
  }
  store.put(record)
})
```

## WAV 文件结构

### WAV Header (44 bytes)

```
Offset  Size  Field           Description
------  ----  -----           -----------
0       4     "RIFF"          RIFF 标识符
4       4     文件长度        文件总大小 - 8
8       4     "WAVE"         WAVE 标识符
12      4     "fmt "         fmt 子块
16      4     fmt 大小        16 (PCM)
20      2     音频格式        1 (PCM)
22      2     声道数          1 或 2
24      4     采样率          如 22050
28      4     字节率          sampleRate * blockAlign
32      2     块对齐          numberOfChannels * bytesPerSample
34      2     位深度          16
36      4     "data"         data 子块
40      4     数据长度        音频数据大小
44      N     音频数据        PCM 16-bit 样本
```

## 使用示例

### 自动转换并存储

```typescript
import { saveAudioFiles } from '../ab-test/lib/audio-storage-idb'

// 原音频可能是 MP3、OGG 等格式
const audios = [
  {
    id: '1',
    provider: 'douyin',
    audioUrl: 'data:audio/mpeg;base64,...',  // MP3 格式
    text: '你好'
  }
]

// 自动转换为 WAV 并存储
await saveAudioFiles(audios)
```

### 读取 WAV 音频

```typescript
import { loadAudioFiles } from '../ab-test/lib/audio-storage-idb'

const audios = await loadAudioFiles()

// audios[0].audioMimeType === 'audio/wav'
// audios[0].audioUrl === 'blob:http://...'
```

## 性能考虑

### 文件大小对比

假设 10 秒音频，22.05 kHz 采样率：

| 格式 | 大小 | 压缩比 |
|------|------|--------|
| MP3 (128 kbps) | ~160 KB | ~11:1 |
| WAV (16-bit PCM) | ~1.7 MB | 1:1 |

### IndexedDB 容量

- 可用空间：几百 MB
- 可存储：100-200 条 WAV 音频（每条约 1-2 MB）
- 完全够用！

### 转换时间

- 10 秒音频转换：约 50-100ms
- 几乎无感知延迟

## 调试

### 查看存储的格式

在浏览器控制台：

```javascript
const request = indexedDB.open('ABTestAudioDB', 1)

request.onsuccess = () => {
  const db = request.result
  const tx = db.transaction(['audios'], 'readonly')
  const store = tx.objectStore('audios')
  const get = store.get('config_1')

  get.onsuccess = () => {
    const record = get.result
    console.log('音频格式:', record.blob.type)  // "audio/wav"
    console.log('文件大小:', record.blob.size)  // 如 1745628 bytes
  }
}
```

### 下载 WAV 文件

如果想下载验证：

```javascript
// 上面代码后继续
get.onsuccess = () => {
  const record = get.result
  const url = URL.createObjectURL(record.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'audio.wav'
  a.click()
}
```

## 转换质量

### 采样率和位深

- **采样率**：保持原音频的采样率
- **位深**：统一转换为 16-bit PCM
- **声道**：保持原音频的声道数（单声道/立体声）

### 质量损失

**从 MP3 转为 WAV：**
- ✅ 不会恢复已损失的音质
- ✅ 但避免了再次压缩损失
- ✅ 统一格式便于处理

## 注意事项

1. **文件较大**：WAV 比压缩格式大 5-10 倍
2. **存储空间**：IndexedDB 容量足够，不必担心
3. **网络传输**：不涉及网络，本地存储
4. **兼容性**：所有现代浏览器都支持 WAV

## 文件清单

```
ab-test/lib/
├── audio-converter.ts       # 音频格式转换工具
├── audio-storage-idb.ts     # IndexedDB 存储（自动转 WAV）
└── audio-storage.ts         # localStorage 存储（备用）
```

## 总结

✅ **自动转换为 WAV 格式**
- 支持任意格式输入（MP3、OGG、M4A 等）
- 统一输出为 WAV（PCM 16-bit）
- 无损质量，广泛兼容

✅ **对用户透明**
- 主项目生成音频后自动转换
- A/B 测试直接使用 WAV
- 无需任何手动操作

✅ **性能优秀**
- 转换快速（毫秒级）
- 存储容量足够
- 播放流畅无卡顿
