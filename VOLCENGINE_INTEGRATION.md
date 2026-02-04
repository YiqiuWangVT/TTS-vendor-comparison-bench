# Integrating volcengine_binary_demo into Next.js app

This document outlines a safe, minimal plan to move the `volcengine_binary_demo` example into the Next.js application as a provider module.

Goals
- Centralize credential handling in `lib/providers/volcengine`.
- Provide server-side helper functions for building auth headers and performing TTS calls.
- Keep the existing demo intact as a reference, but mark an integration path for long-term maintenance.

Suggested steps
1. Add `lib/providers/volcengine/index.ts` (done) — contains helper functions to read env vars and build auth headers.
2. Replace direct usage of credentials inside `volcengine_binary_demo/examples/volcengine/binary.py` or `app/api/tts/route.ts` by calling helpers in `lib/providers/volcengine` from the server-side code (TypeScript). Keep the Python demos as compatibility examples but prefer the TypeScript provider for runtime in Next.js.
3. Move any request/response parsing logic from demo scripts into `app/api/tts` server endpoints as needed (wrap WebSocket or HTTP calls in small adapter functions).
4. Add `/.env.example` (done) and ensure `.env` is in `.gitignore` (already present).

Files to consider migrating into the React/Next stack
- `volcengine_binary_demo/examples/volcengine/binary.py` — keep as reference; reimplement core call in TypeScript at `lib/providers/volcengine/adapter.ts`.
- `volcengine_binary_demo/.env` — already moved into root `.env` (placeholders kept in the demo folder).
- `scripts/tts_qwen3tts_api.py` — CLI utility; optional to port to a server-side Node script, or keep as a developer utility.

Notes
- The helper uses HMAC-SHA256 via Node's `crypto` and is compatible with the demo's signature pattern.
- For HMAC flows you must ensure `VOLCENGINE_SECRET_KEY` is set on the server environment.
