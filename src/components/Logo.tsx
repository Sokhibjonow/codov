type LogoProps = {
  size?: number;
  withText?: boolean;
  tone?: "dark" | "light";
  className?: string;
};

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <polygon points="16,2 29,9.5 16,17 3,9.5" fill="#8f89ff" />
      <polygon points="3,9.5 16,17 16,30 3,22.5" fill="#5046e5" />
      <polygon points="29,9.5 29,22.5 16,30 16,17" fill="#3a31b8" />
    </svg>
  );
}

export function Logo({ size = 32, withText = true, tone = "dark", className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      {withText && (
        <span
          className={`text-lg font-extrabold tracking-tight ${tone === "light" ? "text-white" : "text-foreground"}`}
        >
          Cubick<span className={tone === "light" ? "text-accent" : "text-primary"}>Edu</span>
        </span>
      )}
    </span>
  );
}
