import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 温暖米白风
        paper: "#F4F1EA",      // 页面背景：米白
        card: "#FFFFFF",       // 卡片：纯白
        card2: "#FBF8F2",      // 次级卡片：更暖的米白
        ink: "#3a2f2a",        // 主文字：深棕
        sub: "#8a7d72",        // 次要文字：暖灰棕
        line: "#e8e0d4",       // 描边：浅米
        accent: "#a78bfa",     // 主色：薇衣紫
        accent2: "#f472b6",    // 次色：少女粉
        gold: "#f59e0b",       // 强调：阳光黄
        leaf: "#34d399",       // 体魄绿
        sky: "#60a5fa",        // 事业蓝
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      boxShadow: {
        soft: "0 2px 16px -4px rgba(120, 100, 80, 0.15)",
        card: "0 4px 24px -8px rgba(120, 100, 80, 0.18)",
      },
    },
  },
  plugins: [],
};
export default config;
