// The Meta provider abstraction.
//
// Everything the app does against Facebook/Instagram goes through this
// interface. Today only the Mock implementation exists, so the whole dashboard
// is usable with realistic data while the Meta Developer App + App Review are
// pending. When the live Graph API client is built, it implements this same
// interface and we flip META_PROVIDER=meta — no UI/logic changes required.

export interface IncomingComment {
  externalId: string;
  accountExternalId: string;
  postExternalId: string;
  authorName: string;
  authorHandle?: string;
  text: string;
  commentedAt: Date;
}

export interface MetaProvider {
  /** Pull new comments since the last sync (webhook-backed once live). */
  fetchNewComments(): Promise<IncomingComment[]>;
  /** Like a comment. */
  likeComment(externalId: string): Promise<void>;
  /** Hide a comment (used for clear spam). */
  hideComment(externalId: string): Promise<void>;
  /** Publish a reply to a comment. */
  replyToComment(externalId: string, message: string): Promise<void>;
}

export function getProvider(): MetaProvider {
  // Only "mock" is implemented today. "meta" will be added once App Review
  // clears; we throw clearly rather than silently doing nothing.
  const which = process.env.META_PROVIDER ?? "mock";
  if (which === "meta") {
    throw new Error(
      "Live Meta provider not yet implemented — set META_PROVIDER=mock until the Graph API client + App Review are ready."
    );
  }
  // Lazy import so the mock (and its seed data) isn't bundled into edge runtimes.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MockProvider } = require("./mock") as typeof import("./mock");
  return new MockProvider();
}
