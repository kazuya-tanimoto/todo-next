#!/bin/bash
# default-deny firewall（公式雛形 anthropics/claude-code ベース、2026-07-17 取得）。
# repo 向け差分:
#   - repo 固有の許可先は allowed-domains.conf に分離（テンプレ本体は編集不要にする）
#   - VS Code 系ドメインを削除（ターミナル完結フローのため）
#   - SSH(22) の全開放を削除（push は HTTPS + fine-grained PAT のみ。SSH 鍵は持ち込まない）
#   - ipset add は -exist 付き（GitHub レンジと個別 IP の重複を許容）
set -euo pipefail  # Exit on error, undefined vars, and pipeline failures
IFS=$'\n\t'       # Stricter word splitting

ALLOWED_CONF="/workspace/.devcontainer/allowed-domains.conf"

# 1. Extract Docker DNS info BEFORE any flushing
DOCKER_DNS_RULES=$(iptables-save -t nat | grep "127\.0\.0\.11" || true)

# Flush existing rules and delete existing ipsets
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X
ipset destroy allowed-domains 2>/dev/null || true

# IPv6 は lo 以外すべて遮断（許可リストは IPv4 で運用。OrbStack 等はコンテナに IPv6 を
# 配ることがあり、塞がないと IPv4 の allowlist を素通りできる）
if command -v ip6tables >/dev/null 2>&1; then
    ip6tables -F 2>/dev/null || true
    ip6tables -X 2>/dev/null || true
    ip6tables -P INPUT DROP 2>/dev/null || true
    ip6tables -P FORWARD DROP 2>/dev/null || true
    ip6tables -P OUTPUT DROP 2>/dev/null || true
    ip6tables -A INPUT -i lo -j ACCEPT 2>/dev/null || true
    ip6tables -A OUTPUT -o lo -j ACCEPT 2>/dev/null || true
fi

# 2. Selectively restore ONLY internal Docker DNS resolution
if [ -n "$DOCKER_DNS_RULES" ]; then
    echo "Restoring Docker DNS rules..."
    iptables -t nat -N DOCKER_OUTPUT 2>/dev/null || true
    iptables -t nat -N DOCKER_POSTROUTING 2>/dev/null || true
    echo "$DOCKER_DNS_RULES" | xargs -L 1 iptables -t nat
else
    echo "No Docker DNS rules to restore"
fi

# First allow DNS and localhost before any restrictions
# Allow outbound DNS
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
# Allow inbound DNS responses
iptables -A INPUT -p udp --sport 53 -j ACCEPT
# Allow localhost
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Create ipset with CIDR support
ipset create allowed-domains hash:net

