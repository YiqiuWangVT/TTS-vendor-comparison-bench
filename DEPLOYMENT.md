# Vercel 部署环境变量配置指南

## 问题说明

在 Vercel 部署时出现环境变量无法识别的错误：
- Douyin TTS credentials not configured
- Qwen TTS API key missing

## 解决方案

### 方法 1：在 Vercel Dashboard 中配置环境变量（推荐）

1. 访问 Vercel Dashboard: https://vercel.com/dashboard
2. 选择你的项目
3. 进入 Settings → Environment Variables
4. 添加以下环境变量：

```
VOLCENGINE_APP_ID=9362313762
VOLCENGINE_ACCESS_TOKEN=_El1ftdDa8p6PyrMI1lkZeyFmKuINOmT
VOLCENGINE_SECRET_KEY=EbFdJiYM8KCeNky35VKqFltDtP1ZROKC
VOLCENGINE_CLUSTER=volcano_tts
DASHSCOPE_API_KEY=sk-b7085211c57b474e838936c8e6381b2b
```

### 方法 2：通过 Vercel CLI 配置

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 设置环境变量
vercel env add VOLCENGINE_APP_ID
vercel env add VOLCENGINE_ACCESS_TOKEN
vercel env add VOLCENGINE_SECRET_KEY
vercel env add VOLCENGINE_CLUSTER
vercel env add DASHSCOPE_API_KEY

# 重新部署
vercel --prod
```

## 环境变量优先级

代码中的环境变量读取顺序：
1. `VOLCENGINE_*` (优先)
2. `DOUYIN_*`
3. `SEEDTTS_*` (备用)

## 验证部署

部署完成后，在 Vercel Logs 中应该看到：
```
Douyin TTS credentials check: { appId: '✓ Present', accessToken: '✓ Present', clusterId: '✓ Present' }
Qwen TTS credentials check: { apiKey: '✓ Present' }
```

## 注意事项

- ⚠️ 永远不要在代码中硬编码 API 密钥
- ⚠️ .env.local 文件不会上传到 Git，仅供本地开发使用
- ✅ 生产环境必须在 Vercel Dashboard 中配置环境变量
- ✅ 配置后需要重新部署才能生效