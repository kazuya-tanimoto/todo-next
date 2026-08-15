# 公式雛形（anthropics/claude-code .devcontainer、2026-07-17 取得）ベース。
# repo 向け差分: node:20 → node:24（CI と一致）/ corepack（yarn 4）/
# Playwright Chromium の OS 依存パッケージ焼き込み / fix-perms.sh 追加。
FROM node:24

ARG TZ
ENV TZ="$TZ"

ARG CLAUDE_CODE_VERSION=latest

# Install basic development tools and iptables/ipset
RUN apt-get update && apt-get install -y --no-install-recommends \
  less \
  git \
  procps \
  sudo \
  fzf \
  zsh \
  man-db \
  unzip \
  gnupg2 \
  gh \
  iptables \
  ipset \
  iproute2 \
  dnsutils \
  aggregate \
  jq \
  nano \
  vim \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# yarn 4 (packageManager field / .yarnrc.yml yarnPath)
RUN corepack enable

# Playwright Chromium の OS 依存パッケージのみ焼き込み（ブラウザ本体は
# postCreate で repo の @playwright/test と同じバージョンを入れる）。
# バージョンは repo の @playwright/test 解決バージョンに合わせて更新すること。
ARG PLAYWRIGHT_VERSION=1.59.1
RUN npx -y playwright@${PLAYWRIGHT_VERSION} install-deps chromium \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Ensure default node user has access to /usr/local/share
RUN mkdir -p /usr/local/share/npm-global && \
  chown -R node:node /usr/local/share

ARG USERNAME=node

# Persist bash history.
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  && mkdir /commandhistory \
  && touch /commandhistory/.bash_history \
  && chown -R $USERNAME /commandhistory

# Set `DEVCONTAINER` environment variable to help with orientation
ENV DEVCONTAINER=true

# Create workspace and config directories and set permissions
RUN mkdir -p /workspace /home/node/.claude /home/node/.config/gh /home/node/.cache && \
  chown -R node:node /workspace /home/node/.claude /home/node/.config /home/node/.cache

WORKDIR /workspace

ARG GIT_DELTA_VERSION=0.18.2
RUN ARCH=$(dpkg --print-architecture) && \
  wget "https://github.com/dandavison/delta/releases/download/${GIT_DELTA_VERSION}/git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb" && \
  sudo dpkg -i "git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb" && \
  rm "git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb"

# Set up non-root user
USER node

# Install global packages
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin

# Set the default shell to zsh rather than sh
ENV SHELL=/bin/zsh

# Set the default editor and visual
ENV EDITOR=nano
ENV VISUAL=nano

# Default powerline10k theme
ARG ZSH_IN_DOCKER_VERSION=1.2.0
RUN sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v${ZSH_IN_DOCKER_VERSION}/zsh-in-docker.sh)" -- \
  -p git \
  -p fzf \
  -a "source /usr/share/doc/fzf/examples/key-bindings.zsh" \
  -a "source /usr/share/doc/fzf/examples/completion.zsh" \
  -a "export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  -x

# Install Claude
# npm は optionalDependencies（claude 本体のネイティブバイナリ）の取得失敗を exit 0 で
# 握りつぶし、スタブが残ったままビルドが成功してしまう（2026-08-15 monotrip.jp で実測）。
# 実行して検証し、壊れたイメージをビルド時点で落とす
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} \
  && claude --version

# Copy and set up firewall / perms scripts
# （node に許す sudo はこの固定 2 スクリプトのみ。汎用 sudo は与えない）
COPY init-firewall.sh fix-perms.sh /usr/local/bin/
USER root
RUN chmod +x /usr/local/bin/init-firewall.sh /usr/local/bin/fix-perms.sh && \
  echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh, /usr/local/bin/fix-perms.sh" > /etc/sudoers.d/node-firewall && \
  chmod 0440 /etc/sudoers.d/node-firewall
USER node
