# TTS 多供应商性能对比平台

一个专业的 Text-to-Speech (TTS) 服务对比平台，支持实时对比 5 家主流 TTS 供应商的性能指标，提供毫秒级响应时间和音频质量分析。

## 🚀 在线体验

**生产环境**: https://tts-vendor-comparison.vercel.app/

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://tts-vendor-comparison.vercel.app)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)

## ✨ 核心功能

### 🎯 多供应商支持
- **豆包火山** - 火山引擎 TTS (含 LLM 和标准版本)
- **Minimax** - 多模型 TTS 服务
- **ElevenLabs** - 高质量多语言 TTS
- **LunaLabs** - URL 音频交付 TTS
- **通义千问** - 阿里巴巴 TTS 服务

### 📊 性能指标
- **毫秒级 TTFB** - 前端和后端响应时间追踪
- **并行处理** - 同时请求多个供应商进行公平对比
- **音频格式支持** - MP3, WAV, OGG, FLAC, WebM, M4A
- **自动格式检测** - 智能识别音频文件类型
- **音频时长估算** - WAV 文件头部解析

### 🎨 用户界面
- **现代化设计** - 基于 Tailwind CSS v4 和 shadcn/ui
- **响应式布局** - 完美适配桌面和移动设备
- **实时反馈** - 动态显示处理进度和结果
- **主题切换** - 支持明暗主题
- **国际化** - 中英文双语支持

## 🛠 技术架构

### 前端技术栈
- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript (严格模式)
- **样式**: Tailwind CSS v4.1.9 + shadcn/ui
- **状态管理**: React hooks + localStorage
- **图表**: Recharts 数据可视化

### 后端架构
- **单一 API 端点**: `/api/tts/route.ts` 统一处理所有供应商
- **并行异步处理**: 高性能并发请求
- **全面错误处理**: 优雅的降级和回退机制
- **音频处理**: Base64 编码/解码 + 格式验证

### 高级特性
- **混合架构**: 支持 Node.js + Python WebSocket 实时音频流
- **本地二进制处理**: 豆包火山本地 SDK 集成 (可选)
- **性能监控**: Vercel Analytics 集成
- **类型安全**: 完整的 TypeScript 类型定义

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 pnpm

### 安装和运行

```bash
# 克隆项目
git clone <repository-url>
cd TTS-vendor-comparison-0927

# 安装依赖
npm install

# 配置环境变量 (可选，无密钥时返回测试音频)
cp .env.example .env.local

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start
```

访问 http://localhost:3000 开始使用！

## 🔧 环境配置

为了完整使用所有 TTS 服务，请在 `.env.local` 中配置以下环境变量：

```bash
# 必需：TTS 服务 API 密钥
DASHSCOPE_API_KEY=          # 通义千问 TTS
DOUYIN_APP_ID=              # 豆包/火山 TTS
DOUYIN_ACCESS_TOKEN=        # 豆包/火山 TTS
DOUYIN_SECRET_KEY=          # 豆包/火山 TTS
ELEVENLABS_API_KEY=         # ElevenLabs
MINIMAX_API_KEY=            # Minimax
MINIMAX_GROUP_ID=           # Minimax
LUNA_ACCESS_TOKEN=          # LunaLabs

# 可选：本地开发配置
VOLC_LOCAL_ENDPOINT=        # 本地豆包 TTS 服务器
VOLC_LOCAL_PYTHON=          # 自定义 Python 可执行文件路径
VOLC_LOCAL_SCRIPT=          # 自定义脚本路径
```

> **注意**: 即使不配置 API 密钥，应用仍可正常运行，会返回模拟音频用于测试。

## 📁 项目结构

```
├── app/                     # Next.js App Router
│   ├── api/tts/            # 统一 TTS API 端点
│   ├── layout.tsx          # 根布局
│   └── page.tsx            # 主页面
├── components/             # React 组件
│   ├── tts-comparison-platform.tsx  # 主应用组件
│   ├── configuration-panel.tsx      # 配置面板
│   ├── results-display.tsx          # 结果展示
│   └── ui/                          # shadcn/ui 组件库
├── lib/                    # 核心库
│   ├── providers.ts        # 供应商配置
│   ├── providers/          # 各供应商实现
│   └── utils.ts            # 工具函数
├── volcengine_binary_demo/ # Python SDK (可选)
└── public/                 # 静态资源
```

## 🔍 API 使用

### 主要端点

**POST /api/tts**
```json
{
  "text": "需要转换的文本",
  "providers": [
    {
      "id": "elevenlabs",
      "voice": "rachel",
      "model": "eleven_monolingual_v1"
    }
  ]
}
```

**响应格式**
```json
{
  "results": [
    {
      "provider": {
        "id": "elevenlabs",
        "voice": "rachel",
        "model": "eleven_monolingual_v1"
      },
      "metrics": {
        "frontend": { "ttfbMs": 123 },
        "backend": { "ttfbMs": 89 }
      },
      "audioUrl": "data:audio/mpeg;base64,...",
      "status": "success"
    }
  ]
}
```

## 🧪 测试

### 端到端测试
```bash
# 运行 Playwright 测试
npx playwright test

# 运行特定测试
npx playwright test scripts/playwright-check.js
```

### 代码质量
```bash
# ESLint 检查
npm run lint

# TypeScript 类型检查
npx tsc --noEmit
```

## 🚀 部署

### Vercel (推荐)
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

项目已配置自动部署到 Vercel，只需推送到主分支即可。

### 环境变量配置
在 Vercel 控制台中配置生产环境变量，确保所有 API 密钥都正确设置。

## 🔧 本地开发

### 开发脚本
```bash
npm run dev      # 启动开发服务器 (localhost:3000)
npm run build    # 构建生产版本
npm run start    # 启动生产服务器
npm run lint     # 运行 ESLint
```

### Python 环境 (可选)
如需使用本地豆包火山处理功能：

```bash
# 进入 Python SDK 目录
cd volcengine_binary_demo

# 安装 Python 依赖
pip install -r requirements.txt

# 运行本地服务器
python volcengine_binary_demo/protocols/websocket_server.py
```

## 🎯 高级功能

### WebSocket 实时音频流
- 支持豆包火山 WebSocket 实时音频流
- 二进制协议解析和消息处理
- 自动重连和错误处理

### 音频处理
- 自动格式检测 (MP3, WAV, OGG 等)
- Base64 编码/解码
- 音频时长估算
- 多格式音频播放

### 性能优化
- 并行 API 请求
- 智能缓存策略
- 响应时间监控
- 资源懒加载

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [Vercel](https://vercel.com/) - 部署平台

## 📞 支持

如有问题或建议，请：
- 提交 [Issue](../../issues)
- 发送邮件至 [your-email@example.com]
- 访问在线文档: https://tts-vendor-comparison.vercel.app

---

**Made with ❤️ using Next.js 14 + TypeScript + Tailwind CSS**
