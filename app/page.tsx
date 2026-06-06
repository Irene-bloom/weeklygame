"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyReview,
  DEFAULT_STATE,
  isoWeekLabel,
  loadState,
  saveState,
  type BadgeDef,
  type ChatMessage,
  type CharacterState,
  type ReviewEntry,
} from "@/lib/game";
import { CharacterPanel } from "@/components/CharacterPanel";

type Phase = "idle" | "chatting" | "settling" | "settled";

export default function Home() {
  const [state, setState] = useState<CharacterState>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [settleResult, setSettleResult] = useState<{
    summary: string;
    highlights: string[];
    lessons: string[];
    attrDelta: Record<string, number>;
    memories: string[];
  } | null>(null);
  const [newBadges, setNewBadges] = useState<BadgeDef[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 载入本地状态
  useEffect(() => {
    setState(loadState());
    setMounted(true);
  }, []);

  // 自动滚到底
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const weekLabel = isoWeekLabel(new Date());

  // 开始本周复盘：发一条开场，让 AI 先开口
  async function startReview() {
    setPhase("chatting");
    setMessages([]);
    setSettleResult(null);
    setNewBadges([]);
    // 用一条系统式的引导触发 AI 开场
    await sendToAI([
      {
        role: "user",
        content:
          "（系统：玩家坐到了存档点，开始本周复盘。请用一句温暖的话开场，并问出第一个问题，引导我回顾这一周。）",
      },
    ]);
  }

  // 调用 AI 对话（流式）
  async function sendToAI(history: ChatMessage[]) {
    setStreaming(true);
    setMessages([...history, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history, memories: state.memories, weekLabel }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "请求失败" }));
        setMessages([...history, { role: "assistant", content: `⚠️ ${err.error || "AI 调用失败"}` }]);
        setStreaming(false);
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: acc }]);
      }
    } catch (e) {
      setMessages([
        ...history,
        { role: "assistant", content: `⚠️ 网络错误：${e instanceof Error ? e.message : "未知"}` },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  // 玩家发言
  async function handleSend() {
    if ((!input.trim() && pendingImages.length === 0) || streaming) return;
    const userMsg: ChatMessage = {
      role: "user",
      content: input.trim(),
      images: pendingImages.length > 0 ? pendingImages : undefined,
    };
    const newHistory = [...messages.filter((m) => m.content !== ""), userMsg];
    setInput("");
    setPendingImages([]);
    await sendToAI(newHistory);
  }

  // 处理图片上传 → base64
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPendingImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  // 语音输入（Web Speech API）
  const [listening, setListening] = useState(false);
  function startVoice() {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("你的浏览器不支持语音输入，建议用 Chrome。");
      return;
    }
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.interimResults = false;
    rec.onresult = (ev: any) => {
      const text = ev.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + text : text));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  }

  // 结束复盘 → 结算
  async function settle() {
    const convo = messages.filter((m) => m.content !== "" && !m.content.startsWith("（系统"));
    if (convo.length < 2) {
      alert("再多聊几句，让向导更了解你这一周，才好结算哦~");
      return;
    }
    setPhase("settling");
    try {
      const res = await fetch("/api/settle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: convo }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "结算失败" }));
        alert(`结算失败：${err.error}`);
        setPhase("chatting");
        return;
      }
      const result = await res.json();
      setSettleResult(result);

      // 落库
      const entry: ReviewEntry = {
        id: `${weekLabel}-${Date.now()}`,
        weekLabel,
        createdAt: Date.now(),
        messages: convo,
        highlights: result.highlights || [],
        lessons: result.lessons || [],
        attrDelta: result.attrDelta || {},
        summary: result.summary || "",
        memories: result.memories || [],
      };
      const { next, newBadges: gained } = applyReview(state, entry);
      setState(next);
      saveState(next);
      setNewBadges(gained);
      setPhase("settled");
    } catch (e) {
      alert(`结算出错：${e instanceof Error ? e.message : "未知"}`);
      setPhase("chatting");
    }
  }

  function resetToIdle() {
    setPhase("idle");
    setMessages([]);
    setSettleResult(null);
    setNewBadges([]);
  }

  if (!mounted) {
    return <div className="flex min-h-screen items-center justify-center text-muted">载入中…</div>;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {/* 顶部标题 */}
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            周目 <span className="text-sm font-normal text-muted">· 人生周复盘</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            每一周，都是人生的一个周目 · 本周 {weekLabel}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* 左：角色面板（进度 Progress） */}
        <aside className="rounded-3xl bg-panel/40 p-4">
          <CharacterPanel state={state} />
        </aside>

        {/* 中：存档点对话区 + 资料投喂 */}
        <section className="flex flex-col rounded-3xl bg-panel/40 p-4" style={{ minHeight: "70vh" }}>
          {phase === "idle" && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-4 text-6xl">🛟</div>
              <h2 className="mb-2 text-xl font-bold">存档点 · Savepoint</h2>
              <p className="mb-6 max-w-md text-sm text-muted">
                坐到存档点，和你的 AI 向导聊聊这一周。<br />
                可以把成功日记、和朋友的聊天、周末的照片喂给它，<br />
                它会陪你复盘，并把这一周沉淀成你的成长。
              </p>
              <button
                onClick={startReview}
                className="rounded-full bg-gradient-to-r from-accent to-accent2 px-8 py-3 font-bold text-ink transition hover:opacity-90"
              >
                开始本周复盘
              </button>
            </div>
          )}

          {(phase === "chatting" || phase === "settling") && (
            <>
              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
                {messages
                  .filter((m) => !m.content.startsWith("（系统") || m.role === "assistant")
                  .map((m, i) => (
                    <MessageBubble key={i} msg={m} />
                  ))}
                {streaming && messages[messages.length - 1]?.content === "" && (
                  <div className="text-sm text-muted">向导正在思考…</div>
                )}
              </div>

              {/* 待发送的图片预览 */}
              {pendingImages.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {pendingImages.map((img, i) => (
                    <div key={i} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="h-16 w-16 rounded-lg object-cover" />
                      <button
                        onClick={() => setPendingImages((p) => p.filter((_, idx) => idx !== i))}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 输入区 */}
              <div className="mt-3 rounded-2xl bg-ink/60 p-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
                  }}
                  placeholder="写下这一周……（Ctrl/⌘ + Enter 发送）"
                  rows={2}
                  className="w-full resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted"
                  disabled={phase === "settling"}
                />
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-muted">
                    <label className="cursor-pointer rounded-lg px-2 py-1 text-sm hover:bg-panel/60" title="上传图片">
                      📷
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    </label>
                    <button
                      onClick={startVoice}
                      className={`rounded-lg px-2 py-1 text-sm hover:bg-panel/60 ${listening ? "text-accent2" : ""}`}
                      title="语音输入"
                    >
                      {listening ? "🔴 听着呢…" : "🎤"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={settle}
                      disabled={phase === "settling" || streaming}
                      className="rounded-full bg-gold/20 px-4 py-1.5 text-sm text-gold ring-1 ring-gold/40 transition hover:bg-gold/30 disabled:opacity-40"
                    >
                      {phase === "settling" ? "结算中…" : "结束并结算 💎"}
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={streaming || phase === "settling"}
                      className="rounded-full bg-accent px-5 py-1.5 text-sm font-bold text-ink transition hover:opacity-90 disabled:opacity-40"
                    >
                      发送
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {phase === "settled" && settleResult && (
            <SettleResult
              result={settleResult}
              newBadges={newBadges}
              onDone={resetToIdle}
            />
          )}
        </section>
      </div>

      <footer className="mt-8 text-center text-xs text-muted">
        周目 · 数据只存在你自己的浏览器里 · {weekLabel}
      </footer>
    </main>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? "bg-accent/20" : "bg-panel/80"
        }`}
      >
        {!isUser && <div className="mb-1 text-xs text-accent2">向导</div>}
        {msg.images && msg.images.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {msg.images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={img} alt="" className="h-24 w-24 rounded-lg object-cover" />
            ))}
          </div>
        )}
        <div className="whitespace-pre-wrap">{msg.content}</div>
      </div>
    </div>
  );
}

function SettleResult({
  result,
  newBadges,
  onDone,
}: {
  result: {
    summary: string;
    highlights: string[];
    lessons: string[];
    attrDelta: Record<string, number>;
    memories: string[];
  };
  newBadges: BadgeDef[];
  onDone: () => void;
}) {
  const attrLabels: Record<string, string> = {
    body: "💪 体魄",
    mind: "🧠 心智",
    career: "💼 事业",
    relation: "❤️ 关系",
    wealth: "💰 财务",
  };
  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto py-4 text-center">
      <div className="mb-2 text-5xl animate-pop">💎</div>
      <h2 className="mb-1 text-xl font-bold">本周结算</h2>
      <p className="mb-6 max-w-md text-sm text-accent2">"{result.summary}"</p>

      {/* 经验掉落 */}
      <div className="mb-6 w-full max-w-md">
        <div className="mb-2 text-xs text-muted">属性成长</div>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(result.attrDelta).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-panel/60 px-1 py-2">
              <div className="text-[11px]">{attrLabels[k]}</div>
              <div className={`text-sm font-bold ${v > 0 ? "text-accent" : "text-muted"}`}>
                {v > 0 ? `+${v}` : "0"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 高光卡 */}
      {result.highlights.length > 0 && (
        <div className="mb-4 w-full max-w-md text-left">
          <div className="mb-2 text-xs text-muted">✨ 高光卡</div>
          <div className="space-y-2">
            {result.highlights.map((h, i) => (
              <div key={i} className="rounded-xl bg-gold/10 px-3 py-2 text-sm ring-1 ring-gold/30">
                {h}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 教训卡 */}
      {result.lessons.length > 0 && (
        <div className="mb-4 w-full max-w-md text-left">
          <div className="mb-2 text-xs text-muted">📜 教训卡</div>
          <div className="space-y-2">
            {result.lessons.map((l, i) => (
              <div key={i} className="rounded-xl bg-accent/10 px-3 py-2 text-sm ring-1 ring-accent/30">
                {l}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 新徽章 */}
      {newBadges.length > 0 && (
        <div className="mb-4 w-full max-w-md">
          <div className="mb-2 text-xs text-muted">🏅 解锁新徽章</div>
          <div className="flex flex-wrap justify-center gap-3">
            {newBadges.map((b) => (
              <div key={b.id} className="flex flex-col items-center animate-pop">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gold/20 text-2xl ring-1 ring-gold/50">
                  {b.emoji}
                </div>
                <div className="mt-1 text-xs">{b.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onDone}
        className="mt-4 rounded-full bg-gradient-to-r from-accent to-accent2 px-8 py-2.5 font-bold text-ink transition hover:opacity-90"
      >
        完成 · 回到存档点
      </button>
    </div>
  );
}