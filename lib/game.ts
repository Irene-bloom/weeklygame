// 周目 · 核心数据模型与游戏逻辑
// 所有状态本地存储（localStorage），无需后端数据库即可跑通 Demo。

export type AttrKey = "body" | "mind" | "career" | "relation" | "wealth";

export const ATTR_META: Record<
  AttrKey,
  { label: string; emoji: string; color: string; desc: string }
> = {
  body: { label: "体魄", emoji: "💪", color: "#34d399", desc: "运动、睡眠、饮食、精力" },
  mind: { label: "心智", emoji: "🧠", color: "#a78bfa", desc: "情绪、学习、内省、专注" },
  career: { label: "事业", emoji: "💼", color: "#60a5fa", desc: "工作产出、技能、项目进展" },
  relation: { label: "关系", emoji: "❤️", color: "#f472b6", desc: "家人、朋友、伴侣、社交" },
  wealth: { label: "财务", emoji: "💰", color: "#fbbf24", desc: "收入、储蓄、消费、理财" },
};

export const ATTR_KEYS: AttrKey[] = ["body", "mind", "career", "relation", "wealth"];

// 一条复盘记录
export interface ReviewEntry {
  id: string;
  weekLabel: string; // 如 "2026-W23"
  createdAt: number;
  messages: ChatMessage[]; // 本次复盘的完整对话
  highlights: string[]; // 高光卡
  lessons: string[]; // 教训卡
  attrDelta: Partial<Record<AttrKey, number>>; // 本周各属性获得的经验
  summary: string; // AI 给本周的一句话总结
  memories: string[]; // 提炼出、要长期沉淀的"记忆线索"
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[]; // base64 dataURL
}

// 角色整体状态
export interface CharacterState {
  name: string; // 玩家给自己起的名字
  attrs: Record<AttrKey, number>; // 累计经验值
  streak: number; // 连续复盘周数
  longestStreak: number;
  lastReviewWeek: string | null;
  totalReviews: number;
  badges: string[]; // 已解锁徽章 id
  makeupCards: number; // 补签卡数量
  reviews: ReviewEntry[]; // 所有历史复盘
  memories: string[]; // 全局长期记忆池（跨周沉淀）
}

export const DEFAULT_STATE: CharacterState = {
  name: "旅行者",
  attrs: { body: 0, mind: 0, career: 0, relation: 0, wealth: 0 },
  streak: 0,
  longestStreak: 0,
  lastReviewWeek: null,
  totalReviews: 0,
  badges: [],
  makeupCards: 1,
  reviews: [],
  memories: [],
};

// ---------- 等级与经验曲线 ----------
// 每个属性独立升级。升级曲线：第 n 级需要的累计经验 = 50 * n^1.6（取整）
// 这样前期升级快（有成长感），后期变缓（不通胀）。

export function levelFromExp(exp: number): { level: number; cur: number; need: number; pct: number } {
  let level = 1;
  while (exp >= cumExpForLevel(level + 1)) {
    level++;
    if (level > 200) break;
  }
  const base = cumExpForLevel(level);
  const next = cumExpForLevel(level + 1);
  const cur = exp - base;
  const need = next - base;
  return { level, cur, need, pct: Math.min(100, Math.round((cur / need) * 100)) };
}

function cumExpForLevel(level: number): number {
  // 累计到达 level 级所需经验
  let total = 0;
  for (let n = 1; n < level; n++) {
    total += Math.round(50 * Math.pow(n, 1.6));
  }
  return total;
}

export function totalLevel(attrs: Record<AttrKey, number>): number {
  return ATTR_KEYS.reduce((sum, k) => sum + levelFromExp(attrs[k]).level, 0);
}

