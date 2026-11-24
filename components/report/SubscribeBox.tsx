import { SUBSTACK_URL } from '@/lib/site';

/** Newsletter sign-up. Links out to Substack, so the site itself collects no email addresses. */
export function SubscribeBox() {
  return (
    <section aria-labelledby="subscribe-title" className="panel flex flex-col gap-2 p-5 print:hidden">
      <h2 id="subscribe-title" className="text-lg">Get the Brief by email</h2>
      {SUBSTACK_URL ? (
        <>
          <p className="text-sm text-body">One email a month with the latest numbers. Free, and you can unsubscribe at any time. Sign-up is handled by Substack.</p>
          <a
            href={SUBSTACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex w-fit items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-canvas hover:bg-accent-strong"
          >
            Subscribe on Substack
          </a>
        </>
      ) : (
        <p className="text-sm text-body">A monthly email edition is coming soon. Until then, this page updates whenever the data does.</p>
      )}
    </section>
  );
}
