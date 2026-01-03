interface ButtonProps {
  children: React.ReactNode;      // Text or content inside button
  variant?: "primary" | "outline" | "Play"; // Style variant
  onClick?: () => void;           // Click handler (optional)
  type?: "button" | "submit";     // Button type
  fullWidth?: boolean;            // Take full width?
}

export default function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
  fullWidth = false,
}: ButtonProps) {
  // Base styles (shared by all buttons)
  const baseStyles =
    "font-semibold transition-all duration-200 hover:scale-105";

  // Variant-specific styles
  const variants = {
    primary:
      "px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-[#64FFDA] to-[#5EEAD4] text-[#0A192F] shadow-lg hover:shadow-[#64FFDA]/25",
    outline:
      "px-4 py-2 text-sm rounded-lg bg-transparent text-[#64FFDA] border-2 border-[#64FFDA] hover:bg-[#64FFDA]/10",
    Play:
      "py-4 px-38 rounded-full bg-gradient-to-r from-[#64FFDA] to-[#5EEAD4] text-[#0A192F] shadow-lg hover:shadow-[#64FFDA]/40 text-xl",
  };

  // Width style
  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${widthStyle}`}
    >
      {children}
    </button>
  );
}
