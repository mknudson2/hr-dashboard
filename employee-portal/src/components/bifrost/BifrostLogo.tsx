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
      <img
        src="/bifrost-logo.png"
        alt="Bifröst"
        width={px}
        height={px}
        className="object-contain"
      />

      {showWordmark && (
        <span className="font-display font-semibold tracking-[0.15em] text-deep-night dark:text-white">
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
