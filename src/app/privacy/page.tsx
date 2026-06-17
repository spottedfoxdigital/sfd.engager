// Public privacy policy — required for Meta App Review.
// Reachable at /privacy without login.
export const metadata = {
  title: "Privacy Policy — SFD Engager",
};

export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-zinc-800">
      <h1 className="text-2xl font-semibold text-zinc-900">Privacy Policy</h1>
      <p className="mt-1 text-sm text-zinc-500">Last updated: June 2026</p>

      <section className="prose mt-6 space-y-4 text-sm leading-6">
        <p>
          SFD Engager (&ldquo;the App&rdquo;) is an internal social media management tool operated
          by Spotted Fox Digital (&ldquo;we&rdquo;, &ldquo;us&rdquo;). The App is used by our
          authorized staff to manage community engagement on our clients&rsquo; Facebook Pages and
          Instagram Business accounts. This policy explains what data we access, how we use it, and
          how it can be deleted.
        </p>

        <h2 className="text-base font-semibold text-zinc-900">Information we access</h2>
        <p>With the explicit consent of the account owner, and only for accounts our agency manages, the App accesses through the Meta APIs:</p>
        <ul className="list-disc pl-6">
          <li>The list of Facebook Pages and connected Instagram Business accounts you manage.</li>
          <li>Posts and media on those accounts, and the comments and direct messages received on them.</li>
          <li>The public name/username of people who comment or message those accounts.</li>
          <li>Access tokens issued by Meta to perform actions you authorize.</li>
        </ul>

        <h2 className="text-base font-semibold text-zinc-900">How we use it</h2>
        <ul className="list-disc pl-6">
          <li>Display comments and messages in a single moderation dashboard.</li>
          <li>Draft suggested replies (using AI) for our staff to review, edit, and send.</li>
          <li>Like, hide, reply to, and moderate comments, and reply to messages, on the account owner&rsquo;s behalf.</li>
          <li>Classify spam and sentiment to prioritize what needs attention.</li>
        </ul>
        <p>We do not sell personal data, and we do not use it for advertising or any purpose unrelated to managing the connected accounts.</p>

        <h2 className="text-base font-semibold text-zinc-900">Storage &amp; security</h2>
        <p>
          Data is stored in a secured database accessible only to authorized agency staff. Access
          tokens are stored server-side and are never exposed to end users. Access to the App
          requires authentication.
        </p>

        <h2 className="text-base font-semibold text-zinc-900">Data retention &amp; deletion</h2>
        <p>
          We retain engagement data only as long as needed to manage the connected accounts. You may
          disconnect an account at any time, and you may request deletion of all stored data — see our{" "}
          <a className="text-blue-600 underline" href="/data-deletion">Data Deletion instructions</a>.
        </p>

        <h2 className="text-base font-semibold text-zinc-900">Third parties</h2>
        <p>
          The App uses Meta&rsquo;s Graph API (Facebook/Instagram) and an AI provider (Anthropic) to
          draft replies and classify content. Comment/message text may be sent to the AI provider
          solely to generate suggestions; it is not used to train models.
        </p>

        <h2 className="text-base font-semibold text-zinc-900">Contact</h2>
        <p>
          Questions about this policy or your data: <a className="text-blue-600 underline" href="mailto:spottedfoxdigital@gmail.com">spottedfoxdigital@gmail.com</a>.
        </p>
      </section>
    </main>
  );
}
