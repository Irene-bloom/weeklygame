# 周目 · 开发日志 DEVLOG

> 每完成一个有意义的步骤，就在这里记一笔：**改了什么、为什么、结论**。最新的在最上面，方便后续复盘。

---

## 2026-06-06 · #004 UI 改版：温暖米白风 + 手机自适应

**改了什么**
- 配色从深色赛博风改为**温暖米白风**：背景米白渐变、卡片纯白 + 柔和阴影、文字深棕（护眼）、保留薇衣紫/少女粉/阳光黄点缀。
  - `tailwind.config.ts`：新配色变量（paper/card/ink/sub/line/accent…）+ soft/card 阴影。
  - `app/globals.css`：背景改米白渐变、`color-scheme: light`、滚动条配色。
  - `RadarChart` / `CharacterPanel` / `page.tsx` 全部换成亮色类名。
- **响应式（手机可用）**：
  - 手机端角色面板默认折叠，顶部加「展开/收起」按钮，让对话区在小屏上当主角。
  - 字号/按钮/间距用 `sm:` 断点适配；按钮加 `active:scale-95` 触感。
  - `layout.tsx` 加 viewport 配置，手机缩放正常。

**为什么**
- 用户反馈界面太暗、想在手机上用。复盘多在周末用手机写，温暖米白风更贴内省气质、护眼，响应式让手机体验顺畅。

**结论**
- 本地编译通过、HTTP 200。下一步：用户填智谱 key 后联调 AI 对话与结算。

---

## 2026-06-06 · #003 接入智谱 GLM（Anthropic 兼容接口）

**改了什么**
- 把 `app/api/chat` 和 `app/api/settle` 改成可配置：通过环境变量 `AI_BASE_URL` + `AI_MODEL` + `ZHIPU_API_KEY`（或 `ANTHROPIC_API_KEY`）切换厂商/模型，不写死。
- 智谱用 Anthropic 兼容接口 `https://open.bigmodel.cn/api/anthropic`，默认模型 `glm-4.6`。
- `settle` 路由去掉 `output_config` 结构化输出（智谱兼容接口不支持），改为提示词要求输出 JSON + 健壮解析（去 markdown 围栏、截取首尾大括号），保证拿得到结果。
- `chat` 路由去掉 adaptive thinking（智谱不支持）。
- 更新 `.env.example`，新增 `.env.local`（base_url/model 预填，key 留占位，且 .env.local 已被 .gitignore 忽略，不会进库）。

**为什么**
- 用户用智谱的 key，而非 Anthropic 官方。智谱提供 Anthropic 兼容接口 → 只需让 SDK 指向智谱地址 + 换模型名，几乎不改业务逻辑。
- 做成环境变量可配置 → 以后换模型、换回官方、或换别的兼容厂商，改一行配置即可，不动代码。
- ⚠️ 安全：key 只存本地 `.env.local`，绝不写进任何提交的文件，避免泄露进 git 历史。

**结论**
- 代码已支持智谱。用户只需在 `.env.local` 填入（新的）智谱 key 并重启 dev server，AI 向导即可对话。
- 提醒用户：之前在对话里贴出的 key 应作废重置。

---

## 2026-06-06 · #002 首页界面 + AI 接口跑通

**改了什么**
- 写好首页 `app/page.tsx`：左侧角色面板（进度 Progress）+ 中间存档点对话区（Savepoint）+ 结算掉落（战利品 Loot）三大模块串成完整交互。
- 组件：`components/RadarChart.tsx`（纯 SVG 五维雷达图，零依赖）、`components/CharacterPanel.tsx`（雷达图 + Streak 统计 + 季度 Boss 血条 + 15 个徽章墙）。
- 两个 API 路由：
  - `app/api/chat/route.ts`：AI 向导对话，流式输出（`claude-opus-4-8` + adaptive thinking），注入长期记忆，支持图片多模态。
  - `app/api/settle/route.ts`：复盘结算，用 JSON Schema 结构化输出（summary / attrDelta / highlights / lessons / memories）。
- 资料投喂：文本输入、图片上传（转 base64）、语音输入（Web Speech API）。
- 本地 `npm install`（129 包）+ `npm run dev` 跑通，首页 HTTP 200，渲染正常。

**为什么**
- 让产品从"一堆代码"变成"打开浏览器能看能用"。先把周复盘一个闭环跑通，验证体验。
- 雷达图用纯 SVG 自己画而非引第三方图表库 → 包体更小、Vercel 部署更快、完全可控。
- 结算用结构化输出而非自己解析文本 → 保证返回的经验值/卡片一定可解析，不会因为模型多说一句话就崩。

**结论**
- 界面与 AI 接口跑通（AI 对话待用户配置 ANTHROPIC_API_KEY 后可用）。
- 下一步（用户反馈）：① 配色从深色改为「温暖米白风」；② 全面响应式，适配手机端。

---

## 2026-06-06 · #001 项目骨架 + 世界观确定

**改了什么**
- 在 `weeklygame/` 里搭起 Next.js 15（App Router）+ TypeScript + Tailwind 的项目骨架。
- 确定产品名与世界观：产品大名 **「周目」**（游戏"N 周目"之意，每周通关人生一个周目）；内部三大功能模块用三个游戏词串成一条主线：
  - 🛟 **存档点 Savepoint**：每次复盘的入口与场景（坐到存档点开始本周复盘）。
  - 💎 **战利品 Loot**：复盘结算掉落的高光卡 / 教训卡 / 经验值。
  - 📊 **进度 Progress**：五维属性雷达图 + Streak 连续周数 + 季度 Boss 血条。
- 写好核心游戏逻辑 `lib/game.ts`：五维属性（体魄/心智/事业/关系/财务）、独立升级曲线（`50 × n^1.6`，前期快后期不通胀）、Streak（带补签卡、断签不破罐破摔）、15 个徽章、ISO 周计算、localStorage 持久化、单次复盘结算函数。
- 写好 AI 向导人格与结算引擎提示词 `lib/prompts.ts`。

**为什么**
- 用户要部署到 Vercel，且 `weeklygame/` 已经连好 GitHub 远程（`Irene-bloom/weeklygame`），项目放这里推上去即可部署，省一圈配置。
- 名字"周目"显单调，但用户希望"三个词都用"——发现 Savepoint / Loot / Progress 恰好是同一套复盘循环的三个环节，于是合成统一世界观，既保留好词又不增加工作量。
- 游戏化数值的设计依据来自一份专门的研究报告（Octalysis 八大驱动力、自我决定理论、Hook 模型、Streak/经验/徽章的坑）。**核心原则：用游戏化降低"开始写、坚持写"的门槛，但经验只奖励"诚实完成反思"这个行为本身——不按字数、不按自评高低打分，避免用户为了升级而注水复盘。**

**结论**
- 骨架就位，世界观清晰。下一步：实现首页界面（角色面板 + 对话区 + 资料投喂区）与 AI 对话 API，先在本地跑通"周复盘"一个闭环。
