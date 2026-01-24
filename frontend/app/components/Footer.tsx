import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#112240] border-t border-[#233554] flex-shrink-0">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          {/* Brand */}
          <div className="text-center sm:text-left">
            <span className="text-sm font-semibold text-[#CCD6F6]">Quiz Everything</span>
            <span className="text-xs text-[#8892B0] ml-2">© {new Date().getFullYear()}</span>
          </div>

          {/* Legal Links */}
          <div className="flex items-center space-x-4 text-xs">
            <Link href="/privacy" className="text-[#8892B0] hover:text-[#64FFDA] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-[#8892B0] hover:text-[#64FFDA] transition-colors">
              Terms
            </Link>
            <a 
              href="mailto:contact@quizeverything.tech"
              className="text-[#8892B0] hover:text-[#64FFDA] transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}