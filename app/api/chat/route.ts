import Anthropic from "@anthropic-ai/sdk";
import { GUIDE_SYSTEM_PROMPT } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[]; // base64 dataURL
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "未配置 ANTHROPIC_API_KEY。请在 .env.local 或 Vercel 环境变量里设置。" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  let body: { messages: IncomingMessage[]; memories?: string[]; weekLabel?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "请求体解析失败" }), { status: 400 });
  }

  const { messages, memories = [], weekLabel = "" } = body;
  const client = new Anthropic({ apiKey });

  // 把长期记忆注入到 system（让向导"记得"过去）
  let system = GUIDE_SYSTEM_PROMPT;
  if (memories.length > 0) {
    system += `\n\n# 关于这位玩家的长期记忆（过去几周沉淀，请自然运用）\n` +
      memories.map((m) => `- ${m}`).join("\n");
  }
  if (weekLabel) {
    system += `\n\n（本次复盘的周期标签：${weekLabel}）`;
  }

  // 把投喂的图片转成 Claude 的多模态格式
  const apiMessages: Anthropic.MessageParam[] = messages.map((m) => {
    if (m.images && m.images.length > 0 && m.role === "user") {
      const content: Anthropic.ContentBlockParam[] = [];
      for (const img of m.images) {
        const match = img.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (match) {
          content.push({
            type: "image",
            source: { type: "base64", media_type: match[1] as "image/png", data: match[2] },
          });
        }
      }
      if (m.content.trim()) content.push({ type: "text", text: m.content });
      return { role: "user", content };
    }
    return { role: m.role, content: m.content };
  });

  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system,
      messages: apiMessages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          stream.on("text", (delta) => {
            controller.enqueue(encoder.encode(delta));
          });
          await stream.finalMessage();
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(`\n\n[出错了：${err instanceof Error ? err.message : "未知错误"}]`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "调用 AI 失败" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
