import type { IncomingComment, MetaProvider } from "./provider";

// A pool of realistic comments across the categories that matter to our rules:
// positive / neutral (auto-like), questions (flag), negative (flag),
// profanity (flag), clear spam (auto-hide), and borderline spam (review).
// Each call to fetchNewComments returns a small random batch with fresh ids,
// so the "Sync now" button keeps surfacing new work to triage in the demo.

type Sample = {
  postExternalId: string;
  accountExternalId: string;
  author: string;
  handle: string;
  text: string;
};

const SAMPLES: Sample[] = [
  // Sunrise Cafe (instagram)
  { accountExternalId: "acct_sunrise", postExternalId: "post_sunrise_1", author: "Maya R.", handle: "maya.eats", text: "This latte art is unreal 😍 best in town!" },
  { accountExternalId: "acct_sunrise", postExternalId: "post_sunrise_1", author: "Devon", handle: "devon_k", text: "Do you have oat milk options?" },
  { accountExternalId: "acct_sunrise", postExternalId: "post_sunrise_1", author: "Priya", handle: "priya.travels", text: "Stopped by this morning, lovely vibe ☕" },
  { accountExternalId: "acct_sunrise", postExternalId: "post_sunrise_1", author: "Angry Customer", handle: "jdoe88", text: "Waited 25 minutes for a cold coffee. Terrible service." },
  { accountExternalId: "acct_sunrise", postExternalId: "post_sunrise_1", author: "CryptoKing", handle: "x_profit_x", text: "Make $5000/week from home!! DM me 'MONEY' to start 🚀🚀 bit.ly/quickcash" },
  { accountExternalId: "acct_sunrise", postExternalId: "post_sunrise_1", author: "Sam", handle: "sam_w", text: "What time do you open on Sundays?" },

  // Northside Dental (facebook)
  { accountExternalId: "acct_dental", postExternalId: "post_dental_1", author: "Linda M.", handle: "", text: "Dr. Patel is the best! Painless cleaning, highly recommend." },
  { accountExternalId: "acct_dental", postExternalId: "post_dental_1", author: "Rob", handle: "", text: "Are you accepting new patients with Delta Dental insurance?" },
  { accountExternalId: "acct_dental", postExternalId: "post_dental_1", author: "Frustrated", handle: "", text: "Cancelled my appointment twice with no notice. Unprofessional." },
  { accountExternalId: "acct_dental", postExternalId: "post_dental_1", author: "FreeGiftCard", handle: "", text: "Congratulations!!! You won a $1000 gift card 🎁 claim now: freeprize.link/win" },
  { accountExternalId: "acct_dental", postExternalId: "post_dental_1", author: "Check Profile", handle: "", text: "Nice page 👍 check out my profile for followers" },

  // Trailhead Outfitters (instagram)
  { accountExternalId: "acct_trail", postExternalId: "post_trail_1", author: "Hiker Jess", handle: "jess.summits", text: "Picked up the new pack last week — held up great on a 12 mile loop 🥾" },
  { accountExternalId: "acct_trail", postExternalId: "post_trail_1", author: "Marcus", handle: "marcus.outdoors", text: "Does the tent come in a 4-person size?" },
  { accountExternalId: "acct_trail", postExternalId: "post_trail_1", author: "Annoyed", handle: "t_lewis", text: "Ordered two weeks ago, still no shipping update. Where is my order??" },
  { accountExternalId: "acct_trail", postExternalId: "post_trail_1", author: "Casey", handle: "casey_climbs", text: "🔥🔥🔥" },
  { accountExternalId: "acct_trail", postExternalId: "post_trail_1", author: "DealsBot", handle: "best.deals.daily", text: "Cheap designer bags 90% off!! visit our store link in bio 💼" },
];

export class MockProvider implements MetaProvider {
  async fetchNewComments(): Promise<IncomingComment[]> {
    // Return 3–5 random samples with unique external ids each call.
    const count = 3 + Math.floor(Math.random() * 3);
    const picked: IncomingComment[] = [];
    const used = new Set<number>();
    while (picked.length < count && used.size < SAMPLES.length) {
      const i = Math.floor(Math.random() * SAMPLES.length);
      if (used.has(i)) continue;
      used.add(i);
      const s = SAMPLES[i];
      picked.push({
        externalId: `cmt_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
        accountExternalId: s.accountExternalId,
        postExternalId: s.postExternalId,
        authorName: s.author,
        authorHandle: s.handle || undefined,
        text: s.text,
        commentedAt: new Date(),
      });
    }
    return picked;
  }

  async likeComment(externalId: string): Promise<void> {
    // No-op in mock mode. The live provider will call the Graph API here.
    void externalId;
  }

  async hideComment(externalId: string): Promise<void> {
    void externalId;
  }

  async replyToComment(externalId: string, message: string): Promise<void> {
    void externalId;
    void message;
  }
}
