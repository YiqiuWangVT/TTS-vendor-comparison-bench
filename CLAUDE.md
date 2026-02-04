# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TTS Vendor Comparison Platform - A Next.js 14 application for comparing multiple Text-to-Speech (TTS) providers side-by-side with performance metrics and audio quality evaluation.

## Development Commands

```bash
# Development
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint checking

# Testing (Playwright)
npx playwright test  # Run end-to-end tests
```

## Architecture

### Core Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4.1.9 with shadcn/ui components
- **State Management**: React hooks + localStorage persistence
- **Package Manager**: npm or pnpm

### Main Application Flow
1. **Single API Endpoint**: `/api/tts/route.ts` handles all 5 TTS providers in parallel
2. **Frontend Architecture**: Client-side React components with real-time metrics
3. **Audio Processing**: Base64 encoding/decoding with automatic format detection
4. **Performance Tracking**: TTFB (Time to First Byte) measurement for both frontend and backend

### Key Components
- `TTSComparisonPlatform` (`components/tts-comparison-platform.tsx`) - Root application state manager
- `ConfigurationPanel` (`components/configuration-panel.tsx`) - Provider/voice/model selection
- `ResultsDisplay` (`components/results-display.tsx`) - Audio playback and metrics visualization
- `/api/tts/route.ts` - Unified API handling all providers with parallel processing

## TTS Providers Integration

The platform integrates with 5 major TTS providers:

1. **豆包火山 (Douyin/Volcano)** - Chinese TTS with cloud + local binary support
2. **Minimax** - Multi-language TTS with extensive voice library
3. **ElevenLabs** - Premium multilingual TTS service
4. **LunaLabs** - URL-based audio delivery TTS
5. **通义千问 (Qwen/DashScope)** - Alibaba's TTS service

### Provider Configuration
All provider configurations are centralized in `lib/providers.ts`:
- Provider metadata and labels
- Available models and voice options for each provider
- Language support mapping

## Environment Variables

Critical for functionality. Copy `.env.example` to `.env.local`:

```bash
# Required for full functionality
DASHSCOPE_API_KEY=          # Qwen TTS
DOUYIN_APP_ID=              # Douyin TTS
DOUYIN_ACCESS_TOKEN=        # Douyin TTS
DOUYIN_SECRET_KEY=          # Douyin TTS
ELEVENLABS_API_KEY=         # ElevenLabs
MINIMAX_API_KEY=            # Minimax
MINIMAX_GROUP_ID=           # Minimax
LUNA_ACCESS_TOKEN=          # LunaLabs

# Local development options
VOLC_LOCAL_ENDPOINT=        # Local Douyin TTS server
VOLC_LOCAL_PYTHON=          # Custom Python executable path
VOLC_LOCAL_SCRIPT=          # Custom script path for binary demo
```

**Behavior without API keys**: Returns mock WAV audio for testing.

## Special Features

### Hybrid Python Integration
- Local Douyin/Volcano TTS processing via Python SDK in `volcengine_binary_demo/`
- WebSocket support for real-time audio streaming
- Demonstrates Node.js/Python architecture patterns

### Audio Processing Capabilities
- **Format Support**: MP3, WAV, OGG, FLAC, WebM, M4A
- **Automatic Detection**: File header parsing for MIME type identification
- **Duration Estimation**: WAV header parsing for audio length calculation
- **Data URL Generation**: Dynamic base64 encoding for audio playback

### Performance Metrics
- Real-time TTFB tracking (frontend + backend)
- Audio file size monitoring
- Response time visualization
- Parallel provider processing for accurate comparison

## File Structure Patterns

```
app/
├── api/tts/route.ts         # Single unified API endpoint
├── layout.tsx              # Root layout with theme provider
└── page.tsx                # Main page wrapper

components/
├── tts-comparison-platform.tsx  # Main application component
├── configuration-panel.tsx      # Provider/voice/model selection
├── results-display.tsx          # Results visualization
├── ui/                          # shadcn/ui component library
└── providers/                   # Individual provider integrations

lib/
├── providers.ts         # Provider configurations and voice options
├── providers/volcengine/  # Douyin/Volcano specific implementations
└── utils.ts            # Utility functions (clsx/twMerge)
```

## Development Conventions

### Code Patterns
- Functional components with hooks only
- TypeScript strict mode with comprehensive type definitions
- Barrel exports (`index.ts`) for clean imports
- Environment-based credential management (no hardcoded secrets)

### State Management
- React useState for local component state
- localStorage for user preferences (column layout, provider selections)
- No external state management libraries

### API Design Principles
- Single endpoint handling multiple providers
- Parallel async processing for performance comparison
- Comprehensive error handling with fallback responses
- Audio format normalization and validation

## Testing

Playwright configuration included for end-to-end testing:
- `scripts/playwright-check.js` - General UI testing
- `scripts/playwright-check-comboboxes.js` - Dropdown/selection testing

## Deployment

- **Vercel**: Auto-deployment from main branch
- **v0.app**: Automatic sync with deployed changes
- **Environment Variables**: Must be configured in Vercel dashboard for production

## Working with Local TTS Processing

The project includes Python SDK integration for local Douyin/Volcano TTS:
- Located in `volcengine_binary_demo/`
- Requires Python environment setup
- Uses WebSocket for real-time audio streaming
- Demonstrates hybrid architecture patterns

## Common Development Tasks

### Adding New TTS Provider
1. Add provider to `PROVIDER_IDS` in `lib/providers.ts`
2. Implement provider-specific logic in `/api/tts/route.ts`
3. Add voice/model options to provider configuration
4. Update UI components to handle new provider

### Modifying Audio Processing
- Audio format detection in `detectAudioMimeType()` function
- Base64 encoding/decoding logic in API route
- Duration estimation for WAV files in API route

### Performance Optimization
- Parallel processing already implemented in API route
- TTFB tracking can be extended for additional metrics
- Caching strategies can be added for repeated requests