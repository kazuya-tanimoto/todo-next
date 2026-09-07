#!/bin/bash
# コンテナ内セットアップ（devcontainer.json の postCreate / postStart から呼ばれる）。
#   create: コンテナ作成時に 1 回。重い初期化（依存インストール等）。firewall 適用前に走る
#   start : 起動ごと。母艦からの同期と git 設定のみ。これも firewall 適用前に走る
#
# 母艦からの同期（グローバル CLAUDE.md・statusline・output-styles・bin・hooks・plugin・uv の依存）は
# dotfiles の中央スクリプト container-sync.sh に任せ、ここでは呼ぶだけにする。同期の内容を変えたい
# ときは dotfiles 側を直す（各 repo のこのファイルは触らない）。
set -euo pipefail

MODE="${1:?usage: setup-container.sh <create|start>}"
# 母艦 ~/dotfiles/claude の read-only mount。コピーして使う（mount 直読み・書き戻しはしない
# — docs/devcontainer-plan.md §3 の安全原則）
HOST_CLAUDE=/mnt/host-claude

sync_from_host() {
  local script="$HOST_CLAUDE/devcontainer/container-sync.sh"
  if [ -f "$script" ]; then
    bash "$script" "$MODE"
  else
    echo "WARN: $script が見えないため母艦からの同期を skip（mount を確認してください）" >&2
  fi
}

setup_git() {
  git config --global user.name "Kazuya Tanimoto"
  git config --global user.email "tanimoto@byte-lark.com"
  # 母艦側の改行変換と表示を揃える（CRLF ファイルが phantom diff にならないように）
  git config --global core.autocrlf input
  # bind mount した repo の所有権が uid 違いに見える環境向け（idempotent）
  git config --global --get-all safe.directory 2>/dev/null | grep -qx /workspace \
    || git config --global --add safe.directory /workspace
  # push 認証は fine-grained PAT。コンテナ内で一度 `gh auth login`（PAT 貼り付け）すれば
  # gh 用 volume に永続化される。credential helper の張り直しは毎起動行う
  if gh auth status >/dev/null 2>&1; then
    gh auth setup-git
  else
    echo "INFO: gh 未ログイン。push する前にコンテナ内で 'gh auth login'（PAT 貼り付け）を実行してください" >&2
  fi
}

# Playwright plugin の MCP に repo の E2E 用 chromium を使わせる（devcontainer.json の PLAYWRIGHT_MCP_* と対）。
# MCP は素のままだと Google Chrome を探して失敗する。置き場所は版で変わる（chromium-<rev>）ので、
# 固定パスの symlink を張る。chromium が無ければ何もしない
link_mcp_chromium() {
  local exe
  exe=$(find "$HOME/.cache/ms-playwright" -maxdepth 3 -type f -path '*/chromium-*' -name chrome 2>/dev/null | sort -V | tail -1)
  [ -n "$exe" ] || return 0
  mkdir -p "$HOME/.local/share/playwright-mcp"
  ln -sfn "$exe" "$HOME/.local/share/playwright-mcp/chrome"
}

case "$MODE" in
  create)
    # node_modules 用 named volume の所有権を node に揃える（初回は root 所有で作られるため）
    sudo /usr/local/bin/fix-perms.sh
    sync_from_host
    setup_git
    cd /workspace
    yarn install
    # ブラウザ本体は repo の @playwright/test と同じバージョンを取得
    # （OS 依存パッケージは Dockerfile で焼き込み済み）
    yarn playwright install chromium
    link_mcp_chromium
    ;;
  start)
    sync_from_host
    setup_git
    link_mcp_chromium
    ;;
  *)
    echo "ERROR: unknown mode: $MODE" >&2
    exit 1
    ;;
esac

echo "setup-container.sh $MODE: done"
