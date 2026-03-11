import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.3;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * Zavolá Anthropic API s daným systémovým a uživatelským promptem.
 * Vrací textovou odpověď modelu.
 */
export async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = DEFAULT_TEMPERATURE,
): Promise<string> {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI: žádný textový blok v odpovědi");
  }

  return textBlock.text;
}
