export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-[#0A192F] py-20">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold text-[#CCD6F6] mb-8">Terms of Service</h1>
        
        <div className="text-[#8892B0] space-y-8 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">Acceptance of Terms</h2>
            <p>
              By accessing and using our quiz platform, you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to abide by the above, please do 
              not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">Use License</h2>
            <p>
              Permission is granted to temporarily use our platform for personal, non-commercial 
              transitory viewing only. This is the grant of a license, not a transfer of title, and 
              under this license you may not:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 ml-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to reverse engineer any software contained on the platform</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">User Account</h2>
            <p>
              To access certain features of our platform, you may be required to create an account. 
              You are responsible for:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 ml-4">
              <li>Maintaining the confidentiality of your account and password</li>
              <li>Restricting access to your computer and account</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and up-to-date information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">Prohibited Uses</h2>
            <p>You may not use our platform:</p>
            <ul className="list-disc list-inside mt-3 space-y-1 ml-4">
              <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
              <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
              <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
              <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
              <li>To submit false or misleading information</li>
              <li>To upload or transmit viruses or any other type of malicious code</li>
              <li>To spam, phish, pharm, pretext, spider, crawl, or scrape</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">Content</h2>
            <p className="mt-3">
              By posting content to our service, you grant us the right and license to use, modify, 
              publicly perform, publicly display, reproduce, and distribute such content on and through 
              the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">Privacy Policy</h2>
            <p>
              Your privacy is important to us. Please review our Privacy Policy, which also governs 
              your use of the service, to understand our practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">Termination</h2>
            <p>
              We may terminate or suspend your account and bar access to the service immediately, 
              without prior notice or liability, under our sole discretion, for any reason whatsoever 
              and without limitation, including but not limited to a breach of the Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">Disclaimer</h2>
            <p>
              The information on this platform is provided on an 'as is' basis. To the fullest extent 
              permitted by law, this Company excludes all representations, warranties, conditions and 
              terms relating to our platform and the use of this platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">Limitation of Liability</h2>
            <p>
              In no event shall our company, nor its directors, employees, partners, agents, suppliers, 
              or affiliates, be liable for any indirect, incidental, punitive, special, or consequential 
              damages, including lost profits, arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will always post the most 
              current version on our website. By continuing to use the service after changes become 
              effective, you agree to be bound by the revised terms.
            </p>
            <p className="mt-3 text-sm">
              <strong>Last Updated:</strong> January 24, 2026
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#CCD6F6] mb-4">Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:legal@quizeverything.tech" className="text-[#64FFDA] hover:text-[#4ECDC4]">
                legal@quizeverything.tech
              </a>
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