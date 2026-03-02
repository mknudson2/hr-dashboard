export default function BifrostAdminLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 36 36" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
        <path d="M 4 24 Q 18 2 32 24" fill="none" stroke="#6C3FA0" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M 7 24 Q 18 5 29 24" fill="none" stroke="#2ABFBF" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M 10 24 Q 18 8 26 24" fill="none" stroke="#E8B84B" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="4" y1="24" x2="4" y2="29" stroke="#6C3FA0" strokeWidth="2" strokeLinecap="round"/>
        <line x1="32" y1="24" x2="32" y2="29" stroke="#6C3FA0" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <div>
        <div className="font-display text-[13px] font-semibold text-gray-900 dark:text-white tracking-[2px]">
          BIFRÖST
        </div>
        <div className="text-[9.5px] text-gray-400 dark:text-gray-500 tracking-wide">
          HR Hub · Admin
        </div>
      </div>
    </div>
  );
}