add_cidr() {
    local cidr="$1" label="$2"
    if [[ ! "$cidr" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
        echo "ERROR: Invalid CIDR range from $label: $cidr"
        exit 1
    fi
    echo "Adding $cidr ($label)"
    ipset add -exist allowed-domains "$cidr"
}

# usage: add_domain <domain> [required]
# required 指定時のみ解決失敗で起動失敗。それ以外は警告して続行
# （default-deny のため、許可されないだけで安全側に倒れる）
add_domain() {
    local domain="$1" required="${2:-}"
    echo "Resolving $domain..."
    local ips
    ips=$(dig +noall +answer A "$domain" | awk '$4 == "A" {print $5}')
    if [ -z "$ips" ]; then
        if [ "$required" = "required" ]; then
            echo "ERROR: Failed to resolve $domain (required)"
            exit 1
        fi
        echo "WARN: Failed to resolve $domain - skipping (this destination stays blocked)"
        return 0
    fi
    local ip
    while read -r ip; do
        if [[ ! "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            echo "ERROR: Invalid IP from DNS for $domain: $ip"
            exit 1
        fi
        echo "Adding $ip for $domain"
        ipset add -exist allowed-domains "$ip"
    done < <(echo "$ips")
}

add_cidr_url() {
    local url="$1"
    echo "Fetching CIDR list from $url..."
    local ranges
    ranges=$(curl -sf "$url" || true)
    if [ -z "$ranges" ]; then
        echo "WARN: Failed to fetch CIDR list from $url - skipping (these ranges stay blocked)"
        return 0
    fi
    local cidr
    while read -r cidr; do
        [ -z "$cidr" ] && continue
        if [[ ! "$cidr" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
            echo "WARN: Invalid CIDR from $url: $cidr - skipping line"
            continue
        fi
        add_cidr "$cidr" "$url"
    done < <(echo "$ranges")
}

# Fetch GitHub meta information and aggregate + add their IP ranges
echo "Fetching GitHub IP ranges..."
gh_ranges=$(curl -s https://api.github.com/meta)
if [ -z "$gh_ranges" ]; then
    echo "ERROR: Failed to fetch GitHub IP ranges"
    exit 1
fi

if ! echo "$gh_ranges" | jq -e '.web and .api and .git' >/dev/null; then
    echo "ERROR: GitHub API response missing required fields"
    exit 1
fi

echo "Processing GitHub IPs..."
while read -r cidr; do
    add_cidr "$cidr" "GitHub meta"
done < <(echo "$gh_ranges" | jq -r '(.web + .api + .git)[]' | aggregate -q)

# Base allowed domains (Claude Code 本体が必要とする通信先)
# 必須: これが引けないと Claude Code / npm が動かないため起動失敗にする
for domain in \
    "registry.npmjs.org" \
    "api.anthropic.com"; do
    add_domain "$domain" required
done
# 任意（テレメトリ・エラー報告）: 解決失敗は警告のみ
# ※公式雛形にあった statsig.anthropic.com は NXDOMAIN（2026-07-18 実測）のため削除
for domain in \
    "sentry.io" \
    "statsig.com"; do
    add_domain "$domain"
done

# Repo-specific allowed domains (allowed-domains.conf)
#   書式: 1 行 1 ドメイン。`cidr-url <URL>` 行は CIDR リスト（1 行 1 CIDR の
#   プレーンテキスト）を取得してレンジごと追加。`#` 以降はコメント。
if [ -f "$ALLOWED_CONF" ]; then
    echo "Processing $ALLOWED_CONF..."
    while read -r line; do
        line="${line%%#*}"
        line="$(echo "$line" | xargs || true)"
        [ -z "$line" ] && continue
        if [[ "$line" == cidr-url\ * ]]; then
            add_cidr_url "${line#cidr-url }"
        else
            add_domain "$line"
        fi
    done < "$ALLOWED_CONF"
else
    echo "No $ALLOWED_CONF found, skipping repo-specific domains"
fi

# Get host IP from default route
HOST_IP=$(ip route | grep default | cut -d" " -f3)
if [ -z "$HOST_IP" ]; then
    echo "ERROR: Failed to detect host IP"
    exit 1
fi

HOST_NETWORK=$(echo "$HOST_IP" | sed "s/\.[0-9]*$/.0\/24/")
echo "Host network detected as: $HOST_NETWORK"

# Set up remaining iptables rules
iptables -A INPUT -s "$HOST_NETWORK" -j ACCEPT
iptables -A OUTPUT -d "$HOST_NETWORK" -j ACCEPT

# Set default policies to DROP first
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# First allow established connections for already approved traffic
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Then allow only specific outbound traffic to allowed domains
iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT

# Explicitly REJECT all other outbound traffic for immediate feedback
iptables -A OUTPUT -j REJECT --reject-with icmp-admin-prohibited

echo "Firewall configuration complete"
echo "Verifying firewall rules..."
if curl --connect-timeout 5 https://example.com >/dev/null 2>&1; then
    echo "ERROR: Firewall verification failed - was able to reach https://example.com"
    exit 1
else
    echo "Firewall verification passed - unable to reach https://example.com as expected"
fi

# Verify GitHub API access
if ! curl --connect-timeout 5 https://api.github.com/zen >/dev/null 2>&1; then
    echo "ERROR: Firewall verification failed - unable to reach https://api.github.com"
    exit 1
else
    echo "Firewall verification passed - able to reach https://api.github.com as expected"
fi
