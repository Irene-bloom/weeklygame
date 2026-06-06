"use client";

import { BADGES, type CharacterState, ATTR_KEYS, levelFromExp } from "@/lib/game";
import { RadarChart } from "./RadarChart";

export function CharacterPanel({ state }: { state: CharacterState }) {
  const playerLevel = ATTR_KEYS.reduce((sum, k) => sum + levelFromExp(state.attrs[k]).level, 0);
  const totalHighlights = state.reviews.reduce((n, r) => n + r.highlights.length, 0);

  // 季度 Boss：13 周一个赛季，血条按累计经验推进（演示用简化模型）
  const totalExp = ATTR_KEYS.reduce((s, k) => s + state.attrs[k], 0);
  const bossMax = 1300;
  const bossDealt = Math.min(bossMax, 130 + (totalExp % bossMax)); // 禀赋进度：开局已削 10%
  const bossPct = Math.round((bossDealt / bossMax) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* 角色名 + 等级 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted">周目旅行者</div>
          <div className="text-xl font-bold">{state.name}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">周目等级</div>
          <div className="text-2xl font-bold text-accent">Lv.{playerLevel}</div>
        </div>
      </div>

      {/* 雷达图 */}
      <div className="flex justify-center rounded-2xl bg-panel/60 p-2 card-glow">
        <RadarChart attrs={state.attrs} />
      </div>

      {/* Streak + 统计 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="连续周数" value={`🔥 ${state.streak}`} />
        <Stat label="累计复盘" value={`${state.totalReviews}`} />
        <Stat label="补签卡" value={`🎟️ ${state.makeupCards}`} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="最长连续" value={`${state.longestStreak}`} />
        <Stat label="高光卡" value={`✨ ${totalHighlights}`} />
        <Stat label="记忆线索" value={`🧠 ${state.memories.length}`} />
      </div>

      {/* 季度 Boss 血条 */}
      <div className="rounded-2xl bg-panel/60 p-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted">本季 Boss · 拖延巨兽</span>
          <span className="text-accent2">{bossPct}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-ink">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent2 transition-all"
            style={{ width: `${bossPct}%` }}
          />
        </div>
        <div className="mt-1 text-[11px] text-muted">每完成一次诚实复盘，对 Boss 造成伤害</div>
      </div>

      {/* 徽章墙 */}
      <div>
        <div className="mb-2 text-xs text-muted">徽章墙（{state.badges.length}/{BADGES.length}）</div>
        <div className="grid grid-cols-5 gap-2">
          {BADGES.map((b) => {
            const got = state.badges.includes(b.id);
            return (
              <div
                key={b.id}
                title={`${b.name} · ${b.desc}`}
                className={`flex aspect-square items-center justify-center rounded-xl text-xl transition ${
                  got ? "bg-gold/20 ring-1 ring-gold/50" : "bg-panel/40 opacity-30 grayscale"
                }`}
              >
                {b.emoji}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-panel/60 px-2 py-2">
      <div className="text-base font-bold">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
