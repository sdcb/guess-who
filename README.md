# 猜猜我是谁

两人联机的推理小游戏：<https://guess.sdcb.ai>

各自抽一张身份牌，轮流提问（打字、语音或常用问题），把不符合的卡片倒下，先猜中对方身份的人获胜。每人有 2 张拒绝卡，可以拒绝回答对方的问题；指认猜错直接判负。

## 技术栈

- 前端：Vite + React 19 + Tailwind CSS 4 + TypeScript，头像为程序化 SVG
- 后端：一个 Cloudflare Worker，静态资源 + Durable Object（每个房间一个实例，WebSocket Hibernation）
- `shared/`：前后端共用的游戏状态机（`game.ts`）、消息协议、主题数据（`themes/`，可扩展更多主题）

## 开发

```bash
npm install
npm run dev     # 前端 + Worker + Durable Object 一起跑在本地
npm test
npm run lint
npm run build
```

推送到 `main` 后由 GitHub Actions 自动部署（需要仓库 secrets `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`）。

## 防滥用

- 按 IP 限流（Workers Rate Limiting 绑定）：建房每分钟 5 次，连接/取语音每分钟 60 次
- 拒绝跨站请求（检查 `Origin`）
- 每个连接 10 秒最多 30 条消息，语音最长 15 秒、至少间隔 3 秒，单条约 300 KB 上限
- 只有一人的房间 2 小时后清理，两人房间闲置 24 小时后清理；每个房间只保留最近 40 条语音

## License

AGPL-3.0
