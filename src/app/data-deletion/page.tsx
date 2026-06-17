// Public data-deletion instructions — required for Meta App Review.
// Reachable at /data-deletion without login.
export const metadata = {
  title: "Data Deletion — SFD Engager",
};

export default function DataDeletion() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-zinc-800">
      <h1 className="text-2xl font-semibold text-zinc-900">Data Deletion Instructions</h1>
      <p className="mt-1 text-sm text-zinc-500">Last updated: June 2026</p>

      <section className="mt-6 space-y-4 text-sm leading-6">
        <p>
          SFD Engager, operated by Spotted Fox Digital, stores comment and message data only for the
          Facebook Pages and Instagram accounts it has been authorized to manage. You can have all of
          your data removed at any time.
        </p>

        <h2 className="text-base font-semibold text-zinc-900">How to request deletion</h2>
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            Email <a className="text-blue-600 underline" href="mailto:spottedfoxdigital@gmail.com">spottedfoxdigital@gmail.com</a> with the subject &ldquo;Data Deletion Request&rdquo; and the name of the Facebook Page or Instagram account.
          </li>
          <li>We will disconnect the account, revoke its stored access tokens, and permanently delete all stored comments, messages, drafts, and related records for that account.</li>
          <li>We will confirm completion within 30 days.</li>
        </ol>

        <h2 className="text-base font-semibold text-zinc-900">Automatic removal</h2>
        <p>
          You may also revoke the App&rsquo;s access at any time from your Facebook settings
          (Settings &amp; Privacy → Settings → Business Integrations) or Instagram settings. Once
          access is revoked, the App can no longer retrieve data for that account, and its stored data
          is removed during routine cleanup.
        </p>

        <h2 className="text-base font-semibold text-zinc-900">Contact</h2>
        <p>
          <a className="text-blue-600 underline" href="mailto:spottedfoxdigital@gmail.com">spottedfoxdigital@gmail.com</a>
        </p>
      </section>
    </main>
  );
}
