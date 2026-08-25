#!/bin/sh
# devcontainer 内の Claude Code の状態を、母艦の herdr へ渡すための書き出し役。
#
# コンテナからは母艦の herdr ソケットに触らない（触れると pane.split 等で母艦に
# コマンドを流せてしまい、隔離の意味が消える）。ここでは共有済みの作業ディレクトリに
# 状態を1語書くだけで、herdr への報告は母艦側の見張り（~/dotfiles/bin/herdr-ccd-bridge）が行う。
#
# 使い方（claude-settings.json の hooks から呼ばれる）:
#   agent-state.sh working|idle|blocked|clear
#
# 必要な環境変数が無ければ何もせず終わる。母艦のセッションでも、herdr の外で
# コンテナを起動したときも、この時点で黙って抜ける。
set -eu

state="${1:-}"
case "$state" in
working | idle | blocked | clear) ;;
*) exit 0 ;;
esac

# 母艦では動かさない（コンテナ内だけ）
[ -f /.dockerenv ] || exit 0
# 報告先のペインは ccd が --remote-env で渡す
[ -n "${HERDR_PANE_ID:-}" ] || exit 0
[ -n "${CLAUDE_PROJECT_DIR:-}" ] || exit 0

# hook 入力は捨ててよいが、読まないと書き手が SIGPIPE を踏む可能性がある。
# あわせて subagent 由来のイベント（agent_id を持つ）は無視する。本体がまだ動いて
# いるのに subagent の停止で idle にすると、herdr 公式の連携と同じ罠を踏む。
input="$(cat 2>/dev/null)" || input=""
case "$input" in
*'"agent_id"'*) exit 0 ;;
esac

# Notification は承認待ちだけでなく「入力待ちのまま一定時間たった」ときにも飛ぶ
# （notification_type が idle_prompt）。これで blocked にすると、返事を待っている
# だけの idle が承認待ちに化けるので、種類を見て捨てる。
if [ "$state" = blocked ]; then
  case "$input" in
  *'"notification_type":"idle_prompt"'* | *'"notification_type": "idle_prompt"'*) exit 0 ;;
  esac
fi

dir="$CLAUDE_PROJECT_DIR/.herdr-state"
file="$dir/$(printf '%s' "$HERDR_PANE_ID" | tr ':' '-').state"

if [ "$state" = clear ]; then
  rm -f "$file" 2>/dev/null || true
  exit 0
fi

mkdir -p "$dir" 2>/dev/null || exit 0
tmp="$file.tmp.$$"
if printf '%s\n' "$state" >"$tmp" 2>/dev/null; then
  mv -f "$tmp" "$file" 2>/dev/null || rm -f "$tmp" 2>/dev/null || true
fi
exit 0
