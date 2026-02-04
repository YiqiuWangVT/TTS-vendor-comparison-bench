#!/usr/bin/env bash
set -euo pipefail

B64_FILE="tmp/dashscope_audio.b64"
OUT_FILE="tmp/dashscope_audio.wav"

if [ ! -f "$B64_FILE" ]; then
  echo "Base64 file not found: $B64_FILE"
  exit 1
fi

# Decode base64 to WAV (portable across macOS/BSD and GNU)
if command -v python3 >/dev/null 2>&1; then
  python3 - <<PY > "$OUT_FILE"
import sys, base64
with open('$B64_FILE','rb') as f:
    data = f.read()
    # strip possible surrounding quotes and commas/newlines
    s = data.decode('utf-8').strip().strip('"').rstrip(',')
    sys.stdout.buffer.write(base64.b64decode(s))
PY
elif base64 --help 2>&1 | grep -q '\\-D'; then
  base64 -D "$B64_FILE" > "$OUT_FILE"
else
  base64 -d "$B64_FILE" > "$OUT_FILE"
fi

echo "Wrote: $OUT_FILE ($(wc -c < "$OUT_FILE") bytes)"
file "$OUT_FILE" || true

# On macOS, play with afplay if available
if command -v afplay >/dev/null 2>&1; then
  echo "Playing $OUT_FILE with afplay..."
  afplay "$OUT_FILE"
else
  echo "afplay not found; to play on macOS run: afplay $OUT_FILE"
fi
