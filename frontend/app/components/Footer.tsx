import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#112240] border-t border-[#233554] mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold text-[#CCD6F6] mb-1">
              Quiz Everything
            </h3>
            <p className="text-sm text-[#8892B0]">
              Challenge your knowledge with friends in real-time multiplayer quizzes.
            </p>
          </div>

          {/* Legal Links */}
          <div className="flex items-center space-x-6 text-sm">
            <Link href="/privacy" className="text-[#8892B0] hover:text-[#64FFDA] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-[#8892B0] hover:text-[#64FFDA] transition-colors">
              Terms of Service
            </Link>
            <a 
              href="mailto:contact@quizeverything.tech"
              className="text-[#8892B0] hover:text-[#64FFDA] transition-colors"
            >
              Contact
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-[#233554] mt-6 pt-4 text-center">
          <p className="text-sm text-[#8892B0]">
            © {new Date().getFullYear()} Quiz Everything. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}