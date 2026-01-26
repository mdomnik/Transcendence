"use client";

import { useState } from "react";

interface SignUpModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSwitchToLogin: () => void;
}

const handleGoogleSignup = () => {
  window.location.href = "/api/auth/google/login";
};

export default function SignUpModal({ isOpen, onClose, onSwitchToLogin } : SignUpModalProps) {
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [remember, setRemember] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [errorFields, setErrorFields] = useState<string[]>([]);

	if (!isOpen) return null;

	const getPasswordStrength = (pass: string) => {
		if (!pass) return { label: "", color: "" };
		if (pass.length < 6) return { label: "Very Weak", color: "text-red-500" };
		
		const hasLetters = /[a-zA-Z]/.test(pass);
		const hasNumbers = /[0-9]/.test(pass);
		const hasSpecial = /[^A-Za-z0-9]/.test(pass);
		
		const strength = [hasLetters, hasNumbers, hasSpecial].filter(Boolean).length;
		
		if (pass.length >= 8 && strength === 3) return { label: "Strong", color: "text-green-400" };
		if (pass.length >= 6 && strength >= 2) return { label: "Medium", color: "text-yellow-400" };
		return { label: "Weak", color: "text-orange-400" };
	};

	const strength = getPasswordStrength(password);

	const validateForm = () => {
		const fields: string[] = [];
		if (username.length < 3) {
			setError("Username must be at least 3 characters long");
			fields.push("username");
			setErrorFields(fields);
			return false;
		}
		
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			setError("Please enter a valid email address");
			fields.push("email");
			setErrorFields(fields);
			return false;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters long");
			fields.push("password");
			setErrorFields(fields);
			return false;
		}

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			fields.push("confirmPassword");
			setErrorFields(fields);
			return false;
		}

		setErrorFields([]);
		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setErrorFields([]);

		if (!validateForm()) return;

		setIsLoading(true);

		try {
			// Send credentials to backend
			const response = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include', // Important: allows cookies
				body: JSON.stringify({ username, email, password, remember }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Signup failed');
			}

			// Signup successful - redirect to dashboard
			onClose();
			window.location.href = '/dashboard';
		} catch (err: any) {
			setError(err.message || "Signup failed. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

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

		{error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
		  <input
            type="text"
            placeholder="Username"
			value={username}
			onChange={(e) => {
				setUsername(e.target.value);
				if (errorFields.includes("username")) setErrorFields(prev => prev.filter(f => f !== "username"));
			}}
			required
            className={`w-full px-4 py-3 rounded-xl bg-[#0A192F] border ${errorFields.includes("username") ? 'border-red-500' : 'border-[#64FFDA]/30'} text-[#CCD6F6] placeholder-[#8892B0] focus:outline-none focus:border-[#64FFDA] transition-colors`}
          />
          <input
            type="email"
            placeholder="Email"
			value={email}
			onChange={(e) => {
				setEmail(e.target.value);
				if (errorFields.includes("email")) setErrorFields(prev => prev.filter(f => f !== "email"));
			}}
			required
            className={`w-full px-4 py-3 rounded-xl bg-[#0A192F] border ${errorFields.includes("email") ? 'border-red-500' : 'border-[#64FFDA]/30'} text-[#CCD6F6] placeholder-[#8892B0] focus:outline-none focus:border-[#64FFDA] transition-colors`}
          />
          <input
            type="password"
            placeholder="Password"
			value={password}
			onChange={(e) => {
				setPassword(e.target.value);
				if (errorFields.includes("password")) setErrorFields(prev => prev.filter(f => f !== "password"));
			}}
			required
            className={`w-full px-4 py-3 rounded-xl bg-[#0A192F] border ${errorFields.includes("password") ? 'border-red-500' : 'border-[#64FFDA]/30'} text-[#CCD6F6] placeholder-[#8892B0] focus:outline-none focus:border-[#64FFDA] transition-colors`}
          />
		  {password && (
			<div className="px-1 flex justify-between items-center text-xs">
				<span className="text-[#8892B0]">Password Strength:</span>
				<span className={`font-semibold ${strength.color}`}>{strength.label}</span>
			</div>
		  )}
          <input
            type="password"
            placeholder="Confirm Password"
			value={confirmPassword}
			onChange={(e) => {
				setConfirmPassword(e.target.value);
				if (errorFields.includes("confirmPassword")) setErrorFields(prev => prev.filter(f => f !== "confirmPassword"));
			}}
			required
            className={`w-full px-4 py-3 rounded-xl bg-[#0A192F] border ${errorFields.includes("confirmPassword") ? 'border-red-500' : 'border-[#64FFDA]/30'} text-[#CCD6F6] placeholder-[#8892B0] focus:outline-none focus:border-[#64FFDA] transition-colors`}
          />

          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              id="remember-signup"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-[#64FFDA]/30 bg-[#0A192F] text-[#64FFDA] focus:ring-offset-[#112240] focus:ring-[#64FFDA]"
            />
            <label htmlFor="remember-signup" className="text-sm text-[#8892B0] cursor-pointer hover:text-[#CCD6F6] transition-colors">
              Remember me
            </label>
          </div>

          <button
            type="submit"
			disabled={isLoading}
            className="w-full px-8 py-3 rounded-xl bg-gradient-to-r from-[#64FFDA] to-[#5EEAD4] text-[#0A192F] font-semibold shadow-lg hover:scale-105 hover:shadow-[#64FFDA]/25 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isLoading ? 'Signing up...' : 'Sign Up'}
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