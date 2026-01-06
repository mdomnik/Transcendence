"use client";

interface SignUpModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSwitchToLogin: () => void;
}

const handleGoogleSignup = () => {
  window.location.href = "http://localhost:8080/api/auth/google/login";
};



export default function SignUpModal({ isOpen, onClose, onSwitchToLogin } : SignUpModalProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div
				className="absolute inset-0 bg-black/60 backdrop-blur-sm"
				onClick={onClose}
			/>
		<div className="relative z-10 max-w-sm w-full mx-4 rounded-3xl bg-[#112240] shadow-2xl border border-[#64FFDA]/30 p-16 space-y-6 animate-in fade-in zoom-in duration-200">
		 <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8892B0] hover:text-[#64FFDA] transition-colors text-2xl"
        >
          
        </button>

        <h2 className="text-3xl font-bold text-[#CCD6F6] text-center">Sign Up</h2>

        <form className="space-y-4">
		  <input
            type="Name"
            placeholder="Name"
			required
            className="w-full px-4 py-3 rounded-xl bg-[#0A192F] border border-[#64FFDA]/30 text-[#CCD6F6] placeholder-[#8892B0] focus:outline-none focus:border-[#64FFDA] transition-colors"
          />
          <input
            type="email"
            placeholder="Email"
			required
            className="w-full px-4 py-3 rounded-xl bg-[#0A192F] border border-[#64FFDA]/30 text-[#CCD6F6] placeholder-[#8892B0] focus:outline-none focus:border-[#64FFDA] transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
			required
            className="w-full px-4 py-3 rounded-xl bg-[#0A192F] border border-[#64FFDA]/30 text-[#CCD6F6] placeholder-[#8892B0] focus:outline-none focus:border-[#64FFDA] transition-colors"
          />
          <button
            type="submit"
            className="w-full px-8 py-3 rounded-xl bg-gradient-to-r from-[#64FFDA] to-[#5EEAD4] text-[#0A192F] font-semibold shadow-lg hover:scale-105 hover:shadow-[#64FFDA]/25 transition-all duration-200"
          >
            Sign Up
          </button>
        </form>
        <p className="text-center text-[#8892B0]">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-[#64FFDA] hover:underline"
          >
            Log in
          </button>
        </p>
		<div className="flex items-center gap-4">
  		<div className="flex-1 h-px bg-[#64FFDA]/30"></div>
  		<span className="text-[#8892B0] text-sm">or</span>
 		<div className="flex-1 h-px bg-[#64FFDA]/30"></div>
		</div>

		<button
  		onClick={handleGoogleSignup}
  		className="flex items-center justify-center gap-3 w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
		>
  		<img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
  		<span className="font-medium">Sign up with Google</span>
		</button>

		</div>
		</div>
	)

}