// ---------- 徽章定义 ----------
export interface BadgeDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  check: (s: CharacterState) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: "first_review", name: "初心", emoji: "🌱", desc: "完成第一次周复盘", check: (s) => s.totalReviews >= 1 },
  { id: "streak_4", name: "月之恒", emoji: "🌙", desc: "连续复盘 4 周", check: (s) => s.longestStreak >= 4 },
  { id: "streak_12", name: "季之守", emoji: "🍂", desc: "连续复盘 12 周", check: (s) => s.longestStreak >= 12 },
  { id: "streak_52", name: "年之轮", emoji: "🎊", desc: "连续复盘 52 周", check: (s) => s.longestStreak >= 52 },
  { id: "reviews_10", name: "积跬步", emoji: "👣", desc: "累计复盘 10 次", check: (s) => s.totalReviews >= 10 },
  { id: "body_lv5", name: "铁人", emoji: "🏋️", desc: "体魄达到 5 级", check: (s) => levelFromExp(s.attrs.body).level >= 5 },
  { id: "mind_lv5", name: "心流", emoji: "🧘", desc: "心智达到 5 级", check: (s) => levelFromExp(s.attrs.mind).level >= 5 },
  { id: "career_lv5", name: "匠人", emoji: "⚒️", desc: "事业达到 5 级", check: (s) => levelFromExp(s.attrs.career).level >= 5 },
  { id: "relation_lv5", name: "知己", emoji: "🤝", desc: "关系达到 5 级", check: (s) => levelFromExp(s.attrs.relation).level >= 5 },
  { id: "wealth_lv5", name: "丰盈", emoji: "🪙", desc: "财务达到 5 级", check: (s) => levelFromExp(s.attrs.wealth).level >= 5 },
  { id: "highlights_20", name: "拾光者", emoji: "✨", desc: "累计收集 20 张高光卡", check: (s) => s.reviews.reduce((n, r) => n + r.highlights.length, 0) >= 20 },
  { id: "lessons_10", name: "前事师", emoji: "📜", desc: "累计记录 10 张教训卡", check: (s) => s.reviews.reduce((n, r) => n + r.lessons.length, 0) >= 10 },
  { id: "balanced", name: "六边形", emoji: "⬡", desc: "五维属性全部达到 3 级", check: (s) => ATTR_KEYS.every((k) => levelFromExp(s.attrs[k]).level >= 3) },
  { id: "comeback", name: "浴火", emoji: "🔥", desc: "断签后用补签卡续上", check: () => false /* 由流程单独触发 */ },
  { id: "memory_30", name: "记忆宫殿", emoji: "🏛️", desc: "长期记忆池积累 30 条线索", check: (s) => s.memories.length >= 30 },
];

// ---------- ISO 周计算 ----------
export function isoWeekLabel(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// 判断两个周标签是否相邻（用于 streak）
export function isConsecutiveWeek(prev: string | null, cur: string): boolean {
  if (!prev) return false;
  const p = parseWeek(prev);
  const c = parseWeek(cur);
  if (!p || !c) return false;
  // 同年相邻
  if (p.year === c.year && c.week - p.week === 1) return true;
  // 跨年：上一年最后一周 -> 新年第一周
  if (c.year - p.year === 1 && c.week === 1 && p.week >= 52) return true;
  return false;
}

function parseWeek(label: string): { year: number; week: number } | null {
  const m = label.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return null;
  return { year: parseInt(m[1]), week: parseInt(m[2]) };
}

// ---------- 持久化 ----------
const STORAGE_KEY = "zhoumu_state_v1";

export function loadState(): CharacterState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed, attrs: { ...DEFAULT_STATE.attrs, ...parsed.attrs } };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(s: CharacterState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// 应用一次复盘结算，返回新状态 + 新解锁的徽章
export function applyReview(
  state: CharacterState,
  entry: ReviewEntry
): { next: CharacterState; newBadges: BadgeDef[] } {
  const next: CharacterState = JSON.parse(JSON.stringify(state));

  // 累加经验
  for (const k of ATTR_KEYS) {
    next.attrs[k] += entry.attrDelta[k] ?? 0;
  }

  // streak 计算
  const consecutive = isConsecutiveWeek(next.lastReviewWeek, entry.weekLabel);
  if (next.lastReviewWeek === entry.weekLabel) {
    // 同周重复复盘，不重复加 streak
  } else if (consecutive || next.lastReviewWeek === null) {
    next.streak = (next.lastReviewWeek === null ? 0 : next.streak) + 1;
  } else {
    next.streak = 1; // 断签，重置
  }
  next.longestStreak = Math.max(next.longestStreak, next.streak);
  next.lastReviewWeek = entry.weekLabel;
  next.totalReviews += 1;

  // 每复盘 4 周送一张补签卡
  if (next.totalReviews % 4 === 0) next.makeupCards += 1;

  // 沉淀记忆
  next.memories = [...next.memories, ...entry.memories].slice(-100);

  // 保存记录
  next.reviews = [entry, ...next.reviews];

  // 检查徽章
  const newBadges: BadgeDef[] = [];
  for (const b of BADGES) {
    if (!next.badges.includes(b.id) && b.check(next)) {
      next.badges.push(b.id);
      newBadges.push(b);
    }
  }

  return { next, newBadges };
}
