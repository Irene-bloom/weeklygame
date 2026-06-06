# 周目 · 人生周复盘

> 每一周，都是人生的一个**周目**。
> 把成功日记、和朋友的聊天、周末的照片喂给 AI 向导，让它陪你复盘，沉淀成你的角色成长。

「周目」是一个**游戏化的周复盘 / 周总结工具**。它把复盘做成一个人生 RPG 的"结算"：

```
每周 = 打一个副本
  → 坐到「存档点 Savepoint」开始复盘
  → AI 向导陪你追问、梳理这一周
  → 结算掉落「战利品 Loot」：高光卡 / 教训卡 / 经验值
  → 推进你的「进度 Progress」：五维成长 + 季度 Boss 血条
```

## 三大模块

| 模块 | 作用 |
|------|------|
| 🛟 **存档点 Savepoint** | 每次复盘的入口与对话场景 |
| 💎 **战利品 Loot** | 复盘掉落的高光卡、教训卡、经验值 |
| 📊 **进度 Progress** | 五维属性（体魄/心智/事业/关系/财务）雷达图 + Streak 连续周数 + 季度 Boss 血条 |

## 设计原则

用游戏化降低"开始写、坚持写"的门槛，但**经验只奖励"诚实完成反思"这个行为本身**——不按字数、不按自评高低打分，避免为了升级而注水复盘。复盘的价值来自真实和深度。

## 技术栈

- **Next.js 15**（App Router）+ TypeScript + Tailwind CSS
- **Anthropic Claude API**（AI 向导对话与结算）
- 本地存储（localStorage）保存角色状态与复盘记录
- 部署：GitHub → Vercel

## 本地运行

```bash
npm install
cp .env.example .env.local   # 填入你的 ANTHROPIC_API_KEY
npm run dev
```

打开 http://localhost:3000

## 开发日志

见 [DEVLOG.md](./DEVLOG.md)，记录每一次改动的"改了什么 / 为什么 / 结论"。
