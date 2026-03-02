interface MimirLogoProps {
  size?: number;
}

export default function MimirLogo({ size = 24 }: MimirLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer circle */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />

      {/* Middle circle */}
      <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />

      {/* Inner circle — teal filled */}
      <circle cx="12" cy="12" r="3" fill="#2ABFBF" />
    </svg>
  );
}
