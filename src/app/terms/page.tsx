export default function TermsPage() {
  return (
    <div className="app-page">
      <div className="app-page__inner">
        <h1 className="font-mono text-h1 text-navy uppercase tracking-tight mb-8">Terms of Service</h1>

        <div className="prose max-w-2xl text-gray-700 space-y-6">
          <p className="text-body">
            <strong>Last updated: 2026</strong>
          </p>

          <section>
            <h2 className="font-mono text-h3 text-navy mb-2">1. Acceptance of Terms</h2>
            <p className="text-body">
              This is a demo application. By accessing or using Demo Project Pages, you agree to be
              bound by these Terms of Service. If you do not agree to these terms, please do not use
              this application.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-h3 text-navy mb-2">2. Use at Your Own Risk</h2>
            <p className="text-body">
              This application is provided &ldquo;as is&rdquo; without warranty of any kind. You use
              this application entirely at your own risk. The developers make no guarantees about
              availability, reliability, or fitness for any particular purpose.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-h3 text-navy mb-2">3. AT Protocol &amp; Data Ownership</h2>
            <p className="text-body">
              This application uses the AT Protocol. All project data you create is stored in your
              own AT Protocol Personal Data Server (PDS). You retain full ownership of your data at
              all times. You may delete your data at any time through this application or directly
              via your PDS.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-h3 text-navy mb-2">4. Prohibited Conduct</h2>
            <p className="text-body">
              You agree not to use this application to post unlawful, harmful, or abusive content,
              to impersonate others, or to violate any applicable laws or regulations.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-h3 text-navy mb-2">5. Changes to Terms</h2>
            <p className="text-body">
              We reserve the right to modify these terms at any time. Continued use of the
              application after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-h3 text-navy mb-2">6. Contact</h2>
            <p className="text-body">
              This is a demo application. For questions, please refer to the project repository.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
