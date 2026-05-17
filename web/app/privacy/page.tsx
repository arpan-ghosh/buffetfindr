import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — BuffetFindr",
  description: "Privacy policy for the BuffetFindr app and website.",
};

const LAST_UPDATED = "May 17, 2026";
const CONTACT_EMAIL = "arpanghosh95@gmail.com";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FFF8F2]">
      {/* Header */}
      <div className="border-b border-[#EDE0D4] bg-white">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="BuffetFindr" className="w-9 h-9 rounded-xl" />
          <div>
            <p className="text-xs text-[#8C6B55]">BuffetFindr</p>
            <h1 className="text-lg font-bold text-[#1C0A00] leading-none">Privacy Policy</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        <p className="text-sm text-[#8C6B55]">Last updated: {LAST_UPDATED}</p>

        <Section title="Overview">
          <p>
            BuffetFindr (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;the app&rdquo;) helps you find Indian buffet
            restaurants near you. We are committed to protecting your privacy. This policy explains
            what information we collect, how we use it, and your rights.
          </p>
          <p className="mt-3">
            By using BuffetFindr — on iOS, Android, or the web — you agree to this policy.
          </p>
        </Section>

        <Section title="Information We Collect">
          <SubSection title="Location Data">
            <p>
              When you use the map feature, we request access to your device&rsquo;s location to show
              buffets near you. <strong>Your location is never transmitted to our servers</strong> —
              it is used only on your device to center the map. You can deny location permission
              and still browse all restaurants manually.
            </p>
          </SubSection>

          <SubSection title="Restaurant Submissions">
            <p>
              If you submit a restaurant via the &ldquo;Submit a Buffet&rdquo; form, we collect the information
              you voluntarily provide: restaurant name, city, state, and any optional details
              (phone, website, notes). We do not collect your name, email, or any identifying
              information with submissions.
            </p>
          </SubSection>

          <SubSection title="Buffet Feedback (Votes)">
            <p>
              When you vote &ldquo;Yes, buffet confirmed&rdquo; or &ldquo;No buffet&rdquo; on a restaurant, we store an
              anonymous vote count associated with that restaurant. No user identifier is
              attached to your vote. Your personal vote preference is stored locally on your
              device only.
            </p>
          </SubSection>

          <SubSection title="On-Device Storage">
            <p>
              The app uses local storage (AsyncStorage) to remember:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Restaurants you&rsquo;ve marked as &ldquo;Been Here&rdquo;</li>
              <li>Your individual vote on each restaurant</li>
            </ul>
            <p className="mt-2">
              This data never leaves your device and is deleted if you uninstall the app.
            </p>
          </SubSection>

          <SubSection title="Usage Data">
            <p>
              We do not currently use analytics or crash reporting tools. We do not track
              which restaurants you view or how you interact with the app.
            </p>
          </SubSection>
        </Section>

        <Section title="How We Use Your Information">
          <ul className="list-disc ml-5 space-y-2">
            <li><strong>Location:</strong> Center the map on your current position. Never stored or shared.</li>
            <li><strong>Submissions:</strong> Review and potentially add new restaurants to the database. Submissions are moderated before going live.</li>
            <li><strong>Votes:</strong> Calculate community-verified buffet confidence scores shown on restaurant listings.</li>
          </ul>
          <p className="mt-3">
            We do not sell, rent, or share any data with third parties for marketing purposes.
          </p>
        </Section>

        <Section title="Third-Party Services">
          <p>BuffetFindr uses the following third-party services:</p>

          <SubSection title="Google Maps & Google Places API">
            <p>
              We use Google Maps to display the map and restaurant location pins. Restaurant data
              (names, addresses, ratings, photos, hours) is sourced from the Google Places API.
              Your use of the map is subject to{" "}
              <a href="https://policies.google.com/privacy" className="text-[#C94A1F] underline" target="_blank" rel="noopener noreferrer">
                Google&rsquo;s Privacy Policy
              </a>.
              Google Maps may collect device data as described in their policy.
            </p>
          </SubSection>

          <SubSection title="Future: Advertising (Google AdMob)">
            <p>
              We plan to show free, non-targeted ads via Google AdMob in a future update.
              When enabled, AdMob may collect device identifiers to serve ads. We will update
              this policy before enabling ads and will comply with Apple&rsquo;s App Tracking
              Transparency (ATT) framework, requiring your explicit consent before any
              interest-based advertising.
            </p>
          </SubSection>

          <SubSection title="Future: Sign In with Apple / Google">
            <p>
              A future update will optionally allow you to sign in to sync your &ldquo;Been Here&rdquo; list
              across devices. This will use Apple Sign In or Google Sign In. Sign-in will always
              be optional — the app is fully usable without an account.
            </p>
          </SubSection>
        </Section>

        <Section title="Data Retention">
          <p>
            Restaurant submissions are retained indefinitely to build the database.
            Anonymous vote counts are retained indefinitely.
            On-device data is retained until you delete the app.
            We do not retain any personal information.
          </p>
        </Section>

        <Section title="Children's Privacy">
          <p>
            BuffetFindr is rated 4+ and is suitable for all ages. We do not knowingly collect
            personal information from children under 13. The app does not require account
            creation and does not collect any personally identifiable information.
          </p>
        </Section>

        <Section title="Your Rights">
          <p>
            Since we do not collect personally identifiable information, there is no personal
            data to access, correct, or delete. If you submitted a restaurant and want it
            removed, contact us at the email below and we will remove it promptly.
          </p>
        </Section>

        <Section title="California Privacy Rights (CCPA)">
          <p>
            BuffetFindr does not sell personal information. California residents have the right
            to know what personal information is collected — in our case, none that is linked
            to an individual.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this policy as we add features (ads, sign-in). The &ldquo;Last updated&rdquo;
            date at the top of this page will reflect any changes. Continued use of the app
            after changes constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="Contact Us">
          <p>
            Questions about this privacy policy? Contact us at:
          </p>
          <p className="mt-2">
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#C94A1F] font-semibold">
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-1 text-sm text-[#8C6B55]">
            Website: <a href="https://www.buffetfindr.com" className="underline">buffetfindr.com</a>
          </p>
        </Section>

      </div>

      {/* Footer */}
      <div className="border-t border-[#EDE0D4] mt-12">
        <div className="max-w-3xl mx-auto px-6 py-6 text-center text-xs text-[#8C6B55]">
          © {new Date().getFullYear()} BuffetFindr · <a href="/" className="underline">Home</a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-[#1C0A00] mb-3 pb-2 border-b border-[#EDE0D4]">
        {title}
      </h2>
      <div className="text-[15px] text-[#3D1F0A] leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="font-semibold text-[#1C0A00] mb-1">{title}</h3>
      <div className="text-[15px] text-[#3D1F0A] leading-relaxed">
        {children}
      </div>
    </div>
  );
}
