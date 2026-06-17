import { prisma } from "@/lib/prisma";
import type { IncomingComment, IncomingDM, MetaProvider } from "./provider";

// Live Facebook / Instagram Graph API provider.
//
// This is complete but cannot run until you (1) create a Meta Developer App,
// (2) connect a Page/IG account via the OAuth flow (stores pageAccessToken +
// metaPageId + igUserId on the Account), and (3) clear App Review for the
// comment/message permissions. See META_SETUP.md.
//
// It is selected by setting META_PROVIDER=meta. Until then the app uses the
// mock provider and none of this code runs.

const GRAPH = "https://graph.facebook.com/v21.0";
const TIMEOUT_MS = 12_000;

async function fetchJson(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const json = await res.json();
    return { ok: res.ok, json };
  } finally {
    clearTimeout(t);
  }
}

async function graphGet(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`${GRAPH}/${path}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const { ok, json } = await fetchJson(url.toString());
  if (!ok) throw new Error(`Graph GET ${path} failed: ${JSON.stringify(json)}`);
  return json;
}

async function graphPost(path: string, token: string, body: Record<string, string>) {
  const url = new URL(`${GRAPH}/${path}`);
  const form = new URLSearchParams({ ...body, access_token: token });
  const { ok, json } = await fetchJson(url.toString(), { method: "POST", body: form });
  if (!ok) throw new Error(`Graph POST ${path} failed: ${JSON.stringify(json)}`);
  return json;
}

function connectedAccounts() {
  return prisma.account.findMany({
    where: { connected: true, pageAccessToken: { not: null } },
  });
}

export class LiveMetaProvider implements MetaProvider {
  async fetchNewComments(): Promise<IncomingComment[]> {
    const accounts = await connectedAccounts();
    // Fetch all accounts in parallel — sequential is far too slow at scale.
    const perAccount = await Promise.all(accounts.map((a) => this.accountComments(a)));
    return perAccount.flat();
  }

  private async accountComments(a: {
    id: string;
    platform: string;
    igUserId: string | null;
    metaPageId: string | null;
    pageAccessToken: string | null;
  }): Promise<IncomingComment[]> {
    const token = a.pageAccessToken!;
    try {
      if (a.platform === "instagram" && a.igUserId) {
        const media = await graphGet(`${a.igUserId}/media`, token, { fields: "id", limit: "10" });
        const lists = await Promise.all(
          (media.data ?? []).map(async (m: { id: string }) => {
            const comments = await graphGet(`${m.id}/comments`, token, {
              fields: "id,text,username,timestamp",
              limit: "25",
            });
            return (comments.data ?? []).map((c: { id: string; text?: string; username?: string; timestamp?: string }) => ({
              externalId: c.id,
              accountExternalId: a.id,
              postExternalId: m.id,
              authorName: c.username ?? "Instagram user",
              authorHandle: c.username,
              text: c.text ?? "",
              commentedAt: c.timestamp ? new Date(c.timestamp) : new Date(),
            }));
          })
        );
        return lists.flat();
      }
      if (a.metaPageId) {
        const posts = await graphGet(`${a.metaPageId}/posts`, token, { fields: "id", limit: "10" });
        const lists = await Promise.all(
          (posts.data ?? []).map(async (p: { id: string }) => {
            const comments = await graphGet(`${p.id}/comments`, token, {
              fields: "id,message,from,created_time",
              limit: "25",
            });
            return (comments.data ?? []).map((c: { id: string; message?: string; from?: { name?: string }; created_time?: string }) => ({
              externalId: c.id,
              accountExternalId: a.id,
              postExternalId: p.id,
              authorName: c.from?.name ?? "Facebook user",
              authorHandle: undefined,
              text: c.message ?? "",
              commentedAt: c.created_time ? new Date(c.created_time) : new Date(),
            }));
          })
        );
        return lists.flat();
      }
    } catch (err) {
      // Expected for FB Pages until App Review (pages_read_user_content); skip.
      console.error(`fetchNewComments failed for account ${a.id}:`, err);
    }
    return [];
  }

  async likeComment(externalId: string): Promise<void> {
    const { account, token } = await this.resolveComment(externalId);
    if (account.platform === "instagram") {
      // Instagram's Graph API has no comment-like endpoint. The app routes IG
      // positives to a manual-like queue instead, so this should not be called
      // for IG — guard anyway.
      throw new Error("Instagram does not support liking comments via the API");
    }
    await graphPost(`${externalId}/likes`, token, {});
  }

  async hideComment(externalId: string): Promise<void> {
    const { account, token } = await this.resolveComment(externalId);
    if (account.platform === "instagram") {
      await graphPost(`${externalId}`, token, { hide: "true" });
    } else {
      await graphPost(`${externalId}`, token, { is_hidden: "true" });
    }
  }

  async replyToComment(externalId: string, message: string): Promise<void> {
    const { account, token } = await this.resolveComment(externalId);
    if (account.platform === "instagram") {
      await graphPost(`${externalId}/replies`, token, { message });
    } else {
      await graphPost(`${externalId}/comments`, token, { message });
    }
  }

  async fetchNewDMs(): Promise<IncomingDM[]> {
    const accounts = await connectedAccounts();
    const perAccount = await Promise.all(accounts.map((a) => this.accountDMs(a)));
    return perAccount.flat();
  }

  private async accountDMs(a: {
    id: string;
    platform: string;
    igUserId: string | null;
    metaPageId: string | null;
    pageAccessToken: string | null;
  }): Promise<IncomingDM[]> {
    const token = a.pageAccessToken!;
    const platform = a.platform === "instagram" ? "instagram" : "messenger";
    try {
      const convos = await graphGet(`${a.metaPageId}/conversations`, token, {
        platform,
        fields: "id,participants,updated_time,messages.limit(1){id,message,from,created_time}",
        limit: "25",
      });
      const out: IncomingDM[] = [];
      for (const conv of convos.data ?? []) {
        const last = conv.messages?.data?.[0];
        if (!last) continue;
        const fromName = last.from?.name ?? last.from?.username;
        const participant =
          conv.participants?.data?.find((p: { id: string }) => p.id !== a.metaPageId && p.id !== a.igUserId) ??
          conv.participants?.data?.[0];
        out.push({
          externalId: conv.id,
          accountExternalId: a.id,
          participantName: participant?.name ?? participant?.username ?? fromName ?? "User",
          participantHandle: participant?.username,
          text: last.message ?? "",
          messageExternalId: last.id,
          sentAt: last.created_time ? new Date(last.created_time) : new Date(),
        });
      }
      return out;
    } catch (err) {
      console.error(`fetchNewDMs failed for account ${a.id}:`, err);
      return [];
    }
  }

  async sendDM(conversationExternalId: string, message: string): Promise<void> {
    const conv = await prisma.conversation.findFirst({
      where: { externalId: conversationExternalId },
      include: { account: true },
    });
    if (!conv?.account.pageAccessToken || !conv.account.metaPageId) {
      throw new Error("Conversation/account not connected");
    }
    // Send API: needs the participant's PSID. In a full implementation we'd
    // store it on the Message; here we resolve it from the conversation.
    const token = conv.account.pageAccessToken;
    const recipientId = await this.resolveRecipient(conversationExternalId, token, conv.account.metaPageId, conv.account.igUserId);
    await graphPost(`${conv.account.metaPageId}/messages`, token, {
      recipient: JSON.stringify({ id: recipientId }),
      message: JSON.stringify({ text: message }),
      messaging_type: "RESPONSE",
    });
  }

  // --- helpers ---

  private async resolveComment(externalId: string) {
    const comment = await prisma.comment.findFirst({
      where: { externalId },
      include: { account: true },
    });
    if (!comment?.account.pageAccessToken) throw new Error("Comment/account not connected");
    return { account: comment.account, token: comment.account.pageAccessToken };
  }

  private async resolveRecipient(
    conversationExternalId: string,
    token: string,
    pageId: string,
    igUserId: string | null
  ): Promise<string> {
    const conv = await graphGet(`${conversationExternalId}`, token, { fields: "participants" });
    const other = conv.participants?.data?.find(
      (p: { id: string }) => p.id !== pageId && p.id !== igUserId
    );
    if (!other?.id) throw new Error("Could not resolve recipient PSID");
    return other.id;
  }
}
