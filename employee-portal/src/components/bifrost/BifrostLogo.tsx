interface BifrostLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

const sizeMap = {
  sm: 30,
  md: 40,
  lg: 56,
};

export default function BifrostLogo({ size = 'md', showWordmark = false }: BifrostLogoProps) {
  const px = sizeMap[size];

  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={px}
        height={px}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Bridge base pillars */}
        <rect x="10" y="38" width="4" height="14" rx="2" fill="#6C3FA0" opacity="0.7" />
        <rect x="42" y="38" width="4" height="14" rx="2" fill="#6C3FA0" opacity="0.7" />

        {/* Outer arc — violet */}
        <path
          d="M6 40C6 25.6 17.6 14 28 14s22 11.6 22 26"
          stroke="#6C3FA0"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* Middle arc — teal */}
        <path
          d="M12 40C12 28.9 19.2 20 28 20s16 8.9 16 20"
          stroke="#2ABFBF"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Inner arc — gold */}
        <path
          d="M18 40C18 32.3 22.5 26 28 26s10 6.3 10 14"
          stroke="#E8B84B"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Bridge deck */}
        <line x1="6" y1="40" x2="50" y2="40" stroke="#6C3FA0" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {showWordmark && (
        <span className="font-display font-semibold tracking-[0.15em] text-deep-night">
          {size === 'sm' ? (
            <span className="text-[15px]">BIFRÖST</span>
          ) : size === 'md' ? (
            <span className="text-lg">BIFRÖST</span>
          ) : (
            <span className="text-2xl">BIFRÖST</span>
          )}
        </span>
      )}
    </div>
  );
}
