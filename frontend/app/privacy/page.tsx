export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#0A192F] py-20">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold text-[#CCD6F6] mb-8">Privacy Policy</h1>
        
        <div className="text-[#8892B0] space-y-8 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">Information We Collect</h2>
            <p>
              When you use our quiz platform, we collect information you provide directly, such as:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 ml-4">
              <li>Email address and username when you create an account</li>
              <li>Profile information and avatar images you upload</li>
              <li>Game responses and quiz performance data</li>
              <li>Communications you send to us</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside mt-3 space-y-1 ml-4">
              <li>Provide, maintain, and improve our quiz platform</li>
              <li>Process your account registration and manage your profile</li>
              <li>Enable multiplayer gaming features and track scores</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">Information Sharing</h2>
            <p>
              We do not sell, trade, or otherwise transfer your personal information to third parties. 
              We may share information in the following situations:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 ml-4">
              <li>With your consent or at your direction</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information. However, 
              no method of transmission over the internet is 100% secure, and we cannot guarantee 
              absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies to maintain your session, remember your preferences, 
              and analyze how you use our platform to improve our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:privacy@quizeverything.tech" className="text-[#64FFDA] hover:text-[#4ECDC4]">
                privacy@quizeverything.tech
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">Updates to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page with an updated "Last Updated" date.
            </p>
            <p className="mt-3 text-sm">
              <strong>Last Updated:</strong> January 24, 2026
            </p>
          </section>
        </div>

        <div className="mt-12">
          <a 
            href="/"
            className="inline-flex items-center text-[#64FFDA] hover:text-[#4ECDC4] transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}