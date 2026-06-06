import Anthropic from "@anthropic-ai/sdk";
import { SETTLE_SYSTEM_PROMPT } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ZHIPU_API_KEY;
  const baseURL = process.env.AI_BASE_URL || undefined;
  const model = process.env.AI_MODEL || "claude-opus-4-8";
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "未配置 API key（ZHIPU_API_KEY 或 ANTHROPIC_API_KEY）" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  let body: { messages: IncomingMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "请求体解析失败" }), { status: 400 });
  }

  const transcript = body.messages
    .map((m) => `${m.role === "user" ? "玩家" : "向导"}：${m.content}`)
    .join("\n");

  const client = new Anthropic({ apiKey, baseURL });

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: SETTLE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `这是玩家本周复盘的完整对话，请结算。只输出 JSON，不要任何额外文字、不要 markdown 代码块：\n\n${transcript}`,
        },
      ],
    });

    // 提取文本并解析（兼容模型可能包裹 ```json 代码块或多余文字）
    const textBlock = response.content.find((b) => b.type === "text");
    let raw = textBlock && textBlock.type === "text" ? textBlock.text : "{}";
    // 去掉 markdown 代码块围栏
    raw = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    // 截取第一个 { 到最后一个 } 之间的内容，丢弃前后可能的废话
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      raw = raw.slice(firstBrace, lastBrace + 1);
    }
    const parsed = JSON.parse(raw);

    return new Response(JSON.stringify(parsed), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "结算失败" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
