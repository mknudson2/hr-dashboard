import { ReactNode } from 'react';

interface BifrostLightHeroProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export default function BifrostLightHero({ title, subtitle, children }: BifrostLightHeroProps) {
  return (
    <div className="bifrost-aurora-light relative rounded-[20px] px-10 py-9 overflow-hidden mb-7">
      {/* Decorative circle */}
      <div
        className="absolute -top-10 -right-10 w-[280px] h-[280px] rounded-full border-2 border-bifrost-violet/[0.04] pointer-events-none"
        aria-hidden="true"
      />

      {/* Bridge silhouette decoration */}
      <svg
        className="absolute right-10 bottom-5 opacity-[0.04] pointer-events-none"
        width="200"
        height="100"
        viewBox="0 0 200 100"
        aria-hidden="true"
      >
        <path d="M 10 80 Q 100 0 190 80" fill="none" stroke="#6C3FA0" strokeWidth="2" strokeLinecap="round" />
        <path d="M 25 80 Q 100 12 175 80" fill="none" stroke="#6C3FA0" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 40 80 Q 100 24 160 80" fill="none" stroke="#6C3FA0" strokeWidth="1" strokeLinecap="round" />
      </svg>

      {/* Content */}
      <div className="relative z-10">
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-bifrost-violet-dark mb-1">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[15px] text-[#4A4A62] font-light">{subtitle}</p>
        )}
        {children}
      </div>

      {/* Bottom accent gradient strip */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-[20px] opacity-40"
        style={{ background: 'linear-gradient(90deg, #6C3FA0, #2ABFBF, #E8B84B)' }}
        aria-hidden="true"
      />
    </div>
  );
}
