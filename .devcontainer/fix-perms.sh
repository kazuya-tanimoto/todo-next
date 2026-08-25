#!/bin/bash
# node_modules 用 named volume の所有権を node に揃える。
# sudoers（/etc/sudoers.d/node-firewall）で node に許可される固定スクリプトのため、
# 対象は固定パスのみ。汎用の chown をここに足さないこと。
set -euo pipefail

chown node:node /workspace/node_modules
