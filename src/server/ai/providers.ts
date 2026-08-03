import Anthropic from "@anthropic-ai/sdk";
import { callGroq } from "./groq";

type JsonSchema = Record<string, unknown>;

export type AiTool = {
  name: string;
  description?: string;
  input_schema: JsonSchema;
};

type AiRequest = {
  system: string;
  user: string;
  maxTokens?: number;
  tool?: AiTool;
};

export type AiResult = {
  text: string;
  toolInput: Record<string, unknown> | null;
  model: string;
  provider: "openai" | "groq" | "anthropic";
};

class OpenAiApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "OpenAiApiError";
  }
}

async function callOpenAI({ system, user, maxTokens = 1024, tool }: AiRequest): Promise<AiResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "PASTE_YOUR_OPENAI_KEY_HERE") {
    throw new OpenAiApiError(503, "OPENAI_API_KEY is not configured");
  }
  const model = process.env.OPENAI_MODEL || "gpt-5.6-sol";
  const body: Record<string, unknown> = {
    model,
    instructions: system,
    input: user,
    max_output_tokens: maxTokens,
    store: false,
  };
  if (tool) {
    body.tools = [{
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
      strict: true,
    }];
    body.tool_choice = { type: "function", name: tool.name };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json().catch(() => ({})) as {
    output_text?: string;
    output?: Array<{
      type?: string;
      name?: string;
      arguments?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new OpenAiApiError(response.status, payload.error?.message || `OpenAI request failed (${response.status})`);
  }
  if (tool) {
    const call = payload.output?.find(item => item.type === "function_call" && item.name === tool.name);
    if (!call?.arguments) throw new OpenAiApiError(502, "OpenAI returned no structured tool result");
    try {
      return { text: payload.output_text?.trim() || "", toolInput: JSON.parse(call.arguments), model, provider: "openai" };
    } catch {
      throw new OpenAiApiError(502, "OpenAI returned invalid structured tool arguments");
    }
  }
  const text = payload.output_text?.trim() || payload.output
    ?.flatMap(item => item.content ?? [])
    .filter(item => item.type === "output_text")
    .map(item => item.text ?? "")
    .join("")
    .trim() || "";
  if (!text) throw new OpenAiApiError(502, "OpenAI returned no text");
  return { text, toolInput: null, model, provider: "openai" };
}

async function callAnthropic({ system, user, maxTokens = 1024, tool }: AiRequest): Promise<AiResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const message = await new Anthropic({ apiKey }).messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
    ...(tool ? {
      tools: [tool as Anthropic.Tool],
      tool_choice: { type: "tool" as const, name: tool.name },
    } : {}),
  });
  if (tool) {
    const block = message.content.find((item): item is Anthropic.ToolUseBlock => item.type === "tool_use");
    if (!block) throw new Error("Anthropic returned no structured tool result");
    return { text: "", toolInput: block.input as Record<string, unknown>, model, provider: "anthropic" };
  }
  const text = message.content
    .filter(item => item.type === "text")
    .map(item => (item as Anthropic.TextBlock).text)
    .join("")
    .trim();
  if (!text) throw new Error("Anthropic returned no text");
  return { text, toolInput: null, model, provider: "anthropic" };
}

export async function callAI(request: AiRequest): Promise<AiResult> {
  const failures: string[] = [];
  if (process.env.OPENAI_API_KEY) {
    try {
      return await callOpenAI(request);
    } catch (error) {
      failures.push(`OpenAI: ${error instanceof Error ? error.message : "failed"}`);
      console.warn("[ai-provider] OpenAI failed; trying Groq", error);
    }
  }
  if (process.env.GROQ_API_KEY) {
    try {
      const result = await callGroq(request);
      return { ...result, provider: "groq" };
    } catch (error) {
      failures.push(`Groq: ${error instanceof Error ? error.message : "failed"}`);
      console.warn("[ai-provider] Groq failed; trying Anthropic", error);
    }
  }
  try {
    return await callAnthropic(request);
  } catch (error) {
    failures.push(`Anthropic: ${error instanceof Error ? error.message : "failed"}`);
    throw new Error(`All AI providers are unavailable. ${failures.join(" | ")}`);
  }
}
