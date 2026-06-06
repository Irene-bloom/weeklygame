"use client";

import { ATTR_KEYS, ATTR_META, levelFromExp, type AttrKey } from "@/lib/game";

// 纯 SVG 五维雷达图，无需第三方库
export function RadarChart({
  attrs,
  size = 260,
}: {
  attrs: Record<AttrKey, number>;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.34;
  const n = ATTR_KEYS.length;

  // 用每个属性的等级映射到 0~1（10 级封顶到外环），保证图形随成长扩张
  const levels = ATTR_KEYS.map((k) => levelFromExp(attrs[k]).level);
  const maxLevelForScale = Math.max(5, ...levels);
  const valueOf = (lvl: number) => Math.min(1, lvl / maxLevelForScale);

  const angleAt = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const pointAt = (i: number, r: number) => {
    const a = angleAt(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };

  // 背景网格（4 圈）
  const rings = [0.25, 0.5, 0.75, 1].map((scale) => {
    const pts = ATTR_KEYS.map((_, i) => pointAt(i, radius * scale).join(",")).join(" ");
    return pts;
  });

  // 数据多边形
  const dataPts = ATTR_KEYS.map((k, i) => {
    const v = valueOf(levelFromExp(attrs[k]).level);
    return pointAt(i, radius * Math.max(0.06, v)).join(",");
  }).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* 网格 */}
      {rings.map((pts, idx) => (
        <polygon
          key={idx}
          points={pts}
          fill="none"
          stroke="#3a3354"
          strokeWidth={1}
          opacity={0.6}
        />
      ))}
      {/* 轴线 */}
      {ATTR_KEYS.map((_, i) => {
        const [x, y] = pointAt(i, radius);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#3a3354" strokeWidth={1} opacity={0.6} />;
      })}
      {/* 数据区 */}
      <polygon points={dataPts} fill="rgba(167,139,250,0.35)" stroke="#a78bfa" strokeWidth={2} />
      {/* 顶点圆点 */}
      {ATTR_KEYS.map((k, i) => {
        const v = valueOf(levelFromExp(attrs[k]).level);
        const [x, y] = pointAt(i, radius * Math.max(0.06, v));
        return <circle key={k} cx={x} cy={y} r={3} fill={ATTR_META[k].color} />;
      })}
      {/* 标签 */}
      {ATTR_KEYS.map((k, i) => {
        const [x, y] = pointAt(i, radius + 22);
        const lvl = levelFromExp(attrs[k]).level;
        return (
          <text
            key={k}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fill="#ece9f5"
          >
            {ATTR_META[k].emoji}{ATTR_META[k].label}
            <tspan fill={ATTR_META[k].color} fontSize={11}> Lv.{lvl}</tspan>
          </text>
        );
      })}
    </svg>
  );
}
