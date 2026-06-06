import Anthropic from "@anthropic-ai/sdk";
import { SETTLE_SYSTEM_PROMPT } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

// 结算结果的 JSON Schema（结构化输出，保证可解析）
const SETTLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    attrDelta: {
      type: "object",
      additionalProperties: false,
      properties: {
        body: { type: "integer" },
        mind: { type: "integer" },
        career: { type: "integer" },
        relation: { type: "integer" },
        wealth: { type: "integer" },
      },
      required: ["body", "mind", "career", "relation", "wealth"],
    },
    highlights: { type: "array", items: { type: "string" } },
    lessons: { type: "array", items: { type: "string" } },
    memories: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "attrDelta", "highlights", "lessons", "memories"],
} as const;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "未配置 ANTHROPIC_API_KEY" }), {
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

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: SETTLE_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: SETTLE_SCHEMA } },
      messages: [
        {
          role: "user",
          content: `这是玩家本周复盘的完整对话，请结算：\n\n${transcript}`,
        },
      ],
    });

    // 提取文本并解析
    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "{}";
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
