type JsonSchema = Record<string, unknown>;

export class GroqApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "GroqApiError";
  }
}

type GroqRequest = {
  system: string;
  user: string;
  maxTokens?: number;
  tool?: { name: string; description?: string; input_schema: JsonSchema };
};

type GroqChoice = {
  message?: {
    content?: string | null;
    tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
  };
};

export function shouldUseGroq() {
  return (process.env.AI_PROVIDER ?? "").toLowerCase() === "groq";
}

export async function callGroq({ system, user, maxTokens = 1024, tool }: GroqRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "gsk_...") throw new GroqApiError(503, "GROQ_API_KEY is not configured");

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_completion_tokens: maxTokens,
    temperature: 0.1,
  };
  if (tool) {
    body.tools = [{
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }];
    body.tool_choice = "required";
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => ({})) as {
    choices?: GroqChoice[];
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new GroqApiError(response.status, payload.error?.message || `Groq request failed (${response.status})`);
  }
  const message = payload.choices?.[0]?.message;
  if (!message) throw new GroqApiError(502, "Groq returned no message");

  if (tool) {
    const args = message.tool_calls?.find(call => call.function?.name === tool.name)?.function?.arguments;
    if (!args) throw new GroqApiError(502, "Groq returned no structured tool result");
    try {
      return { text: message.content?.trim() || "", toolInput: JSON.parse(args) as Record<string, unknown>, model };
    } catch {
      throw new GroqApiError(502, "Groq returned invalid structured tool arguments");
    }
  }
  return { text: message.content?.trim() || "", toolInput: null, model };
}
