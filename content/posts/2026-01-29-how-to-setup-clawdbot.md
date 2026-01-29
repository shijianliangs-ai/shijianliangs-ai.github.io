---
title: "从 0 搭建 Clawdbot（Gateway + WebChat + Telegram/WhatsApp）"
date: "2026-01-29"
category: "AI测试"
readTime: "8分钟阅读"
slug: "how-to-setup-clawdbot"
description: "手把手搭建 Clawdbot / Moltbot：安装、启动 Gateway、打开 Dashboard、用 WebChat 验证、接入 Telegram/WhatsApp，并附常见问题排查与安全建议。"
heroStyle: "clawdbot-hero"
---

## 1. Clawdbot 是什么？

你可以把 Clawdbot 理解成“AI 助手的中控台（Gateway）”。Gateway 是一个常驻进程：它负责连接消息渠道（WebChat/Telegram/WhatsApp/Discord/iMessage 等），把消息转发给 AI Agent，再把 Agent 的回复发回去。

## 2. 前置条件

- **Node.js 22+**
- 一台电脑或服务器（macOS / Linux / Windows 推荐用 WSL2）
- （可选）Telegram 机器人 Token，或 WhatsApp 手机用于扫码

## 3. 安装（推荐：npm 全局安装）

```bash
npm install -g moltbot@latest
# 或
pnpm add -g moltbot@latest

moltbot --version
```

说明：近期官方文档中项目名多以 **Moltbot** 命令体现，但它就是 Clawdbot 生态的一部分。本文沿用文档现状，以 `moltbot` 命令为准。

## 4. 初始化（onboard）并安装后台服务

```bash
moltbot onboard --install-daemon
```

## 5. 启动 Gateway & 打开 Dashboard

默认 Dashboard 地址（本机）：

- `http://127.0.0.1:18789/`
- `http://localhost:18789/`

手动启动（用于调试/未装 daemon）：

```bash
moltbot gateway --port 18789
```

## 6. 先用 WebChat 验证“能对话”

打开 Dashboard → 进入会话（Session）→ 发一句“hello”验证链路。

## 7. 接入 Telegram（推荐当作第一条真实渠道）

### 7.1 创建 Bot

1. Telegram 搜索 **@BotFather**
2. 发送 `/newbot` 创建机器人
3. 拿到 Bot Token

### 7.2 写入配置并重启

配置文件默认在：`~/.clawdbot/moltbot.json`。示例：

```json
{
  "channels": {
    "telegram": {
      "token": "YOUR_BOT_TOKEN"
    }
  }
}
```

### 7.3 建议加白名单/提及触发

- allowFrom：只允许你的账号
- requireMention：群里只有 @ 机器人时才触发

## 8. 接入 WhatsApp（可选：需要扫码登录）

```bash
moltbot channels login
```

## 9. 常见问题排查

- Dashboard 打不开：检查 gateway 是否运行、端口是否占用
- 不回消息：先用 WebChat 验证、查看 gateway 日志
- 群聊太吵：启用仅提及触发、allowlist

## 参考链接

- Clawdbot / Moltbot 文档：<https://docs.clawd.bot>
- moltbot GitHub：<https://github.com/moltbot/moltbot>
