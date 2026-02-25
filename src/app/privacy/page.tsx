export default function PrivacyPage() {
  return (
    <div className="app-page">
      <div className="app-page__inner">
        <h1 className="font-mono text-h1 text-navy uppercase tracking-tight mb-8">Privacy Policy</h1>

        <div className="prose max-w-2xl text-gray-700 space-y-6">
          <p className="text-body">
            <strong>Last updated: 2026</strong>
          </p>

          <section>
            <h2 className="font-mono text-h3 text-navy mb-2">1. Overview</h2>
            <p className="text-body">
              This demo application stores data in your AT Protocol Personal Data Server (PDS).
              No personal data is collected, stored, or processed by this application&apos;s
              servers beyond what is necessary to facilitate your AT Protocol session.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-h3 text-navy mb-2">2. Data We Do Not Collect</h2>
            <p className="text-body">
              We do not collect, sell, or share your personal information with third parties.
              We do not use cookies for tracking. We do not run analytics or advertising on
              this application.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-h3 text-navy mb-2">3. Data Stored on Your PDS</h2>
            <p className="text-body">
              All project records you create through this application are written directly to
              your AT Protocol Personal Data Server (PDS). This data is governed by your PDS
              provider&apos;s own privacy policy. You retain full ownership and control of your
              data and may delete it at any time.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-h3 text-navy mb-2">4. Authentication</h2>
            <p className="text-body">
              Authentication is handled via the AT Protocol OAuth flow. We do not store your
              password. Session tokens are stored locally in your browser and are used solely
              to authenticate requests to your PDS on your behalf.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-h3 text-navy mb-2">5. Public Data</h2>
            <p className="text-body">
              Projects you publish are publicly accessible via your PDS and through this
              application&apos;s public project pages. Do not publish information you wish to
              keep private.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-h3 text-navy mb-2">6. Contact</h2>
            <p className="text-body">
              This is a demo application. For questions about privacy, please refer to the
              project repository.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
