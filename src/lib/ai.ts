import Anthropic from "@anthropic-ai/sdk";

// Claude-powered classification + drafting, with heuristic fallbacks so the
// mock slice runs end-to-end even without an ANTHROPIC_API_KEY set.
//
//  - Classification (spam + sentiment) is high-volume, so it uses Haiku 4.5.
//  - Drafting replies/DMs needs tone control, so it uses Sonnet 4.6.
// Both models are configurable via env (CLASSIFY_MODEL / DRAFT_MODEL).

const CLASSIFY_MODEL = process.env.CLASSIFY_MODEL ?? "claude-haiku-4-5";
const DRAFT_MODEL = process.env.DRAFT_MODEL ?? "claude-sonnet-4-6";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

export type Sentiment = "positive" | "neutral" | "negative" | "question";
export type SpamLabel = "clean" | "spam" | "unsure";

export interface Classification {
  sentiment: Sentiment;
  spamLabel: SpamLabel;
  reason: string;
}

const CLASSIFY_SCHEMA = {
  type: "object" as const,
  properties: {
    sentiment: {
      type: "string",
      enum: ["positive", "neutral", "negative", "question"],
    },
    spamLabel: { type: "string", enum: ["clean", "spam", "unsure"] },
    reason: { type: "string" },
  },
  required: ["sentiment", "spamLabel", "reason"],
  additionalProperties: false,
};

export async function classifyComment(text: string): Promise<Classification> {
  const anthropic = getClient();
  if (!anthropic) return heuristicClassify(text);

  try {
    const res = await anthropic.messages.create({
      model: CLASSIFY_MODEL,
      max_tokens: 300,
      system:
        "You moderate comments on a small business's social media. Classify the comment. " +
        "sentiment: 'question' if it asks something, else positive/neutral/negative by tone. " +
        "spamLabel: 'spam' for scams, promo, link-dropping, or follow-for-follow; " +
        "'unsure' if borderline; 'clean' otherwise. Keep reason to one short phrase.",
      messages: [{ role: "user", content: text }],
      // Structured outputs guarantee a parseable JSON response.
      output_config: { format: { type: "json_schema", schema: CLASSIFY_SCHEMA } },
    } as Anthropic.MessageCreateParamsNonStreaming);

    const block = res.content.find((b) => b.type === "text");
    if (block && block.type === "text") {
      const parsed = JSON.parse(block.text) as Classification;
      return parsed;
    }
  } catch (err) {
    console.error("classifyComment fell back to heuristic:", err);
  }
  return heuristicClassify(text);
}

export interface VoiceProfile {
  accountName: string;
  tone?: string | null;
  dos?: string | null;
  donts?: string | null;
  bannedWords?: string | null;
}

export async function draftReply(
  commentText: string,
  authorName: string,
  voice: VoiceProfile,
  kind: "comment" | "dm" = "comment"
): Promise<{ body: string; model: string | null }> {
  const anthropic = getClient();
  if (!anthropic) return { body: heuristicDraft(commentText, voice), model: null };

  try {
    const channel =
      kind === "dm"
        ? `You write private direct-message (DM) replies on behalf of "${voice.accountName}", a small business, responding privately to someone who messaged them.`
        : `You write public reply comments on behalf of "${voice.accountName}", a small business, responding to its audience.`;
    const system = [
      channel,
      voice.tone ? `Voice/tone: ${voice.tone}.` : "Voice/tone: warm, friendly, concise.",
      voice.dos ? `Do: ${voice.dos}.` : "",
      voice.donts ? `Don't: ${voice.donts}.` : "",
      voice.bannedWords ? `Never use these words: ${voice.bannedWords}.` : "",
      kind === "dm"
        ? "Write ONE short, helpful DM reply, 1-3 sentences, no hashtags, no preamble."
        : "Write ONE reply, 1-2 sentences, no hashtags, no preamble. Sound like a real person from the business, not a bot.",
    ]
      .filter(Boolean)
      .join(" ");

    const res = await anthropic.messages.create({
      model: DRAFT_MODEL,
      max_tokens: 400,
      system,
      messages: [
        {
          role: "user",
          content: `Comment from ${authorName}: "${commentText}"\n\nWrite the reply.`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === "text");
    const body = block && block.type === "text" ? block.text.trim() : heuristicDraft(commentText, voice);
    return { body, model: DRAFT_MODEL };
  } catch (err) {
    console.error("draftReply fell back to heuristic:", err);
    return { body: heuristicDraft(commentText, voice), model: null };
  }
}

// ---------------------------------------------------------------------------
// Heuristic fallbacks (no API key required). Good enough to demo the workflow.
// ---------------------------------------------------------------------------

const SPAM_PATTERNS = [
  /\b(bit\.ly|tinyurl|link in bio)\b/i,
  /[a-z0-9-]+\.(link|win|click|info|xyz|top)\//i, // shady short/promo links
  /\$\d{3,}/,
  /\bDM (me|back)\b/i,
  /follow(ers)?\s*(for|4)\s*follow/i,
  /\b\d+k\s+(real\s+)?followers\b/i, // "10k followers"
  /\bgrow your (page|account|following)\b/i,
  /\bfree (iphone|gift ?card|prize|money|followers)\b/i,
  /\byou('|’)?ve been selected\b/i,
  /\b(crypto|forex|gift card|free money|click here|claim now|90% off|claim your)\b/i,
  /\bclick to claim\b/i,
  /🚀{2,}/,
];
const PROMO_HINTS = [/check (out )?my profile/i, /visit our store/i, /link in bio/i];
const NEGATIVE_HINTS = [
  /\b(terrible|awful|worst|horrible|unprofessional|disappointed|never again|refund|waited)\b/i,
  /where(’|')?s? my (order|refund)/i,
  /\?\?+/,
];
const PROFANITY = /\b(damn|hell|crap|wtf|sucks)\b/i;

export function heuristicClassify(text: string): Classification {
  const spamHits = SPAM_PATTERNS.filter((r) => r.test(text)).length;
  if (spamHits >= 1) return { sentiment: "neutral", spamLabel: "spam", reason: "scam/promo/link pattern" };
  if (PROMO_HINTS.some((r) => r.test(text)))
    return { sentiment: "neutral", spamLabel: "unsure", reason: "possible self-promo" };

  const isQuestion = text.trim().endsWith("?") || /\b(do you|are you|what time|can i|how much|does)\b/i.test(text);
  if (NEGATIVE_HINTS.some((r) => r.test(text)) || PROFANITY.test(text))
    return { sentiment: "negative", spamLabel: "clean", reason: "complaint / negative tone" };
  if (isQuestion) return { sentiment: "question", spamLabel: "clean", reason: "asks a question" };

  const positive = /[😍🥰🔥👍☕🥾✨]|love|amazing|best|great|recommend|unreal|lovely/i.test(text);
  return positive
    ? { sentiment: "positive", spamLabel: "clean", reason: "positive sentiment" }
    : { sentiment: "neutral", spamLabel: "clean", reason: "neutral comment" };
}

function heuristicDraft(commentText: string, voice: VoiceProfile): string {
  // Check complaints before questions — a complaint ending in "??" should get
  // an apology, not a "great question!" reply.
  if (NEGATIVE_HINTS.some((r) => r.test(commentText)) || PROFANITY.test(commentText))
    return `We're really sorry to hear about this experience. Please send us a DM with your details so we can make it right.`;
  if (commentText.trim().endsWith("?"))
    return `Great question! We'll get you the details — thanks for reaching out to ${voice.accountName}. 😊`;
  return `Thank you so much! We really appreciate the support. 🙌`;
}
