// The Meta provider abstraction.
//
// Everything the app does against Facebook/Instagram goes through this
// interface. Two implementations:
//   - MockProvider   (src/lib/meta/mock.ts)  — realistic fake data, default
//   - MetaProvider   (src/lib/meta/meta.ts)  — live Graph API
// Flip with META_PROVIDER=meta once the Meta Developer App + App Review are
// ready. The rest of the app never changes.

export interface IncomingComment {
  externalId: string;
  accountExternalId: string;
  postExternalId: string;
  authorName: string;
  authorHandle?: string;
  text: string;
  commentedAt: Date;
}

export interface IncomingDM {
  // The Meta conversation/thread id.
  externalId: string;
  accountExternalId: string;
  participantName: string;
  participantHandle?: string;
  // The latest inbound message text.
  text: string;
  messageExternalId: string;
  sentAt: Date;
}

export interface MetaProvider {
  // --- Comments ---
  /** Pull new comments since the last sync (webhook-backed once live). */
  fetchNewComments(): Promise<IncomingComment[]>;
  /** Like a comment. NOTE: supported on Facebook only — Instagram's API has no
   *  like endpoint, so the live provider throws for IG and the app routes IG
   *  positives to a manual-like queue instead. */
  likeComment(externalId: string): Promise<void>;
  /** Hide a comment (used for clear spam). */
  hideComment(externalId: string): Promise<void>;
  /** Publish a reply to a comment. */
  replyToComment(externalId: string, message: string): Promise<void>;

  // --- Direct messages ---
  /** Pull new DM threads / inbound messages. */
  fetchNewDMs(): Promise<IncomingDM[]>;
  /** Send a DM reply in a conversation (subject to Meta's 24h window). */
  sendDM(conversationExternalId: string, message: string): Promise<void>;
}

let cached: MetaProvider | null = null;

export function getProvider(): MetaProvider {
  if (cached) return cached;
  const which = process.env.META_PROVIDER ?? "mock";
  if (which === "meta") {
    const { LiveMetaProvider } = require("./meta") as typeof import("./meta");
    cached = new LiveMetaProvider();
  } else {
    const { MockProvider } = require("./mock") as typeof import("./mock");
    cached = new MockProvider();
  }
  return cached;
}
