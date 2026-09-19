#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FONT_DIR="$ROOT/assets/fonts"
BASE="https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf"

mkdir -p "$FONT_DIR"

download() {
  local file="$1"
  local url="$2"
  if [[ -f "$FONT_DIR/$file" ]]; then
    echo "exists: $file"
    return
  fi
  echo "downloading: $file"
  curl -fsSL -o "$FONT_DIR/$file" "$url"
}

download "NotoSans-Regular.ttf" "$BASE/NotoSans/NotoSans-Regular.ttf"
download "NotoSans-Bold.ttf" "$BASE/NotoSans/NotoSans-Bold.ttf"
# The Noto Fonts repository static files crash fontkit while laying out some
# valid Bengali conjuncts. Keep the PDF assets aligned with Google Fonts.
download "NotoSansBengali-Regular.ttf" "https://fonts.gstatic.com/s/notosansbengali/v33/Cn-SJsCGWQxOjaGwMQ6fIiMywrNJIky6nvd8BjzVMvJx2mcSPVFpVEqE-6KmsolLudA.ttf"
download "NotoSansBengali-Bold.ttf" "https://fonts.gstatic.com/s/notosansbengali/v33/Cn-SJsCGWQxOjaGwMQ6fIiMywrNJIky6nvd8BjzVMvJx2mcSPVFpVEqE-6Kmsm5MudA.ttf"
download "NotoSansDevanagari-Regular.ttf" "$BASE/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf"

echo "PDF fonts ready in $FONT_DIR"
